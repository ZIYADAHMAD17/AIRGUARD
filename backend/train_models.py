"""
AirGuard - Machine Learning Training & Evaluation Pipeline
Implements:
1. Chronological Time-Series Regression (Baseline Linear Regression & Random Forest Regressor)
2. Air Quality Classification (Random Forest Classifier without target leakage)
3. Unsupervised K-Means Clustering with PCA 2D Projection
4. Isolation Forest Anomaly Detection
Saves models with joblib and evaluation metrics/plots to backend/outputs/ and reports/.
"""

from __future__ import annotations
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import pandas as pd
import numpy as np

# Non-interactive backend
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
    silhouette_score
)
import joblib

from backend.preprocessing import load_dataset, STANDARD_POLLUTANTS, resolve_dataset_path

RANDOM_STATE = 42
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "backend" / "models"
OUTPUTS_DIR = BASE_DIR / "backend" / "outputs"
REPORTS_DIR = BASE_DIR / "reports"


def derive_aqi_bucket(aqi: float) -> str:
    """
    Standard Indian CPCB AQI Bucket mapping for labeling when AQI_Bucket column is missing.
    0-50: Good, 51-100: Satisfactory, 101-200: Moderate,
    201-300: Poor, 301-400: Very Poor, 401+: Severe.
    """
    if np.isnan(aqi):
        return "Unknown"
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Satisfactory"
    elif aqi <= 200:
        return "Moderate"
    elif aqi <= 300:
        return "Poor"
    elif aqi <= 400:
        return "Very Poor"
    else:
        return "Severe"


# ============================================================================
# 1. REGRESSION (PM2.5 Next Day Prediction)
# ============================================================================
def train_regression(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Train PM2.5 forecasting models using chronological lag features.
    Compares Baseline Linear Regression vs. Random Forest Regressor.
    """
    if "PM2.5" not in df.columns:
        return {
            "status": "skipped",
            "reason": "PM2.5 column not present in dataset."
        }

    reg_df = df.copy()

    # Ensure chronological order
    if "Date" in reg_df.columns and pd.api.types.is_datetime64_any_dtype(reg_df["Date"]):
        sort_cols = ["City", "Date"] if "City" in reg_df.columns else ["Date"]
        reg_df = reg_df.sort_values(by=sort_cols).reset_index(drop=True)

    # Feature Engineering with strict avoidance of target leakage
    # We predict the next observation's PM2.5: target = PM2.5 shifted by -1
    if "City" in reg_df.columns:
        reg_df["target_PM2.5_next"] = reg_df.groupby("City")["PM2.5"].shift(-1)
        reg_df["PM2.5_lag1"] = reg_df.groupby("City")["PM2.5"].shift(1)
        reg_df["PM2.5_lag2"] = reg_df.groupby("City")["PM2.5"].shift(2)
        reg_df["PM2.5_roll3"] = reg_df.groupby("City")["PM2.5"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean())
    else:
        reg_df["target_PM2.5_next"] = reg_df["PM2.5"].shift(-1)
        reg_df["PM2.5_lag1"] = reg_df["PM2.5"].shift(1)
        reg_df["PM2.5_lag2"] = reg_df["PM2.5"].shift(2)
        reg_df["PM2.5_roll3"] = reg_df["PM2.5"].shift(1).rolling(3, min_periods=1).mean()

    # Calendar features if Date available
    if "Date" in reg_df.columns and pd.api.types.is_datetime64_any_dtype(reg_df["Date"]):
        reg_df["month"] = reg_df["Date"].dt.month
        reg_df["day_of_week"] = reg_df["Date"].dt.day_of_week

    # Base candidate predictor pollutants currently available
    other_pollutants = [p for p in ["PM10", "NO2", "SO2", "CO", "O3"] if p in reg_df.columns]
    feature_cols = ["PM2.5", "PM2.5_lag1", "PM2.5_lag2", "PM2.5_roll3"] + other_pollutants
    if "month" in reg_df.columns:
        feature_cols.extend(["month", "day_of_week"])

    # Drop rows where target is NaN (e.g., last day) or where all features are NaN
    valid_data = reg_df.dropna(subset=["target_PM2.5_next", "PM2.5"]).copy()
    if len(valid_data) < 30:
        return {
            "status": "skipped",
            "reason": f"Insufficient valid sequential observations for regression ({len(valid_data)} records)."
        }

    X = valid_data[feature_cols].copy()
    y = valid_data["target_PM2.5_next"].values

    # Impute missing feature values (median)
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    # Chronological Split (80% train, 20% test)
    split_idx = int(len(X_imputed) * 0.8)
    X_train, X_test = X_imputed[:split_idx], X_imputed[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # Model 1: Linear Regression (Baseline)
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    y_pred_lr = lr.predict(X_test)
    mae_lr = float(mean_absolute_error(y_test, y_pred_lr))
    rmse_lr = float(root_mean_squared_error(y_test, y_pred_lr))
    r2_lr = float(r2_score(y_test, y_pred_lr))

    # Model 2: Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=RANDOM_STATE, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    mae_rf = float(mean_absolute_error(y_test, y_pred_rf))
    rmse_rf = float(root_mean_squared_error(y_test, y_pred_rf))
    r2_rf = float(r2_score(y_test, y_pred_rf))

    # Best model selection by lowest RMSE
    best_model_name = "Random Forest Regressor" if rmse_rf <= rmse_lr else "Linear Regression"
    best_model = rf if best_model_name == "Random Forest Regressor" else lr
    best_preds = y_pred_rf if best_model_name == "Random Forest Regressor" else y_pred_lr

    # Feature Importance (if RF)
    feature_importances = {}
    if hasattr(rf, "feature_importances_"):
        for f, imp in zip(feature_cols, rf.feature_importances_):
            feature_importances[f] = round(float(imp), 4)

    # Save artifacts
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "model": best_model,
        "imputer": imputer,
        "feature_cols": feature_cols,
        "model_name": best_model_name
    }, MODELS_DIR / "regression_model.joblib")

    # Generate Evaluation Charts
    chart_files = []
    try:
        # 1. Actual vs Predicted Scatter
        plt.figure(figsize=(8, 6))
        # Sample for plotting if large
        sample_size = min(500, len(y_test))
        indices = np.random.RandomState(42).choice(len(y_test), sample_size, replace=False)
        plt.scatter(y_test[indices], best_preds[indices], alpha=0.5, color="#38bdf8", edgecolors="none", s=25)
        min_val = min(y_test[indices].min(), best_preds[indices].min())
        max_val = max(y_test[indices].max(), best_preds[indices].max())
        plt.plot([min_val, max_val], [min_val, max_val], "r--", linewidth=1.5, label="Perfect 1:1 Fit")
        plt.title(f"PM2.5 Forecasting: Actual vs Predicted ({best_model_name})", fontsize=12, color="#38bdf8")
        plt.xlabel("Actual PM2.5 (µg/m³)", color="#94a3b8")
        plt.ylabel("Predicted PM2.5 (µg/m³)", color="#94a3b8")
        plt.legend(facecolor="#1e293b", edgecolor="#334155")
        plt.grid(True, linestyle="--", alpha=0.25)
        plt.tight_layout()
        chart_p1 = OUTPUTS_DIR / "regression_actual_vs_predicted.png"
        plt.savefig(chart_p1, dpi=180, facecolor="#0f172a")
        plt.close()
        chart_files.append("regression_actual_vs_predicted.png")

        # 2. Residual Distribution Plot
        residuals = y_test - best_preds
        plt.figure(figsize=(8, 5))
        sns.histplot(residuals, bins=40, kde=True, color="#0ea5e9")
        plt.axvline(0, color="#f43f5e", linestyle="--", linewidth=1.5, label="Zero Error")
        plt.title("Residual Distribution (Error = Actual - Predicted)", fontsize=12, color="#38bdf8")
        plt.xlabel("Prediction Error (µg/m³)", color="#94a3b8")
        plt.ylabel("Frequency", color="#94a3b8")
        plt.legend(facecolor="#1e293b", edgecolor="#334155")
        plt.grid(True, linestyle="--", alpha=0.25)
        plt.tight_layout()
        chart_p2 = OUTPUTS_DIR / "regression_residuals.png"
        plt.savefig(chart_p2, dpi=180, facecolor="#0f172a")
        plt.close()
        chart_files.append("regression_residuals.png")
    except Exception:
        plt.close()

    # Generate sample actual vs predicted points for interactive frontend Recharts
    sample_len = min(60, len(y_test))
    eval_curve = []
    for i in range(-sample_len, 0):
        eval_curve.append({
            "index": int(i + sample_len),
            "actual": round(float(y_test[i]), 2),
            "predicted": round(float(best_preds[i]), 2),
            "error": round(float(abs(y_test[i] - best_preds[i])), 2)
        })

    return {
        "status": "success",
        "target": "target_PM2.5_next (Next-Day PM2.5 Forecast)",
        "features": feature_cols,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "split_strategy": "Chronological (80% Train, 20% Test)",
        "best_model": best_model_name,
        "models_comparison": [
            {
                "model": "Linear Regression (Baseline)",
                "mae": round(mae_lr, 2),
                "rmse": round(rmse_lr, 2),
                "r2": round(r2_lr, 4)
            },
            {
                "model": "Random Forest Regressor",
                "mae": round(mae_rf, 2),
                "rmse": round(rmse_rf, 2),
                "r2": round(r2_rf, 4)
            }
        ],
        "feature_importances": feature_importances,
        "eval_curve": eval_curve,
        "charts": chart_files
    }


# ============================================================================
# 2. CLASSIFICATION (AQI Category / Air Quality Bucket)
# ============================================================================
def train_classification(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Train Air Quality Category Classifier using raw pollutant concentrations.
    NO TARGET LEAKAGE: Never uses AQI directly as a feature when predicting AQI Bucket.
    """
    clf_df = df.copy()

    # Determine or derive target category
    if "AQI_Bucket" in clf_df.columns and clf_df["AQI_Bucket"].dropna().nunique() >= 2:
        clf_df["target_category"] = clf_df["AQI_Bucket"].astype(str).str.strip()
    elif "AQI" in clf_df.columns and not clf_df["AQI"].dropna().empty:
        clf_df["target_category"] = clf_df["AQI"].apply(derive_aqi_bucket)
    else:
        return {
            "status": "skipped",
            "reason": "Neither 'AQI_Bucket' nor 'AQI' column is available for classification labeling."
        }

    # Filter out empty or Unknown labels
    clf_df = clf_df[~clf_df["target_category"].isin(["nan", "None", "Unknown", ""])].copy()

    # Available numeric pollutant features EXCLUDING AQI to prevent data leakage
    feature_cols = [p for p in STANDARD_POLLUTANTS if p in clf_df.columns]
    if len(feature_cols) < 2:
        return {
            "status": "skipped",
            "reason": f"Insufficient pollutant features for classification ({feature_cols})."
        }

    valid_clf = clf_df.dropna(subset=["target_category"]).copy()
    # Require at least 2 distinct classes with at least 5 instances each
    class_counts = valid_clf["target_category"].value_counts()
    valid_classes = class_counts[class_counts >= 5].index.tolist()
    if len(valid_classes) < 2:
        return {
            "status": "skipped",
            "reason": "Fewer than 2 classes have sufficient records (>=5)."
        }

    valid_clf = valid_clf[valid_clf["target_category"].isin(valid_classes)].copy()
    if len(valid_clf) < 30:
        return {
            "status": "skipped",
            "reason": f"Insufficient records for classification ({len(valid_clf)} samples)."
        }

    X = valid_clf[feature_cols].copy()
    y = valid_clf["target_category"].values

    # Impute missing pollutant values
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    # Train / Test split (stratified)
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X_imputed, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(
            X_imputed, y, test_size=0.25, random_state=RANDOM_STATE
        )

    # Train Random Forest Classifier with balanced class weights
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)

    # Evaluation Metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted", zero_division=0)
    labels = sorted(list(set(y_test)))
    cm = confusion_matrix(y_test, y_pred, labels=labels).tolist()
    report = classification_report(y_test, y_pred, labels=labels, output_dict=True, zero_division=0)

    # Feature importance
    feat_imp = {f: round(float(imp), 4) for f, imp in zip(feature_cols, clf.feature_importances_)}

    # Save model
    joblib.dump({
        "model": clf,
        "imputer": imputer,
        "feature_cols": feature_cols,
        "classes": list(clf.classes_)
    }, MODELS_DIR / "classification_model.joblib")

    # Generate Confusion Matrix Chart
    chart_files = []
    try:
        plt.figure(figsize=(8, 6))
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=labels,
            yticklabels=labels,
            cbar=False,
            linewidths=0.5,
            linecolor="#1e293b"
        )
        plt.title("Air Quality Classification Confusion Matrix", fontsize=12, color="#38bdf8", pad=12)
        plt.xlabel("Predicted Category", color="#94a3b8")
        plt.ylabel("Actual Category", color="#94a3b8")
        plt.xticks(rotation=30, ha="right")
        plt.yticks(rotation=0)
        plt.tight_layout()
        chart_p = OUTPUTS_DIR / "classification_confusion_matrix.png"
        plt.savefig(chart_p, dpi=180, facecolor="#0f172a")
        plt.close()
        chart_files.append("classification_confusion_matrix.png")
    except Exception:
        plt.close()

    return {
        "status": "success",
        "model_name": "Random Forest Classifier",
        "features": feature_cols,
        "classes": labels,
        "class_distribution": {k: int(v) for k, v in valid_clf["target_category"].value_counts().items()},
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": round(acc, 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": {
            "labels": labels,
            "matrix": cm
        },
        "classification_report": report,
        "feature_importances": feat_imp,
        "charts": chart_files
    }


# ============================================================================
# 3. CLUSTERING (K-Means Pollution Pattern Discovery)
# ============================================================================
def train_clustering(df: pd.DataFrame) -> Dict[str, Any]:
    """
    K-Means clustering to discover distinct multi-pollutant environmental patterns.
    Projects clusters onto 2D PCA space for visualization and computes cluster profiles.
    """
    pollutant_cols = [p for p in STANDARD_POLLUTANTS if p in df.columns]
    if len(pollutant_cols) < 2:
        return {
            "status": "skipped",
            "reason": f"Insufficient pollutant features for clustering ({pollutant_cols})."
        }

    cluster_df = df[pollutant_cols].dropna(how="all").copy()
    if len(cluster_df) < 30:
        return {
            "status": "skipped",
            "reason": "Insufficient non-empty records for clustering."
        }

    # Impute missing values with median
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(cluster_df)

    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # Select optimal K using silhouette score over range [2, 3, 4, 5]
    best_k = 3
    best_score = -1.0
    candidate_scores = {}

    # Sample for silhouette computation if dataset is large to maintain fast response
    eval_size = min(3000, len(X_scaled))
    eval_indices = np.random.RandomState(42).choice(len(X_scaled), eval_size, replace=False)
    X_eval = X_scaled[eval_indices]

    for k in [2, 3, 4, 5]:
        if len(X_eval) > k:
            km = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
            labels = km.fit_predict(X_eval)
            score = float(silhouette_score(X_eval, labels))
            candidate_scores[k] = round(score, 3)
            if score > best_score:
                best_score = score
                best_k = k

    # Final fit on full dataset with best_k
    final_km = KMeans(n_clusters=best_k, random_state=RANDOM_STATE, n_init=10)
    all_cluster_labels = final_km.fit_predict(X_scaled)

    # Cluster profiles (unscaled mean pollutant values per cluster)
    cluster_df["cluster"] = all_cluster_labels
    cluster_profiles = []
    cluster_counts = cluster_df["cluster"].value_counts().to_dict()

    for c_id in range(best_k):
        sub_c = cluster_df[cluster_df["cluster"] == c_id]
        profile = {
            "cluster_id": int(c_id),
            "record_count": int(cluster_counts.get(c_id, 0)),
            "percentage": round(float(cluster_counts.get(c_id, 0) / len(cluster_df) * 100), 1),
            "means": {}
        }
        for col in pollutant_cols:
            val = sub_c[col].mean()
            profile["means"][col] = None if np.isnan(val) else round(float(val), 2)
        cluster_profiles.append(profile)

    # PCA 2D coordinates for visualization
    pca = PCA(n_components=2, random_state=RANDOM_STATE)
    X_pca = pca.fit_transform(X_scaled)

    # Save sample points (up to 400 points) for interactive frontend chart
    sample_points = []
    sample_size = min(400, len(X_pca))
    sample_idx = np.random.RandomState(42).choice(len(X_pca), sample_size, replace=False)
    for i in sample_idx:
        sample_points.append({
            "pca_x": round(float(X_pca[i, 0]), 2),
            "pca_y": round(float(X_pca[i, 1]), 2),
            "cluster": int(all_cluster_labels[i])
        })

    # Save artifacts
    joblib.dump({
        "model": final_km,
        "scaler": scaler,
        "imputer": imputer,
        "pca": pca,
        "feature_cols": pollutant_cols,
        "k": best_k
    }, MODELS_DIR / "clustering_model.joblib")

    # Generate PCA Scatter Chart
    chart_files = []
    try:
        plt.figure(figsize=(8, 6))
        scatter = plt.scatter(
            X_pca[sample_idx, 0],
            X_pca[sample_idx, 1],
            c=all_cluster_labels[sample_idx],
            cmap="viridis",
            alpha=0.75,
            edgecolors="none",
            s=25
        )
        plt.colorbar(scatter, label="Cluster ID")
        plt.title(f"K-Means Air Pollution Clusters (2D PCA, K={best_k})", fontsize=12, color="#38bdf8", pad=12)
        plt.xlabel("PCA Component 1", color="#94a3b8")
        plt.ylabel("PCA Component 2", color="#94a3b8")
        plt.grid(True, linestyle="--", alpha=0.25)
        plt.tight_layout()
        chart_p = OUTPUTS_DIR / "cluster_pca_scatter.png"
        plt.savefig(chart_p, dpi=180, facecolor="#0f172a")
        plt.close()
        chart_files.append("cluster_pca_scatter.png")
    except Exception:
        plt.close()

    return {
        "status": "success",
        "optimal_k": best_k,
        "features": pollutant_cols,
        "silhouette_score": round(best_score, 4),
        "candidate_scores": candidate_scores,
        "pca_variance_ratio": [round(float(v), 3) for v in pca.explained_variance_ratio_],
        "cluster_profiles": cluster_profiles,
        "sample_points": sample_points,
        "charts": chart_files
    }


# ============================================================================
# 4. ANOMALY DETECTION (Isolation Forest)
# ============================================================================
def train_anomalies(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Detect extreme or unusual environmental pollution events using Isolation Forest.
    """
    pollutant_cols = [p for p in STANDARD_POLLUTANTS if p in df.columns]
    if len(pollutant_cols) < 2:
        return {"status": "skipped", "reason": "Insufficient pollutants for anomaly detection."}

    sub_df = df.copy()
    num_data = sub_df[pollutant_cols].dropna(how="all")
    if len(num_data) < 30:
        return {"status": "skipped", "reason": "Insufficient observations for anomaly detection."}

    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(num_data)

    # 3% contamination assumed for extreme incidents
    iso = IsolationForest(contamination=0.03, random_state=RANDOM_STATE, n_jobs=-1)
    preds = iso.fit_predict(X_imputed)
    scores = iso.decision_function(X_imputed)

    # Anomaly flagged where preds == -1
    anomaly_indices = np.where(preds == -1)[0]
    total_anomalies = int(len(anomaly_indices))

    # Collect up to 25 notable anomalous records
    notable_anomalies = []
    for idx in anomaly_indices[:25]:
        row = sub_df.iloc[num_data.index[idx]]
        item = {
            "date": str(row.get("Date", "N/A"))[:10] if "Date" in row else "N/A",
            "city": str(row.get("City", "N/A")) if "City" in row else "N/A",
            "anomaly_score": round(float(scores[idx]), 3)
        }
        for p in pollutant_cols:
            val = row.get(p)
            item[p] = None if pd.isna(val) else round(float(val), 2)
        notable_anomalies.append(item)

    return {
        "status": "success",
        "total_anomalies_detected": total_anomalies,
        "contamination_rate": 0.03,
        "anomalies": notable_anomalies
    }


# ============================================================================
# FULL PIPELINE ORCHESTRATOR
# ============================================================================
def run_all_training(preferred_filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute full training pipeline for Regression, Classification, Clustering, and Anomalies.
    Saves metrics to reports/model_metrics.json and outputs/model_metrics.json.
    """
    active_path = resolve_dataset_path(preferred_filename=preferred_filename)
    if not active_path:
        return {
            "status": "error",
            "message": "Dataset not found. Please place 'city_day.csv' in 'data/' directory or upload via the web app."
        }

    df, err = load_dataset(filepath=active_path)
    if err or df is None:
        return {
            "status": "error",
            "message": err or "Failed to load dataset."
        }

    print(f"[*] Training models on dataset: {active_path.name} ({len(df)} records)")

    # Execute tasks
    reg_results = train_regression(df)
    clf_results = train_classification(df)
    cluster_results = train_clustering(df)
    anomaly_results = train_anomalies(df)

    training_summary = {
        "status": "completed",
        "dataset_name": active_path.name,
        "total_records": len(df),
        "regression": reg_results,
        "classification": clf_results,
        "clustering": cluster_results,
        "anomalies": anomaly_results
    }

    # Save to JSON
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUTS_DIR / "model_metrics.json", "w", encoding="utf-8") as f:
        json.dump(training_summary, f, indent=2)

    with open(REPORTS_DIR / "model_metrics.json", "w", encoding="utf-8") as f:
        json.dump(training_summary, f, indent=2)

    return training_summary


if __name__ == "__main__":
    print("=" * 70)
    print("AirGuard - Machine Learning Training Pipeline")
    print("=" * 70)
    res = run_all_training()
    if res.get("status") == "completed":
        print(f"[SUCCESS] Models trained successfully on: {res['dataset_name']}")
        print(f"Regression Best Model: {res['regression'].get('best_model')}")
        print(f"Classification Model: {res['classification'].get('model_name')}")
        print(f"Clustering Optimal K: {res['clustering'].get('optimal_k')}")
        print(f"Outputs written to: {OUTPUTS_DIR} and {REPORTS_DIR}")
    else:
        print(f"[STATUS] {res.get('message')}")
        print("Please ensure your CSV dataset exists in 'data/' to run model training.")
    print("=" * 70)

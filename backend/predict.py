"""
AirGuard - Inference & Prediction Service
Loads saved Scikit-Learn models to make real-time PM2.5 forecasts, AQI category
classifications, and cluster assignments based strictly on trained schemas.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "backend" / "models"


def get_model_status() -> Dict[str, Any]:
    """
    Check which trained model artifacts are available in backend/models/.
    """
    reg_path = MODELS_DIR / "regression_model.joblib"
    clf_path = MODELS_DIR / "classification_model.joblib"
    cluster_path = MODELS_DIR / "clustering_model.joblib"

    def artifact_info(path: Path) -> Dict[str, Any]:
        if not path.is_file():
            return {"trained": False, "features": [], "model_name": None}
        try:
            artifact = joblib.load(path)
            return {
                "trained": True,
                "features": artifact.get("feature_cols", []),
                "model_name": artifact.get("model_name", "Trained Estimator"),
                "classes": artifact.get("classes", [])
            }
        except Exception:
            return {"trained": False, "features": [], "model_name": None}

    return {
        "regression": artifact_info(reg_path),
        "classification": artifact_info(clf_path),
        "clustering": artifact_info(cluster_path)
    }


def predict_pm25(inputs: Dict[str, float]) -> Dict[str, Any]:
    """
    Predict next PM2.5 concentration using the saved regression model.
    Enforces exact feature order and applies saved preprocessing imputer.
    """
    reg_path = MODELS_DIR / "regression_model.joblib"
    if not reg_path.is_file():
        raise FileNotFoundError("Regression model has not been trained yet. Please run model training first.")

    artifact = joblib.load(reg_path)
    model = artifact["model"]
    imputer = artifact["imputer"]
    feature_cols = artifact["feature_cols"]
    model_name = artifact.get("model_name", "Random Forest Regressor")

    # Construct input vector in exact schema order
    raw_vector = []
    missing_features = []
    for f in feature_cols:
        val = inputs.get(f)
        if val is None or val == "":
            raw_vector.append(np.nan)
            missing_features.append(f)
        else:
            try:
                raw_vector.append(float(val))
            except (ValueError, TypeError):
                raw_vector.append(np.nan)
                missing_features.append(f)

    # Impute missing features using the trained imputer with proper column names
    input_df = pd.DataFrame([raw_vector], columns=feature_cols)
    X_imputed = imputer.transform(input_df)
    pred_val = float(model.predict(X_imputed)[0])
    pred_val = max(0.0, round(pred_val, 2))  # Concentrations cannot be negative

    return {
        "predicted_pm25": pred_val,
        "unit": "µg/m³",
        "horizon": "Next observation / Next day",
        "model_name": model_name,
        "features_used": feature_cols,
        "imputed_features": missing_features,
        "disclaimer": "Predictions are algorithmic estimates generated for academic and research purposes, not official environmental measurements."
    }


def classify_aqi(inputs: Dict[str, float]) -> Dict[str, Any]:
    """
    Predict Air Quality Category using the saved classification model.
    Input features are raw pollutant measurements without AQI.
    """
    clf_path = MODELS_DIR / "classification_model.joblib"
    if not clf_path.is_file():
        raise FileNotFoundError("Classification model has not been trained yet. Please run model training first.")

    artifact = joblib.load(clf_path)
    model = artifact["model"]
    imputer = artifact["imputer"]
    feature_cols = artifact["feature_cols"]
    classes = artifact.get("classes", list(model.classes_))

    # Construct feature vector
    raw_vector = []
    for f in feature_cols:
        val = inputs.get(f)
        if val is None or val == "":
            raw_vector.append(np.nan)
        else:
            try:
                raw_vector.append(float(val))
            except (ValueError, TypeError):
                raw_vector.append(np.nan)

    input_df = pd.DataFrame([raw_vector], columns=feature_cols)
    X_imputed = imputer.transform(input_df)
    pred_class = str(model.predict(X_imputed)[0])

    probabilities = {}
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_imputed)[0]
        for c, p in zip(model.classes_, probs):
            probabilities[str(c)] = round(float(p) * 100, 1)

    return {
        "predicted_category": pred_class,
        "probabilities": probabilities,
        "classes": [str(c) for c in classes],
        "features_used": feature_cols,
        "disclaimer": "Air quality category prediction is an algorithmic evaluation derived from pollutant concentrations."
    }

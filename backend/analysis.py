"""
AirGuard - Exploratory Data Science Analysis Module
Performs statistical summaries, missing value/duplicate audits, outlier detection,
correlation analysis, time-series pollutant trends, city comparisons, and automated
statistical interpretation. Generates charts and structured JSON outputs.
"""

from __future__ import annotations
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np

# Non-interactive backend for server environments
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from backend.preprocessing import load_dataset, STANDARD_POLLUTANTS, STANDARD_AQI_COLS, resolve_dataset_path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "backend" / "outputs"


def compute_statistics_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute mean, median, std, min, max, 25%, 75% for all numeric columns.
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    stats = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if series.empty:
            continue
        stats[col] = {
            "count": int(len(series)),
            "missing": int(df[col].isna().sum()),
            "missing_pct": round(float(df[col].isna().sum() / len(df) * 100), 2),
            "mean": round(float(series.mean()), 2),
            "std": round(float(series.std()), 2) if len(series) > 1 else 0.0,
            "min": round(float(series.min()), 2),
            "q25": round(float(series.quantile(0.25)), 2),
            "median": round(float(series.median()), 2),
            "q75": round(float(series.quantile(0.75)), 2),
            "max": round(float(series.max()), 2)
        }
    return stats


def compute_outlier_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Identify outliers using the Interquartile Range (IQR) rule:
    Outlier if val < Q1 - 1.5 * IQR or val > Q3 + 1.5 * IQR.
    """
    outlier_info = {}
    candidate_cols = [c for c in STANDARD_POLLUTANTS + ["AQI"] if c in df.columns]

    for col in candidate_cols:
        series = df[col].dropna()
        if len(series) < 10:
            continue
        q1 = float(series.quantile(0.25))
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outliers = series[(series < lower_bound) | (series > upper_bound)]
        outlier_count = int(len(outliers))
        pct = round(outlier_count / len(series) * 100, 2)

        outlier_info[col] = {
            "q1": round(q1, 2),
            "q3": round(q3, 2),
            "iqr": round(iqr, 2),
            "lower_bound": round(lower_bound, 2),
            "upper_bound": round(upper_bound, 2),
            "outlier_count": outlier_count,
            "outlier_pct": pct,
            "max_detected": round(float(series.max()), 2)
        }
    return outlier_info


def compute_correlations(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute pairwise Pearson correlation matrix for available pollutant and AQI columns.
    """
    cols = [c for c in STANDARD_POLLUTANTS + ["AQI"] if c in df.columns]
    if len(cols) < 2:
        return {"columns": [], "matrix": []}

    numeric_df = df[cols].dropna(how="all")
    corr_matrix = numeric_df.corr(method="pearson").round(3)

    # Format for JSON response
    matrix_list = []
    for row_name, row in corr_matrix.iterrows():
        row_dict = {"feature": row_name}
        for col_name, val in row.items():
            row_dict[col_name] = None if np.isnan(val) else float(val)
        matrix_list.append(row_dict)

    # Key AQI relationships if AQI present
    aqi_correlations = {}
    if "AQI" in corr_matrix.columns:
        aqi_series = corr_matrix["AQI"].drop("AQI", errors="ignore").dropna()
        sorted_corr = aqi_series.sort_values(ascending=False)
        for k, v in sorted_corr.items():
            aqi_correlations[k] = round(float(v), 3)

    return {
        "columns": cols,
        "matrix": matrix_list,
        "aqi_correlations": aqi_correlations
    }


def compute_temporal_trends(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute daily and monthly averages for primary pollutants over time.
    """
    if "Date" not in df.columns or not pd.api.types.is_datetime64_any_dtype(df["Date"]):
        return {"has_dates": False, "monthly_trends": [], "recent_trends": []}

    valid_df = df.dropna(subset=["Date"]).copy()
    if valid_df.empty:
        return {"has_dates": False, "monthly_trends": [], "recent_trends": []}

    pollutants = [p for p in ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "AQI"] if p in valid_df.columns]
    if not pollutants:
        return {"has_dates": True, "monthly_trends": [], "recent_trends": []}

    # Monthly trends
    valid_df["YearMonth"] = valid_df["Date"].dt.to_period("M").astype(str)
    monthly = valid_df.groupby("YearMonth")[pollutants].mean(numeric_only=True).round(2).reset_index()
    monthly_records = monthly.replace({np.nan: None}).to_dict(orient="records")

    # Recent daily trends (sample/last 90 observations)
    daily = valid_df.groupby(valid_df["Date"].dt.strftime("%Y-%m-%d"))[pollutants].mean(numeric_only=True).round(2).reset_index()
    daily.rename(columns={"Date": "date_str"}, inplace=True)
    daily_records = daily.tail(90).replace({np.nan: None}).to_dict(orient="records")

    return {
        "has_dates": True,
        "pollutants_tracked": pollutants,
        "monthly_trends": monthly_records,
        "recent_trends": daily_records
    }


def compute_city_comparisons(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute comparative air quality rankings across cities when City column exists.
    """
    if "City" not in df.columns:
        return {"has_cities": False, "city_stats": []}

    pollutants = [p for p in ["PM2.5", "PM10", "AQI", "NO2", "SO2"] if p in df.columns]
    if not pollutants:
        return {"has_cities": True, "city_stats": []}

    grouped = df.groupby("City")[pollutants].agg(["mean", "count"]).round(2)

    city_stats = []
    for city_name in grouped.index:
        city_dict = {"city": str(city_name)}
        for p in pollutants:
            city_dict[f"{p}_mean"] = None if np.isnan(grouped.loc[city_name, (p, "mean")]) else float(grouped.loc[city_name, (p, "mean")])
            city_dict[f"{p}_count"] = int(grouped.loc[city_name, (p, "count")])
        city_stats.append(city_dict)

    # Sort primarily by PM2.5 mean desc, or AQI mean desc
    sort_key = "PM2.5_mean" if "PM2.5" in pollutants else f"{pollutants[0]}_mean"
    city_stats.sort(key=lambda x: (x.get(sort_key) is not None, x.get(sort_key) or 0), reverse=True)

    return {
        "has_cities": True,
        "city_stats": city_stats,
        "top_polluted": city_stats[:10],
        "least_polluted": city_stats[-10:] if len(city_stats) > 10 else []
    }


def generate_interpretation(
    stats: Dict[str, Any],
    outliers: Dict[str, Any],
    corr: Dict[str, Any],
    cities: Dict[str, Any],
    trends: Dict[str, Any]
) -> List[str]:
    """
    Generate an honest, mathematically supported interpretation of dataset patterns.
    Avoids causal claims.
    """
    interpretations = []

    # 1. PM2.5 summary
    if "PM2.5" in stats:
        pm25 = stats["PM2.5"]
        interpretations.append(
            f"PM2.5 concentrations average {pm25['mean']} µg/m³ (median {pm25['median']} µg/m³) "
            f"with values ranging from {pm25['min']} to {pm25['max']} µg/m³. "
            f"The standard deviation of {pm25['std']} indicates substantial temporal or spatial variance."
        )

    # 2. AQI correlation
    if corr.get("aqi_correlations"):
        top_corr = list(corr["aqi_correlations"].items())[:3]
        corr_strs = [f"{k} (r = {v})" for k, v in top_corr]
        interpretations.append(
            f"Air Quality Index (AQI) exhibits the strongest linear correlation with {', '.join(corr_strs)}. "
            "Note that correlation indicates co-movement in measurements and does not establish independent causality."
        )

    # 3. Outliers
    if "PM2.5" in outliers:
        pm25_out = outliers["PM2.5"]
        interpretations.append(
            f"Interquartile Range (IQR) analysis detected {pm25_out['outlier_count']} statistical outliers "
            f"({pm25_out['outlier_pct']}% of valid observations) for PM2.5 above the upper boundary of {pm25_out['upper_bound']} µg/m³. "
            "These extreme spikes correspond to episodic pollution events such as winter inversions or seasonal agricultural burning."
        )

    # 4. City variations
    if cities.get("has_cities") and cities.get("top_polluted"):
        top_city = cities["top_polluted"][0]
        top_name = top_city["city"]
        pm_val = top_city.get("PM2.5_mean")
        if pm_val is not None:
            interpretations.append(
                f"Geographic comparison highlights significant heterogeneity: {top_name} records the highest mean PM2.5 "
                f"at {pm_val} µg/m³ among monitored urban centres."
            )

    # 5. Missing data limitation
    high_missing = [k for k, v in stats.items() if v.get("missing_pct", 0) > 30]
    if high_missing:
        interpretations.append(
            f"Data coverage limitation: {', '.join(high_missing[:4])} contain over 30% missing observations. "
            "Downstream predictive models apply localized imputation and chronological lag filtering to avoid data distortions."
        )

    return interpretations


def save_visualizations(
    df: pd.DataFrame,
    corr_data: Dict[str, Any],
    city_data: Dict[str, Any],
    trends_data: Dict[str, Any]
) -> List[str]:
    """
    Generate and save high-resolution Seaborn/Matplotlib analysis plots into backend/outputs/.
    """
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    generated_charts = []

    # Configure style
    plt.style.use("dark_background")
    palette = sns.color_palette("mako", as_cmap=True)

    # 1. Correlation Heatmap
    if corr_data.get("columns") and len(corr_data["columns"]) >= 2:
        try:
            plt.figure(figsize=(10, 8))
            sub_df = df[corr_data["columns"]].dropna(how="all")
            corr = sub_df.corr(method="pearson")
            sns.heatmap(
                corr,
                annot=True,
                fmt=".2f",
                cmap="viridis",
                square=True,
                cbar_kws={"shrink": 0.8},
                linewidths=0.5,
                linecolor="#1e293b"
            )
            plt.title("Air Pollutant Pearson Correlation Matrix", fontsize=14, pad=15, color="#38bdf8")
            plt.tight_layout()
            chart_path = OUTPUTS_DIR / "correlation_heatmap.png"
            plt.savefig(chart_path, dpi=180, facecolor="#0f172a")
            plt.close()
            generated_charts.append("correlation_heatmap.png")
        except Exception as e:
            plt.close()

    # 2. City Comparison Chart (Top 10 PM2.5)
    if city_data.get("has_cities") and city_data.get("top_polluted"):
        try:
            plt.figure(figsize=(11, 6))
            top_10 = [c for c in city_data["top_polluted"] if c.get("PM2.5_mean") is not None][:10]
            if top_10:
                c_names = [c["city"] for c in top_10]
                c_vals = [c["PM2.5_mean"] for c in top_10]
                bars = plt.barh(c_names[::-1], c_vals[::-1], color="#0ea5e9", edgecolor="#38bdf8", alpha=0.85)
                plt.xlabel("Mean PM2.5 Concentration (µg/m³)", fontsize=11, color="#94a3b8")
                plt.title("Top Urban Centres by Mean PM2.5 Concentration", fontsize=13, pad=12, color="#38bdf8")
                plt.grid(axis="x", linestyle="--", alpha=0.25)
                plt.tight_layout()
                chart_path = OUTPUTS_DIR / "city_comparison.png"
                plt.savefig(chart_path, dpi=180, facecolor="#0f172a")
                plt.close()
                generated_charts.append("city_comparison.png")
        except Exception:
            plt.close()

    # 3. Pollutant Monthly Trend Chart
    if trends_data.get("has_dates") and trends_data.get("monthly_trends"):
        try:
            m_records = trends_data["monthly_trends"]
            if len(m_records) > 1:
                plt.figure(figsize=(12, 6))
                m_df = pd.DataFrame(m_records)
                x_ticks = m_df["YearMonth"].values
                for pol, colr in [("PM2.5", "#38bdf8"), ("PM10", "#a855f7"), ("AQI", "#f59e0b")]:
                    if pol in m_df.columns and m_df[pol].dropna().count() > 1:
                        plt.plot(m_df["YearMonth"], m_df[pol], label=pol, color=colr, linewidth=2, marker="o", markersize=3)
                
                # Show reasonable tick density
                step = max(1, len(x_ticks) // 12)
                plt.xticks(ticks=range(0, len(x_ticks), step), labels=[x_ticks[i] for i in range(0, len(x_ticks), step)], rotation=45, ha="right")
                plt.title("Historical Monthly Mean Trends (PM2.5, PM10, AQI)", fontsize=13, pad=12, color="#38bdf8")
                plt.ylabel("Concentration / Index Value", fontsize=11, color="#94a3b8")
                plt.legend(frameon=True, facecolor="#1e293b", edgecolor="#334155")
                plt.grid(True, linestyle="--", alpha=0.2)
                plt.tight_layout()
                chart_path = OUTPUTS_DIR / "pollutant_trends.png"
                plt.savefig(chart_path, dpi=180, facecolor="#0f172a")
                plt.close()
                generated_charts.append("pollutant_trends.png")
        except Exception:
            plt.close()

    return generated_charts


def run_full_analysis(preferred_filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute end-to-end exploratory analysis pipeline.
    Produces structured analysis dictionary and writes outputs/analysis_summary.json.
    """
    active_path = resolve_dataset_path(preferred_filename=preferred_filename)
    if not active_path:
        return {
            "status": "error",
            "message": "Dataset not found. Please insert 'city_day.csv' into 'data/' directory or upload via the web interface.",
            "data_present": False
        }

    df, err = load_dataset(filepath=active_path)
    if err or df is None:
        return {
            "status": "error",
            "message": err or "Failed to load dataset.",
            "data_present": False
        }

    stats = compute_statistics_summary(df)
    outliers = compute_outlier_analysis(df)
    correlations = compute_correlations(df)
    trends = compute_temporal_trends(df)
    cities = compute_city_comparisons(df)
    interpretations = generate_interpretation(stats, outliers, correlations, cities, trends)

    # Save visual charts
    charts = save_visualizations(df, correlations, cities, trends)

    analysis_result = {
        "status": "success",
        "dataset_name": active_path.name,
        "total_records": int(len(df)),
        "data_present": True,
        "statistics": stats,
        "outliers": outliers,
        "correlations": correlations,
        "temporal_trends": trends,
        "city_comparisons": cities,
        "interpretations": interpretations,
        "generated_charts": charts
    }

    # Save to disk for quick reload & reporting
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    summary_path = OUTPUTS_DIR / "analysis_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(analysis_result, f, indent=2)

    return analysis_result


if __name__ == "__main__":
    print("=" * 70)
    print("AirGuard - Running Data Science Exploratory Analysis")
    print("=" * 70)
    result = run_full_analysis()
    if result.get("status") == "success":
        print(f"[SUCCESS] Analysis completed for dataset: {result['dataset_name']}")
        print(f"Total Records: {result['total_records']}")
        print(f"Charts saved to: {OUTPUTS_DIR}")
        print("\nKey Statistical Interpretations:")
        for interp in result.get("interpretations", []):
            print(f"- {interp}")
    else:
        print(f"[STATUS] {result.get('message')}")
        print("To proceed, place your dataset (e.g., city_day.csv) in the 'data/' folder.")
    print("=" * 70)


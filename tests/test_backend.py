"""
AirGuard - Automated Backend & ML Unit Tests
Tests preprocessing, dataset discovery, endpoint responses, error handling,
and ML training pipeline logic.
"""

import os
from pathlib import Path
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app
from backend.preprocessing import (
    standardize_columns,
    get_dataset_summary_dict,
    list_csv_files,
    resolve_dataset_path
)
from backend.train_models import (
    derive_aqi_bucket,
    train_regression,
    train_classification,
    train_clustering,
    train_anomalies
)

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "dataset_ready" in data
    assert "models" in data


def test_dataset_status_endpoint():
    response = client.get("/api/dataset/status")
    assert response.status_code == 200
    data = response.json()
    assert "dataset_present" in data
    assert "available_files" in data
    assert "setup_instruction" in data


def test_standardize_columns():
    df = pd.DataFrame({
        " pm2.5 ": [10, 20],
        "CITY": ["Delhi", "Mumbai"],
        "date": ["2023-01-01", "2023-01-02"],
        "AQI BUCKET": ["Good", "Moderate"],
        "Custom_Sensor": [1.2, 3.4]
    })
    cleaned = standardize_columns(df)
    assert "PM2.5" in cleaned.columns
    assert "City" in cleaned.columns
    assert "Date" in cleaned.columns
    assert "AQI_Bucket" in cleaned.columns
    assert "Custom_Sensor" in cleaned.columns


def test_derive_aqi_bucket():
    assert derive_aqi_bucket(30) == "Good"
    assert derive_aqi_bucket(75) == "Satisfactory"
    assert derive_aqi_bucket(150) == "Moderate"
    assert derive_aqi_bucket(250) == "Poor"
    assert derive_aqi_bucket(350) == "Very Poor"
    assert derive_aqi_bucket(450) == "Severe"
    assert derive_aqi_bucket(np.nan) == "Unknown"


def test_predict_endpoint_untrained():
    response = client.post("/api/predict", json={"features": {"PM2.5": 45.0}})
    # If not trained yet, should return 404
    assert response.status_code in [404, 200]


def test_classify_endpoint_untrained():
    response = client.post("/api/classify", json={"features": {"PM2.5": 45.0, "PM10": 90.0}})
    # If not trained yet, should return 404
    assert response.status_code in [404, 200]


def test_upload_invalid_extension():
    response = client.post(
        "/api/dataset/upload",
        files={"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    )
    assert response.status_code == 400


def test_ml_pipelines_on_synthetic_data(tmp_path):
    """
    Test that the training functions run properly and return structured metrics
    when provided with a clean synthetic DataFrame.
    """
    dates = pd.date_range("2023-01-01", periods=100)
    synthetic_df = pd.DataFrame({
        "Date": dates,
        "City": ["TestCity"] * 100,
        "PM2.5": np.random.uniform(15, 120, size=100),
        "PM10": np.random.uniform(30, 250, size=100),
        "NO2": np.random.uniform(5, 50, size=100),
        "SO2": np.random.uniform(2, 30, size=100),
        "CO": np.random.uniform(0.5, 4.0, size=100),
        "AQI": np.random.uniform(40, 280, size=100)
    })
    synthetic_df["AQI_Bucket"] = synthetic_df["AQI"].apply(derive_aqi_bucket)

    # 1. Test Regression
    reg_res = train_regression(synthetic_df)
    assert reg_res["status"] == "success"
    assert "models_comparison" in reg_res
    assert len(reg_res["models_comparison"]) == 2
    for m in reg_res["models_comparison"]:
        assert "mae" in m and "rmse" in m and "r2" in m

    # 2. Test Classification
    clf_res = train_classification(synthetic_df)
    assert clf_res["status"] == "success"
    assert "accuracy" in clf_res
    assert clf_res["accuracy"] >= 0.0

    # 3. Test Clustering
    cluster_res = train_clustering(synthetic_df)
    assert cluster_res["status"] == "success"
    assert cluster_res["optimal_k"] in [2, 3, 4, 5]
    assert len(cluster_res["cluster_profiles"]) == cluster_res["optimal_k"]

    # 4. Test Anomalies
    ano_res = train_anomalies(synthetic_df)
    assert ano_res["status"] == "success"
    assert "total_anomalies_detected" in ano_res


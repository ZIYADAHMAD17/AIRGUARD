"""
AirGuard - FastAPI Backend REST API
Serves dataset status, data exploration, analysis summaries, model training,
real-time regression predictions, and air quality classification endpoints.
"""

from __future__ import annotations
import os
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException, UploadFile, File, Query, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.preprocessing import (
    list_csv_files,
    resolve_dataset_path,
    load_dataset,
    get_dataset_summary_dict,
    get_paginated_readings,
    save_uploaded_csv,
    set_active_dataset_filename,
    get_active_dataset_filename,
    DATA_DIR
)
from backend.analysis import run_full_analysis
from backend.train_models import run_all_training
from backend.predict import get_model_status, predict_pm25, classify_aqi

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AirGuard")

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "backend" / "outputs"
REPORTS_DIR = BASE_DIR / "reports"

app = FastAPI(
    title="AirGuard API",
    description="Air Pollution Monitoring & Predictive Analytics REST API",
    version="1.0.0"
)

# Configurable CORS
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount outputs static files for serving generated chart images
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================
class SelectDatasetRequest(BaseModel):
    filename: str = Field(..., description="Target CSV filename in data directory")


class PredictPM25Request(BaseModel):
    features: Dict[str, float] = Field(..., description="Feature map for regression model")


class ClassifyAQIRequest(BaseModel):
    features: Dict[str, float] = Field(..., description="Pollutant measurements for air quality classification")


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/api/health")
def get_health() -> Dict[str, Any]:
    """
    Health check and high-level system readiness report.
    """
    active_path = resolve_dataset_path()
    model_status = get_model_status()
    return {
        "status": "healthy",
        "service": "AirGuard Environmental Analytics API",
        "dataset_ready": active_path is not None and active_path.is_file(),
        "active_dataset": active_path.name if active_path else None,
        "models": {
            "regression_trained": model_status["regression"]["trained"],
            "classification_trained": model_status["classification"]["trained"],
            "clustering_trained": model_status["clustering"]["trained"]
        }
    }


@app.get("/api/dataset/status")
def get_dataset_status() -> Dict[str, Any]:
    """
    Return dataset availability, active dataset name, and all detected CSV files.
    """
    files = list_csv_files(DATA_DIR)
    active_path = resolve_dataset_path()
    return {
        "dataset_present": active_path is not None and active_path.is_file(),
        "active_filename": active_path.name if active_path else None,
        "available_files": files,
        "data_directory": str(DATA_DIR),
        "setup_instruction": (
            "Place your CSV file (e.g. city_day.csv) in the 'data/' directory "
            "or use the web upload interface to activate real data analytics."
        )
    }


@app.post("/api/dataset/select")
def select_dataset(payload: SelectDatasetRequest) -> Dict[str, Any]:
    """
    Switch active dataset to a specific CSV file in data/.
    """
    target = DATA_DIR / payload.filename
    if not target.is_file():
        raise HTTPException(status_code=404, detail=f"Dataset file '{payload.filename}' not found in data/.")

    set_active_dataset_filename(payload.filename)
    return {
        "status": "success",
        "message": f"Active dataset set to '{payload.filename}'",
        "active_filename": payload.filename
    }


@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Safely upload a CSV dataset to the data directory.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .csv extension."
        )

    try:
        content = await file.read()
        success, message, saved_name = save_uploaded_csv(content, file.filename, DATA_DIR)
        if not success:
            raise HTTPException(status_code=400, detail=message)

        return {
            "status": "success",
            "message": message,
            "filename": saved_name
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")


@app.get("/api/summary")
def get_summary() -> Dict[str, Any]:
    """
    Get detailed dataset schema, statistics, row/col counts, and missing value audit.
    """
    active_path = resolve_dataset_path()
    if not active_path:
        raise HTTPException(
            status_code=404,
            detail="No dataset available. Please place 'city_day.csv' in 'data/' or upload via the web app."
        )

    df, err = load_dataset(filepath=active_path)
    if err or df is None:
        raise HTTPException(status_code=400, detail=err or "Error loading dataset.")

    summary = get_dataset_summary_dict(df, active_path.name)
    return summary


@app.get("/api/cities")
def get_cities() -> Dict[str, Any]:
    """
    List distinct cities present in the active dataset.
    """
    active_path = resolve_dataset_path()
    if not active_path:
        return {"has_cities": False, "cities": []}

    df, err = load_dataset(filepath=active_path)
    if err or df is None or "City" not in df.columns:
        return {"has_cities": False, "cities": []}

    cities = sorted([str(c) for c in df["City"].dropna().unique() if str(c).strip()])
    return {
        "has_cities": True,
        "count": len(cities),
        "cities": cities
    }


@app.get("/api/readings")
def get_readings(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    city: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(True)
) -> Dict[str, Any]:
    """
    Filter, sort, and paginate observations from the active dataset.
    """
    active_path = resolve_dataset_path()
    if not active_path:
        raise HTTPException(status_code=404, detail="Dataset not found. Please upload or provide a CSV.")

    df, err = load_dataset(filepath=active_path)
    if err or df is None:
        raise HTTPException(status_code=400, detail=err or "Failed to load observations.")

    return get_paginated_readings(
        df=df,
        page=page,
        page_size=page_size,
        city=city,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_desc=sort_desc
    )


@app.get("/api/analysis")
def get_analysis() -> Dict[str, Any]:
    """
    Retrieve or compute exploratory analysis results, trends, and correlations.
    """
    summary_file = OUTPUTS_DIR / "analysis_summary.json"
    if summary_file.is_file():
        try:
            with open(summary_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                active_path = resolve_dataset_path()
                if active_path and data.get("dataset_name") == active_path.name:
                    return data
        except Exception:
            pass

    # Compute on the fly if not yet cached or if dataset changed
    result = run_full_analysis()
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result


@app.get("/api/model-metrics")
def get_model_metrics() -> Dict[str, Any]:
    """
    Retrieve model evaluation metrics from saved reports.
    """
    metrics_path = OUTPUTS_DIR / "model_metrics.json"
    if not metrics_path.is_file():
        metrics_path = REPORTS_DIR / "model_metrics.json"

    if not metrics_path.is_file():
        active_path = resolve_dataset_path()
        return {
            "status": "untrained",
            "message": "Models have not been trained yet. Trigger model training via the dashboard or CLI.",
            "dataset_present": active_path is not None and active_path.is_file(),
            "regression": None,
            "classification": None,
            "clustering": None,
            "anomalies": None
        }

    try:
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model metrics: {str(e)}")


@app.post("/api/train")
def train_models_endpoint() -> Dict[str, Any]:
    """
    Trigger the machine learning training pipeline.
    """
    active_path = resolve_dataset_path()
    if not active_path:
        raise HTTPException(
            status_code=400,
            detail="Cannot train models: No CSV dataset found in 'data/' directory. Please upload one first."
        )

    logger.info(f"Triggering model training on {active_path.name}...")
    res = run_all_training()
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))

    # Also refresh exploratory analysis
    try:
        run_full_analysis()
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Model training completed successfully.",
        "summary": res
    }


@app.post("/api/predict")
def predict_pm25_endpoint(payload: PredictPM25Request) -> Dict[str, Any]:
    """
    Predict next PM2.5 concentration using the trained regression model.
    """
    try:
        result = predict_pm25(payload.features)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")


@app.post("/api/classify")
def classify_aqi_endpoint(payload: ClassifyAQIRequest) -> Dict[str, Any]:
    """
    Predict AQI Category using the trained classifier without target leakage.
    """
    try:
        result = classify_aqi(payload.features)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Classification error: {str(e)}")


@app.get("/api/clusters")
def get_clusters() -> Dict[str, Any]:
    """
    Get clustering profiles and 2D PCA visualization samples.
    """
    metrics_path = OUTPUTS_DIR / "model_metrics.json"
    if not metrics_path.is_file():
        metrics_path = REPORTS_DIR / "model_metrics.json"

    if not metrics_path.is_file():
        raise HTTPException(status_code=404, detail="Clustering model has not been trained yet.")

    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    clustering = data.get("clustering")
    if not clustering or clustering.get("status") != "success":
        raise HTTPException(status_code=404, detail="Clustering was not performed or failed on the dataset.")

    return clustering


@app.get("/api/anomalies")
def get_anomalies() -> Dict[str, Any]:
    """
    Get detected pollution anomaly events.
    """
    metrics_path = OUTPUTS_DIR / "model_metrics.json"
    if not metrics_path.is_file():
        metrics_path = REPORTS_DIR / "model_metrics.json"

    if not metrics_path.is_file():
        raise HTTPException(status_code=404, detail="Anomaly detection model has not been trained yet.")

    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    anomalies = data.get("anomalies")
    if not anomalies or anomalies.get("status") != "success":
        raise HTTPException(status_code=404, detail="Anomaly detection not available.")

    return anomalies


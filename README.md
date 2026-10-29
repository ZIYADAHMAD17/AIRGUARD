# AirGuard — Air Pollution Monitoring & Predictive Analytics System

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4+-orange.svg)](https://scikit-learn.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An end-to-end data science and machine learning application that analyzes historical air pollution dynamics, audits missing sensor data, trains chronological forecasting models for PM2.5 concentrations, classifies air quality health categories without data leakage, and discovers multi-pollutant environmental patterns.

Designed for the **Essentials of Data Science** college curriculum.

---

## 🌟 Key Features

1. **Robust Dataset Discovery & Validation**
   - Automatically detects CSV files in the `data/` directory (default: `city_day.csv`).
   - Browser-based CSV uploader supporting multi-dataset switching.
   - Preserves raw data intact, standardizing column aliases (`PM2.5`, `PM10`, `NO2`, `SO2`, `CO`, `O3`, `AQI`, `AQI_Bucket`) without fabricating missing observations.

2. **Exploratory Data Science Analysis (`backend/analysis.py`)**
   - Parametric and non-parametric statistics (mean, median, standard deviation, quartiles, IQR outliers).
   - High-resolution Pearson correlation matrix and heatmaps.
   - Historical time-series trends (daily and monthly aggregated levels).
   - Top-10 polluted urban centre rankings.
   - Automated, mathematically supported textual interpretations.

3. **Strict Machine Learning Pipelines (`backend/train_models.py`)**
   - **Regression (Future PM2.5 Forecast):** Chronological 80/20 train-test split (avoids future-to-past leakage). Compares Ordinary Least Squares (OLS) Linear Regression baseline against Random Forest Regressor using engineered lag terms (`PM2.5_lag1`, `PM2.5_lag2`, rolling 3-day mean).
   - **Classification (Air Quality Bucket):** Random Forest Classifier predicting health categories (`Good`, `Satisfactory`, `Moderate`, `Poor`, `Very Poor`, `Severe`). **Zero Target Leakage:** strictly excludes AQI from predictors.
   - **Clustering (Environmental Regimes):** Unsupervised K-Means clustering on standardized pollutant space with silhouette score optimization (K=2 to 5) and 2D Principal Component Analysis (PCA) projection.
   - **Anomaly Detection:** Isolation Forest flagging multivariate statistical outliers for environmental investigation.

4. **FastAPI REST API (`backend/main.py`)**
   - Comprehensive endpoints for telemetry, data filtering, pagination, real-time predictions, and training orchestration with interactive Swagger UI docs.

5. **Modern Analytics Web Dashboard (`frontend/`)**
   - High-contrast dark theme (#0B1120 navy, cyan and teal accents).
   - Interactive Recharts line, bar, scatter, and histogram visualizations.
   - Empty-state setup guides when dataset is awaiting upload.
   - Form pre-fill helpers with dataset averages.

---

## 📁 Project Folder Structure

```text
DATASCIENCE PROJ/
│
├── data/                       # CSV storage folder
│   ├── .gitkeep
│   └── city_day.csv            # Place your air pollution CSV here
│
├── backend/                    # Python FastAPI & Machine Learning
│   ├── __init__.py
│   ├── preprocessing.py        # Dataset discovery, cleaning, pagination
│   ├── analysis.py             # Statistical summaries & visualizations
│   ├── train_models.py         # Regression, Classification, Clustering, Anomalies
│   ├── predict.py              # Inference service & model loading
│   ├── main.py                 # FastAPI REST API routes
│   ├── requirements.txt        # Backend dependencies
│   ├── models/                 # Serialized Joblib model artifacts (.joblib)
│   └── outputs/                # Generated charts & analysis JSON summaries
│
├── frontend/                   # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # Navbar, MetricCard, EmptyDatasetState, UploadModal
│   │   ├── pages/              # 7 Pages (Overview, Explorer, Predict, Classify, Patterns, Evaluation, About)
│   │   ├── api.ts              # REST client service
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── App.tsx             # Main application orchestrator
│   │   └── main.tsx            # React root mount
│   ├── package.json
│   ├── vite.config.ts          # Vite proxy & Tailwind setup
│   └── tsconfig.json
│
├── reports/                    # Persisted model evaluation JSON summaries
│   └── model_metrics.json
│
├── tests/                      # Automated unit tests
│   └── test_backend.py         # Pytest test suite
│
├── .gitignore                  # Git exclusion rules
├── .env.example                # Environment variable reference
├── requirements.txt            # Root Python dependencies
├── start_backend.bat           # Windows 1-click backend launcher
├── start_frontend.bat          # Windows 1-click frontend launcher
├── run_all.bat                 # Windows 1-click full stack launcher
├── PROJECT_REPORT.md           # Formal academic report
├── VIVA_QUESTIONS.md           # 25+ viva voce questions & model answers
└── README.md                   # System documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python:** 3.10+ (Tested on Python 3.12)
- **Node.js:** v18+ (Tested on Node v24)
- **Git** (optional)

### 1. Insert Your Dataset
Insert your air quality CSV (e.g. `city_day.csv` from Kaggle/CPCB) into:
```text
data/city_day.csv
```
*(Alternatively, leave it empty and upload the CSV directly via the web dashboard).*

### 2. Python Backend Setup
From the project root:

```powershell
# Optional: Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate      # On Windows
# source .venv/bin/activate # On macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Run Automated Tests
Verify all preprocessing and ML pipelines:
```powershell
python -m pytest tests/test_backend.py -v
```

### 4. Run Analysis & Model Training
Execute the standalone exploratory and training workflows:
```powershell
# Run exploratory data analysis (generates charts in backend/outputs/)
python -m backend.analysis

# Train regression, classification, clustering, and anomaly models
python -m backend.train_models
```

### 5. Launch Backend Server
```powershell
uvicorn backend.main:app --reload --port 8000
```
- API Base: `http://127.0.0.1:8000`
- Swagger Interactive Docs: `http://127.0.0.1:8000/docs`

### 6. Launch Frontend Dashboard
In a new terminal window:
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🪟 Windows 1-Click Launchers

For convenience during viva presentations and testing on Windows:
- Double-click **`run_all.bat`** to start both the FastAPI backend and React frontend concurrently.
- Or use **`start_backend.bat`** and **`start_frontend.bat`** individually.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service status, dataset readiness, and trained models report |
| `GET` | `/api/dataset/status` | List available CSVs, active dataset, and directory path |
| `POST` | `/api/dataset/select` | Switch active dataset to a specific file in `data/` |
| `POST` | `/api/dataset/upload` | Securely upload and validate a new CSV dataset |
| `GET` | `/api/summary` | Real statistical summary, columns schema, and null audit |
| `GET` | `/api/cities` | List distinct monitored cities in active dataset |
| `GET` | `/api/readings` | Filtered, sorted, and paginated observations |
| `GET` | `/api/analysis` | Computed trends, correlations, outliers, and interpretations |
| `GET` | `/api/model-metrics`| Real evaluation metrics (MAE, RMSE, R², Accuracy, Confusion Matrix) |
| `POST` | `/api/train` | Execute the ML training workflow safely |
| `POST` | `/api/predict` | Real-time future PM2.5 forecasting |
| `POST` | `/api/classify` | Predict AQI category without data leakage |
| `GET` | `/api/clusters` | K-Means cluster profiles and 2D PCA coordinates |
| `GET` | `/api/anomalies` | Isolation Forest multivariate anomaly records |

---

## 📊 Scientific Methodology & Data Hygiene

- **Strict Chronological Splits:** In time-series forecasting, standard random cross-validation leaks future information backwards. AirGuard strictly partitions chronological sequences (80% train, 20% test).
- **Target Leakage Prohibition:** In air quality classification, AQI is computed from pollutant maximums. Using AQI to predict AQI categories is mathematically tautological. AirGuard uses raw ambient concentrations only.
- **Median Imputation Tracking:** Missing feature attributes during inference are imputed using training medians and explicitly reported in the response metadata.

---

## 👨‍🎓 Academic Deliverables
- **Academic Project Report:** [`PROJECT_REPORT.md`](PROJECT_REPORT.md)
- **Viva Voce Prep & 25+ Answers:** [`VIVA_QUESTIONS.md`](VIVA_QUESTIONS.md)


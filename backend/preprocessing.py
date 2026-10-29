"""
AirGuard - Preprocessing and Dataset Management Module
Handles dataset discovery, safe loading, schema validation, data cleaning,
statistical summaries, filtering, and safe upload validation.
"""

from __future__ import annotations
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
import numpy as np

# Configurable paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Standard known air pollution column names
STANDARD_POLLUTANTS = ["PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "SO2", "CO", "O3", "Benzene", "Toluene", "Xylene"]
STANDARD_AQI_COLS = ["AQI", "AQI_Bucket"]
STANDARD_META_COLS = ["City", "Date"]

# Column mapping dictionary for case-insensitive matching & common variations
COLUMN_ALIASES = {
    "pm2.5": "PM2.5",
    "pm25": "PM2.5",
    "pm2_5": "PM2.5",
    "pm10": "PM10",
    "no": "NO",
    "no2": "NO2",
    "nox": "NOx",
    "nh3": "NH3",
    "so2": "SO2",
    "co": "CO",
    "o3": "O3",
    "ozone": "O3",
    "benzene": "Benzene",
    "toluene": "Toluene",
    "xylene": "Xylene",
    "aqi": "AQI",
    "aqi_bucket": "AQI_Bucket",
    "aqi bucket": "AQI_Bucket",
    "aqi_category": "AQI_Bucket",
    "city": "City",
    "date": "Date",
    "datetime": "Date",
    "timestamp": "Date"
}

# In-memory cached active dataset filename
_active_filename: Optional[str] = None


def set_active_dataset_filename(filename: Optional[str]) -> None:
    """Set the currently active dataset filename."""
    global _active_filename
    _active_filename = filename


def get_active_dataset_filename() -> Optional[str]:
    """Retrieve the active dataset filename."""
    global _active_filename
    return _active_filename


def list_csv_files(data_dir: Path = DATA_DIR) -> List[Dict[str, Any]]:
    """
    Search data directory for CSV files and gather metadata.
    """
    if not data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        return []

    csv_files = []
    for file in sorted(data_dir.glob("*.csv")):
        try:
            stat = file.stat()
            size_bytes = stat.st_size
            if size_bytes < 1024:
                size_str = f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.2f} MB"

            csv_files.append({
                "filename": file.name,
                "path": str(file),
                "size_bytes": size_bytes,
                "size_formatted": size_str,
                "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "is_default": file.name.lower() == "city_day.csv"
            })
        except Exception:
            continue
    return csv_files


def resolve_dataset_path(preferred_filename: Optional[str] = None, data_dir: Path = DATA_DIR) -> Optional[Path]:
    """
    Resolve which dataset CSV to use:
    1. preferred_filename argument if given and exists
    2. in-memory _active_filename if set and exists
    3. 'city_day.csv' if exists
    4. First available .csv file in data_dir
    5. None if no CSV files exist
    """
    if preferred_filename:
        cand = data_dir / preferred_filename
        if cand.is_file():
            return cand

    active = get_active_dataset_filename()
    if active:
        cand = data_dir / active
        if cand.is_file():
            return cand

    default_file = data_dir / "city_day.csv"
    if default_file.is_file():
        return default_file

    csvs = list(data_dir.glob("*.csv"))
    if csvs:
        return csvs[0]

    return None


def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Strip whitespace from column names and standardize known pollutant/meta column names.
    Does not drop unrecognized columns.
    """
    cleaned_df = df.copy()
    new_cols = {}
    for col in cleaned_df.columns:
        clean_col = str(col).strip()
        lower_col = clean_col.lower()
        if lower_col in COLUMN_ALIASES:
            new_cols[col] = COLUMN_ALIASES[lower_col]
        else:
            new_cols[col] = clean_col
    cleaned_df = cleaned_df.rename(columns=new_cols)
    return cleaned_df


def load_dataset(filepath: Optional[Path] = None, data_dir: Path = DATA_DIR) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Safely load a dataset into memory as a cleaned DataFrame.
    Returns (DataFrame, error_message_or_None).
    """
    path = filepath or resolve_dataset_path(data_dir=data_dir)
    if not path or not path.is_file():
        return None, f"No CSV dataset found in '{data_dir}'. Please place 'city_day.csv' or upload a dataset."

    try:
        # Try utf-8 first, fallback to latin-1
        try:
            df = pd.read_csv(path, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(path, encoding="latin-1")

        if df.empty:
            return None, f"Dataset '{path.name}' is empty."

        df = standardize_columns(df)

        # Parse Date if present
        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

        # Convert numeric pollutant columns
        for col in df.columns:
            if col in STANDARD_POLLUTANTS or col == "AQI":
                df[col] = pd.to_numeric(df[col], errors="coerce")

        return df, None

    except Exception as e:
        return None, f"Failed to load dataset '{path.name}': {str(e)}"


def get_dataset_summary_dict(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
    """
    Generate an honest, detailed statistical and architectural summary of the DataFrame.
    Never fabricates values.
    """
    total_rows = int(len(df))
    total_cols = int(len(df.columns))
    duplicate_rows = int(df.duplicated().sum())

    # Available columns by role
    pollutants_present = [col for col in STANDARD_POLLUTANTS if col in df.columns]
    aqi_present = [col for col in STANDARD_AQI_COLS if col in df.columns]
    meta_present = [col for col in STANDARD_META_COLS if col in df.columns]
    other_cols = [col for col in df.columns if col not in pollutants_present + aqi_present + meta_present]

    # Date range
    date_range = {"start": None, "end": None, "valid_count": 0}
    if "Date" in df.columns:
        valid_dates = df["Date"].dropna()
        if not valid_dates.empty:
            date_range["start"] = valid_dates.min().strftime("%Y-%m-%d")
            date_range["end"] = valid_dates.max().strftime("%Y-%m-%d")
            date_range["valid_count"] = int(len(valid_dates))

    # Cities
    cities = []
    if "City" in df.columns:
        cities = sorted([str(c) for c in df["City"].dropna().unique() if str(c).strip()])

    # Missing values & column schema
    columns_info = []
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        null_pct = round((null_count / total_rows * 100), 2) if total_rows > 0 else 0.0
        dtype_str = str(df[col].dtype)
        is_numeric = pd.api.types.is_numeric_dtype(df[col])

        col_dict: Dict[str, Any] = {
            "name": col,
            "dtype": dtype_str,
            "is_numeric": is_numeric,
            "null_count": null_count,
            "null_percentage": null_pct,
            "non_null_count": total_rows - null_count
        }

        if is_numeric:
            series = df[col].dropna()
            if not series.empty:
                col_dict["min"] = round(float(series.min()), 2)
                col_dict["max"] = round(float(series.max()), 2)
                col_dict["mean"] = round(float(series.mean()), 2)
                col_dict["median"] = round(float(series.median()), 2)
                col_dict["std"] = round(float(series.std()), 2)
                col_dict["q25"] = round(float(series.quantile(0.25)), 2)
                col_dict["q75"] = round(float(series.quantile(0.75)), 2)

        columns_info.append(col_dict)

    # AQI category distribution if present
    aqi_bucket_dist = {}
    if "AQI_Bucket" in df.columns:
        val_counts = df["AQI_Bucket"].dropna().value_counts()
        aqi_bucket_dist = {str(k): int(v) for k, v in val_counts.items()}

    # Average PM2.5 and AQI if present
    avg_pm25 = None
    if "PM2.5" in df.columns and not df["PM2.5"].dropna().empty:
        avg_pm25 = round(float(df["PM2.5"].dropna().mean()), 2)

    avg_aqi = None
    if "AQI" in df.columns and not df["AQI"].dropna().empty:
        avg_aqi = round(float(df["AQI"].dropna().mean()), 2)

    return {
        "filename": filename,
        "total_records": total_rows,
        "total_columns": total_cols,
        "duplicate_records": duplicate_rows,
        "pollutants_present": pollutants_present,
        "aqi_columns_present": aqi_present,
        "metadata_columns_present": meta_present,
        "other_columns_present": other_cols,
        "cities_count": len(cities),
        "cities": cities,
        "date_range": date_range,
        "avg_pm25": avg_pm25,
        "avg_aqi": avg_aqi,
        "aqi_bucket_distribution": aqi_bucket_dist,
        "columns": columns_info
    }


def get_paginated_readings(
    df: pd.DataFrame,
    page: int = 1,
    page_size: int = 25,
    city: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_desc: bool = True
) -> Dict[str, Any]:
    """
    Filter, sort, and paginate dataset observations.
    """
    filtered = df.copy()

    # Filter by city
    if city and "City" in filtered.columns and city.lower() != "all":
        filtered = filtered[filtered["City"].astype(str).str.lower() == city.lower()]

    # Filter by date range
    if "Date" in filtered.columns and pd.api.types.is_datetime64_any_dtype(filtered["Date"]):
        if start_date:
            try:
                s_dt = pd.to_datetime(start_date)
                filtered = filtered[filtered["Date"] >= s_dt]
            except Exception:
                pass
        if end_date:
            try:
                e_dt = pd.to_datetime(end_date)
                filtered = filtered[filtered["Date"] <= e_dt]
            except Exception:
                pass

    total_filtered = len(filtered)

    # Sorting
    if sort_by and sort_by in filtered.columns:
        filtered = filtered.sort_values(by=sort_by, ascending=not sort_desc, na_position="last")
    elif "Date" in filtered.columns:
        filtered = filtered.sort_values(by="Date", ascending=not sort_desc, na_position="last")

    # Pagination bounds
    page = max(1, page)
    page_size = max(5, min(100, page_size))
    total_pages = max(1, int(np.ceil(total_filtered / page_size)))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    page_df = filtered.iloc[start_idx:end_idx].copy()

    # Format Date column as string for JSON serialization
    if "Date" in page_df.columns:
        page_df["Date"] = page_df["Date"].dt.strftime("%Y-%m-%d").fillna("")

    # Replace NaN with None for valid JSON serialization
    records = page_df.replace({np.nan: None}).to_dict(orient="records")

    return {
        "page": page,
        "page_size": page_size,
        "total_records": total_filtered,
        "total_pages": total_pages,
        "records": records
    }


def save_uploaded_csv(file_bytes: bytes, filename: str, data_dir: Path = DATA_DIR) -> Tuple[bool, str, Optional[str]]:
    """
    Safely store an uploaded CSV file in data_dir.
    Validates file extension and ensures file can be read by Pandas.
    Returns (success, message, saved_filename).
    """
    if not filename.lower().endswith(".csv"):
        return False, "File must be a valid .csv file.", None

    if len(file_bytes) == 0:
        return False, "Uploaded file is empty.", None

    # 100MB limit
    if len(file_bytes) > 100 * 1024 * 1024:
        return False, "File size exceeds 100MB limit.", None

    data_dir.mkdir(parents=True, exist_ok=True)
    # Sanitize filename
    clean_name = os.path.basename(filename).replace(" ", "_")
    target_path = data_dir / clean_name

    try:
        with open(target_path, "wb") as f:
            f.write(file_bytes)

        # Validate with pandas
        try:
            test_df = pd.read_csv(target_path, nrows=5)
            if test_df.empty:
                target_path.unlink(missing_ok=True)
                return False, "Uploaded CSV contains no rows.", None
        except Exception as e:
            target_path.unlink(missing_ok=True)
            return False, f"Invalid CSV file format: {str(e)}", None

        # Set as active dataset
        set_active_dataset_filename(clean_name)
        return True, f"Dataset '{clean_name}' successfully uploaded and activated.", clean_name

    except Exception as e:
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        return False, f"Failed to save file: {str(e)}", None

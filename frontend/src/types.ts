// AirGuard Frontend TypeScript Definitions

export interface DatasetStatus {
  dataset_present: boolean;
  active_filename: string | null;
  available_files: Array<{
    filename: string;
    path: string;
    size_bytes: number;
    size_formatted: string;
    modified_time: string;
    is_default: boolean;
  }>;
  data_directory: string;
  setup_instruction: string;
}

export interface ColumnSchema {
  name: string;
  dtype: string;
  is_numeric: boolean;
  null_count: number;
  null_percentage: number;
  non_null_count: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q25?: number;
  q75?: number;
}

export interface DatasetSummary {
  filename: string;
  total_records: number;
  total_columns: number;
  duplicate_records: number;
  pollutants_present: string[];
  aqi_columns_present: string[];
  metadata_columns_present: string[];
  other_columns_present: string[];
  cities_count: number;
  cities: string[];
  date_range: {
    start: string | null;
    end: string | null;
    valid_count: number;
  };
  avg_pm25: number | null;
  avg_aqi: number | null;
  aqi_bucket_distribution: Record<string, number>;
  columns: ColumnSchema[];
}

export interface PaginatedReadings {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  records: Array<Record<string, any>>;
}

export interface AnalysisSummary {
  status: string;
  dataset_name: string;
  total_records: number;
  data_present: boolean;
  statistics: Record<string, any>;
  outliers: Record<string, any>;
  correlations: {
    columns: string[];
    matrix: Array<Record<string, number | null>>;
    aqi_correlations?: Record<string, number>;
  };
  temporal_trends: {
    has_dates: boolean;
    pollutants_tracked?: string[];
    monthly_trends?: Array<Record<string, any>>;
    recent_trends?: Array<Record<string, any>>;
  };
  city_comparisons: {
    has_cities: boolean;
    city_stats: Array<Record<string, any>>;
    top_polluted?: Array<Record<string, any>>;
    least_polluted?: Array<Record<string, any>>;
  };
  interpretations: string[];
  generated_charts: string[];
}

export interface ModelMetricsSummary {
  status: string;
  message?: string;
  dataset_name?: string;
  dataset_present?: boolean;
  regression?: {
    status: string;
    target?: string;
    features?: string[];
    train_samples?: number;
    test_samples?: number;
    split_strategy?: string;
    best_model?: string;
    models_comparison?: Array<{
      model: string;
      mae: number;
      rmse: number;
      r2: number;
    }>;
    feature_importances?: Record<string, number>;
    eval_curve?: Array<{
      index: number;
      actual: number;
      predicted: number;
      error: number;
    }>;
    charts?: string[];
    reason?: string;
  };
  classification?: {
    status: string;
    model_name?: string;
    features?: string[];
    classes?: string[];
    class_distribution?: Record<string, number>;
    train_samples?: number;
    test_samples?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    confusion_matrix?: {
      labels: string[];
      matrix: number[][];
    };
    classification_report?: Record<string, any>;
    feature_importances?: Record<string, number>;
    charts?: string[];
    reason?: string;
  };
  clustering?: {
    status: string;
    optimal_k?: number;
    features?: string[];
    silhouette_score?: number;
    candidate_scores?: Record<string, number>;
    pca_variance_ratio?: number[];
    cluster_profiles?: Array<{
      cluster_id: number;
      record_count: number;
      percentage: number;
      means: Record<string, number | null>;
    }>;
    sample_points?: Array<{
      pca_x: number;
      pca_y: number;
      cluster: number;
    }>;
    charts?: string[];
    reason?: string;
  };
  anomalies?: {
    status: string;
    total_anomalies_detected?: number;
    contamination_rate?: number;
    anomalies?: Array<Record<string, any>>;
    reason?: string;
  };
}

export interface PredictionResult {
  predicted_pm25: number;
  unit: string;
  horizon: string;
  model_name: string;
  features_used: string[];
  imputed_features: string[];
  disclaimer: string;
}

export interface ClassificationResult {
  predicted_category: string;
  probabilities: Record<string, number>;
  classes: string[];
  features_used: string[];
  disclaimer: string;
}


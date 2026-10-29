// AirGuard API Service Layer

import {
  DatasetStatus,
  DatasetSummary,
  PaginatedReadings,
  AnalysisSummary,
  ModelMetricsSummary,
  PredictionResult,
  ClassificationResult
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse<{
      status: string;
      service: string;
      dataset_ready: boolean;
      active_dataset: string | null;
      models: Record<string, boolean>;
    }>(res);
  },

  async getDatasetStatus(): Promise<DatasetStatus> {
    const res = await fetch(`${BASE_URL}/dataset/status`);
    return handleResponse<DatasetStatus>(res);
  },

  async selectDataset(filename: string) {
    const res = await fetch(`${BASE_URL}/dataset/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    return handleResponse<{ status: string; message: string; active_filename: string }>(res);
  },

  async uploadDataset(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/dataset/upload`, {
      method: 'POST',
      body: formData
    });
    return handleResponse<{ status: string; message: string; filename: string }>(res);
  },

  async getSummary(): Promise<DatasetSummary> {
    const res = await fetch(`${BASE_URL}/summary`);
    return handleResponse<DatasetSummary>(res);
  },

  async getCities(): Promise<{ has_cities: boolean; count?: number; cities: string[] }> {
    const res = await fetch(`${BASE_URL}/cities`);
    return handleResponse<{ has_cities: boolean; count?: number; cities: string[] }>(res);
  },

  async getReadings(params: {
    page?: number;
    page_size?: number;
    city?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    sort_desc?: boolean;
  }): Promise<PaginatedReadings> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());
    if (params.city && params.city !== 'ALL') query.append('city', params.city);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_desc !== undefined) query.append('sort_desc', params.sort_desc.toString());

    const res = await fetch(`${BASE_URL}/readings?${query.toString()}`);
    return handleResponse<PaginatedReadings>(res);
  },

  async getAnalysis(): Promise<AnalysisSummary> {
    const res = await fetch(`${BASE_URL}/analysis`);
    return handleResponse<AnalysisSummary>(res);
  },

  async getModelMetrics(): Promise<ModelMetricsSummary> {
    const res = await fetch(`${BASE_URL}/model-metrics`);
    return handleResponse<ModelMetricsSummary>(res);
  },

  async trainModels(): Promise<{ status: string; message: string; summary: any }> {
    const res = await fetch(`${BASE_URL}/train`, {
      method: 'POST'
    });
    return handleResponse<{ status: string; message: string; summary: any }>(res);
  },

  async predictPM25(features: Record<string, number>): Promise<PredictionResult> {
    const res = await fetch(`${BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });
    return handleResponse<PredictionResult>(res);
  },

  async classifyAQI(features: Record<string, number>): Promise<ClassificationResult> {
    const res = await fetch(`${BASE_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });
    return handleResponse<ClassificationResult>(res);
  },

  async getClusters() {
    const res = await fetch(`${BASE_URL}/clusters`);
    return handleResponse<any>(res);
  },

  async getAnomalies() {
    const res = await fetch(`${BASE_URL}/anomalies`);
    return handleResponse<any>(res);
  }
};


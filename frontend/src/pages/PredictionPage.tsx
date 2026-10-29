import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  CloudFog,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../api';
import type { ModelMetricsSummary, PredictionResult, DatasetSummary } from '../types';

interface PredictionPageProps {
  modelMetrics: ModelMetricsSummary | null;
  summary: DatasetSummary | null;
  onNavigateToEvaluation: () => void;
  onTrainModels: () => void;
  isTraining: boolean;
}

export const PredictionPage: React.FC<PredictionPageProps> = ({
  modelMetrics,
  summary,
  onNavigateToEvaluation,
  onTrainModels,
  isTraining
}) => {
  const regMetrics = modelMetrics?.regression;
  const isModelTrained = regMetrics?.status === 'success';

  // Feature input values state
  const [featureInputs, setFeatureInputs] = useState<Record<string, string>>({});
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  const expectedFeatures =
    regMetrics?.features && regMetrics.features.length > 0
      ? regMetrics.features
      : ['PM2.5', 'PM2.5_lag1', 'PM2.5_lag2', 'PM2.5_roll3', 'PM10', 'NO2', 'SO2', 'CO'];

  // Initialize input fields with dataset averages when available
  const handlePrefillAverages = () => {
    const prefilled: Record<string, string> = {};
    const colMap = new Map(summary?.columns.map((c) => [c.name, c.mean]));

    expectedFeatures.forEach((feat) => {
      if (feat.startsWith('PM2.5')) {
        const pmVal = colMap.get('PM2.5') || 65.0;
        prefilled[feat] = pmVal.toString();
      } else if (feat === 'month') {
        prefilled[feat] = (new Date().getMonth() + 1).toString();
      } else if (feat === 'day_of_week') {
        prefilled[feat] = new Date().getDay().toString();
      } else {
        const val = colMap.get(feat) || (feat === 'CO' ? 1.2 : feat === 'SO2' ? 14.5 : 45.0);
        prefilled[feat] = val.toString();
      }
    });

    setFeatureInputs(prefilled);
  };

  useEffect(() => {
    if (Object.keys(featureInputs).length === 0) {
      handlePrefillAverages();
    }
  }, [expectedFeatures, summary]);

  const handleInputChange = (field: string, val: string) => {
    setFeatureInputs((prev) => ({
      ...prev,
      [field]: val
    }));
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    setPredictError(null);
    try {
      const numMap: Record<string, number> = {};
      for (const [k, v] of Object.entries(featureInputs)) {
        if (v !== '' && !isNaN(Number(v))) {
          numMap[k] = Number(v);
        }
      }
      const res = await api.predictPM25(numMap);
      setPredictionResult(res);
    } catch (err: any) {
      setPredictError(err.message || 'Prediction failed.');
    } finally {
      setIsPredicting(false);
    }
  };

  const evalCurve = regMetrics?.eval_curve || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Time-Series PM2.5 Predictive Modeling</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PM2.5 Forecasting Laboratory</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Forecast future particulate matter concentrations using strictly chronological lag features and trained ensemble regressors.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isModelTrained ? (
            <div className="bg-slate-900 border border-slate-700/80 px-4 py-2 rounded-xl text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Regressor</span>
              <span className="text-teal-300 font-semibold">{regMetrics?.best_model}</span>
            </div>
          ) : (
            <button
              onClick={onTrainModels}
              disabled={isTraining}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <Cpu className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Calibrating...' : 'Calibrate Model'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Form (2 cols) + Output Card (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Feature Input Form */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <CloudFog className="w-4 h-4 text-cyan-400" />
                  <span>Telemetry Predictor Features</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Input features strictly avoid future target leakage ({expectedFeatures.length} parameters)
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrefillAverages}
                className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
                title="Populate inputs with historical averages"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Averages</span>
              </button>
            </div>

            <form onSubmit={handlePredict} id="prediction-form" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {expectedFeatures.map((feat) => {
                  const val = featureInputs[feat] ?? '';
                  const isLag = feat.includes('lag') || feat.includes('roll');
                  return (
                    <div
                      key={feat}
                      className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 focus-within:border-cyan-500/60 transition-colors flex flex-col justify-between"
                    >
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span className="truncate">{feat}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {isLag ? 'µg/m³ (lag)' : feat.includes('month') ? '1–12' : feat === 'CO' ? 'mg/m³' : 'µg/m³'}
                        </span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) => handleInputChange(feat, e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                        required={feat === 'PM2.5'}
                      />
                    </div>
                  );
                })}
              </div>

              {predictError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{predictError}</span>
                </div>
              )}
            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              * Required: Current day PM2.5. Unfilled features use median imputation.
            </span>
            <button
              type="submit"
              form="prediction-form"
              disabled={isPredicting}
              className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-lg shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${isPredicting ? 'animate-spin' : ''}`} />
              <span>{isPredicting ? 'Computing Forecast...' : 'Generate PM2.5 Forecast'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Prediction Output Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm min-h-[380px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Inference Result
              </span>
              <span className="text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full font-medium">
                Next-Day Horizon
              </span>
            </div>

            {predictionResult ? (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-6 text-center shadow-inner">
                  <span className="text-xs text-slate-400 font-medium block mb-1">
                    Predicted PM2.5 Concentration
                  </span>
                  <div className="flex items-baseline justify-center space-x-2 my-1">
                    <span className="text-4xl sm:text-5xl font-extrabold text-cyan-400 tracking-tight font-mono">
                      {predictionResult.predicted_pm25}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 font-sans">{predictionResult.unit}</span>
                  </div>

                  {/* Health Impact Badge */}
                  <div className="mt-3">
                    {predictionResult.predicted_pm25 <= 30 ? (
                      <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1 rounded-full font-medium">
                        Good / Acceptable Air
                      </span>
                    ) : predictionResult.predicted_pm25 <= 60 ? (
                      <span className="inline-block bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs px-3 py-1 rounded-full font-medium">
                        Satisfactory Concentration
                      </span>
                    ) : predictionResult.predicted_pm25 <= 120 ? (
                      <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1 rounded-full font-medium">
                        Moderate / Elevated Exposure
                      </span>
                    ) : (
                      <span className="inline-block bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-3 py-1 rounded-full font-medium">
                        Severe Particulate Hazard
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs space-y-2 font-mono">
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-400">Forecast Horizon:</span>
                    <span className="text-slate-200 font-medium">{predictionResult.horizon}</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-400">Model Applied:</span>
                    <span className="text-teal-400 font-medium">{predictionResult.model_name}</span>
                  </div>
                  {predictionResult.imputed_features.length > 0 && (
                    <div className="text-[11px] text-amber-400/90 pt-1 border-t border-slate-800/80 font-sans">
                      * Median imputed: {predictionResult.imputed_features.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-56 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                <Activity className="w-10 h-10 text-slate-600 mb-3" />
                <span className="font-medium text-slate-400 mb-1">Awaiting Telemetry Input</span>
                <span>Configure features and click "Generate PM2.5 Forecast" to compute the estimate.</span>
              </div>
            )}
          </div>

          {/* Academic Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400 block mb-0.5">Academic Notice:</span>
            Estimates are algorithmic statistical predictions generated for educational data science modeling, not official statutory measurements.
          </div>
        </div>
      </div>

      {/* Model Performance Validation Chart */}
      {evalCurve.length > 0 && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Test Set Forecasting Validation (Actual vs. Predicted)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Chronological unseen test partition ({regMetrics?.test_samples?.toLocaleString()} observations)
              </p>
            </div>
            <button
              onClick={onNavigateToEvaluation}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer self-start sm:self-auto"
            >
              View Full Metrics Report →
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evalCurve} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="index"
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Timeline Observations (Chronological Order)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" µg" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="actual" name="Actual PM2.5" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="predicted" name="Predicted PM2.5" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

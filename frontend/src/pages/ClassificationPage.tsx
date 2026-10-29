import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  Cpu,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api';
import type { ModelMetricsSummary, ClassificationResult, DatasetSummary } from '../types';

interface ClassificationPageProps {
  modelMetrics: ModelMetricsSummary | null;
  summary: DatasetSummary | null;
  onTrainModels: () => void;
  isTraining: boolean;
}

export const ClassificationPage: React.FC<ClassificationPageProps> = ({
  modelMetrics,
  summary,
  onTrainModels,
  isTraining
}) => {
  const clfMetrics = modelMetrics?.classification;
  const isModelTrained = clfMetrics?.status === 'success';

  const [featureInputs, setFeatureInputs] = useState<Record<string, string>>({});
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expectedFeatures =
    clfMetrics?.features && clfMetrics.features.length > 0
      ? clfMetrics.features
      : ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'];

  // Fill reasonable pollutant concentrations from dataset averages
  const handlePrefillAverages = () => {
    const prefilled: Record<string, string> = {};
    const colMap = new Map(summary?.columns.map((c) => [c.name, c.mean]));

    expectedFeatures.forEach((feat) => {
      const val = colMap.get(feat) || (feat === 'CO' ? 1.2 : feat === 'SO2' ? 14.5 : 55.0);
      prefilled[feat] = val.toString();
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

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsClassifying(true);
    setError(null);
    try {
      const numMap: Record<string, number> = {};
      for (const [k, v] of Object.entries(featureInputs)) {
        if (v !== '' && !isNaN(Number(v))) {
          numMap[k] = Number(v);
        }
      }
      const res = await api.classifyAQI(numMap);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Classification failed.');
    } finally {
      setIsClassifying(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'good':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'satisfactory':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'moderate':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'poor':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'very poor':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'severe':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BrainCircuit className="w-4 h-4" />
            <span>Multi-Class Environmental Health Assessment</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AQI Category Classification</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Predict air quality categories strictly from raw pollutant concentrations, rigorously preventing data leakage by excluding direct AQI inputs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isModelTrained ? (
            <div className="bg-slate-900 border border-slate-700/80 px-4 py-2 rounded-xl text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Classifier</span>
              <span className="text-teal-300 font-semibold">{clfMetrics?.model_name}</span>
            </div>
          ) : (
            <button
              onClick={onTrainModels}
              disabled={isTraining}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <Cpu className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Training...' : 'Train Classifier'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Inputs (2 cols) + Output (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>Ambient Pollutant Inputs</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Raw ambient concentrations only — AQI strictly excluded to avoid mathematical leakage
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrefillAverages}
                className="flex items-center space-x-1.5 text-xs text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
                title="Populate inputs with historical averages"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Averages</span>
              </button>
            </div>

            <form onSubmit={handleClassify} id="classify-form" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {expectedFeatures.map((feat) => {
                  const val = featureInputs[feat] ?? '';
                  return (
                    <div
                      key={feat}
                      className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 focus-within:border-teal-500/60 transition-colors flex flex-col justify-between"
                    >
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>{feat}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {feat === 'CO' ? 'mg/m³' : 'µg/m³'}
                        </span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) => handleInputChange(feat, e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              * Evaluates multi-pollutant environmental standards (CPCB / WHO).
            </span>
            <button
              type="submit"
              form="classify-form"
              disabled={isClassifying}
              className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-lg shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <BrainCircuit className={`w-4 h-4 ${isClassifying ? 'animate-spin' : ''}`} />
              <span>{isClassifying ? 'Classifying Air Quality...' : 'Classify Air Quality'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Classification Outcome Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm min-h-[380px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Classification Result
              </span>
              <span className="text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full font-medium">
                Health Bucket
              </span>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 text-center shadow-inner">
                  <span className="text-xs text-slate-400 block mb-2">Predicted Air Quality Category</span>
                  <span
                    className={`inline-block text-xl font-bold px-4 py-1.5 rounded-full border shadow-sm ${getCategoryColor(
                      result.predicted_category
                    )}`}
                  >
                    {result.predicted_category}
                  </span>
                </div>

                {/* Probabilities */}
                {result.probabilities && Object.keys(result.probabilities).length > 0 && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Class Posterior Probabilities:
                    </span>
                    {Object.entries(result.probabilities).map(([cat, prob]) => (
                      <div key={cat} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">{cat}</span>
                          <span className="text-slate-200 font-mono font-medium">{prob}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-teal-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${prob}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-56 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                <BrainCircuit className="w-10 h-10 text-slate-600 mb-3" />
                <span className="font-medium text-slate-400 mb-1">Awaiting Sensor Telemetry</span>
                <span>Supply ambient measurements to estimate the air quality bucket.</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400 block mb-0.5">Methodology Integrity:</span>
            Random Forest Classifier trained with balanced class weights to address natural category distribution skew across urban monitoring seasons.
          </div>
        </div>
      </div>

      {/* Confusion Matrix & Classification Metrics */}
      {clfMetrics && clfMetrics.status === 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Classification Metrics Summary */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Test Set Validation Benchmarks</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {clfMetrics.test_samples?.toLocaleString()} Test Samples
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Accuracy</span>
                  <span className="text-xl font-bold text-teal-400 font-mono">
                    {((clfMetrics.accuracy || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Precision</span>
                  <span className="text-xl font-bold text-cyan-400 font-mono">
                    {((clfMetrics.precision || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Recall</span>
                  <span className="text-xl font-bold text-cyan-400 font-mono">
                    {((clfMetrics.recall || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">F1-Score</span>
                  <span className="text-xl font-bold text-teal-400 font-mono">
                    {((clfMetrics.f1_score || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/80">
              Evaluated using stratified train/test partitioning to preserve identical category proportions in training ({clfMetrics.train_samples?.toLocaleString()} samples) and validation ({clfMetrics.test_samples?.toLocaleString()} samples).
            </p>
          </div>

          {/* Confusion Matrix Display */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Confusion Matrix Heatmap</h3>
                  <p className="text-xs text-slate-400">Actual (rows) vs. Model Predicted (columns)</p>
                </div>
              </div>

              {clfMetrics.confusion_matrix ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="p-2 text-slate-500 font-mono text-[10px] text-left">Actual \ Pred</th>
                        {clfMetrics.confusion_matrix.labels.map((l) => (
                          <th key={l} className="p-2 text-slate-300 font-semibold truncate max-w-[70px]">
                            {l}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                      {clfMetrics.confusion_matrix.matrix.map((row, rIdx) => {
                        const actualLabel = clfMetrics.confusion_matrix!.labels[rIdx];
                        return (
                          <tr key={actualLabel}>
                            <td className="p-2 text-slate-300 font-semibold truncate max-w-[70px] text-left">
                              {actualLabel}
                            </td>
                            {row.map((val, cIdx) => {
                              const isDiagonal = rIdx === cIdx;
                              return (
                                <td
                                  key={cIdx}
                                  className={`p-2 font-mono ${isDiagonal
                                      ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                                      : val > 0
                                        ? 'bg-slate-900 text-slate-400'
                                        : 'text-slate-600'
                                    }`}
                                >
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Confusion matrix not generated.</p>
              )}
            </div>

            <div className="mt-3 pt-2 text-[11px] text-slate-500 font-mono">
              Highlighted diagonal entries indicate true positive classifications.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

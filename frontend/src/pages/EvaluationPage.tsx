import React from 'react';
import {
  Cpu,
  TrendingUp,
  CheckCircle2,
  RotateCcw,
  BrainCircuit,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import type { ModelMetricsSummary } from '../types';

interface EvaluationPageProps {
  modelMetrics: ModelMetricsSummary | null;
  onTrainModels: () => void;
  isTraining: boolean;
}

export const EvaluationPage: React.FC<EvaluationPageProps> = ({
  modelMetrics,
  onTrainModels,
  isTraining
}) => {
  const reg = modelMetrics?.regression;
  const clf = modelMetrics?.classification;
  const hasModels = modelMetrics?.status === 'completed' || reg?.status === 'success';

  // Feature importances for regression
  const regFeatureData = reg?.feature_importances
    ? Object.entries(reg.feature_importances)
        .map(([name, imp]) => ({
          feature: name,
          importance: Number((imp * 100).toFixed(1))
        }))
        .sort((a, b) => b.importance - a.importance)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" />
            <span>Rigorous Machine Learning Validation</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Model Evaluation & Benchmarking</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Objective evaluation metrics, baseline comparisons, residual analyses, and honest documentation of data science constraints.
          </p>
        </div>

        <button
          onClick={onTrainModels}
          disabled={isTraining}
          className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
          <span>{isTraining ? 'Training Models...' : 'Retrain All Models'}</span>
        </button>
      </div>

      {hasModels ? (
        <div className="space-y-6">
          {/* Section 1: Regression Benchmarking (Linear Regression vs Random Forest) */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>PM2.5 Regression Model Comparison</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological test split ({reg?.test_samples?.toLocaleString()} unseen test samples). Strict avoidance of target leakage.
                </p>
              </div>

              <span className="text-xs text-teal-300 font-semibold bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
                Optimal: {reg?.best_model}
              </span>
            </div>

            {/* Regression Comparison Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Model Architecture</th>
                    <th className="p-3">Mean Absolute Error (MAE)</th>
                    <th className="p-3">Root Mean Squared Error (RMSE)</th>
                    <th className="p-3">R² Coefficient of Determination</th>
                    <th className="p-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
                  {reg?.models_comparison?.map((m) => {
                    const isWinner = reg?.best_model?.includes(m.model.split(' ')[0]);
                    return (
                      <tr key={m.model} className={isWinner ? 'bg-cyan-500/10' : 'hover:bg-slate-800/40'}>
                        <td className="p-3 font-semibold text-white flex items-center space-x-2">
                          {isWinner && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                          <span>{m.model}</span>
                        </td>
                        <td className="p-3">{m.mae} µg/m³</td>
                        <td className="p-3 font-bold text-cyan-300">{m.rmse} µg/m³</td>
                        <td className="p-3 font-bold text-teal-300">{m.r2}</td>
                        <td className="p-3 font-sans text-xs">
                          {m.model.includes('Baseline') ? (
                            <span className="text-slate-400">Baseline Benchmark</span>
                          ) : (
                            <span className="text-cyan-400 font-medium">Nonlinear Ensemble</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Feature Importance Bar Chart */}
            {regFeatureData.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2">
                  Feature Importance (% relative contribution to predictions)
                </h4>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regFeatureData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="feature" stroke="#64748b" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(val: any) => [`${val}%`, 'Importance Weight']}
                      />
                      <Bar dataKey="importance" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Classification Evaluation */}
          {clf && clf.status === 'success' && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <BrainCircuit className="w-4 h-4 text-teal-400" />
                    <span>AQI Category Classification Report</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluated on {clf.test_samples?.toLocaleString()} stratified test instances with balanced class weighting.
                  </p>
                </div>
                <span className="text-xs text-teal-300 font-mono font-semibold self-start sm:self-auto bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                  Accuracy: {((clf.accuracy || 0) * 100).toFixed(1)}%
                </span>
              </div>

              {clf.classification_report && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Class Label</th>
                        <th className="p-3">Precision</th>
                        <th className="p-3">Recall</th>
                        <th className="p-3">F1-Score</th>
                        <th className="p-3">Support (Instances)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                      {clf.classes?.map((c) => {
                        const row = clf.classification_report?.[c];
                        if (!row) return null;
                        return (
                          <tr key={c} className="hover:bg-slate-800/40">
                            <td className="p-3 font-semibold text-white">{c}</td>
                            <td className="p-3">{((row.precision || 0) * 100).toFixed(1)}%</td>
                            <td className="p-3">{((row.recall || 0) * 100).toFixed(1)}%</td>
                            <td className="p-3 font-semibold text-cyan-300">
                              {((row['f1-score'] || 0) * 100).toFixed(1)}%
                            </td>
                            <td className="p-3 text-slate-400">{row.support}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Limitations & Methodology Documentation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Scientific Methodology & Documented Constraints</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-teal-300 block mb-1">
                  1. Chronological Split vs Random K-Fold
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Time-series air quality records exhibit strong temporal autocorrelation. Random k-fold cross-validation causes future observations to bleed into training folds, fabricating deceptively high R² scores. AirGuard strictly partitions data chronologically (first 80% train, last 20% test).
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-teal-300 block mb-1">
                  2. Strict Prevention of Data Leakage
                </span>
                <p className="text-slate-400 leading-relaxed">
                  AQI is a mathematical function of pollutant maximums. Predicting AQI categories using AQI as an input is a tautological error. AirGuard’s classification model consumes only raw pollutant measurements (PM2.5, PM10, NO2, etc.).
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-amber-300 block mb-1">
                  3. Unmonitored Meteorological Variables
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Atmospheric dispersion relies heavily on wind speed, temperature inversion boundaries, boundary layer height, and relative humidity. Because standard monitoring CSVs often omit weather data, sudden atmospheric stagnation events cannot be anticipated solely from chemical telemetry.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-amber-300 block mb-1">
                  4. Sensor Missingness & Drift
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Real-world monitoring stations suffer from sensor downtime and optical chamber saturation. Median imputation is utilized in inference pipelines to preserve model stability while transparently flagging imputed fields to users.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
          Model evaluation metrics will be displayed here upon training completion.
        </div>
      )}
    </div>
  );
};

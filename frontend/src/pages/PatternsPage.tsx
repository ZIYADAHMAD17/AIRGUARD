import React, { useMemo } from 'react';
import {
  Layers,
  Cpu,
  AlertTriangle,
  Flame,
  ScatterChart as ScatterIcon,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import type { ModelMetricsSummary } from '../types';

interface PatternsPageProps {
  modelMetrics: ModelMetricsSummary | null;
  onTrainModels: () => void;
  isTraining: boolean;
}

export const PatternsPage: React.FC<PatternsPageProps> = ({
  modelMetrics,
  onTrainModels,
  isTraining
}) => {
  const clusterMetrics = modelMetrics?.clustering;
  const anomalyMetrics = modelMetrics?.anomalies;
  const isTrained = clusterMetrics?.status === 'success';

  const clusterColors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

  const pcaPoints = useMemo(() => {
    return clusterMetrics?.sample_points || [];
  }, [clusterMetrics]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Unsupervised Machine Learning & Pattern Discovery</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pollution Patterns & Anomalies</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Discover multi-pollutant environmental regimes using K-Means clustering and detect potential extreme pollution anomalies using Isolation Forest.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isTrained ? (
            <div className="bg-slate-900 border border-slate-700/80 px-4 py-2 rounded-xl text-xs flex items-center space-x-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Optimal Clusters</span>
                <span className="text-teal-300 font-bold font-mono">K = {clusterMetrics.optimal_k}</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Silhouette Score</span>
                <span className="text-cyan-300 font-bold font-mono">{clusterMetrics.silhouette_score}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={onTrainModels}
              disabled={isTraining}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <Cpu className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Training...' : 'Train Clustering'}</span>
            </button>
          )}
        </div>
      </div>

      {isTrained ? (
        <div className="space-y-6">
          {/* PCA 2D Cluster Scatter Plot */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ScatterIcon className="w-4 h-4 text-cyan-400" />
                  <span>2D Principal Component Analysis (PCA) Projection</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dimensionality reduction of standardized multi-pollutant space into 2 principal components
                </p>
              </div>

              {/* Cluster Legend */}
              <div className="flex items-center space-x-3 text-xs flex-wrap gap-y-1">
                {clusterMetrics?.cluster_profiles?.map((prof, idx) => (
                  <span key={prof.cluster_id} className="flex items-center space-x-1.5 text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: clusterColors[idx % clusterColors.length] }}
                    />
                    <span>Cluster {prof.cluster_id}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="h-80 w-full">
              {pcaPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 15, bottom: 15, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      type="number"
                      dataKey="pca_x"
                      name="PCA Component 1"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Principal Component 1 (Primary Variance Axis)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="pca_y"
                      name="PCA Component 2"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Principal Component 2', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                    />
                    <ZAxis range={[25, 25]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any, name: any) => [val, name]}
                    />
                    <Scatter data={pcaPoints}>
                      {pcaPoints.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={clusterColors[entry.cluster % clusterColors.length]}
                          fillOpacity={0.8}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No PCA coordinates generated.
                </div>
              )}
            </div>
          </div>

          {/* Cluster Profile Comparison Cards */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-bold text-white">Cluster Profiles & Multi-Pollutant Signatures</h3>
              <p className="text-xs text-slate-400">Unscaled mean concentration baselines per discovered cluster</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {clusterMetrics?.cluster_profiles?.map((prof, idx) => {
                const color = clusterColors[idx % clusterColors.length];
                return (
                  <div
                    key={prof.cluster_id}
                    className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <h4 className="font-bold text-white text-sm">Cluster {prof.cluster_id}</h4>
                        </div>
                        <span className="text-xs font-mono font-semibold text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          {prof.percentage}% of data
                        </span>
                      </div>

                      <span className="text-xs text-slate-400 block mb-2 font-medium">
                        Mean Pollutant Levels:
                      </span>

                      <div className="space-y-1.5 text-xs font-mono">
                        {Object.entries(prof.means).map(([pol, val]) => (
                          <div key={pol} className="flex justify-between items-center py-0.5 border-b border-slate-800/40">
                            <span className="text-slate-400 font-sans">{pol}</span>
                            <span className="text-slate-200 font-semibold">{val !== null ? `${val} µg` : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-sans flex justify-between">
                      <span>Observations:</span>
                      <span className="font-mono text-slate-400">{prof.record_count.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anomaly Detection Section */}
          {anomalyMetrics && anomalyMetrics.status === 'success' && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-rose-400">
                  <Flame className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <h3 className="text-base font-bold text-white">
                    Isolation Forest Detected Anomalies ({anomalyMetrics.total_anomalies_detected} flagged events)
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Contamination Ratio: {(anomalyMetrics.contamination_rate! * 100).toFixed(0)}%
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                <strong className="text-slate-300">Methodological Clarification:</strong> Flagged records represent multivariate statistical outliers (extreme divergence from regular covariance structures). They are designated as <em>potential anomalies requiring investigation</em> rather than verified environmental violations.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">City</th>
                      <th className="p-2.5">Anomaly Score</th>
                      <th className="p-2.5">PM2.5</th>
                      <th className="p-2.5">PM10</th>
                      <th className="p-2.5">NO2</th>
                      <th className="p-2.5">SO2</th>
                      <th className="p-2.5">CO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                    {anomalyMetrics.anomalies?.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-slate-400">{row.date}</td>
                        <td className="p-2.5 text-white font-sans">{row.city}</td>
                        <td className="p-2.5 text-rose-400 font-bold">{row.anomaly_score}</td>
                        <td className="p-2.5 text-amber-300">{row['PM2.5'] ?? '—'}</td>
                        <td className="p-2.5">{row['PM10'] ?? '—'}</td>
                        <td className="p-2.5">{row['NO2'] ?? '—'}</td>
                        <td className="p-2.5">{row['SO2'] ?? '—'}</td>
                        <td className="p-2.5">{row['CO'] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
          Clustering model not trained yet.
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  Activity,
  MapPin,
  CloudFog,
  TrendingUp,
  BrainCircuit,
  Info,
  Database,
  Upload,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { MetricCard } from '../components/MetricCard';
import { EmptyDatasetState } from '../components/EmptyDatasetState';
import type { DatasetSummary, AnalysisSummary, ModelMetricsSummary } from '../types';

interface OverviewPageProps {
  summary: DatasetSummary | null;
  analysis: AnalysisSummary | null;
  modelMetrics: ModelMetricsSummary | null;
  onNavigate: (tab: string) => void;
  onOpenUpload: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  summary,
  analysis,
  modelMetrics,
  onNavigate,
  onOpenUpload
}) => {
  const trendsData = useMemo(() => {
    return analysis?.temporal_trends?.monthly_trends || [];
  }, [analysis]);

  const cityComparisonData = useMemo(() => {
    return analysis?.city_comparisons?.city_stats?.slice(0, 10) || [];
  }, [analysis]);

  const hasTrainedModels =
    modelMetrics?.status === 'completed' || modelMetrics?.regression?.status === 'success';

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Environmental Telemetry & Forecasting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AirGuard Intelligence Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time statistical synthesis of particulate matter, gaseous pollutants, and predictive air-quality indices.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {summary?.filename ? (
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Dataset</span>
              <span className="text-teal-300 font-mono font-medium">{summary.filename}</span>
            </div>
          ) : (
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV Dataset</span>
            </button>
          )}
        </div>
      </div>

      {/* Dataset Setup Card if Dataset is Missing */}
      {!summary && (
        <EmptyDatasetState onOpenUpload={onOpenUpload} />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Observations"
          value={summary?.total_records ? summary.total_records.toLocaleString() : '—'}
          unit={summary?.total_records ? 'Records' : undefined}
          subtitle={summary ? `Duplicates: ${summary.duplicate_records}` : 'Awaiting CSV ingest'}
          icon={Activity}
          badge={summary ? 'Verified' : 'Standby'}
          badgeColor={summary ? 'teal' : 'slate'}
        />

        <MetricCard
          title="Monitored Locations"
          value={summary?.cities_count ?? '—'}
          unit={summary?.cities_count ? 'Cities' : undefined}
          subtitle={summary?.cities?.[0] ? `e.g. ${summary.cities[0]}` : 'Multi-regional'}
          icon={MapPin}
          badge={summary ? 'Geographic' : 'Standby'}
          badgeColor={summary ? 'cyan' : 'slate'}
        />

        <MetricCard
          title="Mean PM2.5 Level"
          value={summary?.avg_pm25 ?? '—'}
          unit={summary?.avg_pm25 ? 'µg/m³' : undefined}
          subtitle="Particulate Fine Matter"
          icon={CloudFog}
          badge={summary?.avg_pm25 && summary.avg_pm25 > 60 ? 'Exceeds Standard' : 'Monitored'}
          badgeColor={summary?.avg_pm25 && summary.avg_pm25 > 60 ? 'rose' : 'teal'}
        />

        <MetricCard
          title="Mean AQI Index"
          value={summary?.avg_aqi ?? '—'}
          unit={summary?.avg_aqi ? 'Index' : undefined}
          subtitle={
            summary?.date_range?.end
              ? `Range: ${summary.date_range.start} → ${summary.date_range.end}`
              : 'Chronological'
          }
          icon={TrendingUp}
          badge={hasTrainedModels ? 'ML Ready' : 'Training Pending'}
          badgeColor={hasTrainedModels ? 'teal' : 'amber'}
        />
      </div>

      {/* Interpretation & Key Findings Box (when data computed) */}
      {analysis?.interpretations && analysis.interpretations.length > 0 && (
        <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 text-cyan-400 text-sm font-semibold mb-3">
            <Info className="w-4 h-4" />
            <span>Automated Statistical Interpretations</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
            {analysis.interpretations.map((interp, idx) => (
              <div key={idx} className="flex items-start space-x-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{interp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section: Historical Trends & City Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-Series Monthly Trends (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm min-h-[360px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Historical Pollutant Trends</span>
              </h3>
              <p className="text-xs text-slate-400">Monthly mean concentrations for PM2.5, PM10, and AQI</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>PM2.5</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>PM10</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>AQI</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full flex-1">
            {trendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="YearMonth" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                  />
                  <Line type="monotone" dataKey="PM2.5" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="PM10" stroke="#c084fc" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="AQI" stroke="#fbbf24" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
                <span>Time-series observations will render here automatically upon CSV upload.</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Polluted Cities Bar Chart (Takes 1 col) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm min-h-[360px]">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>Urban PM2.5 Ranking</span>
            </h3>
            <p className="text-xs text-slate-400">Top monitored cities by mean PM2.5 (µg/m³)</p>
          </div>

          <div className="h-64 w-full flex-1">
            {cityComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityComparisonData} layout="vertical" margin={{ top: 5, right: 15, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="city" stroke="#64748b" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} µg/m³`, 'Mean PM2.5']}
                  />
                  <Bar dataKey="PM2.5_mean" radius={[0, 4, 4, 0]}>
                    {cityComparisonData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#f43f5e' : '#0ea5e9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                <MapPin className="w-8 h-8 text-slate-600 mb-2" />
                <span>City geographic comparisons will be calculated from active records.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pollutant Correlation & Quick Action Callouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AQI Correlation Insights (1 col) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-1">
            <BrainCircuit className="w-4 h-4 text-teal-400" />
            <span>Pollutant vs. AQI Correlation</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Linear Pearson correlation coefficients with AQI</p>

          <div className="space-y-3">
            {analysis?.correlations?.aqi_correlations &&
            Object.keys(analysis.correlations.aqi_correlations).length > 0 ? (
              Object.entries(analysis.correlations.aqi_correlations).slice(0, 5).map(([pollutant, corr]) => {
                const pct = Math.abs(corr) * 100;
                return (
                  <div key={pollutant} className="text-xs">
                    <div className="flex justify-between font-medium mb-1">
                      <span className="text-slate-300">{pollutant}</span>
                      <span className="text-teal-400 font-mono font-semibold">r = {corr}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-cyan-400 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2.5 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>PM2.5 (Typical)</span>
                  <span className="text-cyan-400 font-mono font-semibold">r ≈ 0.88</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>PM10 (Typical)</span>
                  <span className="text-cyan-400 font-mono font-semibold">r ≈ 0.82</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>NO2 (Typical)</span>
                  <span className="text-cyan-400 font-mono font-semibold">r ≈ 0.65</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>CO (Typical)</span>
                  <span className="text-cyan-400 font-mono font-semibold">r ≈ 0.58</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Launchpad Cards (2 cols) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => onNavigate('predict')}
            className="bg-gradient-to-br from-slate-900 to-[#0f172a] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                <span>PM2.5 Forecasting Lab</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Test next-day PM2.5 predictive models using historical chronological lag features with Linear Regression and Random Forest.
              </p>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold mt-4 block">Launch Interactive Predictor →</span>
          </div>

          <div
            onClick={() => onNavigate('classify')}
            className="bg-gradient-to-br from-slate-900 to-[#0f172a] border border-slate-800 hover:border-teal-500/40 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors flex items-center justify-between">
                <span>AQI Classification</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Classify air-quality categories (Good to Severe) strictly from raw pollutant concentrations without target leakage.
              </p>
            </div>
            <span className="text-[11px] text-teal-400 font-semibold mt-4 block">Run Category Classifier →</span>
          </div>
        </div>
      </div>
    </div>
  );
};

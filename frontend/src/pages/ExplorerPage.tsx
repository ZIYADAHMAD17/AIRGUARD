import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Table,
  BarChart2,
  SlidersHorizontal,
  Upload,
  Calendar,
  Filter
} from 'lucide-react';
import { api } from '../api';
import type { DatasetStatus, DatasetSummary, PaginatedReadings } from '../types';

interface ExplorerPageProps {
  status: DatasetStatus | null;
  summary: DatasetSummary | null;
  onRefresh: () => void;
  onOpenUpload: () => void;
}

export const ExplorerPage: React.FC<ExplorerPageProps> = ({
  status,
  summary,
  onRefresh,
  onOpenUpload
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'schema' | 'stats'>('table');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Date');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [readings, setReadings] = useState<PaginatedReadings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load paginated records
  const fetchRecords = async () => {
    if (!status?.dataset_present) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getReadings({
        page,
        page_size: pageSize,
        city: selectedCity,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_by: sortBy,
        sort_desc: sortDesc
      });
      setReadings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load readings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, pageSize, selectedCity, sortBy, sortDesc, status?.dataset_present]);

  // Handle dataset switching
  const handleSelectDataset = async (filename: string) => {
    try {
      await api.selectDataset(filename);
      onRefresh();
      setPage(1);
    } catch (err: any) {
      alert(`Failed to activate dataset: ${err.message}`);
    }
  };

  // Export filtered readings to CSV client-side
  const handleExportCSV = () => {
    if (!readings?.records || readings.records.length === 0) return;
    const headers = Object.keys(readings.records[0]);
    const csvContent = [
      headers.join(','),
      ...readings.records.map((row) =>
        headers.map((h) => `"${row[h] !== null && row[h] !== undefined ? row[h] : ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airguard_readings_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns =
    summary?.columns.map((c) => c.name) ||
    (readings?.records?.[0]
      ? Object.keys(readings.records[0])
      : ['Date', 'City', 'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'AQI', 'AQI_Bucket']);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Dataset Architecture & Inspection</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dataset Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, audit missing attributes, and inspect granular environmental observations.
          </p>
        </div>

        {/* Dataset Switching Dropdown & Upload Action */}
        <div className="flex flex-wrap items-center gap-3">
          {status?.available_files && status.available_files.length > 1 && (
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400">Dataset:</span>
              <select
                value={status.active_filename || ''}
                onChange={(e) => handleSelectDataset(e.target.value)}
                className="bg-transparent text-teal-300 font-semibold focus:outline-none cursor-pointer"
              >
                {status.available_files.map((f) => (
                  <option key={f.filename} value={f.filename} className="bg-slate-900 text-white">
                    {f.filename} ({f.size_formatted})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span>Upload CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'table'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Observation Records ({summary?.total_records?.toLocaleString() ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'schema'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Schema & Null Value Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'stats'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Statistical Distributions</span>
        </button>
      </div>

      {/* Tab 1: Paginated Observation Table */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* City Filter */}
              {summary?.cities && summary.cities.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">City:</span>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="ALL">All Cities ({summary.cities.length})</option>
                    {summary.cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Filters */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
                />
                <span className="text-xs text-slate-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
                />
              </div>

              {/* Rows Per Page */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Download current page records as CSV"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Export Page CSV</span>
              </button>
              <button
                onClick={fetchRecords}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs cursor-pointer"
                title="Refresh table"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[580px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-800 shadow-sm">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        onClick={() => {
                          if (sortBy === col) {
                            setSortDesc(!sortDesc);
                          } else {
                            setSortBy(col);
                            setSortDesc(true);
                          }
                        }}
                        className="p-3 whitespace-nowrap cursor-pointer hover:text-cyan-400 transition-colors select-none"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{col}</span>
                          {sortBy === col && (
                            <span className="text-[10px] text-cyan-400">{sortDesc ? '▼' : '▲'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {readings?.records && readings.records.length > 0 ? (
                    readings.records.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        {columns.map((col) => {
                          const val = row[col];
                          const isNull = val === null || val === undefined || val === '';
                          return (
                            <td key={col} className="p-3 whitespace-nowrap align-middle">
                              {isNull ? (
                                <span className="text-slate-600 font-sans italic">null</span>
                              ) : col === 'AQI_Bucket' ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium inline-block ${val === 'Good'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : val === 'Satisfactory'
                                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                        : val === 'Moderate'
                                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                          : val === 'Poor'
                                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}
                                >
                                  {val}
                                </span>
                              ) : (
                                <span>{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length || 1} className="p-8 text-center text-slate-500 font-sans">
                        {isLoading ? 'Loading records...' : 'No observations found matching the specified filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {readings && readings.total_pages > 1 && (
              <div className="bg-slate-900/90 px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, readings.total_records)} of{' '}
                  <span className="font-semibold text-white">{readings.total_records.toLocaleString()}</span> observations
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1 || isLoading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-slate-300 font-medium px-2">
                    Page {page} of {readings.total_pages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(readings.total_pages, page + 1))}
                    disabled={page === readings.total_pages || isLoading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Schema & Missing-Value Audit Table */}
      {activeTab === 'schema' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden p-5 shadow-sm">
          <div className="mb-4 pb-2 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Attribute Schema & Missing Value Audit</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Honest data quality report: missing values are detected and documented without fabrication.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Attribute Name</th>
                  <th className="p-3">Data Type</th>
                  <th className="p-3">Non-Null Records</th>
                  <th className="p-3">Missing Records</th>
                  <th className="p-3">Missing Percentage</th>
                  <th className="p-3">Data Quality Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300 font-mono">
                {summary?.columns.map((col) => {
                  const pct = col.null_percentage;
                  const isHighMissing = pct > 30;
                  return (
                    <tr key={col.name} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{col.name}</td>
                      <td className="p-3 text-cyan-400">{col.dtype}</td>
                      <td className="p-3">{col.non_null_count.toLocaleString()}</td>
                      <td className="p-3 text-slate-400">{col.null_count.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <span className={isHighMissing ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                            {pct}%
                          </span>
                          <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${pct === 0 ? 'bg-emerald-400' : isHighMissing ? 'bg-amber-400' : 'bg-cyan-400'
                                }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-sans">
                        {pct === 0 ? (
                          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium inline-block">
                            Complete (100%)
                          </span>
                        ) : isHighMissing ? (
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium inline-block">
                            Sparse (&gt;30% null)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full inline-block">
                            Acceptable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Summary Statistics (Min, Max, Mean, Median, Quartiles) */}
      {activeTab === 'stats' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden p-5 shadow-sm">
          <div className="mb-4 pb-2 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Descriptive Statistics for Numeric Features</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Parametric and non-parametric dispersion metrics computed directly from valid observations.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Feature</th>
                  <th className="p-3">Mean</th>
                  <th className="p-3">Std Dev</th>
                  <th className="p-3">Min</th>
                  <th className="p-3">25% (Q1)</th>
                  <th className="p-3">50% (Median)</th>
                  <th className="p-3">75% (Q3)</th>
                  <th className="p-3">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300 font-mono">
                {summary?.columns
                  .filter((c) => c.is_numeric && c.mean !== undefined)
                  .map((col) => (
                    <tr key={col.name} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-cyan-300">{col.name}</td>
                      <td className="p-3">{col.mean}</td>
                      <td className="p-3 text-slate-400">{col.std}</td>
                      <td className="p-3 text-slate-400">{col.min}</td>
                      <td className="p-3">{col.q25}</td>
                      <td className="p-3 font-semibold text-white">{col.median}</td>
                      <td className="p-3">{col.q75}</td>
                      <td className="p-3 text-amber-300">{col.max}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

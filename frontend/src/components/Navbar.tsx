import React from 'react';
import {
  Activity,
  Database,
  BarChart3,
  BrainCircuit,
  Layers,
  FileText,
  Upload,
  Cpu
} from 'lucide-react';
import type { DatasetStatus } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  datasetStatus: DatasetStatus | null;
  onOpenUpload: () => void;
  onTrain: () => void;
  isTraining: boolean;
  backendOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  datasetStatus,
  onOpenUpload,
  onTrain,
  isTraining,
  backendOnline
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'explorer', label: 'Explorer', icon: Database },
    { id: 'predict', label: 'Predict PM2.5', icon: Activity },
    { id: 'classify', label: 'AQI Classify', icon: BrainCircuit },
    { id: 'patterns', label: 'Patterns', icon: Layers },
    { id: 'evaluation', label: 'Evaluation', icon: Cpu },
    { id: 'about', label: 'Project Info', icon: FileText }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0 select-none"
            onClick={() => setCurrentTab('overview')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Activity className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight text-white">AirGuard</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded">
                  ML
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block -mt-0.5">Air Pollution Telemetry</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 flex-shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Backend Connectivity Status */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                backendOnline
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
              title={backendOnline ? 'FastAPI Backend Online (127.0.0.1:8000)' : 'FastAPI Backend Offline'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="hidden xl:inline">{backendOnline ? 'API Ready' : 'API Offline'}</span>
            </div>

            {/* Dataset Pill */}
            <div
              className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
                datasetStatus?.dataset_present
                  ? 'bg-slate-800/80 text-teal-300 border-slate-700'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}
              title={datasetStatus?.dataset_present ? `Active file: ${datasetStatus.active_filename}` : 'No CSV loaded in data/'}
            >
              <Database className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[110px]">
                {datasetStatus?.dataset_present ? datasetStatus.active_filename : 'No CSV'}
              </span>
            </div>

            {/* Quick Upload Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
              title="Upload CSV dataset"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Train Models Trigger */}
            <button
              onClick={onTrain}
              disabled={isTraining}
              className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                isTraining
                  ? 'bg-cyan-500/50 text-white cursor-wait'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 shadow-sm shadow-cyan-500/20'
              }`}
              title="Execute ML training pipeline"
            >
              <Cpu className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Training...' : 'Train ML'}</span>
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Sub-Navigation Bar */}
        <div className="md:hidden flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-1 whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

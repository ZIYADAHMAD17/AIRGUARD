import React from 'react';
import { Upload, FolderCheck, AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface EmptyDatasetStateProps {
  onOpenUpload: () => void;
}

export const EmptyDatasetState: React.FC<EmptyDatasetStateProps> = ({ onOpenUpload }) => {
  return (
    <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6 sm:p-8 w-full shadow-xl">
      <div className="flex items-start sm:items-center space-x-3 text-amber-400 mb-4">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">No Air Pollution Dataset Detected</h2>
          <p className="text-xs text-amber-300/80">Insert or upload your dataset to activate telemetry analytics</p>
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-6">
        AirGuard operates strictly on real data science principles and does not fabricate measurements or synthetic statistics. To activate the monitoring dashboard, statistical exploratory analysis, and machine-learning models, please provide your CSV dataset.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Option A: Workspace Folder */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-sm font-semibold text-teal-400 mb-2">
              <FolderCheck className="w-4 h-4 flex-shrink-0" />
              <span>Option A: Place CSV in Workspace</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Copy your air quality CSV (e.g. <code className="text-teal-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">city_day.csv</code>) into the project folder:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 break-all select-all">
              AirGuard/data/city_day.csv
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-3 block">
            Supports standard columns: Date, City, PM2.5, PM10, NO2, SO2, CO, O3, AQI, AQI_Bucket
          </span>
        </div>

        {/* Option B: Browser Upload */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-sm font-semibold text-cyan-400 mb-2">
              <Upload className="w-4 h-4 flex-shrink-0" />
              <span>Option B: Upload via Browser</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Upload your air pollution CSV immediately through the secure web uploader. The backend will validate the columns and refresh all analyses automatically.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-semibold text-xs py-2.5 px-4 rounded-lg transition-all shadow-md shadow-cyan-500/10 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload CSV Dataset Now</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-400">
        <FileSpreadsheet className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-slate-300 block mb-0.5">Compatible Datasets</span>
          The system is optimized for Indian Urban Air Quality (CPCB / Kaggle city_day.csv) as well as EPA/international daily station monitoring CSVs.
        </div>
      </div>
    </div>
  );
};

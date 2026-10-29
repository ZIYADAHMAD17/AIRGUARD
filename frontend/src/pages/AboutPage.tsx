import React from 'react';
import {
  Activity,
  Layers,
  BrainCircuit,
  Terminal,
  Code2,
  Cpu,
  BookOpen
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <BookOpen className="w-4 h-4" />
          <span>Academic Mini-Project Documentation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          AirGuard: Air Pollution Monitoring & Predictive Analytics
        </h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Course Domain: <span className="text-teal-300 font-semibold">Essentials of Data Science</span> | Full-Stack Machine Learning Architecture
        </p>
      </div>

      {/* Aim & Problem Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Project Aim</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            To build an end-to-end, scientifically defensible data science application capable of monitoring historical air pollution dynamics, engineering chronological predictive models for PM2.5 forecasting, classifying air quality categories without target leakage, and discovering multi-pollutant environmental clusters.
          </p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span>Problem Statement</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Urban air pollution, predominantly fine particulate matter (PM2.5), poses severe public health threats. Conventional air monitoring systems provide only retrospective telemetry. AirGuard bridges the gap by transforming retrospective data into chronological predictive intelligence.
          </p>
        </div>
      </div>

      {/* Machine Learning Architecture Grid */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Algorithms & Analytical Methodologies</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-bold text-cyan-300 block mb-1">1. Baseline Regression</span>
              <p className="text-slate-400 leading-relaxed mb-3">
                Ordinary Least Squares (OLS) Linear Regression serves as a parsimonious, interpretable baseline to establish minimum acceptable predictive performance.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Metrics: MAE, RMSE, R²</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-bold text-teal-300 block mb-1">2. Ensemble Forecasting</span>
              <p className="text-slate-400 leading-relaxed mb-3">
                Random Forest Regressor captures nonlinear interactions across engineered lag features (PM2.5_lag1, PM2.5_lag2, rolling 3-day mean) and calendar signals.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">100 Trees, Max Depth 12</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-bold text-purple-300 block mb-1">3. AQI Classification</span>
              <p className="text-slate-400 leading-relaxed mb-3">
                Random Forest Classifier fitted with class-balanced weighting to predict standard health buckets (Good to Severe) strictly from ambient concentrations.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">No Target Leakage</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="font-bold text-amber-300 block mb-1">4. Unsupervised Clustering</span>
              <p className="text-slate-400 leading-relaxed mb-3">
                K-Means clustering on standardized multi-pollutant space with silhouette validation and 2D Principal Component Analysis (PCA) projection.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">K=2 to 5 Optimization</span>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-teal-400" />
          <span>Technology Stack</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center text-xs">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Backend</span>
            <span className="text-white font-bold mt-1 block">FastAPI</span>
            <span className="text-slate-500 text-[10px]">Python 3.12</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Frontend</span>
            <span className="text-white font-bold mt-1 block">React 19</span>
            <span className="text-slate-500 text-[10px]">Vite + TS</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Styling</span>
            <span className="text-white font-bold mt-1 block">Tailwind CSS</span>
            <span className="text-slate-500 text-[10px]">Dark Analytics</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Machine Learning</span>
            <span className="text-white font-bold mt-1 block">Scikit-Learn</span>
            <span className="text-slate-500 text-[10px]">Joblib Serialization</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Data Processing</span>
            <span className="text-white font-bold mt-1 block">Pandas & NumPy</span>
            <span className="text-slate-500 text-[10px]">Vectorized Stats</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Charts</span>
            <span className="text-white font-bold mt-1 block">Recharts</span>
            <span className="text-slate-500 text-[10px]">Matplotlib / Seaborn</span>
          </div>
        </div>
      </div>

      {/* Step-by-Step Reproduction Guide */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-3 flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Execution & Reproduction Commands</span>
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-sans font-medium mb-1">1. Run backend automated test suite:</span>
            <span className="text-teal-400">python -m pytest tests/test_backend.py -v</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-sans font-medium mb-1">2. Run standalone exploratory analysis:</span>
            <span className="text-teal-400">python -m backend.analysis</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-sans font-medium mb-1">3. Run machine learning training pipeline:</span>
            <span className="text-teal-400">python -m backend.train_models</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-sans font-medium mb-1">4. Start FastAPI REST server:</span>
            <span className="text-teal-400">uvicorn backend.main:app --reload --port 8000</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-sans font-medium mb-1">5. Start Vite React development server:</span>
            <span className="text-cyan-400">cd frontend && npm run dev</span>
          </div>
        </div>
      </div>
    </div>
  );
};


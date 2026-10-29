import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { UploadModal } from './components/UploadModal';
import { OverviewPage } from './pages/OverviewPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { PredictionPage } from './pages/PredictionPage';
import { ClassificationPage } from './pages/ClassificationPage';
import { PatternsPage } from './pages/PatternsPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { AboutPage } from './pages/AboutPage';
import { api } from './api';
import type { DatasetStatus, DatasetSummary, AnalysisSummary, ModelMetricsSummary } from './types';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [datasetStatus, setDatasetStatus] = useState<DatasetStatus | null>(null);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetricsSummary | null>(null);

  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Fetch initial telemetry and dataset state
  const loadAppState = useCallback(async () => {
    try {
      await api.getHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }

    try {
      const statusData = await api.getDatasetStatus();
      setDatasetStatus(statusData);

      if (statusData.dataset_present) {
        try {
          const sumData = await api.getSummary();
          setSummary(sumData);
        } catch (e) {
          console.warn('Failed to load summary', e);
        }

        try {
          const anaData = await api.getAnalysis();
          setAnalysis(anaData);
        } catch (e) {
          console.warn('Failed to load analysis', e);
        }

        try {
          const metData = await api.getModelMetrics();
          setModelMetrics(metData);
        } catch (e) {
          console.warn('Failed to load model metrics', e);
        }
      } else {
        setSummary(null);
        setAnalysis(null);
        setModelMetrics(null);
      }
    } catch (err: any) {
      console.error('Error loading app state:', err);
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadAppState();
  }, [loadAppState]);

  // Handle Model Training trigger
  const handleTrainModels = async () => {
    if (!datasetStatus?.dataset_present) {
      showNotification('error', 'Cannot train models: No CSV dataset found. Please insert or upload your dataset.');
      setIsUploadOpen(true);
      return;
    }

    setIsTraining(true);
    try {
      await api.trainModels();
      showNotification('success', 'Model training completed successfully! Metrics and predictions updated.');
      await loadAppState();
    } catch (err: any) {
      showNotification('error', `Model training error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handleUploadSuccess = (filename: string) => {
    showNotification('success', `Dataset '${filename}' uploaded and activated!`);
    loadAppState();
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        datasetStatus={datasetStatus}
        onOpenUpload={() => setIsUploadOpen(true)}
        onTrain={handleTrainModels}
        isTraining={isTraining}
        backendOnline={backendOnline}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoadingInitial ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs text-slate-400 font-mono tracking-wide">
              Connecting to AirGuard Telemetry Engine...
            </span>
          </div>
        ) : !backendOnline ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 max-w-xl mx-auto my-12 text-center shadow-lg">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">FastAPI Backend Server Offline</h2>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Unable to establish a connection with the Python backend server at{' '}
              <code className="text-rose-300 font-mono">http://127.0.0.1:8000</code>.
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 mb-4 text-left">
              uvicorn backend.main:app --reload --port 8000
            </div>
            <button
              onClick={loadAppState}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'overview' && (
              <OverviewPage
                summary={summary}
                analysis={analysis}
                modelMetrics={modelMetrics}
                onNavigate={(t) => setCurrentTab(t)}
                onOpenUpload={() => setIsUploadOpen(true)}
              />
            )}
            {currentTab === 'explorer' && (
              <ExplorerPage
                status={datasetStatus}
                summary={summary}
                onRefresh={loadAppState}
                onOpenUpload={() => setIsUploadOpen(true)}
              />
            )}
            {currentTab === 'predict' && (
              <PredictionPage
                modelMetrics={modelMetrics}
                summary={summary}
                onNavigateToEvaluation={() => setCurrentTab('evaluation')}
                onTrainModels={handleTrainModels}
                isTraining={isTraining}
              />
            )}
            {currentTab === 'classify' && (
              <ClassificationPage
                modelMetrics={modelMetrics}
                summary={summary}
                onTrainModels={handleTrainModels}
                isTraining={isTraining}
              />
            )}
            {currentTab === 'patterns' && (
              <PatternsPage
                modelMetrics={modelMetrics}
                onTrainModels={handleTrainModels}
                isTraining={isTraining}
              />
            )}
            {currentTab === 'evaluation' && (
              <EvaluationPage
                modelMetrics={modelMetrics}
                onTrainModels={handleTrainModels}
                isTraining={isTraining}
              />
            )}
            {currentTab === 'about' && <AboutPage />}
          </>
        )}
      </main>

      {/* CSV Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0f172a]/60 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">AirGuard Analytics System</span>
            <span>•</span>
            <span>College Mini-Project in Essentials of Data Science</span>
          </div>
          <div>
            FastAPI + Scikit-Learn + React + Tailwind CSS. Zero fabricated statistics.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

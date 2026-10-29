import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (filename: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSet(e.target.files[0]);
    }
  };

  const validateAndSet = (file: File) => {
    setError(null);
    setSuccessMsg(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only .csv files are supported.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds maximum allowed limit (100MB).');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.uploadDataset(selectedFile);
      setSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess(res.filename);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to upload dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Upload Air Pollution Dataset</h3>
            <p className="text-xs text-slate-400">Select or drop your CSV file into the workspace</p>
          </div>
        </div>

        {/* Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />

          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-200">
            Drag and drop your <span className="text-cyan-400 font-semibold">.csv</span> file here
          </p>
          <p className="text-xs text-slate-400 mt-1">or click to browse your computer (Max 100MB)</p>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 truncate">
              <FileSpreadsheet className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-200 truncate">{selectedFile.name}</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="text-slate-400 hover:text-rose-400 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
              !selectedFile || isUploading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 shadow-md shadow-cyan-500/20'
            }`}
          >
            {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isUploading ? 'Uploading & Validating...' : 'Upload Dataset'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


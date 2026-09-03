import React, { useState, useRef } from 'react';
import { CURRENCIES } from '../constants/currencies';
import { validateImportData } from '../utils/validation';
import { 
  X, 
  Settings, 
  Moon, 
  Sun, 
  Monitor, 
  Upload, 
  Trash2, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText,
  Database,
  CheckCircle2
} from 'lucide-react';

export const SettingsModal = ({
  isOpen,
  settings,
  onUpdateSettings,
  onExportExcel,
  onExportPDF,
  onExportJSON,
  onImportData,
  onResetSampleData,
  onRequestClearAll,
  onClose,
}) => {
  const fileInputRef = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');
  const [importMode, setImportMode] = useState('replace');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const validation = validateImportData(parsed);
        if (!validation.isValid) {
          setImportError(validation.message);
          setImportPreview(null);
        } else {
          setImportPreview({
            data: parsed,
            summary: validation.summary,
            fileName: file.name,
          });
        }
      } catch (err) {
        setImportError('Invalid JSON format: Could not parse file.');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!importPreview?.data) return;
    onImportData(importPreview.data, importMode);
    setImportPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in-scale">
      <div 
        role="dialog" 
        aria-modal="true" 
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full max-h-[90vh] flex flex-col text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">Settings & Preferences</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* 1. Theme Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
                { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5 text-blue-400" /> },
                { id: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5 text-neutral-400" /> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border font-medium transition-all ${
                    settings.theme === t.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Currency Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Currency
            </label>
            <select
              value={settings.currency || 'INR'}
              onChange={(e) => onUpdateSettings({ currency: e.target.value })}
              className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Export Reports */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Export Monthly Reports
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportExcel}
                className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                onClick={onExportPDF}
                className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-red-600" />
                <span>PDF Document</span>
              </button>
            </div>
          </div>

          {/* 4. Data Backup & Reset */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Data Management
            </label>
            
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">JSON Backup</h4>
                  <p className="text-[11px] text-neutral-400">Download all records as JSON.</p>
                </div>
                <button
                  onClick={onExportJSON}
                  className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 flex items-center gap-1"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Import Backup</h4>
                  <p className="text-[11px] text-neutral-400">Restore from JSON backup file.</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 rounded-lg font-medium flex items-center gap-1 border border-neutral-300 dark:border-neutral-600"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Import Preview */}
              {importPreview && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2 animate-fade-in-scale">
                  <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-300 font-semibold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>File: {importPreview.fileName}</span>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setImportPreview(null)}
                      className="px-2 py-0.5 text-xs text-neutral-500 rounded border border-neutral-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      className="px-2.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Confirm Import
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Load Demo Dataset</h4>
                  <p className="text-[11px] text-neutral-400">Populate realistic test records.</p>
                </div>
                <button
                  onClick={() => {
                    onResetSampleData();
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 rounded-lg font-medium border border-neutral-300 dark:border-neutral-600 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Load</span>
                </button>
              </div>

              <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/20 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-red-600 dark:text-red-400">Clear All Records</h4>
                  <p className="text-[11px] text-neutral-400">Erase all meal and expense data.</p>
                </div>
                <button
                  onClick={onRequestClearAll}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

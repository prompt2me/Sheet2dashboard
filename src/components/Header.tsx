import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  RotateCcw,
  Layers,
  Mail,
} from 'lucide-react';
import { DashboardSpec, QualityStatus } from '../types/dashboard';

interface HeaderProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  datasetName?: string;
  rowCount?: number;
  qualityStatus?: QualityStatus;
  spec: DashboardSpec | null;
  onSaveSpec: () => void;
  onLoadSpec: (spec: DashboardSpec) => void;
  onReset: () => void;
  onOpenGmailSync?: () => void;
  gmailConnected?: boolean;
  gmailUserEmail?: string;
  subscriberCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onSelectStep,
  datasetName,
  rowCount,
  qualityStatus,
  spec,
  onSaveSpec,
  onLoadSpec,
  onReset,
  onOpenGmailSync,
  gmailConnected = false,
  gmailUserEmail,
  subscriberCount = 0,
}) => {
  const steps = [
    { num: 1, label: 'Upload & Review' },
    { num: 2, label: 'Quality & Audit' },
    { num: 3, label: 'Visuals & Spec' },
    { num: 4, label: 'Live Preview' },
    { num: 5, label: 'Export & Delivery QA' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          onLoadSpec(json);
        } catch {
          alert('Invalid dashboard specification JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const getStatusBadge = () => {
    if (!qualityStatus) return null;
    switch (qualityStatus) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Audit: Ready
          </span>
        );
      case 'ready_with_caveats':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Ready with Caveats
          </span>
        );
      case 'needs_cleaning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            Needs Cleaning
          </span>
        );
      case 'unsafe':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Unsafe for Interpretation
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white">Sheet2Dashboard</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Formula-Driven BI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Transform CSVs, XLSX & table images into production-grade Excel dashboards
            </p>
          </div>
        </div>

        {/* Dataset Meta & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {datasetName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-200 font-medium truncate max-w-[160px]">{datasetName}</span>
              {rowCount !== undefined && (
                <span className="text-slate-400">({rowCount.toLocaleString()} rows)</span>
              )}
              {getStatusBadge()}
            </div>
          )}

          {/* Gmail Subscriber Sync Button */}
          {onOpenGmailSync && (
            <button
              onClick={onOpenGmailSync}
              title="Manage Gmail integration and send subscribers to your inbox"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                gmailConnected
                  ? 'bg-blue-600/25 border-blue-500/50 text-blue-200 hover:bg-blue-600/35'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Mail className={`w-3.5 h-3.5 ${gmailConnected ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{gmailConnected ? (gmailUserEmail ? `Gmail: ${gmailUserEmail.split('@')[0]}` : 'Gmail Connected') : 'Connect Gmail'}</span>
              {subscriberCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                  {subscriberCount}
                </span>
              )}
            </button>
          )}

          {spec && (
            <button
              onClick={onSaveSpec}
              title="Save current dashboard specification to JSON"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Save Spec
            </button>
          )}

          <label
            title="Load an existing dashboard specification JSON"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Load Spec
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          {datasetName && (
            <button
              onClick={onReset}
              title="Start over with a new dataset"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Step Navigation Pill Bar */}
      <div className="bg-slate-950/70 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none py-0.5">
          <nav className="flex items-center space-x-1 sm:space-x-3 text-xs">
            {steps.map((s, idx) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              const isAvailable = datasetName ? true : s.num === 1;

              return (
                <React.Fragment key={s.num}>
                  <button
                    disabled={!isAvailable}
                    onClick={() => onSelectStep(s.num)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                        : isPast
                        ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isActive
                          ? 'bg-white text-blue-600 font-bold'
                          : isPast
                          ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isPast ? '✓' : s.num}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className="w-4 h-[1px] bg-slate-800 hidden sm:block" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="text-[11px] text-slate-400 hidden md:block">
            Step {currentStep} of {steps.length}
          </div>
        </div>
      </div>
    </header>
  );
};

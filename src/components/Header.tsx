import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  RotateCcw,
  Layers,
  Globe,
  UserX,
} from 'lucide-react';
import { DashboardSpec, QualityStatus } from '../types/dashboard';
import { AppLanguage, getTranslation } from '../utils/i18n';

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
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  subscriberEmail?: string;
  onReturnToNewUser?: () => void;
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
  language,
  onLanguageChange,
  subscriberEmail,
  onReturnToNewUser,
}) => {
  const t = getTranslation(language);

  const steps = [
    { num: 1, label: t.step1 },
    { num: 2, label: t.step2 },
    { num: 3, label: t.step3 },
    { num: 4, label: t.step4 },
    { num: 5, label: t.step5 },
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
            {t.auditReady}
          </span>
        );
      case 'ready_with_caveats':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {t.auditCaveats}
          </span>
        );
      case 'needs_cleaning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            {t.auditNeedsCleaning}
          </span>
        );
      case 'unsafe':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            {t.auditUnsafe}
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
                {t.brandTag}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Header Right Actions: French / English Switcher & Dataset Meta */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* French / English Version Switcher */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs font-semibold shadow-inner">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1 shrink-0" />
            <button
              type="button"
              onClick={() => onLanguageChange('fr')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                language === 'fr'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Basculer vers la version française"
            >
              <span>French</span>
            </button>
            <span className="text-slate-500 text-[11px] px-1 select-none font-bold">/</span>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Switch to English version"
            >
              <span>English</span>
            </button>
          </div>

          {datasetName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-200 font-medium truncate max-w-[160px]">{datasetName}</span>
              {rowCount !== undefined && (
                <span className="text-slate-400">({rowCount.toLocaleString()} {t.rows})</span>
              )}
              {getStatusBadge()}
            </div>
          )}

          {spec && (
            <button
              onClick={onSaveSpec}
              title={t.saveSpec}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              {t.saveSpec}
            </button>
          )}

          <label
            title={t.loadSpec}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            {t.loadSpec}
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          {datasetName && (
            <button
              onClick={onReset}
              title={t.reset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.reset}
            </button>
          )}

          {/* Active Subscriber Indicator */}
          {subscriberEmail && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span className="text-slate-400 text-[11px]">{t.subscriberActive}:</span>
              <span className="font-mono text-[11px] text-slate-200 truncate max-w-[120px]">{subscriberEmail}</span>
            </div>
          )}

          {/* Return to New User Option */}
          {onReturnToNewUser && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t.confirmReturnToNewUser)) {
                  onReturnToNewUser();
                }
              }}
              title={t.returnToNewUserTooltip}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 transition cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.returnToNewUser}</span>
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

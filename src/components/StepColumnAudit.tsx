import React, { useState } from 'react';
import {
  ColumnProfile,
  ColumnDataType,
  DataQualityAudit,
  BusinessTemplate,
  QualityStatus,
  PiiRedactionMethod,
  PiiType,
} from '../types/dashboard';
import { redactCellValue } from '../utils/piiRedactor';
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Hash,
  Calendar,
  Layers,
  DollarSign,
  Percent,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  Tag,
  Info,
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  EyeOff,
} from 'lucide-react';

interface StepColumnAuditProps {
  columns: ColumnProfile[];
  audit: DataQualityAudit;
  template: BusinessTemplate;
  onUpdateColumn: (index: number, updates: Partial<ColumnProfile>) => void;
  onUpdateTemplate: (template: BusinessTemplate) => void;
  onProceed: () => void;
  onBack: () => void;
}

const DATA_TYPES: { type: ColumnDataType; label: string; icon: any }[] = [
  { type: 'categorical', label: 'Categorical Dimension', icon: Layers },
  { type: 'numeric', label: 'Numeric Measure', icon: Hash },
  { type: 'currency', label: 'Currency ($/€/£)', icon: DollarSign },
  { type: 'date', label: 'Date / Time', icon: Calendar },
  { type: 'percentage', label: 'Percentage (%)', icon: Percent },
  { type: 'count', label: 'Count / Quantity', icon: Hash },
  { type: 'target', label: 'Target / Quota', icon: TrendingUp },
  { type: 'identifier', label: 'Identifier / ID', icon: Tag },
  { type: 'text', label: 'Free Text', icon: Info },
  { type: 'boolean', label: 'Boolean (Yes/No)', icon: CheckCircle2 },
];

const TEMPLATES: { id: BusinessTemplate; label: string; desc: string }[] = [
  { id: 'generic', label: 'Generic Explorer', desc: 'Auto-adapts to arbitrary business data' },
  { id: 'sales', label: 'Commercial Sales', desc: 'Deals, quotas, revenue attainment & top accounts' },
  { id: 'inventory', label: 'Inventory & Materials', desc: 'Stock on hand, unit-level reorder flags & valuation' },
  { id: 'finance', label: 'Finance & Expense', desc: 'Budgets, actual vs forecast variance & cost centers' },
  { id: 'operations', label: 'Operations & Worklogs', desc: 'Throughput, cycle time, hours & completion status' },
  { id: 'hr', label: 'HR & People Ops', desc: 'Headcount, tenure, compensation & department metrics' },
  { id: 'marketing', label: 'Marketing & Campaigns', desc: 'Spend, channel ROI, CTR & conversion funnel' },
  { id: 'projects', label: 'Project Tracking', desc: 'Milestones, tasks, burndown & resource allocation' },
];

export const StepColumnAudit: React.FC<StepColumnAuditProps> = ({
  columns,
  audit,
  template,
  onUpdateColumn,
  onUpdateTemplate,
  onProceed,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'audit' | 'anomalies' | 'pii'>('columns');

  // Count active PII columns
  const piiColumns = columns.filter(
    (c) => c.isPII && c.piiRedactionMethod && c.piiRedactionMethod !== 'none'
  );

  const handleRedactAllPii = (method: PiiRedactionMethod = 'mask') => {
    columns.forEach((col, idx) => {
      if (col.isPII) {
        onUpdateColumn(idx, { piiRedactionMethod: method });
      }
    });
  };

  const handleClearAllPii = () => {
    columns.forEach((col, idx) => {
      onUpdateColumn(idx, { isPII: false, piiRedactionMethod: 'none' });
    });
  };

  const [columnFilter, setColumnFilter] = useState<'all' | 'measures' | 'dimensions' | 'identifiers' | 'dates' | 'issues'>('all');

  const getStatusDisplay = (status: QualityStatus) => {
    switch (status) {
      case 'ready':
        return {
          title: 'Ready',
          badge: 'Executive Dashboard Ready',
          color: 'bg-emerald-50 text-emerald-950 border-emerald-300',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: ShieldCheck,
          iconColor: 'text-emerald-600',
        };
      case 'ready_with_caveats':
        return {
          title: 'Ready with caveats',
          badge: 'Analytical Caveats Noted',
          color: 'bg-amber-50 text-amber-950 border-amber-300',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
        };
      case 'needs_cleaning':
        return {
          title: 'Needs cleaning',
          badge: 'Cleaning Recommended',
          color: 'bg-orange-50 text-orange-950 border-orange-300',
          badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
        };
      case 'unsafe':
        return {
          title: 'Unsafe for interpretation',
          badge: 'Integrity Hazard Detected',
          color: 'bg-rose-50 text-rose-950 border-rose-300',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: XCircle,
          iconColor: 'text-rose-600',
        };
    }
  };

  const statusInfo = getStatusDisplay(audit.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Quality Status Card with Business Intelligence Analyst Verdict */}
      <div className={`p-5 rounded-xl border ${statusInfo.color} space-y-4 shadow-sm`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white/90 shadow-xs shrink-0 mt-0.5">
              <StatusIcon className={`w-7 h-7 ${statusInfo.iconColor}`} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-black/5">
                  Data Quality Audit
                </span>
                <span className="text-base font-black tracking-tight">{statusInfo.title}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusInfo.badgeColor}`}>
                  {statusInfo.badge}
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                Audited {audit.totalRows.toLocaleString()} rows across {audit.totalColumns} columns.
                {audit.completenessScore !== undefined && (
                  <span className="font-semibold ml-1.5">
                    Data Completeness: {audit.completenessScore}% · Overall Health: {audit.overallHealthScore ?? 100}%
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {audit.overallHealthScore !== undefined && (
              <div className="px-3 py-1.5 rounded-lg bg-white/80 border border-black/10 flex items-center gap-1.5 text-xs font-bold shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Health: {audit.overallHealthScore}%</span>
              </div>
            )}
            {audit.duplicateRowCount > 0 && (
              <span className="px-2.5 py-1.5 rounded-lg bg-white/80 border border-black/10 text-xs font-semibold">
                {audit.duplicateRowCount} duplicate rows
              </span>
            )}
            {audit.anomalies.length > 0 && (
              <span className="px-2.5 py-1.5 rounded-lg bg-white/80 border border-black/10 text-xs font-semibold">
                {audit.anomalies.length} anomaly signals
              </span>
            )}
            {piiColumns.length > 0 && (
              <span className="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                {piiColumns.length} PII redacted
              </span>
            )}
          </div>
        </div>

        {/* Detailed Reasons for Quality Status */}
        <div className="pt-3 border-t border-black/10 space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-black/70 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Detailed Audit Findings & Status Reasons:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {audit.statusReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/60 p-2 rounded-lg border border-black/5 font-medium">
                <span className="text-blue-600 font-bold shrink-0">•</span>
                <span className="leading-snug">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Analyst Verdict & Action Plan */}
        {audit.analystVerdict && (
          <div className="pt-3 border-t border-black/10 bg-white/70 p-3.5 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                BI Analyst Verdict: {audit.analystVerdict.headline}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {audit.analystVerdict.summary}
            </p>
            <div className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold text-slate-900">Automated Pipeline Actions:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                {audit.analystVerdict.actionItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* GDPR PII Redaction & Data Privacy Card */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-800 text-white shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/30 shadow-inner">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  GDPR & Privacy Compliance
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Article 5(1)(c) & Article 32
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                Sensitive PII Redaction (Names, Emails, Phones, Addresses, IDs)
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Flag personal data columns to be automatically masked or pseudonymized (hashed) in the generated Excel tables.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleRedactAllPii('mask')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Mask All PII
            </button>
            <button
              onClick={() => handleRedactAllPii('hash')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-700 hover:bg-indigo-600 text-white shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Hash / Pseudonymize All
            </button>
            {piiColumns.length > 0 && (
              <button
                onClick={handleClearAllPii}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Clear Redactions
              </button>
            )}
          </div>
        </div>

        {/* PII Summary Pill Bar */}
        <div className="pt-2 border-t border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Identified PII Columns:</span>
            {columns.filter((c) => c.isPII).length === 0 ? (
              <span className="text-slate-400 italic">No columns automatically flagged as PII.</span>
            ) : (
              columns
                .filter((c) => c.isPII)
                .map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700 text-[11px] font-mono"
                  >
                    <Lock className="w-3 h-3 text-blue-400" />
                    {c.name} ({c.piiType || 'personal'})
                  </span>
                ))
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            Hashed pseudonymization preserves unique grouping for charts without exposing identities.
          </span>
        </div>
      </div>

      {/* Mixed Units Rule Enforcement Warning (NON-NEGOTIABLE CORE PHILOSOPHY) */}
      {audit.mixedUnitWarnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            Mixed Units Rule Enforced: Never sum quantities across differing units or currencies!
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-800">
            {audit.mixedUnitWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 italic">
            Sheet2Dashboard will automatically segment calculations by unit and warn on any grand totals.
          </p>
        </div>
      )}

      {/* Business Context & Template Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Select Business Domain Template
            </h3>
            <p className="text-xs text-slate-500">
              Aligns metric calculations, terminology, and KPI benchmarks with your specific industry.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => onUpdateTemplate(tmpl.id)}
              className={`p-3 rounded-lg border text-left transition ${
                template === tmpl.id
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold text-xs text-slate-900">{tmpl.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{tmpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs: Columns | Audit Issues | Anomalies */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('columns')}
            className={`py-3 px-5 border-b-2 font-medium transition ${
              activeTab === 'columns'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Column Types & Semantic Units ({columns.length})
          </button>
          <button
            onClick={() => setActiveTab('pii')}
            className={`py-3 px-5 border-b-2 font-medium transition flex items-center gap-1.5 ${
              activeTab === 'pii'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            GDPR & PII Audit ({piiColumns.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-5 border-b-2 font-medium transition ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Audit Issues Log ({audit.issues.length})
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`py-3 px-5 border-b-2 font-medium transition ${
              activeTab === 'anomalies'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Statistical Outliers & Spikes ({audit.anomalies.length})
          </button>
        </div>

        {/* Tab 1: Column Classification Grid */}
        {activeTab === 'columns' && (
          <div className="space-y-3">
            {/* Column Role & Issue Quick Filters */}
            <div className="px-5 pt-3 pb-1 flex items-center justify-between gap-3 flex-wrap text-xs bg-slate-50/50 border-b border-slate-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-semibold text-[11px] mr-1">Filter View:</span>
                {[
                  { id: 'all', label: `All Columns (${columns.length})` },
                  { id: 'measures', label: `Measures (${columns.filter(c => ['numeric', 'currency', 'percentage', 'count', 'target'].includes(c.userType)).length})` },
                  { id: 'dimensions', label: `Dimensions (${columns.filter(c => ['categorical', 'boolean'].includes(c.userType)).length})` },
                  { id: 'identifiers', label: `Identifiers (${columns.filter(c => c.userType === 'identifier').length})` },
                  { id: 'dates', label: `Dates (${columns.filter(c => c.userType === 'date').length})` },
                  { id: 'issues', label: `Caveats & Issues (${columns.filter(c => c.isUncertain || (c.inconsistencies && c.inconsistencies.length > 0) || c.missingCount > 0).length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setColumnFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-md transition font-medium text-[11px] cursor-pointer ${
                      columnFilter === f.id
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400">
                Audited {columns.length} columns · Click dropdown to adjust classification
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Column & BI Role</th>
                    <th className="py-2.5 px-3">Data Classification</th>
                    <th className="py-2.5 px-3">Unit / Currency</th>
                    <th className="py-2.5 px-3">Sample Values</th>
                    <th className="py-2.5 px-3 text-center">Cardinality</th>
                    <th className="py-2.5 px-3">Completeness</th>
                    <th className="py-2.5 px-3">🔒 PII Redaction</th>
                    <th className="py-2.5 px-4">Status & Caveats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {columns
                    .filter((col) => {
                      if (columnFilter === 'measures') return ['numeric', 'currency', 'percentage', 'count', 'target'].includes(col.userType);
                      if (columnFilter === 'dimensions') return ['categorical', 'boolean'].includes(col.userType);
                      if (columnFilter === 'identifiers') return col.userType === 'identifier';
                      if (columnFilter === 'dates') return col.userType === 'date';
                      if (columnFilter === 'issues') return col.isUncertain || (col.inconsistencies && col.inconsistencies.length > 0) || col.missingCount > 0;
                      return true;
                    })
                    .map((col) => {
                      const idx = col.index;
                      const role = col.biRole || (
                        ['numeric', 'currency', 'count', 'percentage', 'target'].includes(col.userType)
                          ? 'measure'
                          : col.userType === 'date'
                          ? 'date'
                          : col.userType === 'identifier'
                          ? 'identifier'
                          : 'dimension'
                      );
                      const missingPct = col.missingPercentage ?? (audit.totalRows > 0 ? Math.round((col.missingCount / audit.totalRows) * 100) : 0);
                      const completeness = 100 - missingPct;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{col.name}</span>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  role === 'measure'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : role === 'date'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : role === 'identifier'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {role}
                              </span>
                            </div>
                            {col.originalName !== col.name && (
                              <div className="text-[10px] text-slate-400 font-normal">Orig: {col.originalName}</div>
                            )}
                          </td>

                          {/* Classification Dropdown */}
                          <td className="py-2 px-3">
                            <select
                              value={col.userType}
                              onChange={(e) =>
                                onUpdateColumn(idx, {
                                  userType: e.target.value as ColumnDataType,
                                  isUncertain: false,
                                })
                              }
                              className="w-full text-xs py-1 px-2 rounded border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                            >
                              {DATA_TYPES.map((dt) => (
                                <option key={dt.type} value={dt.type}>
                                  {dt.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Unit input */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={col.unit}
                              onChange={(e) => onUpdateColumn(idx, { unit: e.target.value })}
                              placeholder="e.g. $, kg, %"
                              className="w-20 text-xs py-1 px-2 rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </td>

                          {/* Sample values */}
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate font-mono text-[11px]">
                            {col.sampleValues.map((v) => String(v)).join(', ')}
                          </td>

                          {/* Cardinality count */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-mono text-slate-800 font-semibold">{col.uniqueCount}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {col.distinctPercentage !== undefined ? `${col.distinctPercentage}% unique` : 'distinct'}
                            </span>
                          </td>

                          {/* Completeness & Missing bar */}
                          <td className="py-2.5 px-3 min-w-[120px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                {col.missingCount === 0 ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100%
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-bold">
                                    {col.missingCount} blank ({missingPct}%)
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    completeness >= 98
                                      ? 'bg-emerald-500'
                                      : completeness >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${completeness}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* PII Redaction Toggle & Method */}
                          <td className="py-2 px-3 min-w-[150px]">
                            <div className="flex flex-col gap-1">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(col.isPII && col.piiRedactionMethod && col.piiRedactionMethod !== 'none')}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    onUpdateColumn(idx, {
                                      isPII: checked,
                                      piiRedactionMethod: checked ? (col.piiRedactionMethod || 'mask') : 'none',
                                      piiType: checked ? (col.piiType || 'custom') : undefined,
                                    });
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span className={`text-[11px] font-semibold ${col.isPII ? 'text-blue-800' : 'text-slate-600'}`}>
                                  {col.isPII ? 'Redact (PII)' : 'Flag PII'}
                                </span>
                              </label>

                              {col.isPII && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <select
                                    value={col.piiRedactionMethod || 'mask'}
                                    onChange={(e) =>
                                      onUpdateColumn(idx, {
                                        piiRedactionMethod: e.target.value as PiiRedactionMethod,
                                      })
                                    }
                                    className="text-[10px] py-0.5 px-1 rounded border border-blue-300 bg-blue-50/50 text-blue-900 font-medium focus:outline-none"
                                  >
                                    <option value="mask">Mask (j***@...)</option>
                                    <option value="hash">Hash (SHA-256)</option>
                                    <option value="redact_label">[REDACTED]</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Uncertainty & Status Caveats */}
                          <td className="py-2.5 px-4 min-w-[170px]">
                            <div className="space-y-1">
                              {col.isUncertain ? (
                                <div className="flex items-start gap-1.5 text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 text-[10px]">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                                  <span>{col.uncertaintyReason || 'Unclear semantic type'}</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed
                                </span>
                              )}

                              {col.inconsistencies && col.inconsistencies.length > 0 && (
                                <div className="space-y-0.5">
                                  {col.inconsistencies.map((inc, i) => (
                                    <div key={i} className="text-[10px] text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200">
                                      ⚠️ {inc}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: GDPR & PII Redaction Audit */}
        {activeTab === 'pii' && (
          <div className="p-5 space-y-4">
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">GDPR Compliance & Pseudonymization Protocol</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Under GDPR Article 32, pseudonymization and encryption significantly reduce risks to data subjects while allowing statistical aggregation. When using <strong>Deterministic Hashing</strong>, unique entities retain their relationship in Excel pivot tables, VLOOKUPs, and SUMIFS without exposing sensitive personal data. When using <strong>Masking</strong>, direct visibility is obscured while preserving structural cues.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Detected PII Type</th>
                    <th className="py-2.5 px-3">Redaction Toggle</th>
                    <th className="py-2.5 px-3">Redaction Method</th>
                    <th className="py-2.5 px-3">Raw Sample Value</th>
                    <th className="py-2.5 px-3">Redacted Output Preview (in Excel)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {columns.map((col, idx) => {
                    const isRedacted = Boolean(col.isPII && col.piiRedactionMethod && col.piiRedactionMethod !== 'none');
                    const sample = col.sampleValues[0] !== undefined ? String(col.sampleValues[0]) : '';
                    const preview = isRedacted ? redactCellValue(sample, col.piiRedactionMethod || 'mask', col.piiType) : sample;

                    return (
                      <tr key={col.name} className={col.isPII ? 'bg-blue-50/30' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {col.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                            col.isPII ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {col.piiType ? (
                              <>
                                <Lock className="w-3 h-3 text-blue-600" />
                                {col.piiType.toUpperCase()}
                              </>
                            ) : (
                              'Non-PII'
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              const nextState = !col.isPII;
                              onUpdateColumn(idx, {
                                isPII: nextState,
                                piiRedactionMethod: nextState ? (col.piiRedactionMethod || 'mask') : 'none',
                                piiType: nextState ? (col.piiType || 'custom') : undefined,
                              });
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                              col.isPII
                                ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {col.isPII ? (
                              <>
                                <Lock className="w-3 h-3" /> Redacted
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" /> Unredacted
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            disabled={!col.isPII}
                            value={col.piiRedactionMethod || 'mask'}
                            onChange={(e) =>
                              onUpdateColumn(idx, {
                                piiRedactionMethod: e.target.value as PiiRedactionMethod,
                              })
                            }
                            className="text-xs py-1 px-2 rounded border border-slate-300 bg-white font-medium text-slate-800 disabled:opacity-40 disabled:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="mask">Mask (e.g., j***@corp.com)</option>
                            <option value="hash">Deterministic Hash (SHA-256)</option>
                            <option value="redact_label">Replace with [REDACTED]</option>
                            <option value="none">No Redaction</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] max-w-[150px] truncate">
                          {sample || '<empty>'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                            isRedacted ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold' : 'text-slate-600'
                          }`}>
                            {preview || '<empty>'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Audit Issues List */}
        {activeTab === 'audit' && (
          <div className="p-5 space-y-3">
            {audit.issues.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                Zero critical data quality defects found.
              </div>
            ) : (
              audit.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-4 ${
                    issue.severity === 'critical'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : issue.severity === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          issue.severity === 'critical'
                            ? 'bg-rose-200 text-rose-800'
                            : issue.severity === 'warning'
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="font-semibold">{issue.message}</span>
                    </div>
                    <div className="text-[11px] opacity-80 pl-1">
                      Action applied: {issue.recommendation}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Statistical Anomalies */}
        {activeTab === 'anomalies' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <p>
                Core Rule: Anomalies are signals, never silently deleted. Flagged rows with |z| &ge; 2.5 standard deviations from their unit/category group mean.
              </p>
            </div>

            {audit.anomalies.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No extreme outliers or spike signals detected.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Context / Category</th>
                      <th className="py-2 px-3">Measure</th>
                      <th className="py-2 px-3 text-right">Value</th>
                      <th className="py-2 px-3 text-right">Mean</th>
                      <th className="py-2 px-3 text-right">Std Dev</th>
                      <th className="py-2 px-3 text-right">Z-Score</th>
                      <th className="py-2 px-3">Sample Caveat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {audit.anomalies.map((an, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/40">
                        <td className="py-2 px-3 font-mono text-slate-500">{an.rowIndex + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{an.dimensionLabel}</td>
                        <td className="py-2 px-3 text-slate-600">{an.measureColumn}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {an.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {an.mean.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {an.stdDev.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          {an.zScore > 0 ? `+${an.zScore}` : an.zScore}
                        </td>
                        <td className="py-2 px-3">
                          {an.isIndicative ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              Indicative (group n={an.groupSize} &lt; 30)
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              Confirmed (group n={an.groupSize})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
        >
          ← Back to Upload
        </button>

        <button
          onClick={onProceed}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
        >
          Proceed to Choose Visuals & Sections
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

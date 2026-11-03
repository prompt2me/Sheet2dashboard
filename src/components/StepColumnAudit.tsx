import React, { useState } from 'react';
import {
  ColumnProfile,
  ColumnDataType,
  DataQualityAudit,
  BusinessTemplate,
  QualityStatus,
} from '../types/dashboard';
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
  const [activeTab, setActiveTab] = useState<'columns' | 'audit' | 'anomalies'>('columns');

  const getStatusDisplay = (status: QualityStatus) => {
    switch (status) {
      case 'ready':
        return {
          title: 'Ready for Dashboarding',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: ShieldCheck,
          iconColor: 'text-emerald-600',
        };
      case 'ready_with_caveats':
        return {
          title: 'Ready with Caveats',
          color: 'bg-amber-50 text-amber-900 border-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
        };
      case 'needs_cleaning':
        return {
          title: 'Needs Cleaning',
          color: 'bg-orange-50 text-orange-900 border-orange-300',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
        };
      case 'unsafe':
        return {
          title: 'Unsafe for Direct Interpretation',
          color: 'bg-rose-50 text-rose-900 border-rose-300',
          icon: XCircle,
          iconColor: 'text-rose-600',
        };
    }
  };

  const statusInfo = getStatusDisplay(audit.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Quality Status Card */}
      <div className={`p-5 rounded-xl border ${statusInfo.color} space-y-3 shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/80 shadow-xs">
              <StatusIcon className={`w-6 h-6 ${statusInfo.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider opacity-75">
                  Data Quality Audit
                </span>
                <span className="text-sm font-extrabold">{statusInfo.title}</span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                Audited {audit.totalRows.toLocaleString()} rows across {audit.totalColumns} columns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {audit.duplicateRowCount > 0 && (
              <span className="px-2.5 py-1 rounded bg-white/70 text-xs font-semibold">
                {audit.duplicateRowCount} duplicates
              </span>
            )}
            {audit.anomalies.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-white/70 text-xs font-semibold">
                {audit.anomalies.length} anomaly signals
              </span>
            )}
          </div>
        </div>

        {/* Audit Status Reasons */}
        <div className="pt-2 border-t border-black/10 text-xs space-y-1">
          {audit.statusReasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-1.5 font-medium">
              <span className="text-[10px] mt-0.5">•</span>
              <span>{reason}</span>
            </div>
          ))}
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Column Name</th>
                  <th className="py-2.5 px-3">Data Classification</th>
                  <th className="py-2.5 px-3">Unit / Currency</th>
                  <th className="py-2.5 px-3">Sample Values</th>
                  <th className="py-2.5 px-3 text-center">Uniques</th>
                  <th className="py-2.5 px-3 text-center">Missing</th>
                  <th className="py-2.5 px-4">Status & Caveats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      <div>{col.name}</div>
                      {col.originalName !== col.name && (
                        <div className="text-[10px] text-slate-400">Orig: {col.originalName}</div>
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
                        className="w-full text-xs py-1 px-2 rounded border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="w-24 text-xs py-1 px-2 rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Sample values */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {col.sampleValues.map((v) => String(v)).join(', ')}
                    </td>

                    {/* Unique count */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {col.uniqueCount}
                    </td>

                    {/* Missing count */}
                    <td className="py-2.5 px-3 text-center">
                      {col.missingCount > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          {col.missingCount} ({Math.round((col.missingCount / audit.totalRows) * 100)}%)
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Uncertainty & Status */}
                    <td className="py-2.5 px-4">
                      {col.isUncertain ? (
                        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px]">{col.uncertaintyReason || 'Unclear semantic type'}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Confirmed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

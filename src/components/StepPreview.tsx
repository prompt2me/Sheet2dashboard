import React, { useState } from 'react';
import {
  DashboardSpec,
  ColumnProfile,
  DataQualityAudit,
  EvidenceFinding,
} from '../types/dashboard';
import { ChartRenderer } from './ChartRenderer';
import { cleanNumericValue } from '../utils/dataProfiler';
import {
  Filter,
  Download,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Calendar,
} from 'lucide-react';

interface StepPreviewProps {
  spec: DashboardSpec;
  columns: ColumnProfile[];
  rows: Record<string, any>[];
  audit: DataQualityAudit;
  findings: EvidenceFinding[];
  onProceedToGenerate: () => void;
  onBack: () => void;
}

export const StepPreview: React.FC<StepPreviewProps> = ({
  spec,
  columns,
  rows,
  audit,
  findings,
  onProceedToGenerate,
  onBack,
}) => {
  // Live Interactive Filter (Mirrors Dashboard!C4 Data Validation in Excel)
  const filterColName = spec.filters[0]?.column || columns[1]?.name || columns[0]?.name;
  const [filterValue, setFilterValue] = useState<string>('All');
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);

  // Filter rows dynamically based on the user's dropdown choice
  const activeRows = filterValue === 'All'
    ? rows
    : rows.filter((r) => String(r[filterColName] ?? '').trim() === filterValue);

  // Helper to compute live aggregations for active filtered rows
  const numCol = columns.find((c) => ['currency', 'numeric', 'count'].includes(c.userType)) || columns[columns.length - 1];
  const catCol = columns.find((c) => c.userType === 'categorical') || columns[0];
  const dateCol = columns.find((c) => c.userType === 'date');
  const targetCol = columns.find((c) => c.userType === 'target');

  // Compute live KPI values
  const computeMeasure = (colName: string, agg: string, dataset: typeof rows) => {
    const nums: number[] = [];
    dataset.forEach((r) => {
      const { numericValue } = cleanNumericValue(r[colName]);
      if (numericValue !== null && !isNaN(numericValue)) {
        nums.push(numericValue);
      }
    });

    if (nums.length === 0) return 0;
    if (agg === 'SUM') return nums.reduce((a, b) => a + b, 0);
    if (agg === 'AVERAGE') return nums.reduce((a, b) => a + b, 0) / nums.length;
    if (agg === 'MAX') return Math.max(...nums);
    if (agg === 'MIN') return Math.min(...nums);
    return nums.length;
  };

  const filteredTotal = numCol ? computeMeasure(numCol.name, 'SUM', activeRows) : 0;
  const overallTotal = numCol ? computeMeasure(numCol.name, 'SUM', rows) : 1;
  const filteredAvg = numCol ? computeMeasure(numCol.name, 'AVERAGE', activeRows) : 0;
  const pctOfTotal = overallTotal > 0 ? (filteredTotal / overallTotal) * 100 : 0;

  // Compute live data for Category Breakdown Table
  const uniqueCats = Array.from(
    new Set(rows.map((r) => String(r[catCol?.name] ?? '').trim()).filter(Boolean))
  ).slice(0, 10);

  const categoryTableData = uniqueCats.map((cat) => {
    const catRows = activeRows.filter((r) => String(r[catCol?.name] ?? '').trim() === cat);
    const catSum = numCol ? computeMeasure(numCol.name, 'SUM', catRows) : 0;
    const catAvg = numCol ? computeMeasure(numCol.name, 'AVERAGE', catRows) : 0;
    const share = filteredTotal > 0 ? (catSum / filteredTotal) * 100 : 0;
    return {
      category: cat,
      sum: catSum,
      avg: catAvg,
      share,
      count: catRows.length,
    };
  });

  // Prepare Chart Data
  const getChartData = (chart: typeof spec.charts[0]) => {
    const xName = chart.xColumn;
    const yName = chart.yColumns[0]?.column || numCol?.name;
    const agg = chart.yColumns[0]?.aggregation || 'SUM';

    const grouped = new Map<string, { sum: number; count: number; target: number }>();

    activeRows.forEach((r) => {
      const xVal = String(r[xName] ?? 'Other').trim() || 'Other';
      const { numericValue: yVal } = cleanNumericValue(r[yName]);
      const { numericValue: tVal } = targetCol ? cleanNumericValue(r[targetCol.name]) : { numericValue: null };

      const existing = grouped.get(xVal) || { sum: 0, count: 0, target: 0 };
      if (yVal !== null) {
        existing.sum += yVal;
        existing.count += 1;
      }
      if (tVal !== null) {
        existing.target += tVal;
      }
      grouped.set(xVal, existing);
    });

    let items = Array.from(grouped.entries()).map(([k, v]) => ({
      label: k,
      value: agg === 'AVERAGE' && v.count > 0 ? v.sum / v.count : v.sum,
      secondaryValue: targetCol && v.target > 0 ? v.target : undefined,
    }));

    if (chart.sortOrder === 'desc') {
      items.sort((a, b) => b.value - a.value);
    } else if (chart.sortOrder === 'asc') {
      items.sort((a, b) => a.value - b.value);
    }

    if (chart.topN) {
      items = items.slice(0, chart.topN);
    }

    return items;
  };

  const formatCurrency = (val: number) => {
    return numCol?.userType === 'currency'
      ? `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Simulation Info Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Interactive In-Browser Dashboard Preview
            </h3>
            <p className="text-xs text-slate-500">
              Rendered from the exact same declarative specification used to build the Excel workbook.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDictionaryModal(!showDictionaryModal)}
            className="text-xs text-slate-700 hover:text-blue-600 font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100 transition"
          >
            Traceability & Dictionary
          </button>

          <button
            onClick={onProceedToGenerate}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
          >
            Generate Production .xlsx
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dashboard Canvas Preview (Mirrors Dashboard Sheet) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Dashboard Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {spec.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {spec.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Period: {spec.reportingPeriod.label}
            </span>
            <span>•</span>
            <span>Refreshed: {spec.lastRefreshDate}</span>
          </div>
        </div>

        {/* Live Interactive Dropdown Filter (Simulates Excel Dashboard!C4) */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
          <div className="flex items-center gap-2 font-semibold text-xs text-blue-950">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Interactive Filter ({filterColName}):</span>
          </div>

          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 rounded-lg border border-blue-300 bg-white text-blue-900 shadow-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All {filterColName}s (Unfiltered)</option>
            {spec.filters[0]?.availableOptions
              .filter((o) => o !== 'All')
              .map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
          </select>

          <span className="text-[11px] text-blue-700/80 italic hidden sm:inline">
            Notice: Selecting an option updates KPIs, tables, and charts instantly using Excel SUMIFS logic.
          </span>
        </div>

        {/* KPI Cards Row (Formula-Driven) */}
        {spec.sections.kpiCards && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Filtered Total ({numCol?.unit || '$'})
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(filteredTotal)}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {filterValue === 'All' ? '100.0% of total portfolio' : `${pctOfTotal.toFixed(1)}% of portfolio`}
              </div>
            </div>

            {/* KPI 2 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Overall Benchmark
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(overallTotal)}
              </div>
              <div className="text-[11px] text-slate-400 italic">
                Unfiltered baseline benchmark
              </div>
            </div>

            {/* KPI 3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Mean Per Record
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(filteredAvg)}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Arithmetic mean across active rows
              </div>
            </div>

            {/* KPI 4 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Records
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {activeRows.length.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {((activeRows.length / rows.length) * 100).toFixed(1)}% of dataset rows
              </div>
            </div>
          </div>
        )}

        {/* Charts & Table Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Category Performance Table (Mirrors Dashboard Table) */}
          {spec.sections.categoryComparison && (
            <div className="lg:col-span-5 border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {catCol?.name || 'Category'} Attribution
                </span>
                <span className="text-[11px] text-slate-400">Analysis Feed</span>
              </div>

              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">{catCol?.name}</th>
                      <th className="py-2 px-2 text-right">Sum</th>
                      <th className="py-2 px-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryTableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 font-medium text-slate-800 truncate max-w-[120px]">
                          {row.category}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-900">
                          {formatCurrency(row.sum)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-blue-600">
                          {row.share.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Native Charts Grid */}
          <div className={`${spec.sections.categoryComparison ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6`}>
            {spec.charts.map((chart) => {
              const cData = getChartData(chart);
              return (
                <div
                  key={chart.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{chart.title}</h4>
                      <p className="text-[11px] text-slate-500">{chart.purpose}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {chart.type.replace('_', ' ')}
                    </span>
                  </div>

                  <ChartRenderer
                    chart={chart}
                    data={cData}
                    theme={spec.theme}
                    height={200}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Anomaly Signals Section */}
        {spec.sections.anomalyList && audit.anomalies.length > 0 && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Flagged Anomaly Signals (|z| &ge; {spec.anomalyThresholdZ})
                </h4>
              </div>
              <span className="text-[11px] text-amber-800">Preserved in Detail sheet</span>
            </div>

            <p className="text-[11px] text-amber-900">
              Core Philosophy: Anomalies are never deleted. They highlight extreme operational or financial variance.
            </p>

            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {audit.anomalies.slice(0, 5).map((an, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-white border border-amber-200 text-xs shrink-0 min-w-[180px] space-y-1 shadow-xs"
                >
                  <div className="font-semibold text-slate-800 truncate">{an.dimensionLabel}</div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-600">{an.measureColumn}: {an.value}</span>
                    <span className="text-rose-600 font-bold">z={an.zScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Metric Dictionary Modal */}
      {showDictionaryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Metric Traceability Dictionary</h3>
                <p className="text-xs text-slate-500">
                  Every KPI and chart feed documented with source columns and formulas.
                </p>
              </div>
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Metric Name</th>
                    <th className="py-2.5 px-2">Agg</th>
                    <th className="py-2.5 px-3">Source Field</th>
                    <th className="py-2.5 px-3">Live Excel Formula</th>
                    <th className="py-2.5 px-3">Caveats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {spec.metricDictionary.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-2 px-2 text-blue-700 font-mono">{m.aggregation}</td>
                      <td className="py-2 px-3 text-slate-600">{m.sourceField}</td>
                      <td className="py-2 px-3 text-emerald-700 font-mono truncate max-w-xs">{m.formula}</td>
                      <td className="py-2 px-3 text-slate-500 italic text-[11px]">{m.caveats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Traceability Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
        >
          ← Back to Visuals Builder
        </button>

        <button
          onClick={onProceedToGenerate}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
        >
          Generate Workbook & Run Delivery QA
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

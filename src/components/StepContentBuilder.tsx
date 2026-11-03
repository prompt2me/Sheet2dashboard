import React, { useState } from 'react';
import {
  DashboardSpec,
  ColumnProfile,
  ChartConfig,
  KPIConfig,
  ChartType,
} from '../types/dashboard';
import { evaluateChartSuitability, buildRecommendedSpec } from '../utils/recommendationEngine';
import {
  Sparkles,
  BarChart3,
  TrendingUp,
  PieChart,
  Layers,
  Settings2,
  Palette,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  Filter,
  Eye,
  Sliders,
} from 'lucide-react';

interface StepContentBuilderProps {
  spec: DashboardSpec;
  columns: ColumnProfile[];
  rows: Record<string, any>[];
  onUpdateSpec: (spec: DashboardSpec) => void;
  onProceed: () => void;
  onBack: () => void;
}

export const StepContentBuilder: React.FC<StepContentBuilderProps> = ({
  spec,
  columns,
  rows,
  onUpdateSpec,
  onProceed,
  onBack,
}) => {
  const [selectedChartId, setSelectedChartId] = useState<string | null>(
    spec.charts[0]?.id || null
  );

  const suitabilityList = evaluateChartSuitability(columns);

  const numericCols = columns.filter((c) =>
    ['numeric', 'currency', 'count', 'target', 'percentage'].includes(c.userType)
  );
  const catCols = columns.filter((c) => c.userType === 'categorical');
  const dateCols = columns.filter((c) => c.userType === 'date');

  const handleRecommendForMe = () => {
    const recommended = buildRecommendedSpec(spec.title, columns, spec.template, rows);
    onUpdateSpec(recommended);
  };

  const handleToggleSection = (key: keyof DashboardSpec['sections']) => {
    onUpdateSpec({
      ...spec,
      sections: {
        ...spec.sections,
        [key]: !spec.sections[key],
      },
    });
  };

  const handleUpdateChart = (id: string, updates: Partial<ChartConfig>) => {
    const updatedCharts = spec.charts.map((c) => (c.id === id ? { ...c, ...updates } : c));
    onUpdateSpec({ ...spec, charts: updatedCharts });
  };

  const handleAddChart = (type: ChartType) => {
    const defaultX = (type === 'line' || type === 'area' ? dateCols[0]?.name : catCols[0]?.name) || columns[0]?.name;
    const defaultY = numericCols[0]?.name || columns[1]?.name || columns[0]?.name;

    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      title: `${defaultY} by ${defaultX}`,
      purpose: `Analyze distribution of ${defaultY} across ${defaultX} categories.`,
      type,
      xColumn: defaultX,
      yColumns: [{ column: defaultY, aggregation: 'SUM', label: defaultY }],
      sortOrder: 'desc',
      topN: 10,
      dataLabels: true,
      xAxisTitle: defaultX,
      yAxisTitle: defaultY,
    };

    onUpdateSpec({ ...spec, charts: [...spec.charts, newChart] });
    setSelectedChartId(newChart.id);
  };

  const handleDeleteChart = (id: string) => {
    const updated = spec.charts.filter((c) => c.id !== id);
    onUpdateSpec({ ...spec, charts: updated });
    if (selectedChartId === id) {
      setSelectedChartId(updated[0]?.id || null);
    }
  };

  const selectedChart = spec.charts.find((c) => c.id === selectedChartId);

  const themes: { id: DashboardSpec['theme']; label: string; bg: string }[] = [
    { id: 'slate', label: 'Executive Slate', bg: 'bg-slate-800' },
    { id: 'teal', label: 'Modern Teal', bg: 'bg-teal-700' },
    { id: 'indigo', label: 'Indigo Corporate', bg: 'bg-indigo-700' },
    { id: 'emerald', label: 'Emerald Operations', bg: 'bg-emerald-700' },
    { id: 'amber', label: 'Amber Industrial', bg: 'bg-amber-700' },
    { id: 'monochrome', label: 'Minimal Monochrome', bg: 'bg-neutral-800' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Smart Recommendation Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-500/30 text-blue-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold">
              Automated BI Intelligence: "Recommend for Me"
            </h3>
          </div>
          <p className="text-xs text-blue-200 max-w-xl">
            Core Philosophy: Do not turn every column into a chart. Click below to analyze your data's patterns, cardinality, and dimensions to curate the clearest visual narrative with 1-line justifications.
          </p>
        </div>

        <button
          onClick={handleRecommendForMe}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow transition shrink-0 self-start md:self-center"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Recommend Best Visuals for Me
        </button>
      </div>

      {/* Grid: Left Column (Sections & Interactivity) | Right Column (Chart Builder) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sections & Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Dashboard Sections Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Dashboard Sections
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Included in Excel</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { key: 'executiveSummary', label: 'Executive Summary Briefing' },
                { key: 'kpiCards', label: 'Live Formula KPI Cards' },
                {
                  key: 'trendAnalysis',
                  label: 'Time Series Trend Analysis',
                  disabled: dateCols.length === 0,
                  reason: 'No date column',
                },
                { key: 'categoryComparison', label: 'Category Performance Breakdown' },
                { key: 'rankings', label: 'Top Contributor Rankings' },
                { key: 'distribution', label: 'Share & Proportions (Doughnut)' },
                { key: 'anomalyList', label: 'Statistical Anomaly Signals (|z|)' },
                { key: 'qualityAuditPanel', label: 'Data Quality & Health Audit' },
                { key: 'detailedTable', label: 'Detail Drill-Down Tables' },
                { key: 'methodologyTraceability', label: 'Metric Traceability Dictionary' },
              ].map((sec) => (
                <label
                  key={sec.key}
                  className={`flex items-center justify-between p-2 rounded border transition cursor-pointer ${
                    sec.disabled
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      : spec.sections[sec.key as keyof DashboardSpec['sections']]
                      ? 'bg-blue-50/50 border-blue-200 text-slate-900 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={sec.disabled}
                      checked={spec.sections[sec.key as keyof DashboardSpec['sections']]}
                      onChange={() => handleToggleSection(sec.key as keyof DashboardSpec['sections'])}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs">{sec.label}</span>
                  </div>
                  {sec.disabled && (
                    <span className="text-[10px] text-slate-400 italic">{sec.reason}</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Theme & Styling */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Theme & Palette (Color-Blind Safe)
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSpec({ ...spec, theme: th.id })}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition ${
                    spec.theme === th.id
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${th.bg} shrink-0`} />
                  <span className="text-xs font-medium text-slate-800">{th.label}</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Density Mode:</span>
              <div className="flex rounded border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={() => onUpdateSpec({ ...spec, density: 'executive' })}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    spec.density === 'executive'
                      ? 'bg-white shadow text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Executive
                </button>
                <button
                  onClick={() => onUpdateSpec({ ...spec, density: 'analyst' })}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    spec.density === 'analyst'
                      ? 'bg-white shadow text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Analyst
                </button>
              </div>
            </div>
          </div>

          {/* Dropdown Filters Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Excel Dropdown Filter
              </h4>
            </div>

            <p className="text-[11px] text-slate-500">
              Interactive dropdown filter in Dashboard!C4 fed by dynamic named range in Controls sheet.
            </p>

            {catCols.length > 0 ? (
              <select
                value={spec.filters[0]?.column || catCols[0]?.name}
                onChange={(e) => {
                  const selected = e.target.value;
                  const opts = Array.from(
                    new Set(rows.map((r) => String(r[selected] ?? '').trim()).filter(Boolean))
                  ).slice(0, 30);
                  onUpdateSpec({
                    ...spec,
                    filters: [
                      {
                        column: selected,
                        label: `Filter by ${selected}`,
                        defaultValue: 'All',
                        availableOptions: ['All', ...opts],
                      },
                    ],
                  });
                }}
                className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-medium text-slate-800"
              >
                {catCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.uniqueCount} options)
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-slate-400 italic">No categorical dimension available</div>
            )}
          </div>
        </div>

        {/* Right: Charts Manager & Detailed Visual Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Chart Cards List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Included Native Visualizations ({spec.charts.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Each chart is bound to live formula feeds on the Analysis sheet.
                </p>
              </div>

              {/* Add Chart Dropdown */}
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition">
                    <Plus className="w-3.5 h-3.5" />
                    Add Chart
                  </button>

                  <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-20 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                      Suited Chart Types
                    </div>
                    {suitabilityList.map((st) => (
                      <button
                        key={st.type}
                        disabled={!st.enabled}
                        onClick={() => handleAddChart(st.type)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between ${
                          st.enabled
                            ? 'hover:bg-blue-50 text-slate-800 font-medium'
                            : 'opacity-40 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <span>{st.label}</span>
                        {!st.enabled && (
                          <span className="text-[9px] text-rose-500 font-normal">
                            {st.disabledReason?.slice(0, 20)}...
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Pill Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {spec.charts.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChartId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition shrink-0 ${
                    selectedChartId === c.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[150px]">{c.title}</span>
                  {spec.charts.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChart(c.id);
                      }}
                      className="hover:text-rose-300 ml-1"
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Chart Editor Form */}
            {selectedChart ? (
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Chart Title</label>
                    <input
                      type="text"
                      value={selectedChart.title}
                      onChange={(e) => handleUpdateChart(selectedChart.id, { title: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 bg-white font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Visual Purpose & Rationale</label>
                    <input
                      type="text"
                      value={selectedChart.purpose}
                      onChange={(e) => handleUpdateChart(selectedChart.id, { purpose: e.target.value })}
                      placeholder="One-line clear rationale"
                      className="w-full p-2 rounded border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Chart Type */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Chart Type</label>
                    <select
                      value={selectedChart.type}
                      onChange={(e) =>
                        handleUpdateChart(selectedChart.id, { type: e.target.value as ChartType })
                      }
                      className="w-full p-2 rounded border border-slate-300 bg-white"
                    >
                      {suitabilityList
                        .filter((s) => s.enabled || s.type === selectedChart.type)
                        .map((st) => (
                          <option key={st.type} value={st.type}>
                            {st.label}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* X Axis Column */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">X-Axis Dimension</label>
                    <select
                      value={selectedChart.xColumn}
                      onChange={(e) => handleUpdateChart(selectedChart.id, { xColumn: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 bg-white"
                    >
                      {columns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.userType})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Y Axis Column */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Y-Axis Metric</label>
                    <select
                      value={selectedChart.yColumns[0]?.column || numericCols[0]?.name}
                      onChange={(e) =>
                        handleUpdateChart(selectedChart.id, {
                          yColumns: [
                            {
                              column: e.target.value,
                              aggregation: 'SUM',
                              label: e.target.value,
                            },
                          ],
                        })
                      }
                      className="w-full p-2 rounded border border-slate-300 bg-white"
                    >
                      {numericCols.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.unit || c.userType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Top N Limitation</label>
                    <select
                      value={selectedChart.topN || 'all'}
                      onChange={(e) =>
                        handleUpdateChart(selectedChart.id, {
                          topN: e.target.value === 'all' ? undefined : parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full p-2 rounded border border-slate-300 bg-white"
                    >
                      <option value="5">Top 5 Leaders</option>
                      <option value="8">Top 8</option>
                      <option value="10">Top 10</option>
                      <option value="all">All Categories</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Sort Order</label>
                    <select
                      value={selectedChart.sortOrder || 'desc'}
                      onChange={(e) =>
                        handleUpdateChart(selectedChart.id, {
                          sortOrder: e.target.value as any,
                        })
                      }
                      className="w-full p-2 rounded border border-slate-300 bg-white"
                    >
                      <option value="desc">Highest First (Descending)</option>
                      <option value="asc">Lowest First (Ascending)</option>
                      <option value="none">Original Order</option>
                    </select>
                  </div>

                  <div className="space-y-1 flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedChart.dataLabels}
                        onChange={(e) =>
                          handleUpdateChart(selectedChart.id, { dataLabels: e.target.checked })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700">Show Data Value Labels</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                Click "+ Add Chart" to add a visualization.
              </div>
            )}
          </div>

          {/* Metric Traceability Dictionary Preview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Metric Governance & Formula Traceability
                </h4>
                <p className="text-[11px] text-slate-500">
                  Every KPI and chart feed is traceable to a source column, formula, and caveats in the Controls sheet.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Metric Name</th>
                    <th className="py-2 px-2">Agg</th>
                    <th className="py-2 px-2">Unit</th>
                    <th className="py-2 px-3">Source Column</th>
                    <th className="py-2 px-3">Formula Specification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {spec.metricDictionary.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-sans font-semibold text-slate-800">{m.name}</td>
                      <td className="py-1.5 px-2 text-blue-700">{m.aggregation}</td>
                      <td className="py-1.5 px-2 text-slate-500">{m.unit || '—'}</td>
                      <td className="py-1.5 px-3 text-slate-600">{m.sourceField}</td>
                      <td className="py-1.5 px-3 text-emerald-700 truncate max-w-xs">{m.formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
        >
          ← Back to Column Audit
        </button>

        <button
          onClick={onProceed}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
        >
          Proceed to Live Browser Preview
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

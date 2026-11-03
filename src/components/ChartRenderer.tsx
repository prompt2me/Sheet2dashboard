import React from 'react';
import { ChartConfig } from '../types/dashboard';

interface ChartRendererProps {
  chart: ChartConfig;
  data: { label: string; value: number; secondaryValue?: number }[];
  theme?: string;
  height?: number;
}

const PALETTE_COLORS: Record<string, string[]> = {
  slate: ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#DB2777', '#0284C7'],
  teal: ['#0D9488', '#0284C7', '#F59E0B', '#6366F1', '#EC4899', '#10B981'],
  indigo: ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
  emerald: ['#059669', '#2563EB', '#D97706', '#8B5CF6', '#06B6D4', '#EF4444'],
  amber: ['#D97706', '#2563EB', '#059669', '#7C3AED', '#EC4899', '#0284C7'],
  monochrome: ['#27272A', '#52525B', '#71717A', '#A1A1AA', '#3F3F46'],
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chart,
  data,
  theme = 'slate',
  height = 240,
}) => {
  const colors = PALETTE_COLORS[theme] || PALETTE_COLORS.slate;
  const primaryColor = colors[0];
  const accentColor = colors[1];

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200"
      >
        No data available for {chart.title}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const totalValue = data.reduce((acc, d) => acc + d.value, 0);

  // Format numbers nicely
  const formatNum = (num: number) => {
    if (chart.unit === '$' || chart.unit === 'USD') {
      return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    if (chart.unit === '%') {
      return `${num.toFixed(1)}%`;
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  // 1. Horizontal Bar Chart
  if (chart.type === 'bar') {
    return (
      <div className="space-y-2 py-1">
        {data.map((item, idx) => {
          const pct = Math.max(2, Math.min(100, (item.value / maxValue) * 100));
          return (
            <div key={idx} className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-700">
                <span className="font-medium truncate max-w-[180px]" title={item.label}>
                  {item.label}
                </span>
                <span className="font-semibold text-slate-900 font-mono">
                  {formatNum(item.value)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: colors[idx % colors.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 2. Vertical Column Chart
  if (chart.type === 'column') {
    return (
      <div className="space-y-2">
        <div style={{ height: height - 40 }} className="flex items-end gap-2 pt-4 px-2">
          {data.map((item, idx) => {
            const hPct = Math.max(4, (item.value / maxValue) * 100);
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition absolute -top-7 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-10 font-mono">
                  {item.label}: {formatNum(item.value)}
                </div>

                {chart.dataLabels && (
                  <span className="text-[10px] text-slate-500 font-mono mb-1 truncate max-w-full">
                    {item.value > 1000 ? `${(item.value / 1000).toFixed(0)}k` : item.value}
                  </span>
                )}

                <div
                  className="w-full rounded-t transition-all duration-300 hover:brightness-110"
                  style={{
                    height: `${hPct}%`,
                    backgroundColor: colors[idx % colors.length],
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex gap-2 px-2 border-t border-slate-200 pt-1 text-[11px] text-slate-500">
          {data.map((item, idx) => (
            <div key={idx} className="flex-1 text-center truncate" title={item.label}>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Time Series Line Chart
  if (chart.type === 'line' || chart.type === 'area') {
    const svgWidth = 500;
    const svgHeight = height - 40;
    const padding = 30;

    const points = data.map((d, i) => {
      const x = padding + (i / Math.max(1, data.length - 1)) * (svgWidth - padding * 2);
      const y = svgHeight - padding - (d.value / maxValue) * (svgHeight - padding * 2);
      return { x, y, ...d };
    });

    const pathD = points.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    );

    const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

    return (
      <div className="space-y-2">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
          {/* Subtle Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = svgHeight - padding - ratio * (svgHeight - padding * 2);
            return (
              <line
                key={idx}
                x1={padding}
                y1={y}
                x2={svgWidth - padding}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          {chart.type === 'area' && (
            <path d={areaD} fill={primaryColor} fillOpacity="0.15" />
          )}

          {/* Line Path */}
          <path d={pathD} fill="none" stroke={primaryColor} strokeWidth="2.5" />

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group">
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#FFFFFF"
                stroke={primaryColor}
                strokeWidth="2.5"
                className="transition hover:r-6 cursor-pointer"
              />
              <title>{`${p.label}: ${formatNum(p.value)}`}</title>
            </g>
          ))}
        </svg>

        {/* Date labels */}
        <div className="flex justify-between px-2 text-[11px] text-slate-500">
          <span>{data[0]?.label}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    );
  }

  // 4. Doughnut Chart (Proportional Share)
  if (chart.type === 'doughnut') {
    const size = 160;
    const center = size / 2;
    const radius = 55;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPct = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            {data.map((item, idx) => {
              const pct = totalValue > 0 ? item.value / totalValue : 0;
              const strokeDasharray = `${pct * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPct * circumference;
              accumulatedPct += pct;

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors[idx % colors.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-85"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total</span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {formatNum(totalValue)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 text-xs max-w-xs">
          {data.map((item, idx) => {
            const share = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            return (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span className="text-slate-700 truncate max-w-[120px]">{item.label}</span>
                <span className="text-slate-400 text-[11px] font-mono">
                  {share.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. Combo Chart (Actual Column + Target Line)
  if (chart.type === 'combo') {
    return (
      <div className="space-y-2">
        <div style={{ height: height - 40 }} className="flex items-end gap-2 pt-4 px-2 relative">
          {data.map((item, idx) => {
            const hPct = Math.max(4, (item.value / maxValue) * 100);
            const targetPct = item.secondaryValue
              ? Math.max(4, (item.secondaryValue / maxValue) * 100)
              : null;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Column for Actual */}
                <div
                  className="w-full rounded-t transition hover:brightness-110"
                  style={{ height: `${hPct}%`, backgroundColor: primaryColor }}
                />

                {/* Target marker indicator */}
                {targetPct !== null && (
                  <div
                    className="absolute w-full border-t-2 border-rose-500 z-10"
                    style={{ bottom: `${targetPct}%` }}
                    title={`Target: ${formatNum(item.secondaryValue || 0)}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs pt-1 border-t border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: primaryColor }} />
            <span className="text-slate-700">Actual {chart.yColumns[0]?.label || 'Value'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-rose-500" />
            <span className="text-slate-700">Target Benchmark</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

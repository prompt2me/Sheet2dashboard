import {
  ColumnProfile,
  DashboardSpec,
  BusinessTemplate,
  ChartSuitability,
  KPIConfig,
  ChartConfig,
  FilterConfig,
  MetricDictionaryEntry,
} from '../types/dashboard';

/**
 * Determine chart suitability for the current dataset columns
 */
export function evaluateChartSuitability(columns: ColumnProfile[]): ChartSuitability[] {
  const dateCols = columns.filter((c) => c.userType === 'date');
  const catCols = columns.filter((c) => c.userType === 'categorical');
  const numCols = columns.filter((c) => ['numeric', 'currency', 'count', 'target', 'percentage'].includes(c.userType));

  const hasDate = dateCols.length > 0;
  const hasCat = catCols.length > 0;
  const hasMultipleNum = numCols.length >= 2;
  const hasAnyNum = numCols.length >= 1;

  // Check low cardinality category for doughnut
  const lowCardCat = catCols.find((c) => c.uniqueCount >= 2 && c.uniqueCount <= 6);

  return [
    {
      type: 'bar',
      label: 'Horizontal Bar Chart',
      enabled: hasCat && hasAnyNum,
      disabledReason: !hasCat ? 'Requires a categorical dimension for row labels.' : !hasAnyNum ? 'Requires at least one numeric measure.' : undefined,
    },
    {
      type: 'column',
      label: 'Vertical Column Chart',
      enabled: (hasCat || hasDate) && hasAnyNum,
      disabledReason: !hasAnyNum ? 'Requires at least one numeric measure.' : undefined,
    },
    {
      type: 'stacked_column',
      label: 'Stacked Column Chart',
      enabled: catCols.length >= 2 && hasAnyNum,
      disabledReason: catCols.length < 2 ? 'Requires at least 2 categorical dimensions (X-axis and Legend breakdown).' : undefined,
    },
    {
      type: 'line',
      label: 'Time Series Line Chart',
      enabled: hasDate && hasAnyNum,
      disabledReason: !hasDate ? 'Line charts require sequential time data (date column). Categories lack natural order.' : undefined,
    },
    {
      type: 'area',
      label: 'Area Trend Chart',
      enabled: hasDate && hasAnyNum,
      disabledReason: !hasDate ? 'Requires a date column for cumulative trend representation.' : undefined,
    },
    {
      type: 'doughnut',
      label: 'Doughnut Chart (Share of Total)',
      enabled: Boolean(lowCardCat && hasAnyNum),
      disabledReason: !lowCardCat
        ? 'Doughnut charts degrade readability with >6 categories. Use a Bar chart for precise comparison.'
        : undefined,
    },
    {
      type: 'combo',
      label: 'Combo Chart (Bars + Line Trend)',
      enabled: hasDate && hasMultipleNum,
      disabledReason: !hasDate
        ? 'Requires a date column.'
        : !hasMultipleNum
        ? 'Requires at least 2 distinct measures (e.g. Sales Volume + Average Price).'
        : undefined,
    },
    {
      type: 'scatter',
      label: 'Scatter Plot (Correlation)',
      enabled: hasMultipleNum,
      disabledReason: !hasMultipleNum ? 'Requires at least two independent continuous numeric measures.' : undefined,
    },
    {
      type: 'heatmap',
      label: 'Matrix Heatmap Grid',
      enabled: catCols.length >= 2 && hasAnyNum,
      disabledReason: catCols.length < 2 ? 'Requires 2 categorical dimensions for rows and columns.' : undefined,
    },
  ];
}

/**
 * Intelligent "Recommend for me" engine
 * Auto-selects the optimal dashboard spec tailored to the data's true structure
 */
export function buildRecommendedSpec(
  filename: string,
  columns: ColumnProfile[],
  template: BusinessTemplate = 'generic',
  rows: Record<string, any>[]
): DashboardSpec {
  const dateCol = columns.find((c) => c.userType === 'date');
  const catCols = columns.filter((c) => c.userType === 'categorical');
  const currencyCols = columns.filter((c) => c.userType === 'currency');
  const countCols = columns.filter((c) => c.userType === 'count');
  const targetCols = columns.filter((c) => c.userType === 'target');
  const numericCols = columns.filter((c) => ['numeric', 'currency', 'count'].includes(c.userType));

  // Determine Primary Measure
  let primaryMeasure = currencyCols[0] || numericCols[0] || countCols[0];
  let secondaryMeasure = numericCols.find((c) => c.name !== primaryMeasure?.name);

  // Determine Primary Categorical Dimension (prefer moderate cardinality: 3-12)
  let primaryCat = catCols.find((c) => c.uniqueCount >= 3 && c.uniqueCount <= 15) || catCols[0];
  let secondaryCat = catCols.find((c) => c.name !== primaryCat?.name);

  // Generate Title & Subtitle based on template and filename
  const cleanBaseName = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  let title = `${cleanBaseName.toUpperCase()} Executive Performance Dashboard`;
  let businessContext = `Comprehensive business intelligence analysis generated for ${cleanBaseName}.`;

  if (template === 'sales') {
    title = 'Sales Performance & Revenue Intelligence';
    businessContext = 'Commercial sales performance, regional rankings, and top customer revenue contributions.';
  } else if (template === 'inventory') {
    title = 'Inventory Levels & Material Flow Dashboard';
    businessContext = 'Stock balances, item categories, turnover metrics, and unit-tracked reorder points.';
  } else if (template === 'finance') {
    title = 'Financial Operations & Expense Variance';
    businessContext = 'Revenue reconciliation, budget vs actual variance, and departmental spend audit.';
  } else if (template === 'operations') {
    title = 'Operational Efficiency & Worklog Analytics';
    businessContext = 'Work order throughput, regional utilization, and turnaround variance.';
  }

  // 1. Build KPI Cards
  const kpis: KPIConfig[] = [];
  const metricDictionary: MetricDictionaryEntry[] = [];

  if (primaryMeasure) {
    const isCurr = primaryMeasure.userType === 'currency';
    const unit = primaryMeasure.unit || (isCurr ? '$' : '');
    kpis.push({
      id: 'kpi_total_primary',
      title: `Total ${primaryMeasure.name}`,
      measureColumn: primaryMeasure.name,
      aggregation: 'SUM',
      unit,
      format: isCurr ? 'currency' : 'number',
      showPercentOfTotal: false,
      description: `Cumulative sum of all records in ${primaryMeasure.name}`,
      sourceColumnTrace: primaryMeasure.name,
    });

    metricDictionary.push({
      id: 'dict_total_primary',
      name: `Total ${primaryMeasure.name}`,
      aggregation: 'SUM',
      unit,
      sourceField: primaryMeasure.name,
      formula: `=SUM(Data[${primaryMeasure.name}])`,
      caveats: 'Additive metric. Excludes nulls and non-numeric entries.',
    });

    kpis.push({
      id: 'kpi_avg_primary',
      title: `Average ${primaryMeasure.name}`,
      measureColumn: primaryMeasure.name,
      aggregation: 'AVERAGE',
      unit,
      format: isCurr ? 'currency' : 'number',
      showPercentOfTotal: false,
      description: `Arithmetic mean per transaction in ${primaryMeasure.name}`,
      sourceColumnTrace: primaryMeasure.name,
    });

    metricDictionary.push({
      id: 'dict_avg_primary',
      name: `Average ${primaryMeasure.name}`,
      aggregation: 'AVERAGE',
      unit,
      sourceField: primaryMeasure.name,
      formula: `=AVERAGE(Data[${primaryMeasure.name}])`,
      caveats: 'Simple average per transaction row. Denominator is active record count.',
    });
  }

  if (secondaryMeasure) {
    const isCurr = secondaryMeasure.userType === 'currency';
    kpis.push({
      id: 'kpi_secondary',
      title: `Total ${secondaryMeasure.name}`,
      measureColumn: secondaryMeasure.name,
      aggregation: 'SUM',
      unit: secondaryMeasure.unit || '',
      format: isCurr ? 'currency' : 'number',
      showPercentOfTotal: false,
      description: `Total sum of ${secondaryMeasure.name}`,
      sourceColumnTrace: secondaryMeasure.name,
    });

    metricDictionary.push({
      id: 'dict_secondary',
      name: `Total ${secondaryMeasure.name}`,
      aggregation: 'SUM',
      unit: secondaryMeasure.unit || '',
      sourceField: secondaryMeasure.name,
      formula: `=SUM(Data[${secondaryMeasure.name}])`,
      caveats: 'Additive metric across active records.',
    });
  }

  // Record Count KPI
  kpis.push({
    id: 'kpi_record_count',
    title: 'Active Records',
    measureColumn: columns[0]?.name || 'ID',
    aggregation: 'COUNT',
    unit: 'records',
    format: 'integer',
    showPercentOfTotal: false,
    description: 'Total number of filtered business records analysed',
    sourceColumnTrace: columns[0]?.name || 'Row Index',
  });

  metricDictionary.push({
    id: 'dict_record_count',
    name: 'Active Records',
    aggregation: 'COUNTA',
    unit: 'records',
    sourceField: columns[0]?.name || 'Row ID',
    formula: `=COUNTA(Data[${columns[0]?.name || 'ID'}])`,
    caveats: 'Excludes blank rows and header row.',
  });

  // 2. Build Charts
  const charts: ChartConfig[] = [];

  // Chart 1: Categorical Bar / Column
  if (primaryCat && primaryMeasure) {
    charts.push({
      id: 'chart_category_breakdown',
      title: `${primaryMeasure.name} by ${primaryCat.name}`,
      purpose: `Compare contribution and distribution of ${primaryMeasure.name} across different ${primaryCat.name} groups.`,
      type: primaryCat.uniqueCount > 6 ? 'bar' : 'column',
      xColumn: primaryCat.name,
      yColumns: [
        {
          column: primaryMeasure.name,
          aggregation: 'SUM',
          label: `Total ${primaryMeasure.name}`,
          color: '#1E40AF',
        },
      ],
      topN: 10,
      sortOrder: 'desc',
      dataLabels: true,
      xAxisTitle: primaryCat.name,
      yAxisTitle: primaryMeasure.name,
      unit: primaryMeasure.unit,
      colorPalette: 'Viridis',
    });
  }

  // Chart 2: Time Series Trend (if date exists)
  if (dateCol && primaryMeasure) {
    charts.push({
      id: 'chart_trend_over_time',
      title: `${primaryMeasure.name} Performance Over Time`,
      purpose: `Identify seasonal spikes, growth trajectories, and trend inflection points across dates.`,
      type: 'line',
      xColumn: dateCol.name,
      yColumns: [
        {
          column: primaryMeasure.name,
          aggregation: 'SUM',
          label: `Total ${primaryMeasure.name}`,
          color: '#0D9488',
        },
      ],
      sortOrder: 'asc',
      dataLabels: false,
      xAxisTitle: dateCol.name,
      yAxisTitle: primaryMeasure.name,
      unit: primaryMeasure.unit,
      colorPalette: 'Teal',
    });
  }

  // Chart 3: Doughnut (only if low cardinality category exists)
  const lowCard = catCols.find((c) => c.name !== primaryCat?.name && c.uniqueCount >= 2 && c.uniqueCount <= 6);
  if (lowCard && primaryMeasure) {
    charts.push({
      id: 'chart_share_doughnut',
      title: `Share of ${primaryMeasure.name} by ${lowCard.name}`,
      purpose: `Visualize proportional split and market share among primary ${lowCard.name} divisions.`,
      type: 'doughnut',
      xColumn: lowCard.name,
      yColumns: [
        {
          column: primaryMeasure.name,
          aggregation: 'SUM',
          label: `Share of ${primaryMeasure.name}`,
        },
      ],
      sortOrder: 'desc',
      dataLabels: true,
      unit: '%',
    });
  } else if (secondaryCat && primaryMeasure) {
    // Top 5 Ranking Chart
    charts.push({
      id: 'chart_rankings_secondary',
      title: `Top 5 ${secondaryCat.name} Leaders`,
      purpose: `Highlight top performing ${secondaryCat.name} contributors to focus business efforts.`,
      type: 'bar',
      xColumn: secondaryCat.name,
      yColumns: [
        {
          column: primaryMeasure.name,
          aggregation: 'SUM',
          label: primaryMeasure.name,
          color: '#4338CA',
        },
      ],
      topN: 5,
      sortOrder: 'desc',
      dataLabels: true,
      xAxisTitle: secondaryCat.name,
      yAxisTitle: primaryMeasure.name,
      unit: primaryMeasure.unit,
    });
  }

  // Chart 4: Target vs Actual (Combo) if target column exists
  if (targetCols.length > 0 && primaryMeasure && primaryCat) {
    const targetCol = targetCols[0];
    charts.push({
      id: 'chart_actual_vs_target',
      title: `Actual vs Target Performance by ${primaryCat.name}`,
      purpose: `Assess quota attainment and variance against benchmark targets.`,
      type: 'combo',
      xColumn: primaryCat.name,
      yColumns: [
        { column: primaryMeasure.name, aggregation: 'SUM', label: 'Actual', color: '#2563EB' },
        { column: targetCol.name, aggregation: 'SUM', label: 'Target', color: '#DC2626' },
      ],
      topN: 8,
      sortOrder: 'desc',
      dataLabels: true,
      unit: primaryMeasure.unit,
    });
  }

  // 3. Dropdown Filters
  const filters: FilterConfig[] = [];
  catCols.slice(0, 3).forEach((col) => {
    const uniqueValues = Array.from(
      new Set(rows.map((r) => String(r[col.name] ?? '').trim()).filter(Boolean))
    ).slice(0, 25);
    filters.push({
      column: col.name,
      label: `Filter by ${col.name}`,
      defaultValue: 'All',
      availableOptions: ['All', ...uniqueValues],
    });
  });

  // Calculate reporting period
  let periodLabel = 'Full Historical Record';
  if (dateCol && rows.length > 0) {
    const dates = rows
      .map((r) => r[dateCol.name])
      .filter((d) => d && !isNaN(new Date(d).getTime()))
      .map((d) => new Date(d).getTime());
    if (dates.length > 0) {
      const minD = new Date(Math.min(...dates)).toISOString().slice(0, 10);
      const maxD = new Date(Math.max(...dates)).toISOString().slice(0, 10);
      periodLabel = `${minD} to ${maxD}`;
    }
  }

  return {
    title,
    subtitle: 'Formula-Driven Executive Intelligence · Dynamic Named Ranges · Native Excel Visualizations',
    businessContext,
    template,
    theme: 'slate',
    density: 'executive',
    language: 'English',
    reportingPeriod: {
      mode: 'auto',
      label: periodLabel,
    },
    lastRefreshDate: new Date().toISOString().slice(0, 10),
    anomalyThresholdZ: 2.5,
    sections: {
      executiveSummary: true,
      kpiCards: true,
      trendAnalysis: Boolean(dateCol),
      categoryComparison: Boolean(primaryCat),
      rankings: Boolean(secondaryCat || primaryCat),
      distribution: Boolean(lowCard),
      varianceGrowth: targetCols.length > 0,
      anomalyList: true,
      qualityAuditPanel: true,
      detailedTable: true,
      methodologyTraceability: true,
    },
    kpis,
    charts,
    filters,
    metricDictionary,
    parameters: {
      targetMarginPct: 0.2,
      budgetThreshold: 10000,
      highlightTopN: 5,
    },
  };
}

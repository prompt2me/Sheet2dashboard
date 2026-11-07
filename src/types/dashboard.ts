/**
 * Sheet2Dashboard Type Definitions
 * Declarative specification driving both in-browser interactive preview and Excel generator
 */

export type ColumnDataType =
  | 'identifier'
  | 'date'
  | 'categorical'
  | 'numeric'
  | 'currency'
  | 'percentage'
  | 'ratio'
  | 'count'
  | 'target'
  | 'text'
  | 'boolean'
  | 'unknown';

export type PiiType = 'name' | 'email' | 'phone' | 'address' | 'id' | 'financial' | 'custom';
export type PiiRedactionMethod = 'mask' | 'hash' | 'redact_label' | 'none';

export interface ColumnProfile {
  name: string;
  originalName: string;
  index: number;
  detectedType: ColumnDataType;
  userType: ColumnDataType;
  unit: string;
  sampleValues: (string | number | boolean | null)[];
  uniqueCount: number;
  missingCount: number;
  missingPercentage?: number;
  distinctPercentage?: number;
  min?: number | string;
  max?: number | string;
  isUncertain: boolean;
  uncertaintyReason?: string;
  detectedCurrencies?: string[];
  detectedUnits?: string[];
  hasMixedUnits?: boolean;
  isPII?: boolean;
  piiType?: PiiType;
  piiRedactionMethod?: PiiRedactionMethod;
  biRole?: 'dimension' | 'measure' | 'identifier' | 'date' | 'attribute';
  inconsistencies?: string[];
  classificationConfidence?: number;
}

export type QualityStatus = 'ready' | 'ready_with_caveats' | 'needs_cleaning' | 'unsafe';

export interface QualityIssue {
  id: string;
  column?: string;
  type:
    | 'missing_values'
    | 'duplicate_rows'
    | 'inconsistent_spelling'
    | 'numbers_as_text'
    | 'mixed_units'
    | 'mixed_currencies'
    | 'mixed_percentages'
    | 'impossible_values'
    | 'unreconciled_totals'
    | 'outliers_spikes';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  count: number;
  affectedRowIndices?: number[];
  recommendation: string;
}

export interface AnomalyItem {
  rowIndex: number;
  dimensionLabel: string;
  measureColumn: string;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
  isIndicative: boolean; // true if group sample size < 30
  groupSize: number;
  categoryGroup?: string;
}

export interface DataQualityAudit {
  status: QualityStatus;
  statusReasons: string[];
  totalRows: number;
  totalColumns: number;
  duplicateRowCount: number;
  missingCellsCount: number;
  completenessScore?: number;
  overallHealthScore?: number;
  issues: QualityIssue[];
  anomalies: AnomalyItem[];
  mixedUnitWarnings: string[];
  hasSummaryRows: boolean;
  summaryRowsDetected?: number[];
  analystVerdict?: {
    headline: string;
    summary: string;
    actionItems: string[];
  };
}

export type BusinessTemplate =
  | 'generic'
  | 'sales'
  | 'inventory'
  | 'finance'
  | 'hr'
  | 'operations'
  | 'marketing'
  | 'projects';

export type ChartType =
  | 'bar'
  | 'column'
  | 'stacked_column'
  | 'line'
  | 'area'
  | 'combo'
  | 'doughnut'
  | 'scatter'
  | 'heatmap';

export interface ChartSuitability {
  type: ChartType;
  label: string;
  enabled: boolean;
  disabledReason?: string;
}

export interface KPIConfig {
  id: string;
  title: string;
  measureColumn: string;
  aggregation: 'SUM' | 'AVERAGE' | 'COUNT' | 'DISTINCT_COUNT' | 'MAX' | 'MIN';
  targetColumn?: string;
  unit: string;
  format: 'currency' | 'number' | 'percentage' | 'integer';
  showPercentOfTotal?: boolean;
  description: string;
  sourceColumnTrace: string;
}

export interface ChartYSeries {
  column: string;
  aggregation: 'SUM' | 'AVERAGE' | 'COUNT';
  label?: string;
  color?: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  purpose: string;
  type: ChartType;
  xColumn: string;
  yColumns: ChartYSeries[];
  stackByColumn?: string;
  topN?: number; // e.g. 5 or 10
  sortOrder?: 'desc' | 'asc' | 'none';
  dataLabels: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
  unit?: string;
  colorPalette?: string;
}

export interface FilterConfig {
  column: string;
  label: string;
  defaultValue: string;
  availableOptions: string[];
}

export interface MetricDictionaryEntry {
  id: string;
  name: string;
  aggregation: string;
  unit: string;
  sourceField: string;
  formula: string;
  caveats: string;
}

export interface DashboardSpec {
  title: string;
  subtitle: string;
  businessContext: string;
  template: BusinessTemplate;
  theme: 'slate' | 'teal' | 'indigo' | 'emerald' | 'amber' | 'monochrome';
  density: 'executive' | 'analyst';
  language: string;
  reportingPeriod: {
    mode: 'auto' | 'manual';
    startDate?: string;
    endDate?: string;
    label: string;
  };
  lastRefreshDate: string;
  anomalyThresholdZ: number;
  sections: {
    executiveSummary: boolean;
    kpiCards: boolean;
    trendAnalysis: boolean;
    categoryComparison: boolean;
    rankings: boolean;
    distribution: boolean;
    varianceGrowth: boolean;
    anomalyList: boolean;
    qualityAuditPanel: boolean;
    detailedTable: boolean;
    methodologyTraceability: boolean;
  };
  kpis: KPIConfig[];
  charts: ChartConfig[];
  filters: FilterConfig[];
  metricDictionary: MetricDictionaryEntry[];
  parameters: {
    targetMarginPct?: number;
    budgetThreshold?: number;
    highlightTopN?: number;
  };
}

export interface OcrCell {
  column: string;
  value: string | number | null;
  confidence: number; // 0.0 - 1.0
  type: 'text' | 'number' | 'currency' | 'date';
  isEdited?: boolean;
}

export interface OcrRow {
  cells: OcrCell[];
}

export interface OcrExtractionData {
  tableName: string;
  columns: string[];
  rows: OcrRow[];
  notes: string[];
}

export interface DeliveryQAItem {
  id: string;
  category: 'Formulas' | 'Reconciliation' | 'Scenario' | 'Integrity' | 'Layout';
  label: string;
  passed: boolean;
  details: string;
  verifier: string;
}

export interface ValidationReport {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  qaItems: DeliveryQAItem[];
  contract: FinalOutputContract;
}

export interface EvidenceFinding {
  headline: string;
  observation: string;
  interpretation: string;
  recommendation: string;
  confidence: 'High' | 'Medium' | 'Low';
  metricReference: string;
  sourceColumn: string;
}

export interface FinalOutputContract {
  datasetAnalysed: {
    name: string;
    rowCount: number;
    columnCount: number;
    fileFormat: string;
  };
  outputBuilt: {
    sheetsCreated: string[];
    kpiCount: number;
    chartCount: number;
    filterCount: number;
  };
  dataQualityStatus: {
    status: QualityStatus;
    reasons: string[];
    criticalIssuesCount: number;
  };
  chartsCreated: Array<{
    title: string;
    purpose: string;
    type: string;
    source: string;
  }>;
  mostImportantFindings: EvidenceFinding[];
  primaryInsight: string;
  caveatsAndNotComputed: string[];
  recommendedNextSteps: string[];
  traceability: MetricDictionaryEntry[];
}

export interface ParsedDataset {
  filename: string;
  fileSize: number;
  sheetNames: string[];
  activeSheet: string;
  rawRows: Record<string, any>[];
  headers: string[];
  columns: ColumnProfile[];
  audit: DataQualityAudit;
  originalRawText?: string;
  isFromOcr?: boolean;
  ocrData?: OcrExtractionData;
}

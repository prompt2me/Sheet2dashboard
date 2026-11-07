import {
  ColumnDataType,
  ColumnProfile,
  DataQualityAudit,
  QualityIssue,
  QualityStatus,
  AnomalyItem,
} from '../types/dashboard';
import { detectPiiColumn } from './piiRedactor';

/**
 * Currency symbols and codes to detect currency strings
 */
const CURRENCY_SYMBOLS = ['$', '€', '£', '¥', '₹', '₩', 'CHF', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

/**
 * Common unit keywords found in column names or values
 */
const KNOWN_UNITS = [
  'kg', 'g', 'lbs', 'oz', 'tons', 'ton',
  'm', 'cm', 'mm', 'km', 'ft', 'in', 'miles',
  'liters', 'l', 'ml', 'gallons', 'gal',
  'pcs', 'pieces', 'units', 'boxes', 'crates', 'bars', 'sheets', 'rolls', 'items',
  'hours', 'hrs', 'days', 'weeks', 'months', 'mins', 'seconds',
  '%', 'pct', 'percent'
];

/**
 * Clean numeric string into actual number, detecting currency/unit
 */
export function cleanNumericValue(val: any): {
  numericValue: number | null;
  currency?: string;
  unit?: string;
  isPercent?: boolean;
} {
  if (val === null || val === undefined || val === '') {
    return { numericValue: null };
  }
  if (typeof val === 'number') {
    return { numericValue: isNaN(val) ? null : val };
  }

  const str = String(val).trim();
  let detectedCurrency: string | undefined;
  let detectedUnit: string | undefined;
  let isPercent = false;

  // Check currency
  for (const curr of CURRENCY_SYMBOLS) {
    if (str.includes(curr)) {
      detectedCurrency = curr;
      break;
    }
  }

  // Check percent
  if (str.endsWith('%')) {
    isPercent = true;
  }

  // Strip non-numeric characters except minus and decimal point
  let cleaned = str.replace(/[^\d.-]/g, '');

  // Check for European comma decimal (e.g. 1.250,50 -> 1250.50)
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // European format: 1.250,50
      cleaned = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    } else {
      // US format: 1,250.50
      cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '');
    }
  } else if (str.includes(',') && !str.includes('.')) {
    // Check if comma is decimal (e.g. 45,5) or thousand (e.g. 1,000)
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length !== 3) {
      cleaned = str.replace(',', '.').replace(/[^\d.-]/g, '');
    } else {
      cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '');
    }
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return { numericValue: null };
  }

  return {
    numericValue: isPercent ? num / 100 : num,
    currency: detectedCurrency,
    unit: detectedUnit,
    isPercent,
  };
}

/**
 * Check if a string is a valid date
 */
export function isValidDate(val: any): boolean {
  if (!val) return false;
  const s = String(val).trim();
  if (s.length < 4) return false;
  // Exclude pure numbers e.g. "2024" which might be year or regular int
  if (/^\d{1,4}$/.test(s)) return false;

  // Standard date patterns: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, Mon DD YYYY, Fiscal Qs
  if (/^Q[1-4]\s+\d{4}$/i.test(s) || /^\d{4}-Q[1-4]$/i.test(s)) return true;

  const d = new Date(s);
  return !isNaN(d.getTime()) && d.getFullYear() > 1950 && d.getFullYear() < 2100;
}

/**
 * Classify a column based on name, values, patterns, and BI analytical semantics
 */
export function classifyColumn(name: string, values: any[], index: number): ColumnProfile {
  const totalCount = values.length;
  const nonNulls = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  const totalNonNull = nonNulls.length;
  const missingCount = totalCount - totalNonNull;
  const missingPercentage = totalCount > 0 ? Math.round((missingCount / totalCount) * 1000) / 10 : 0;

  const sampleValues = nonNulls.slice(0, 5);
  const uniqueSet = new Set(nonNulls.map((v) => String(v).trim().toLowerCase()));
  const uniqueCount = uniqueSet.size;
  const distinctPercentage = totalNonNull > 0 ? Math.round((uniqueCount / totalNonNull) * 1000) / 10 : 0;

  const lowerName = name.toLowerCase().trim();
  const inconsistencies: string[] = [];

  // Unit detection from column name (e.g. "Weight (kg)", "Revenue ($)", "Growth %")
  let unit = '';
  for (const curr of CURRENCY_SYMBOLS) {
    if (lowerName.includes(curr.toLowerCase()) || lowerName.includes(`(${curr.toLowerCase()})`)) {
      unit = curr;
      break;
    }
  }
  if (!unit) {
    for (const u of KNOWN_UNITS) {
      if (
        lowerName.endsWith(`_${u}`) ||
        lowerName.endsWith(`(${u})`) ||
        lowerName.includes(`[${u}]`) ||
        lowerName.split(/\s+/).includes(u)
      ) {
        unit = u;
        break;
      }
    }
  }

  // Detect types from values
  let dateMatches = 0;
  let numberMatches = 0;
  let booleanMatches = 0;
  let currencySymbolsFound = new Set<string>();
  let hasPercentSign = 0;
  let negativeCount = 0;
  let whitespaceCount = 0;

  let minNum: number | undefined;
  let maxNum: number | undefined;

  for (const v of nonNulls) {
    const s = String(v).trim();
    if (String(v) !== s) {
      whitespaceCount++;
    }

    if (['true', 'false', 'yes', 'no', '0', '1', 'y', 'n', 'oui', 'non'].includes(s.toLowerCase()) && uniqueCount <= 2) {
      booleanMatches++;
    }
    if (isValidDate(v)) {
      dateMatches++;
    }

    const { numericValue, currency, isPercent } = cleanNumericValue(v);
    if (numericValue !== null) {
      numberMatches++;
      if (numericValue < 0) negativeCount++;
      if (minNum === undefined || numericValue < minNum) minNum = numericValue;
      if (maxNum === undefined || numericValue > maxNum) maxNum = numericValue;
    }
    if (currency) currencySymbolsFound.add(currency);
    if (isPercent) hasPercentSign++;
  }

  if (whitespaceCount > 0) {
    inconsistencies.push(`${whitespaceCount} value(s) contain leading or trailing whitespace`);
  }

  const dateRatio = totalNonNull > 0 ? dateMatches / totalNonNull : 0;
  const numRatio = totalNonNull > 0 ? numberMatches / totalNonNull : 0;
  const boolRatio = totalNonNull > 0 ? booleanMatches / totalNonNull : 0;

  let detectedType: ColumnDataType = 'unknown';
  let biRole: 'dimension' | 'measure' | 'identifier' | 'date' | 'attribute' = 'dimension';
  let classificationConfidence = 0.85;
  let isUncertain = false;
  let uncertaintyReason: string | undefined;

  // Rule 1: Identifier / ID
  if (
    lowerName.includes('id') ||
    lowerName.includes('code') ||
    lowerName.includes('uuid') ||
    lowerName.includes('sku') ||
    lowerName.includes('barcode') ||
    lowerName.includes('reference') ||
    lowerName.includes('key') ||
    (uniqueCount === totalNonNull && totalNonNull > 10 && numRatio < 0.9)
  ) {
    detectedType = 'identifier';
    biRole = 'identifier';
    classificationConfidence = 0.95;
  }
  // Rule 2: Date
  else if (
    dateRatio > 0.6 ||
    lowerName.includes('date') ||
    lowerName.includes('timestamp') ||
    lowerName.includes('time') ||
    lowerName.includes('created_at') ||
    lowerName.includes('updated_at') ||
    lowerName.includes('period') ||
    lowerName.includes('month') ||
    lowerName.includes('year')
  ) {
    detectedType = 'date';
    biRole = 'date';
    classificationConfidence = 0.96;
  }
  // Rule 3: Currency
  else if (
    currencySymbolsFound.size > 0 ||
    unit === '$' ||
    unit === '€' ||
    unit === '£' ||
    lowerName.includes('revenue') ||
    lowerName.includes('sales') ||
    lowerName.includes('cost') ||
    lowerName.includes('price') ||
    lowerName.includes('profit') ||
    lowerName.includes('margin') ||
    lowerName.includes('budget') ||
    lowerName.includes('spend') ||
    lowerName.includes('fee') ||
    lowerName.includes('amount') ||
    lowerName.includes('valuation')
  ) {
    if (numRatio > 0.5) {
      detectedType = 'currency';
      biRole = 'measure';
      classificationConfidence = 0.98;
      if (!unit && currencySymbolsFound.size > 0) {
        unit = Array.from(currencySymbolsFound)[0];
      } else if (!unit) {
        unit = '$';
      }
    }
  }
  // Rule 4: Percentage / Ratio
  else if (
    hasPercentSign > 0 ||
    unit === '%' ||
    lowerName.includes('rate') ||
    lowerName.includes('percentage') ||
    lowerName.includes('pct') ||
    lowerName.includes('ratio') ||
    lowerName.includes('share') ||
    lowerName.includes('growth')
  ) {
    if (numRatio > 0.5) {
      detectedType = 'percentage';
      biRole = 'measure';
      unit = '%';
      classificationConfidence = 0.95;
    }
  }
  // Rule 5: Target
  else if (lowerName.includes('target') || lowerName.includes('quota') || lowerName.includes('goal') || lowerName.includes('benchmark')) {
    if (numRatio > 0.5) {
      detectedType = 'target';
      biRole = 'measure';
      classificationConfidence = 0.92;
    }
  }
  // Rule 6: Count / Integer
  else if (
    lowerName.includes('count') ||
    lowerName.includes('quantity') ||
    lowerName.includes('qty') ||
    lowerName.includes('headcount') ||
    lowerName.includes('units') ||
    lowerName.includes('volume') ||
    lowerName.includes('orders')
  ) {
    if (numRatio > 0.5) {
      detectedType = 'count';
      biRole = 'measure';
      if (!unit) unit = 'units';
      classificationConfidence = 0.94;
    }
  }
  // Rule 7: General Numeric Measure
  else if (numRatio > 0.75) {
    detectedType = 'numeric';
    biRole = 'measure';
    classificationConfidence = 0.90;
  }
  // Rule 8: Boolean Flag
  else if (boolRatio > 0.8 && uniqueCount <= 2) {
    detectedType = 'boolean';
    biRole = 'dimension';
    classificationConfidence = 0.95;
  }
  // Rule 9: Categorical Dimension
  else if (uniqueCount <= Math.max(35, totalNonNull * 0.4) && totalNonNull > 0) {
    detectedType = 'categorical';
    biRole = 'dimension';
    classificationConfidence = 0.92;
  }
  // Rule 10: Free text attribute
  else {
    detectedType = 'text';
    biRole = 'attribute';
    classificationConfidence = 0.85;
  }

  // Detect logical inconsistencies
  if (['count', 'quantity'].includes(detectedType) && negativeCount > 0) {
    inconsistencies.push(`${negativeCount} negative count/quantity value(s) found`);
  }
  if (currencySymbolsFound.size > 1) {
    inconsistencies.push(`Mixed currency symbols detected (${Array.from(currencySymbolsFound).join(', ')})`);
  }
  if (uniqueCount === 1 && totalNonNull > 3) {
    inconsistencies.push('Zero-variance constant column (only 1 unique value)');
  }

  // Check uncertainty
  if (numRatio > 0.3 && numRatio < 0.8) {
    isUncertain = true;
    uncertaintyReason = `Mixed text and numbers (${Math.round(numRatio * 100)}% numeric). Confirm whether this is a measure or dimension.`;
  } else if (detectedType === 'unknown' || (uniqueCount === totalNonNull && detectedType === 'categorical')) {
    isUncertain = true;
    uncertaintyReason = `High cardinality with unclear semantic role.`;
  }

  const piiCheck = detectPiiColumn(name, sampleValues);

  return {
    name,
    originalName: name,
    index,
    detectedType,
    userType: detectedType,
    unit,
    sampleValues,
    uniqueCount,
    missingCount,
    missingPercentage,
    distinctPercentage,
    min: minNum,
    max: maxNum,
    isUncertain,
    uncertaintyReason,
    detectedCurrencies: Array.from(currencySymbolsFound),
    detectedUnits: unit ? [unit] : [],
    hasMixedUnits: currencySymbolsFound.size > 1,
    isPII: piiCheck.isPII,
    piiType: piiCheck.piiType,
    piiRedactionMethod: piiCheck.isPII ? 'mask' : 'none',
    biRole,
    inconsistencies,
    classificationConfidence,
  };
}

/**
 * Conduct comprehensive business intelligence data quality audit,
 * detecting missing values, inconsistencies, mixed units, and Z-score outlier signals.
 * Assigns one of 4 rigorous statuses: 'ready' | 'ready_with_caveats' | 'needs_cleaning' | 'unsafe'
 */
export function runDataQualityAudit(
  rows: Record<string, any>[],
  columns: ColumnProfile[],
  summaryRowsDetected: number[] = []
): DataQualityAudit {
  const issues: QualityIssue[] = [];
  const statusReasons: string[] = [];
  const mixedUnitWarnings: string[] = [];
  const anomalies: AnomalyItem[] = [];

  const totalRows = rows.length;
  const totalColumns = columns.length;

  if (totalRows === 0) {
    return {
      status: 'unsafe',
      statusReasons: ['Dataset contains 0 records. No business data available for analysis.'],
      totalRows: 0,
      totalColumns,
      duplicateRowCount: 0,
      missingCellsCount: 0,
      completenessScore: 0,
      overallHealthScore: 0,
      issues: [
        {
          id: 'empty_dataset',
          type: 'missing_values',
          severity: 'critical',
          message: 'Dataset contains 0 records.',
          count: 0,
          recommendation: 'Upload a populated dataset with at least 2 rows of transactional or dimensional data.',
        },
      ],
      anomalies: [],
      mixedUnitWarnings: [],
      hasSummaryRows: false,
      analystVerdict: {
        headline: 'Critical Failure: Dataset is Empty',
        summary: 'Cannot perform BI modeling on an empty dataset.',
        actionItems: ['Upload a valid CSV, XLSX, or table document.'],
      },
    };
  }

  // 1. Duplicate Rows Check
  const rowHashTracker = new Map<string, number[]>();
  let duplicateRowCount = 0;
  rows.forEach((r, idx) => {
    const serialized = JSON.stringify(r);
    const existing = rowHashTracker.get(serialized);
    if (existing) {
      existing.push(idx);
      duplicateRowCount++;
    } else {
      rowHashTracker.set(serialized, [idx]);
    }
  });

  if (duplicateRowCount > 0) {
    const dupRatio = duplicateRowCount / totalRows;
    const severity = dupRatio > 0.1 ? 'warning' : 'info';
    issues.push({
      id: 'duplicate_rows',
      type: 'duplicate_rows',
      severity,
      message: `${duplicateRowCount} duplicate row(s) identified (${(dupRatio * 100).toFixed(1)}% of dataset).`,
      count: duplicateRowCount,
      recommendation: 'Verify if duplicate transactions are intentional or redundant data export artifacts.',
    });
    if (dupRatio > 0.15) {
      statusReasons.push(`High duplicate row concentration: ${(dupRatio * 100).toFixed(1)}% of dataset consists of repeated records.`);
    }
  }

  // 2. Missing Values Analysis
  let totalMissingCells = 0;
  const totalCells = totalRows * totalColumns;

  columns.forEach((col) => {
    totalMissingCells += col.missingCount;
    if (col.missingCount > 0) {
      const missRatio = col.missingCount / totalRows;
      const severity = missRatio > 0.4 ? 'warning' : 'info';
      if (missRatio > 0.05) {
        issues.push({
          id: `missing_${col.name}`,
          column: col.name,
          type: 'missing_values',
          severity,
          message: `Column "${col.name}" has ${col.missingCount} missing values (${(missRatio * 100).toFixed(1)}%).`,
          count: col.missingCount,
          recommendation: 'Formulas will utilize zero-fill or explicit filter conditions to avoid skewing totals.',
        });
        if (missRatio > 0.45 && ['currency', 'numeric', 'date', 'identifier'].includes(col.userType)) {
          statusReasons.push(`Critical column "${col.name}" has ${(missRatio * 100).toFixed(1)}% missing values.`);
        }
      }
    }
  });

  const completenessScore = totalCells > 0 ? Math.round(((totalCells - totalMissingCells) / totalCells) * 1000) / 10 : 0;

  // 3. Inconsistent Casing across Categorical Dimensions
  columns.forEach((col) => {
    if (['categorical', 'text'].includes(col.userType)) {
      const rawValues = rows.map((r) => r[col.name]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      const uniqueCased = new Set(rawValues.map((v) => String(v).trim()));
      const uniqueLower = new Set(rawValues.map((v) => String(v).trim().toLowerCase()));

      if (uniqueCased.size > uniqueLower.size) {
        const diff = uniqueCased.size - uniqueLower.size;
        issues.push({
          id: `casing_${col.name}`,
          column: col.name,
          type: 'inconsistent_spelling',
          severity: 'warning',
          message: `Column "${col.name}" contains ${diff} casing variant(s) (e.g., capitalization differences in category labels).`,
          count: diff,
          recommendation: 'Categorical normalization will reconcile casing so pivot tables do not fracture categories.',
        });
        statusReasons.push(`Inconsistent casing in "${col.name}" creates duplicate category groupings in pivot summaries.`);
      }
    }
  });

  // 4. Numbers Stored as Text & Whitespace Inconsistencies
  columns.forEach((col) => {
    let leadingTrailingSpaces = 0;
    let numbersStoredAsText = 0;

    rows.forEach((r) => {
      const val = r[col.name];
      if (typeof val === 'string') {
        if (val !== val.trim()) {
          leadingTrailingSpaces++;
        }
        if (['numeric', 'currency', 'percentage', 'count'].includes(col.userType)) {
          if (/^[\s$€£¥\d,.-]+$/.test(val) && !isNaN(parseFloat(val.replace(/[^\d.-]/g, '')))) {
            numbersStoredAsText++;
          }
        }
      }
    });

    if (leadingTrailingSpaces > 0) {
      issues.push({
        id: `spaces_${col.name}`,
        column: col.name,
        type: 'inconsistent_spelling',
        severity: 'info',
        message: `Column "${col.name}" has ${leadingTrailingSpaces} values with leading or trailing whitespace.`,
        count: leadingTrailingSpaces,
        recommendation: 'Automated TRIM() cleaning is applied during Excel data table creation to ensure formula joins work.',
      });
    }

    if (numbersStoredAsText > 0 && col.userType !== 'text') {
      issues.push({
        id: `text_num_${col.name}`,
        column: col.name,
        type: 'numbers_as_text',
        severity: 'info',
        message: `Column "${col.name}" contains numeric values formatted with strings or symbols.`,
        count: numbersStoredAsText,
        recommendation: 'Clean numeric conversion will be written to the clean Data table with native cell formatting.',
      });
    }
  });

  // 5. Mixed Units Rule Enforcement (NON-NEGOTIABLE CORE PHILOSOPHY)
  columns.forEach((col) => {
    if (col.hasMixedUnits && col.detectedCurrencies && col.detectedCurrencies.length > 1) {
      const warn = `Column "${col.name}" contains mixed currencies (${col.detectedCurrencies.join(', ')}). Never sum amounts across different currencies!`;
      mixedUnitWarnings.push(warn);
      issues.push({
        id: `mixed_curr_${col.name}`,
        column: col.name,
        type: 'mixed_currencies',
        severity: 'critical',
        message: warn,
        count: col.detectedCurrencies.length,
        recommendation: 'Segment aggregates by currency code or apply currency conversion before aggregating grand totals.',
      });
      statusReasons.push(`Mixed currencies detected in "${col.name}". Summing without currency filter is mathematically invalid.`);
    }
  });

  // 6. Outliers and Z-Score Anomalies (signals, never silently deleted)
  const catCol = columns.find((c) => c.userType === 'categorical');
  const numericCols = columns.filter((c) => ['numeric', 'currency', 'count'].includes(c.userType));

  numericCols.forEach((mCol) => {
    const cleanVals: { rowIndex: number; val: number; groupKey: string }[] = [];
    rows.forEach((r, idx) => {
      const { numericValue } = cleanNumericValue(r[mCol.name]);
      if (numericValue !== null && !isNaN(numericValue)) {
        const groupKey = catCol ? String(r[catCol.name] ?? 'All') : 'All';
        cleanVals.push({ rowIndex: idx, val: numericValue, groupKey });
      }
    });

    if (cleanVals.length >= 5) {
      const totalCount = cleanVals.length;
      const globalMean = cleanVals.reduce((acc, curr) => acc + curr.val, 0) / totalCount;
      const globalVariance =
        cleanVals.reduce((acc, curr) => acc + Math.pow(curr.val - globalMean, 2), 0) / totalCount;
      const globalStdDev = Math.sqrt(globalVariance);

      if (globalStdDev > 0) {
        cleanVals.forEach((item) => {
          const zScore = (item.val - globalMean) / globalStdDev;
          if (Math.abs(zScore) >= 2.5) {
            const dimLabel = catCol
              ? `${item.groupKey} (Row ${item.rowIndex + 1})`
              : `Row ${item.rowIndex + 1}`;

            if (!anomalies.some((a) => a.rowIndex === item.rowIndex && a.measureColumn === mCol.name)) {
              anomalies.push({
                rowIndex: item.rowIndex,
                dimensionLabel: dimLabel,
                measureColumn: mCol.name,
                value: item.val,
                mean: globalMean,
                stdDev: globalStdDev,
                zScore: parseFloat(zScore.toFixed(2)),
                isIndicative: totalCount < 30,
                groupSize: totalCount,
                categoryGroup: item.groupKey,
              });
            }
          }
        });
      }

      // Group-level Z-Scores
      const groups = new Map<string, typeof cleanVals>();
      cleanVals.forEach((item) => {
        const list = groups.get(item.groupKey) || [];
        list.push(item);
        groups.set(item.groupKey, list);
      });

      groups.forEach((items, gKey) => {
        const count = items.length;
        if (count < 4) return;
        const mean = items.reduce((acc, curr) => acc + curr.val, 0) / count;
        const variance = items.reduce((acc, curr) => acc + Math.pow(curr.val - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        if (stdDev > 0) {
          items.forEach((item) => {
            const zScore = (item.val - mean) / stdDev;
            if (Math.abs(zScore) >= 2.5) {
              const dimLabel = `${gKey} (Row ${item.rowIndex + 1})`;
              if (!anomalies.some((a) => a.rowIndex === item.rowIndex && a.measureColumn === mCol.name)) {
                anomalies.push({
                  rowIndex: item.rowIndex,
                  dimensionLabel: dimLabel,
                  measureColumn: mCol.name,
                  value: item.val,
                  mean,
                  stdDev,
                  zScore: parseFloat(zScore.toFixed(2)),
                  isIndicative: count < 30,
                  groupSize: count,
                  categoryGroup: gKey,
                });
              }
            }
          });
        }
      });
    }
  });

  if (anomalies.length > 0) {
    issues.push({
      id: 'anomalies_detected',
      type: 'outliers_spikes',
      severity: 'warning',
      message: `${anomalies.length} statistical anomaly signal(s) identified (|z| >= 2.5).`,
      count: anomalies.length,
      recommendation:
        'Anomalies are flagged in the Detail & Anomaly sheet for audit. They are preserved, not deleted.',
    });
    statusReasons.push(`${anomalies.length} statistical outlier(s) (|z| >= 2.5) detected. Highlighted in Detail audit sheet.`);
  }

  // 7. Embedded Summary / Total Rows
  if (summaryRowsDetected.length > 0) {
    issues.push({
      id: 'summary_rows_isolated',
      type: 'unreconciled_totals',
      severity: 'info',
      message: `${summaryRowsDetected.length} total/summary rows detected and isolated from raw records.`,
      count: summaryRowsDetected.length,
      recommendation: 'Raw data is maintained cleanly so Excel formula aggregates do not double-count.',
    });
    statusReasons.push(`${summaryRowsDetected.length} source total/summary row(s) isolated to prevent double-counting.`);
  }

  // Calculate Overall Data Health Score (0 to 100%)
  let healthScore = 100;
  if (duplicateRowCount > 0) healthScore -= Math.min(15, (duplicateRowCount / totalRows) * 50);
  healthScore -= Math.max(0, (100 - completenessScore) * 0.5);
  if (mixedUnitWarnings.length > 0) healthScore -= 30;
  if (anomalies.length > 0) healthScore -= Math.min(10, anomalies.length * 2);
  const casingIssues = issues.filter((i) => i.type === 'inconsistent_spelling' && i.severity === 'warning');
  if (casingIssues.length > 0) healthScore -= 10;
  const overallHealthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  // Strict Assignment of the 4 Mandated Statuses:
  // 'Ready' | 'Ready with caveats' | 'Needs cleaning' | 'Unsafe for interpretation'
  let status: QualityStatus = 'ready';
  const hasCritical = issues.some((i) => i.severity === 'critical');
  const criticalBlankColumns = columns.some((c) => c.missingPercentage && c.missingPercentage > 50 && ['currency', 'numeric', 'identifier'].includes(c.userType));

  if (hasCritical || criticalBlankColumns || totalRows < 2) {
    status = 'unsafe';
  } else if (casingIssues.length > 0 || duplicateRowCount > 0 || issues.filter((i) => i.severity === 'warning').length > 1) {
    status = 'needs_cleaning';
  } else if (anomalies.length > 0 || issues.some((i) => i.severity === 'warning') || completenessScore < 98) {
    status = 'ready_with_caveats';
  } else {
    status = 'ready';
  }

  if (statusReasons.length === 0) {
    if (status === 'ready') {
      statusReasons.push('Data passed integrity, column typing, completeness, and consistency checks.');
    } else if (status === 'ready_with_caveats') {
      statusReasons.push('Dataset is suitable for dashboarding with noted caveats and anomaly flags.');
    }
  }

  // Generate Business Intelligence Analyst Verdict & Action Plan
  const actionItems: string[] = [];
  if (summaryRowsDetected.length > 0) {
    actionItems.push('Isolated embedded total rows to prevent double-counting in SUM/SUMIFS formulas');
  }
  if (mixedUnitWarnings.length > 0) {
    actionItems.push('Enforced Mixed Units Rule: Split calculations by currency/unit to avoid aggregating incomparable amounts');
  }
  if (casingIssues.length > 0) {
    actionItems.push('Normalize dimension casing to consolidate identical business entities');
  }
  if (anomalies.length > 0) {
    actionItems.push(`Audited ${anomalies.length} statistical anomaly signal(s) with |z| >= 2.5 in Detail sheet`);
  }
  if (actionItems.length === 0) {
    actionItems.push('Data integrity verified: Zero blockers detected for formula-driven dashboard compilation');
  }

  const analystVerdict = {
    headline:
      status === 'ready'
        ? 'Verified Clean: Executive Dashboard Ready'
        : status === 'ready_with_caveats'
        ? 'Ready with Analytical Caveats'
        : status === 'needs_cleaning'
        ? 'Data Cleaning Recommended Before Modeling'
        : 'Critical Integrity Alert: Unsafe for Direct Interpretation',
    summary: `Business intelligence audit completed across ${totalRows} rows and ${totalColumns} columns with an overall data health score of ${overallHealthScore}% and completeness of ${completenessScore}%.`,
    actionItems,
  };

  return {
    status,
    statusReasons,
    totalRows,
    totalColumns,
    duplicateRowCount,
    missingCellsCount: totalMissingCells,
    completenessScore,
    overallHealthScore,
    issues,
    anomalies: anomalies.slice(0, 50),
    mixedUnitWarnings,
    hasSummaryRows: summaryRowsDetected.length > 0,
    summaryRowsDetected,
    analystVerdict,
  };
}

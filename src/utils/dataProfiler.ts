import {
  ColumnDataType,
  ColumnProfile,
  DataQualityAudit,
  QualityIssue,
  QualityStatus,
  AnomalyItem,
} from '../types/dashboard';

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
  // Note: Handle comma as thousand separator vs decimal
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

  // Standard date patterns: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, Mon DD YYYY
  const d = new Date(s);
  return !isNaN(d.getTime()) && d.getFullYear() > 1950 && d.getFullYear() < 2100;
}

/**
 * Classify a column based on name, values, patterns
 */
export function classifyColumn(name: string, values: any[], index: number): ColumnProfile {
  const nonNulls = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  const totalNonNull = nonNulls.length;
  const missingCount = values.length - totalNonNull;

  const sampleValues = nonNulls.slice(0, 5);
  const uniqueSet = new Set(nonNulls.map((v) => String(v).trim().toLowerCase()));
  const uniqueCount = uniqueSet.size;

  const lowerName = name.toLowerCase().trim();

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

  let minNum: number | undefined;
  let maxNum: number | undefined;

  for (const v of nonNulls) {
    const s = String(v).trim();
    if (['true', 'false', 'yes', 'no', '0', '1'].includes(s.toLowerCase()) && uniqueCount <= 2) {
      booleanMatches++;
    }
    if (isValidDate(v)) {
      dateMatches++;
    }

    const { numericValue, currency, isPercent } = cleanNumericValue(v);
    if (numericValue !== null) {
      numberMatches++;
      if (minNum === undefined || numericValue < minNum) minNum = numericValue;
      if (maxNum === undefined || numericValue > maxNum) maxNum = numericValue;
    }
    if (currency) currencySymbolsFound.add(currency);
    if (isPercent) hasPercentSign++;
  }

  const dateRatio = totalNonNull > 0 ? dateMatches / totalNonNull : 0;
  const numRatio = totalNonNull > 0 ? numberMatches / totalNonNull : 0;
  const boolRatio = totalNonNull > 0 ? booleanMatches / totalNonNull : 0;

  let detectedType: ColumnDataType = 'unknown';
  let isUncertain = false;
  let uncertaintyReason: string | undefined;

  // Rule 1: Identifier / ID
  if (
    lowerName.includes('id') ||
    lowerName.includes('code') ||
    lowerName.includes('uuid') ||
    lowerName.includes('sku') ||
    lowerName.includes('barcode') ||
    (uniqueCount === totalNonNull && totalNonNull > 10 && numRatio < 0.9)
  ) {
    detectedType = 'identifier';
  }
  // Rule 2: Date
  else if (
    dateRatio > 0.7 ||
    lowerName.includes('date') ||
    lowerName.includes('timestamp') ||
    lowerName.includes('time') ||
    lowerName.includes('created_at') ||
    lowerName.includes('updated_at')
  ) {
    detectedType = 'date';
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
    lowerName.includes('fee')
  ) {
    if (numRatio > 0.6) {
      detectedType = 'currency';
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
    lowerName.includes('share')
  ) {
    if (numRatio > 0.6) {
      detectedType = 'percentage';
      unit = '%';
    }
  }
  // Rule 5: Target
  else if (lowerName.includes('target') || lowerName.includes('quota') || lowerName.includes('goal')) {
    if (numRatio > 0.6) {
      detectedType = 'target';
    }
  }
  // Rule 6: Count / Integer
  else if (
    lowerName.includes('count') ||
    lowerName.includes('quantity') ||
    lowerName.includes('qty') ||
    lowerName.includes('headcount') ||
    lowerName.includes('units') ||
    lowerName.includes('volume')
  ) {
    if (numRatio > 0.6) {
      detectedType = 'count';
      if (!unit) unit = 'units';
    }
  }
  // Rule 7: General Numeric
  else if (numRatio > 0.75) {
    detectedType = 'numeric';
  }
  // Rule 8: Boolean
  else if (boolRatio > 0.8 && uniqueCount <= 2) {
    detectedType = 'boolean';
  }
  // Rule 9: Categorical Dimension
  else if (uniqueCount <= Math.max(15, totalNonNull * 0.4) && totalNonNull > 0) {
    detectedType = 'categorical';
  }
  // Rule 10: Free text
  else {
    detectedType = 'text';
  }

  // Check uncertainty
  if (numRatio > 0.3 && numRatio < 0.8) {
    isUncertain = true;
    uncertaintyReason = `Mixed text and numbers (${Math.round(numRatio * 100)}% numeric). Confirm whether this should be numeric or text.`;
  } else if (detectedType === 'unknown' || (uniqueCount === totalNonNull && detectedType === 'categorical')) {
    isUncertain = true;
    uncertaintyReason = `High cardinality with unclear semantic meaning.`;
  }

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
    min: minNum,
    max: maxNum,
    isUncertain,
    uncertaintyReason,
    detectedCurrencies: Array.from(currencySymbolsFound),
    detectedUnits: unit ? [unit] : [],
    hasMixedUnits: currencySymbolsFound.size > 1,
  };
}

/**
 * Conduct comprehensive data quality audit, mixed units analysis, and Z-score outlier detection
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
      statusReasons: ['The dataset has no rows.'],
      totalRows: 0,
      totalColumns,
      duplicateRowCount: 0,
      missingCellsCount: 0,
      issues: [
        {
          id: 'empty_dataset',
          type: 'missing_values',
          severity: 'critical',
          message: 'Dataset contains 0 records.',
          count: 0,
          recommendation: 'Please upload a dataset containing at least 2 rows of data.',
        },
      ],
      anomalies: [],
      mixedUnitWarnings: [],
      hasSummaryRows: false,
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
      message: `${duplicateRowCount} duplicate row(s) detected (${(dupRatio * 100).toFixed(1)}% of dataset).`,
      count: duplicateRowCount,
      recommendation: 'Check whether repeated transactions are intentional or accidental duplicate exports.',
    });
    if (dupRatio > 0.15) {
      statusReasons.push(`High proportion of duplicate rows (${(dupRatio * 100).toFixed(1)}%).`);
    }
  }

  // 2. Missing values across columns
  let totalMissingCells = 0;
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
          recommendation: `Formulas will skip or zero-fill missing values. Ensure key metrics are not skewed.`,
        });
        if (missRatio > 0.5 && ['currency', 'numeric', 'date'].includes(col.userType)) {
          statusReasons.push(`Critical column "${col.name}" is over 50% blank.`);
        }
      }
    }
  });

  // 3. Numbers Stored as Text & Inconsistent casing / leading spaces
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
        recommendation: 'Automated TRIM() cleaning is applied during Excel data table creation.',
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
        recommendation: 'Clean numeric conversion will be written to the clean Data table with native formatting.',
      });
    }
  });

  // 4. Mixed Units Rule Check (NON-NEGOTIABLE CORE PHILOSOPHY)
  columns.forEach((col) => {
    if (col.hasMixedUnits && col.detectedCurrencies && col.detectedCurrencies.length > 1) {
      const warn = `Column "${col.name}" has mixed currencies (${col.detectedCurrencies.join(', ')}). Never sum amounts across different currencies!`;
      mixedUnitWarnings.push(warn);
      issues.push({
        id: `mixed_curr_${col.name}`,
        column: col.name,
        type: 'mixed_currencies',
        severity: 'critical',
        message: warn,
        count: col.detectedCurrencies.length,
        recommendation: 'Filter or split analysis by currency before aggregating totals.',
      });
      statusReasons.push(`Mixed currencies detected in "${col.name}". Summing without currency filter is invalid.`);
    }
  });

  // 5. Outliers and Z-Score Anomalies (signals, never silently deleted)
  // Find a categorical column (e.g. Region, Category, Product) if any, and numeric measures
  const catCol = columns.find((c) => c.userType === 'categorical');
  const numericCols = columns.filter((c) => ['numeric', 'currency', 'count'].includes(c.userType));

  numericCols.forEach((mCol) => {
    // Extract valid numbers
    const cleanVals: { rowIndex: number; val: number; groupKey: string }[] = [];
    rows.forEach((r, idx) => {
      const { numericValue } = cleanNumericValue(r[mCol.name]);
      if (numericValue !== null && !isNaN(numericValue)) {
        const groupKey = catCol ? String(r[catCol.name] ?? 'All') : 'All';
        cleanVals.push({ rowIndex: idx, val: numericValue, groupKey });
      }
    });

    if (cleanVals.length >= 5) {
      // 1. Global Measure-Level Z-Score
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

            // Prevent duplicate anomaly entries for the same row & measure
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

      // 2. Group-Level Z-Score for categories with >= 4 items
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
  }

  // 6. Summary Rows in Source
  if (summaryRowsDetected.length > 0) {
    issues.push({
      id: 'summary_rows_isolated',
      type: 'unreconciled_totals',
      severity: 'info',
      message: `${summaryRowsDetected.length} total/summary rows detected and isolated from raw records.`,
      count: summaryRowsDetected.length,
      recommendation: 'Raw data is maintained cleanly so Excel formula aggregates do not double-count.',
    });
  }

  // Determine overall Quality Status
  let status: QualityStatus = 'ready';
  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasWarning = issues.some((i) => i.severity === 'warning');

  if (hasCritical || statusReasons.length >= 2) {
    status = 'unsafe';
  } else if (hasWarning || statusReasons.length > 0) {
    status = 'ready_with_caveats';
  } else if (issues.length > 3) {
    status = 'needs_cleaning';
  } else {
    status = 'ready';
  }

  if (statusReasons.length === 0) {
    if (status === 'ready') {
      statusReasons.push('Data passed integrity, column typing, and consistency checks.');
    } else if (status === 'ready_with_caveats') {
      statusReasons.push('Dataset is suitable for dashboarding with noted caveats and anomaly flags.');
    }
  }

  return {
    status,
    statusReasons,
    totalRows,
    totalColumns,
    duplicateRowCount,
    missingCellsCount: totalMissingCells,
    issues,
    anomalies: anomalies.slice(0, 50), // keep top 50 anomalies for audit UI
    mixedUnitWarnings,
    hasSummaryRows: summaryRowsDetected.length > 0,
    summaryRowsDetected,
  };
}

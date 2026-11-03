import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParseResult {
  filename: string;
  fileSize: number;
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, any>[];
  summaryRowsRemoved?: { rowIndex: number; label: string }[];
  originalSheetData?: any[][];
}

/**
 * Common summary row keywords to prevent aggregating summary rows into raw datasets
 */
const SUMMARY_KEYWORDS = ['total', 'grand total', 'subtotal', 'sum', 'average', 'summary', 'overall'];

/**
 * Detects whether a row is a summary or total row
 */
export function isSummaryRow(row: Record<string, any>, headers: string[]): boolean {
  if (!row || headers.length === 0) return false;
  const firstColVal = String(row[headers[0]] ?? '').trim().toLowerCase();
  if (SUMMARY_KEYWORDS.some((kw) => firstColVal === kw || firstColVal.startsWith(`${kw}:`))) {
    return true;
  }
  // Check if second column has total if first column is code or blank
  if (headers.length > 1) {
    const secondColVal = String(row[headers[1]] ?? '').trim().toLowerCase();
    if (SUMMARY_KEYWORDS.some((kw) => secondColVal === kw)) {
      return true;
    }
  }
  return false;
}

/**
 * Parse CSV or TSV text with PapaParse, detecting header row and delimiter
 */
export function parseDelimitedText(content: string, filename = 'data.csv'): ParseResult {
  // Normalize newlines
  const cleanContent = content.trim();

  const parsed = Papa.parse(cleanContent, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const rawGrid = parsed.data as string[][];
  if (!rawGrid || rawGrid.length === 0) {
    throw new Error('The uploaded file appears to be empty.');
  }

  // Find header row: scan first 5 rows for the one with the most non-empty string tokens
  let headerIndex = 0;
  let maxCols = 0;
  for (let i = 0; i < Math.min(5, rawGrid.length); i++) {
    const nonEmpties = rawGrid[i].filter((c) => String(c).trim().length > 0).length;
    if (nonEmpties > maxCols) {
      maxCols = nonEmpties;
      headerIndex = i;
    }
  }

  // Sanitize headers
  const rawHeaders = rawGrid[headerIndex];
  const headers: string[] = [];
  const seenHeaders = new Set<string>();

  rawHeaders.forEach((h, idx) => {
    let name = String(h || '').trim();
    if (!name) name = `Column_${idx + 1}`;
    // Deduplicate
    let finalName = name;
    let counter = 2;
    while (seenHeaders.has(finalName)) {
      finalName = `${name}_${counter++}`;
    }
    seenHeaders.add(finalName);
    headers.push(finalName);
  });

  // Extract rows
  const rows: Record<string, any>[] = [];
  const summaryRowsRemoved: { rowIndex: number; label: string }[] = [];

  for (let r = headerIndex + 1; r < rawGrid.length; r++) {
    const rowCells = rawGrid[r];
    if (!rowCells || rowCells.every((c) => String(c).trim() === '')) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, cIdx) => {
      let val: string | null = null;
      if (rowCells[cIdx] !== undefined && rowCells[cIdx] !== null) {
        val = String(rowCells[cIdx]).trim();
      }
      rowObj[h] = val;
    });

    if (isSummaryRow(rowObj, headers)) {
      summaryRowsRemoved.push({
        rowIndex: r,
        label: String(rowObj[headers[0]] || 'Summary Row'),
      });
    } else {
      rows.push(rowObj);
    }
  }

  return {
    filename,
    fileSize: content.length,
    sheetNames: ['Sheet1'],
    activeSheet: 'Sheet1',
    headers,
    rows,
    summaryRowsRemoved,
    originalSheetData: rawGrid,
  };
}

/**
 * Parse an Excel workbook (XLSX / XLS)
 */
export function parseExcelWorkbook(data: ArrayBuffer, filename = 'data.xlsx'): ParseResult {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetNames = wb.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('No worksheets found in the Excel workbook.');
  }

  // Default to first sheet or sheet with most data
  let bestSheet = sheetNames[0];
  let maxRows = 0;
  for (const name of sheetNames) {
    const sheet = wb.Sheets[name];
    if (sheet && sheet['!ref']) {
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const count = range.e.r - range.s.r;
      if (count > maxRows) {
        maxRows = count;
        bestSheet = name;
      }
    }
  }

  const selectedSheet = wb.Sheets[bestSheet];
  const rawGrid = XLSX.utils.sheet_to_json(selectedSheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as any[][];

  if (!rawGrid || rawGrid.length === 0) {
    throw new Error(`Worksheet "${bestSheet}" is empty.`);
  }

  // Find header row
  let headerIndex = 0;
  let maxCols = 0;
  for (let i = 0; i < Math.min(8, rawGrid.length); i++) {
    const nonEmpties = rawGrid[i].filter((c) => String(c).trim().length > 0).length;
    if (nonEmpties > maxCols) {
      maxCols = nonEmpties;
      headerIndex = i;
    }
  }

  const rawHeaders = rawGrid[headerIndex] || [];
  const headers: string[] = [];
  const seenHeaders = new Set<string>();

  rawHeaders.forEach((h, idx) => {
    let name = String(h || '').trim();
    if (!name) name = `Col_${idx + 1}`;
    let finalName = name;
    let counter = 2;
    while (seenHeaders.has(finalName)) {
      finalName = `${name}_${counter++}`;
    }
    seenHeaders.add(finalName);
    headers.push(finalName);
  });

  const rows: Record<string, any>[] = [];
  const summaryRowsRemoved: { rowIndex: number; label: string }[] = [];

  for (let r = headerIndex + 1; r < rawGrid.length; r++) {
    const rowCells = rawGrid[r];
    if (!rowCells || rowCells.every((c) => String(c).trim() === '')) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, cIdx) => {
      let val = rowCells[cIdx];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        rowObj[h] = String(val).trim();
      } else {
        rowObj[h] = null;
      }
    });

    if (isSummaryRow(rowObj, headers)) {
      summaryRowsRemoved.push({
        rowIndex: r,
        label: String(rowObj[headers[0]] || 'Summary Row'),
      });
    } else {
      rows.push(rowObj);
    }
  }

  return {
    filename,
    fileSize: data.byteLength,
    sheetNames,
    activeSheet: bestSheet,
    headers,
    rows,
    summaryRowsRemoved,
    originalSheetData: rawGrid,
  };
}

/**
 * Parse text or markdown table format
 */
export function parseTextOrMarkdown(text: string, filename = 'document.txt'): ParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    throw new Error('Text document is empty.');
  }

  // Check if markdown table (contains | and header separator |---|)
  const isMarkdown = lines.some((l) => l.includes('|')) && lines.some((l) => /\|?\s*[-:]+[-|\s:]+/.test(l));

  if (isMarkdown) {
    const tableLines = lines.filter((l) => l.includes('|'));
    const rowsGrid: string[][] = [];

    for (const line of tableLines) {
      // Ignore separator row like |---|---|
      if (/^\|?\s*[-:\s|]+\s*\|?$/.test(line)) continue;

      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => {
          // Remove leading/trailing empty splits from | col | col |
          if (idx === 0 && line.startsWith('|') && _ === '') return false;
          if (idx === arr.length - 1 && line.endsWith('|') && _ === '') return false;
          return true;
        });

      if (cells.length > 0) {
        rowsGrid.push(cells);
      }
    }

    if (rowsGrid.length > 0) {
      const headers = rowsGrid[0];
      const rows: Record<string, any>[] = [];
      for (let i = 1; i < rowsGrid.length; i++) {
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = rowsGrid[i][idx] ?? null;
        });
        rows.push(rowObj);
      }

      return {
        filename,
        fileSize: text.length,
        sheetNames: ['MarkdownTable'],
        activeSheet: 'MarkdownTable',
        headers,
        rows,
        originalSheetData: rowsGrid,
      };
    }
  }

  // Fallback to Delimited text parser (PapaParse handles tabs, spaces, commas)
  return parseDelimitedText(text, filename);
}

/**
 * Validate a join key between two tables with real overlap count
 */
export function validateJoinKey(
  leftRows: Record<string, any>[],
  leftKey: string,
  rightRows: Record<string, any>[],
  rightKey: string
): {
  valid: boolean;
  matchCount: number;
  leftCount: number;
  rightCount: number;
  overlapPercentage: number;
  warning?: string;
} {
  const leftValues = new Set(leftRows.map((r) => String(r[leftKey] ?? '').trim()).filter(Boolean));
  const rightValues = new Set(rightRows.map((r) => String(r[rightKey] ?? '').trim()).filter(Boolean));

  let matchCount = 0;
  for (const v of leftValues) {
    if (rightValues.has(v)) {
      matchCount++;
    }
  }

  const overlapPercentage = leftValues.size > 0 ? (matchCount / leftValues.size) * 100 : 0;
  const valid = matchCount > 0 && overlapPercentage >= 20;

  let warning: string | undefined;
  if (overlapPercentage < 50 && matchCount > 0) {
    warning = `Only ${overlapPercentage.toFixed(1)}% of values in ${leftKey} match ${rightKey}. Some records will have empty joins.`;
  } else if (matchCount === 0) {
    warning = `No common values between ${leftKey} and ${rightKey}. Join will produce empty records.`;
  }

  return {
    valid,
    matchCount,
    leftCount: leftValues.size,
    rightCount: rightValues.size,
    overlapPercentage,
    warning,
  };
}

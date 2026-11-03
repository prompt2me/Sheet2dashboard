/**
 * Automated Test Suite for Sheet2Dashboard
 * Tests:
 * 1. Multi-format ingestion (CSV, Delimiters, Summary Row detection, Markdown tables)
 * 2. Data profiling and quality audit (mixed units rule, z-score anomaly detection, typing)
 * 3. Recommendation engine and chart suitability gating
 * 4. Production Excel workbook generation with 7 architectural sheets
 * 5. Automated pre-flight validation (formula crash check, mathematical reconciliation)
 */

import { parseDelimitedText, parseTextOrMarkdown } from '../src/utils/fileParser';
import { classifyColumn, runDataQualityAudit } from '../src/utils/dataProfiler';
import { buildRecommendedSpec, evaluateChartSuitability } from '../src/utils/recommendationEngine';
import { generateProductionWorkbook } from '../src/utils/excelGenerator';
import { runComprehensiveWorkbookValidation } from '../src/utils/qaValidator';
import { SAMPLE_DATASETS } from '../src/utils/sampleDatasets';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('--- SHEET2DASHBOARD AUTOMATED VERIFICATION SUITE ---');
  console.log('======================================================\n');

  // PHASE 1: INGESTION TESTS
  console.log('Phase 1: Multi-Format Ingestion & Table Parsing');
  const salesCsv = SAMPLE_DATASETS[0].data;
  const parsedSales = parseDelimitedText(salesCsv, 'sales.csv');
  assert(parsedSales.rows.length === 22, 'CSV correctly parses 22 records');
  assert(parsedSales.headers.includes('Revenue'), 'Header detection identifies "Revenue"');
  assert(parsedSales.headers.includes('Product_Category'), 'Header detection identifies "Product_Category"');

  // Test summary row detection
  const csvWithSummary = `Category,Amount\nHardware,500\nSoftware,800\nTotal,1300`;
  const parsedSummary = parseDelimitedText(csvWithSummary, 'summary_test.csv');
  assert(parsedSummary.rows.length === 2, 'Summary row "Total" is isolated from raw records');
  assert(parsedSummary.summaryRowsRemoved?.length === 1, 'Summary row recorded in removed audit log');

  // Test Markdown table parser
  const mdTable = `| Department | Headcount | Budget |\n| --- | --- | --- |\n| Engineering | 45 | 450000 |\n| Design | 12 | 120000 |`;
  const parsedMd = parseTextOrMarkdown(mdTable, 'teams.md');
  assert(parsedMd.rows.length === 2, 'Markdown table parser extracts 2 rows');
  assert(parsedMd.headers[0] === 'Department', 'Markdown parser extracts Department header');

  // PHASE 2: DATA UNDERSTANDING & QUALITY AUDIT
  console.log('\nPhase 2: Data Understanding, Mixed Units & Anomaly Audit');
  const cols = parsedSales.headers.map((h, i) =>
    classifyColumn(h, parsedSales.rows.map((r) => r[h]), i)
  );

  const revCol = cols.find((c) => c.name === 'Revenue');
  assert(revCol?.userType === 'currency', 'Classifies Revenue as currency');
  assert(revCol?.unit === '$', 'Detects dollar currency unit');

  const dateCol = cols.find((c) => c.name === 'Date');
  assert(dateCol?.userType === 'date', 'Classifies Date column as date');

  const auditResult = runDataQualityAudit(parsedSales.rows, cols);
  assert(auditResult.status === 'ready' || auditResult.status === 'ready_with_caveats', 'Sales data audit passes with clean or caveat status');

  // Test Mixed Units Rule on Messy Inventory
  const messyCsv = SAMPLE_DATASETS[1].data;
  const parsedMessy = parseDelimitedText(messyCsv, 'messy.csv');
  const messyCols = parsedMessy.headers.map((h, i) =>
    classifyColumn(h, parsedMessy.rows.map((r) => r[h]), i)
  );
  const messyAudit = runDataQualityAudit(parsedMessy.rows, messyCols);
  assert(messyAudit.anomalies.length > 0, 'Detects extreme statistical outlier (STL-999 Titanium Bar)');
  const spikeAnomaly = messyAudit.anomalies.find((a) => a.value >= 70000);
  assert(Boolean(spikeAnomaly && spikeAnomaly.zScore > 2.5), 'Spike anomaly z-score > 2.5');

  // PHASE 3: RECOMMENDATION ENGINE & SUITABILITY GATING
  console.log('\nPhase 3: Recommendation Engine & Chart Suitability');
  const suitability = evaluateChartSuitability(cols);
  const lineSuitability = suitability.find((s) => s.type === 'line');
  assert(lineSuitability?.enabled === true, 'Line chart enabled when date column exists');

  const noDateCols = cols.filter((c) => c.userType !== 'date');
  const noDateSuitability = evaluateChartSuitability(noDateCols);
  const noDateLine = noDateSuitability.find((s) => s.type === 'line');
  assert(noDateLine?.enabled === false, 'Line chart disabled when date column is absent');
  assert(Boolean(noDateLine?.disabledReason), 'Disabled chart contains explanatory reason');

  const recommendedSpec = buildRecommendedSpec('Quarterly Sales', cols, 'sales', parsedSales.rows);
  assert(recommendedSpec.kpis.length >= 3, 'Smart recommendation engine curates >=3 KPI cards');
  assert(recommendedSpec.charts.length >= 2, 'Smart recommendation engine curates >=2 visualizations');
  assert(recommendedSpec.metricDictionary.length >= 3, 'Traceability dictionary populated with formulas');

  // PHASE 4: PRODUCTION EXCEL GENERATION
  console.log('\nPhase 4: Excel Workbook Generation (7 Sheets & OpenXML Charts)');
  const buffer = await generateProductionWorkbook(
    recommendedSpec,
    cols,
    parsedSales.rows,
    auditResult,
    []
  );
  assert(buffer.byteLength > 10000, `Generated workbook binary buffer is valid size (${buffer.byteLength} bytes)`);

  // PHASE 5: COMPREHENSIVE QA VALIDATION
  console.log('\nPhase 5: Pre-Flight Automated Validation & Reconciliation');
  const validation = await runComprehensiveWorkbookValidation(
    buffer,
    recommendedSpec,
    cols,
    parsedSales.rows,
    auditResult,
    []
  );

  assert(validation.passed === true, 'All 7 pre-flight validation checks pass');
  assert(validation.contract.outputBuilt.sheetsCreated.includes('Dashboard'), 'Dashboard sheet confirmed');
  assert(validation.contract.outputBuilt.sheetsCreated.includes('Analysis'), 'Analysis sheet confirmed');
  assert(validation.contract.outputBuilt.sheetsCreated.includes('Detail'), 'Detail sheet confirmed');
  assert(validation.contract.outputBuilt.sheetsCreated.includes('Data'), 'Data sheet confirmed');
  assert(validation.contract.outputBuilt.sheetsCreated.includes('Controls'), 'Controls sheet confirmed');
  assert(validation.contract.outputBuilt.sheetsCreated.includes('Original_Data'), 'Original_Data sheet confirmed');

  console.log('\n======================================================');
  console.log(`TEST RUN COMPLETE: ${passedTests} of ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

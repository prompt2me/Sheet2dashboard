# Sheet2Dashboard — Architecture & Technical Design

## 1. Executive Overview & Core Philosophy

**Sheet2Dashboard** transforms raw, unstructured, or messy tabular uploads (CSV, TSV, XLSX/XLS, TXT, Markdown, and table images/receipts) into production-grade, formula-driven Excel workbooks (`.xlsx`) with embedded native DrawingML charts.

### Non-Negotiable Core Tenets
1. **Visual Restraint over Column Clutter:** We do not chart every column. Visualizations explain structural patterns, comparisons, and distributions with a 1-line justification per chart.
2. **Authoritative Source Data:** No metrics, dates, or targets are fabricated or silently substituted. If data lacks dates, trend lines are disabled with clear reasons.
3. **Complete Traceability:** Every KPI card and chart feed links to an explicit source column, aggregation formula, and caveat in the Metric Dictionary (`Controls` sheet).
4. **Mixed Units Rule:** Never sum quantities across differing units (e.g. sheets + bars + pieces) or currencies (USD + EUR). Calculations are partitioned by unit, and warnings are logged for any mixed source grand totals.
5. **Anomalies as Signals:** Outliers (|z| &ge; 2.5) are preserved and audited in the `Detail` sheet—never silently discarded.
6. **Zero-Hardcoding Contract:** All dashboard figures in the workbook are live Excel formulas (`SUMIFS`, `COUNTIFS`, `AVERAGEIFS`, `INDEX`, `MATCH`, `LARGE`, `IFERROR`). Appending new records to the `Data` table immediately updates every KPI and chart.

---

## 2. Declarative Architecture (`DashboardSpec`)

A single declarative JSON specification (`DashboardSpec`) acts as the single source of truth driving both the in-browser interactive preview and the binary `.xlsx` generator:

```
[ Upload (CSV/XLSX/Image/TXT) ]
              │
              ▼
[ Ingestion & Summary Row Isolation (src/utils/fileParser.ts) ]
              │
              ▼
[ Profiling & Quality Audit (src/utils/dataProfiler.ts) ]
              │
              ▼
[ Smart Recommendation Engine (src/utils/recommendationEngine.ts) ]
              │
              ▼
    ┌─────────────────── DashboardSpec (JSON) ───────────────────┐
    │                                                            │
    ▼                                                            ▼
[ Live Interactive Browser Preview ]              [ Production Excel Generator ]
(src/components/StepPreview.tsx)                  (src/utils/excelGenerator.ts)
    │                                                            │
    └────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                   [ Pre-Flight Delivery QA Engine ]
                     (src/utils/qaValidator.ts)
```

---

## 3. Seven Architectural Worksheets

The generated `.xlsx` workbook follows institutional financial modeling standards across 7 distinct sheets:

| Sheet Name | Architectural Purpose | Formula Engine & Logic |
| :--- | :--- | :--- |
| **`Summary`** | Executive briefing, report metadata, navigation links | `=HYPERLINK("#'Dashboard'!A1", "Go to Dashboard")`, evidence-based findings |
| **`Dashboard`** | Interactive KPI cards, filter dropdown, and category summaries | `=IF($C$4="All", SUM(Data!$D$2:$D$100), SUMIFS(Data!$D$2:$D$100, Data!$C$2:$C$100, $C$4))` |
| **`Analysis`** | Calculation engine and feeds for native DrawingML charts | Dynamic category and date aggregates referencing `Data` table and `Dashboard!$C$4` |
| **`Detail`** | Audit log of statistical anomalies (|z| &ge; 2.5) | Flagged rows with group means, standard deviations, and small-sample indicative tags |
| **`Data`** | Cleaned Excel Table with strict number and date formatting | Formatted with currency `$#,##0.00`, dates `YYYY-MM-DD`, and trimmed text strings |
| **`Controls`** | Parameters, filter dropdown source ranges, metric dictionary | Named ranges, z-score threshold parameter cell, and full metric governance table |
| **`Original_Data`**| Untouched source data | Exact byte-for-value replica of raw upload for auditing and legal reconciliation |

---

## 4. Native OpenXML DrawingML Chart Injection

Unlike legacy libraries that only write flat values, Sheet2Dashboard leverages `JSZip` to package standard OpenXML DrawingML parts:
- `xl/charts/chart1.xml`: Defines `c:chartSpace`, `c:barChart` / `c:lineChart`, referencing live cell formulas on `'Analysis'!$A$4:$B$15`.
- `xl/drawings/drawing1.xml`: Anchors the chart across worksheet rows and columns using `xdr:twoCellAnchor`.
- `xl/worksheets/_rels/sheet2.xml.rels`: Links `drawing1.xml` to the `Dashboard` worksheet.
- `[Content_Types].xml`: Registers drawing and chart content types.

When opened in **Microsoft Excel**, **LibreOffice Calc**, **Google Sheets**, or **Apple Numbers**, the chart renders natively and dynamically shifts whenever filter values change.

---

## 5. Automated Pre-Flight QA Verification Engine

Before delivering the `.xlsx` file to the user, `src/utils/qaValidator.ts` executes an automated pre-flight test suite:
1. **Sheet Completeness Check:** Confirms all 7 architectural sheets exist.
2. **Formula Crash Scan:** Confirms zero `#NAME?`, `#REF!`, `#DIV/0!`, `#VALUE!`, or `#N/A` errors exist.
3. **Independent Mathematical Reconciliation:** Recomputes sums independently against the raw source data and verifies workbook formula parity.
4. **Scenario Filter Simulation:** Verifies that changing the `Dashboard!C4` filter dynamically updates SUMIFS formulas.
5. **DrawingML Package Verification:** Verifies OpenXML chart XML structures and relationships.
6. **Original Data Fidelity:** Confirms that the `Original_Data` sheet preserves the exact uploaded records.
7. **Metric Dictionary Governance:** Verifies that all metrics have explicit formulas and caveats documented.

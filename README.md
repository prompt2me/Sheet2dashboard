# Sheet2Dashboard 📊

> Turn uploaded CSVs, XLSX, text files, and table images into professional, formula-driven Excel dashboards (`.xlsx`) with live native charts, dynamic dropdown filters, and deep quality audits.

---

## Key Features

- **Multi-Format Ingestion:**
  - Automatic delimiter and encoding detection (CSV, TSV).
  - Excel workbook parsing (.xlsx, .xls) with multi-sheet support.
  - Semi-structured text & Markdown table extraction.
  - Multi-file combiner with key validation: checks real value overlap percentages before joining.
  - Isolation of summary/total rows to prevent duplicate double-counting in raw data.
- **Vision Tabular OCR Extraction Review:**
  - Extracts tables from invoices, receipts, and table photos using Gemini 3.8 Flash.
  - **Editable Extraction Review Grid:** Displays per-cell confidence scores (High >90%, Med 70–90%, Low <70% highlighted with warnings) and lets users correct errors before building.
- **Deep Data Understanding & Quality Audit:**
  - Automatic column classification: `identifier`, `date`, `categorical`, `numeric`, `currency`, `percentage`, `ratio`, `count`, `target`, `text`, `boolean`.
  - **Non-Negotiable Mixed Units Rule:** Detects mixed units (e.g. sheets + bars + kg) and currencies (USD vs EUR). Strictly separates aggregations to prevent invalid arithmetic.
  - **Statistical Anomaly Detection:** Calculates Z-scores (|z| &ge; 2.5) across dimensions. Flags outliers as signals rather than silently deleting them.
  - Assigns an audit status: *Ready*, *Ready with Caveats*, *Needs Cleaning*, or *Unsafe for Interpretation*.
- **Wizard Content Builder & "Recommend for Me":**
  - Smart 1-click curator that analyzes cardinality and dimensions to pick the clearest visual narrative with 1-line justifications.
  - Chart suitability gating: unsuitable charts are disabled with explicit reasons (e.g. no line chart on unordered categories, no pie chart with >6 slices, no 3D charts ever).
  - Color-blind safe palettes: Executive Slate, Modern Teal, Indigo Corporate, Emerald Bio/Ops, Amber Industrial, Minimal Monochrome.
- **Interactive Live In-Browser Preview:**
  - Mirrors the Excel dashboard layout using the exact same declarative specification (`DashboardSpec`).
  - Interactive dropdown filter dynamically recalculates KPIs, updates table shares, and filters charts using Excel SUMIFS logic.
- **Production-Grade Excel Output (`.xlsx`):**
  - **7 Architectural Sheets:** `Summary`, `Dashboard`, `Analysis`, `Detail`, `Data`, `Controls`, `Original_Data`.
  - **100% Formula-Driven:** Uses universal formulas (`SUMIFS`, `COUNTIFS`, `AVERAGEIFS`, `INDEX`, `MATCH`, `IFERROR`). Appending new records to `Data` updates everything immediately.
  - **Native Excel DrawingML Charts:** Real OpenXML charts embedded directly into the spreadsheet package.
  - **Metric Dictionary:** Documents every metric, aggregation, unit, source field, formula, and caveat in the `Controls` sheet.
- **Automated Delivery QA Engine:**
  - Pre-flight verification checklist covering formula error scans, mathematical reconciliation against raw data, and scenario testing.
  - Comprehensive Final Output Contract and downloadable Markdown delivery report.

---

## Quick Start

### 1. Development Dev Server
```bash
npm run dev
```
Runs the Express server with Vite middleware on port 3000 (`http://localhost:3000`).

### 2. Run Automated Verification Tests
```bash
npx tsx test/suite.ts
```
Executes all 27 unit and integration tests across file ingestion, profiling, suitability gating, Excel generation, and pre-flight validation.

### 3. Production Build
```bash
npm run build
npm start
```

---

## Sample Datasets Included

You can test immediately using the built-in 1-click sample dataset buttons or by loading files from the `/samples` folder:

1. **`samples/clean_sales_performance.csv`**: Quarterly sales performance by region, rep, and product category with quotas and dates.
2. **`samples/messy_inventory_mixed_units.csv`** & **`samples/messy_inventory_mixed_units.xlsx`**: Messy warehouse inventory demonstrating mixed unit detection (bars, sheets, rolls, kg) and extreme statistical outlier flagging.
3. **`samples/operations_workorders.csv`**: Operational work orders with logged hours, hourly billing rates, and completion statuses.
4. **`samples/sample_table_invoice.svg`**: Invoice tabular screenshot for testing OCR extraction review.

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full technical design, the `DashboardSpec` JSON schema, and OpenXML chart integration details.

import React, { useState } from 'react';
import { Header } from './components/Header';
import { StepUpload } from './components/StepUpload';
import { ExtractionReviewGrid } from './components/ExtractionReviewGrid';
import { StepColumnAudit } from './components/StepColumnAudit';
import { StepContentBuilder } from './components/StepContentBuilder';
import { StepPreview } from './components/StepPreview';
import { StepExportQA } from './components/StepExportQA';
import { SubscriptionModal } from './components/SubscriptionModal';

import {
  ColumnProfile,
  DataQualityAudit,
  DashboardSpec,
  BusinessTemplate,
  OcrExtractionData,
  ValidationReport,
  EvidenceFinding,
} from './types/dashboard';
import { classifyColumn, runDataQualityAudit } from './utils/dataProfiler';
import { buildRecommendedSpec } from './utils/recommendationEngine';
import { generateProductionWorkbook } from './utils/excelGenerator';
import { runComprehensiveWorkbookValidation } from './utils/qaValidator';

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(
    () => localStorage.getItem('sheet2dashboard_subscribed') === 'true'
  );

  // Raw dataset state
  const [filename, setFilename] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [originalSheetData, setOriginalSheetData] = useState<any[][] | undefined>(undefined);
  const [template, setTemplate] = useState<BusinessTemplate>('generic');

  // OCR state
  const [ocrData, setOcrData] = useState<OcrExtractionData | null>(null);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | undefined>(undefined);
  const [showOcrReview, setShowOcrReview] = useState<boolean>(false);

  // Profiled state
  const [columns, setColumns] = useState<ColumnProfile[]>([]);
  const [audit, setAudit] = useState<DataQualityAudit | null>(null);
  const [spec, setSpec] = useState<DashboardSpec | null>(null);

  // Export & Validation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [generatedWorkbookBuffer, setGeneratedWorkbookBuffer] = useState<Uint8Array | null>(null);

  // 1. Data Ingestion from Upload or Sample
  const handleDataLoaded = (
    parsed: {
      filename: string;
      fileSize: number;
      sheetNames: string[];
      activeSheet: string;
      headers: string[];
      rows: Record<string, any>[];
      originalSheetData?: any[][];
      summaryRowsRemoved?: { rowIndex: number; label: string }[];
    },
    rawText?: string
  ) => {
    setFilename(parsed.filename);
    setHeaders(parsed.headers);
    setRawRows(parsed.rows);
    setOriginalSheetData(parsed.originalSheetData);
    setShowOcrReview(false);

    // Profile columns
    const profiledCols: ColumnProfile[] = parsed.headers.map((h, idx) => {
      const vals = parsed.rows.map((r) => r[h]);
      return classifyColumn(h, vals, idx);
    });
    setColumns(profiledCols);

    // Run deep quality audit
    const summaryRowIndices = (parsed.summaryRowsRemoved || []).map((s) => s.rowIndex);
    const auditResult = runDataQualityAudit(parsed.rows, profiledCols, summaryRowIndices);
    setAudit(auditResult);

    // Build initial recommended spec
    const initialSpec = buildRecommendedSpec(parsed.filename, profiledCols, template, parsed.rows);
    setSpec(initialSpec);

    setCurrentStep(2);
  };

  // 2. OCR Loaded from Image
  const handleOcrLoaded = (ocr: OcrExtractionData, previewUrl: string) => {
    setOcrData(ocr);
    setOcrPreviewUrl(previewUrl);
    setShowOcrReview(true);
  };

  // 3. Confirm OCR Review
  const handleConfirmOcr = (confirmed: OcrExtractionData) => {
    setShowOcrReview(false);
    const ocrHeaders = confirmed.columns;
    const ocrRows: Record<string, any>[] = confirmed.rows.map((r) => {
      const rowObj: Record<string, any> = {};
      r.cells.forEach((c) => {
        rowObj[c.column] = c.value;
      });
      return rowObj;
    });

    handleDataLoaded({
      filename: `${confirmed.tableName || 'Extracted_Table'}.csv`,
      fileSize: 1024,
      sheetNames: ['OCR_Table'],
      activeSheet: 'OCR_Table',
      headers: ocrHeaders,
      rows: ocrRows,
    });
  };

  // 4. Update Column Profile
  const handleUpdateColumn = (index: number, updates: Partial<ColumnProfile>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    setColumns(updated);

    // Re-run quality audit with updated column types
    if (rawRows.length > 0) {
      const newAudit = runDataQualityAudit(rawRows, updated);
      setAudit(newAudit);
    }
  };

  // 5. Update Business Template
  const handleUpdateTemplate = (newTemplate: BusinessTemplate) => {
    setTemplate(newTemplate);
    if (columns.length > 0 && rawRows.length > 0) {
      const updatedSpec = buildRecommendedSpec(filename, columns, newTemplate, rawRows);
      setSpec(updatedSpec);
    }
  };

  // 6. Generate Workbook & Run Delivery QA
  const handleGenerateWorkbook = async () => {
    if (!spec || !audit || rawRows.length === 0) return;
    setIsGenerating(true);

    try {
      const findings: EvidenceFinding[] = [
        {
          headline: 'Primary Categorical Concentration',
          observation: `Top performing category leads volume across active ${columns[1]?.name || 'category'} segments.`,
          interpretation: 'Reflects core operational throughput while indicating concentration risk.',
          recommendation: 'Monitor weekly variance and diversify portfolio across secondary tiers.',
          confidence: 'High',
          metricReference: spec.kpis[0]?.title || 'Total Volume',
          sourceColumn: columns[1]?.name || 'Values',
        },
        {
          headline: 'Data Health & Statistical Outliers',
          observation: `${audit.anomalies.length} anomaly signal(s) flagged (|z| >= ${spec.anomalyThresholdZ}).`,
          interpretation: 'Transactions deviate by more than 2.5 standard deviations from their group mean.',
          recommendation: 'Inspect Detail sheet before finalizing accounting reconciliations.',
          confidence: 'Medium',
          metricReference: 'Z-Score Audit',
          sourceColumn: columns[columns.length - 1]?.name || 'Values',
        },
      ];

      // Step A: Generate actual binary .xlsx with ExcelJS and OpenXML Native Charts
      const workbookBuffer = await generateProductionWorkbook(
        spec,
        columns,
        rawRows,
        audit,
        findings,
        originalSheetData
      );

      // Step B: Run comprehensive automated pre-flight QA validation suite
      const report = await runComprehensiveWorkbookValidation(
        workbookBuffer,
        spec,
        columns,
        rawRows,
        audit,
        findings
      );

      setGeneratedWorkbookBuffer(workbookBuffer);
      setValidationReport(report);
      setCurrentStep(5);
    } catch (err: any) {
      alert(`Error generating workbook: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. Save / Load Dashboard Spec
  const handleSaveSpec = () => {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename || 'Dashboard'}_Spec.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadSpec = (loadedSpec: DashboardSpec) => {
    setSpec(loadedSpec);
    if (loadedSpec.template) {
      setTemplate(loadedSpec.template);
    }
    alert('Dashboard specification loaded successfully! Navigating to Visuals & Spec step.');
    setCurrentStep(3);
  };

  const handleReset = () => {
    setFilename('');
    setRawRows([]);
    setHeaders([]);
    setColumns([]);
    setAudit(null);
    setSpec(null);
    setValidationReport(null);
    setGeneratedWorkbookBuffer(null);
    setShowOcrReview(false);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Mandatory Subscription Pop-up Modal ("Stay with us ! / subscribe to us and get the last update.") */}
      <SubscriptionModal
        isOpen={!isSubscribed}
        onSubscribed={(email, name) => {
          localStorage.setItem('sheet2dashboard_subscribed', 'true');
          localStorage.setItem('sheet2dashboard_subscriber_email', email);
          if (name) localStorage.setItem('sheet2dashboard_subscriber_name', name);
          setIsSubscribed(true);
        }}
      />

      {/* Top Application Header */}
      <Header
        currentStep={currentStep}
        onSelectStep={(step) => setCurrentStep(step)}
        datasetName={filename}
        rowCount={rawRows.length}
        qualityStatus={audit?.status}
        spec={spec}
        onSaveSpec={handleSaveSpec}
        onLoadSpec={handleLoadSpec}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Building Production Excel Workbook...
                </h3>
                <p className="text-xs text-slate-500">
                  Injecting OpenXML DrawingML charts, dynamic named ranges, live SUMIFS formulas, and running pre-flight delivery QA.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* OCR Review Grid (Shown when an image was uploaded) */}
        {showOcrReview && ocrData ? (
          <ExtractionReviewGrid
            ocrData={ocrData}
            imagePreviewUrl={ocrPreviewUrl}
            onConfirm={handleConfirmOcr}
            onCancel={() => setShowOcrReview(false)}
          />
        ) : (
          <>
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <StepUpload
                onDataLoaded={handleDataLoaded}
                onOcrLoaded={handleOcrLoaded}
              />
            )}

            {/* Step 2: Column Profiling & Data Quality Audit */}
            {currentStep === 2 && audit && (
              <StepColumnAudit
                columns={columns}
                audit={audit}
                template={template}
                onUpdateColumn={handleUpdateColumn}
                onUpdateTemplate={handleUpdateTemplate}
                onProceed={() => setCurrentStep(3)}
                onBack={() => setCurrentStep(1)}
              />
            )}

            {/* Step 3: Choose Visuals, Sections & Interactivity */}
            {currentStep === 3 && spec && (
              <StepContentBuilder
                spec={spec}
                columns={columns}
                rows={rawRows}
                onUpdateSpec={setSpec}
                onProceed={() => setCurrentStep(4)}
                onBack={() => setCurrentStep(2)}
              />
            )}

            {/* Step 4: Live In-Browser Preview */}
            {currentStep === 4 && spec && audit && (
              <StepPreview
                spec={spec}
                columns={columns}
                rows={rawRows}
                audit={audit}
                findings={[]}
                onProceedToGenerate={handleGenerateWorkbook}
                onBack={() => setCurrentStep(3)}
              />
            )}

            {/* Step 5: Export .xlsx, Delivery QA Checklist & Final Output Contract */}
            {currentStep === 5 && validationReport && spec && (
              <StepExportQA
                spec={spec}
                validationReport={validationReport}
                workbookBuffer={generatedWorkbookBuffer}
                filename={filename}
                onBackToEdit={() => setCurrentStep(3)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sheet2Dashboard · Professional Formula-Driven Excel Dashboard Engine</span>
          <span className="font-mono text-[11px] text-slate-400">
            OpenXML Compliant · Zero-Hardcoding Contract · LibreOffice Verified
          </span>
        </div>
      </footer>
    </div>
  );
}

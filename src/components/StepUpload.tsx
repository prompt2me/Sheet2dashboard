import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Link2,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';
import { parseDelimitedText, parseExcelWorkbook, parseTextOrMarkdown, validateJoinKey } from '../utils/fileParser';
import { SAMPLE_DATASETS, SampleDataset } from '../utils/sampleDatasets';
import { OcrExtractionData } from '../types/dashboard';

interface StepUploadProps {
  onDataLoaded: (
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
  ) => void;
  onOcrLoaded: (ocrData: OcrExtractionData, previewUrl: string) => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({ onDataLoaded, onOcrLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);

  // Multi-file joining state
  const [isCombining, setIsCombining] = useState(false);
  const [fileA, setFileA] = useState<any | null>(null);
  const [fileB, setFileB] = useState<any | null>(null);
  const [leftKey, setLeftKey] = useState<string>('');
  const [rightKey, setRightKey] = useState<string>('');
  const [joinValidation, setJoinValidation] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenManualReviewGrid = () => {
    if (!failedImage) return;
    const starterExtraction: OcrExtractionData = {
      tableName: `${failedImage.name.replace(/\.[^/.]+$/, '')}_Table`,
      columns: ['Item_Description', 'Quantity', 'Unit_Price', 'Total_Amount'],
      rows: [
        {
          cells: [
            { column: 'Item_Description', value: '', confidence: 1.0, type: 'text', isEdited: true },
            { column: 'Quantity', value: 1, confidence: 1.0, type: 'number', isEdited: true },
            { column: 'Unit_Price', value: 0, confidence: 1.0, type: 'currency', isEdited: true },
            { column: 'Total_Amount', value: 0, confidence: 1.0, type: 'currency', isEdited: true },
          ],
        },
      ],
      notes: [
        'Interactive Review Grid opened for: ' + failedImage.name,
        'Compare against your image on the left and enter or adjust rows freely.',
      ],
    };
    setErrorMessage(null);
    onOcrLoaded(starterExtraction, failedImage.base64);
  };

  const handleRetryOcr = async () => {
    if (!failedImage) return;
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingMessage('Retrying vision OCR extraction...');
    try {
      const res = await fetch('/api/ocr-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: failedImage.base64,
          mimeType: failedImage.mimeType,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'OCR table extraction failed');
      }
      setFailedImage(null);
      onOcrLoaded(result.extraction, failedImage.base64);
    } catch (err: any) {
      const msg = String(err.message || '');
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
        setErrorMessage(
          'The AI vision model is currently experiencing high demand (503). You can click "Open Review Grid" below to work with your image right now, or upload a CSV/XLSX directly.'
        );
      } else {
        setErrorMessage(`OCR Extraction Notice: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingMessage(`Reading ${file.name}...`);

    try {
      const fileNameLower = file.name.toLowerCase();

      // Case 1: Image file (Run OCR Vision Extraction)
      if (
        file.type.startsWith('image/') ||
        ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => fileNameLower.endsWith(ext))
      ) {
        setLoadingMessage('Processing image with vision tabular model...');
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;
          setFailedImage({
            base64: base64Data,
            mimeType: file.type || 'image/png',
            name: file.name,
          });

          try {
            const res = await fetch('/api/ocr-extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64Data,
                mimeType: file.type || 'image/png',
              }),
            });
            const result = await res.json();
            if (!res.ok || !result.success) {
              throw new Error(result.error || 'OCR table extraction failed');
            }
            setFailedImage(null);
            onOcrLoaded(result.extraction, base64Data);
          } catch (err: any) {
            const msg = String(err.message || '');
            if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
              setErrorMessage(
                'The AI vision model is currently experiencing high demand (503). You can click "Open Review Grid" to input or adjust cells directly alongside your image, or retry in a moment.'
              );
            } else {
              setErrorMessage(`OCR Extraction Notice: ${msg}. You can also upload CSV, TSV, or XLSX directly.`);
            }
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // Case 2: Excel Workbook (.xlsx, .xls)
      if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
        setLoadingMessage('Parsing Excel sheets, formulas, and merged cells...');
        const buffer = await file.arrayBuffer();
        const parsed = parseExcelWorkbook(buffer, file.name);
        onDataLoaded(parsed);
        setIsLoading(false);
        return;
      }

      // Case 3: Text, CSV, TSV, or Markdown
      setLoadingMessage('Detecting delimiter, encoding, and header structure...');
      const text = await file.text();
      let parsed;
      if (fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.md')) {
        parsed = parseTextOrMarkdown(text, file.name);
      } else {
        parsed = parseDelimitedText(text, file.name);
      }

      onDataLoaded(parsed, text);
      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(`Failed to process file: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleClick = (sample: SampleDataset) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingMessage(`Loading ${sample.name}...`);
    try {
      const parsed = parseDelimitedText(sample.data, sample.filename);
      onDataLoaded(parsed, sample.data);
    } catch (err: any) {
      setErrorMessage(`Failed to load sample dataset: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Multi-file joining logic
  const handleValidateJoin = () => {
    if (!fileA || !fileB || !leftKey || !rightKey) return;
    const result = validateJoinKey(fileA.rows, leftKey, fileB.rows, rightKey);
    setJoinValidation(result);
  };

  const executeJoin = () => {
    if (!fileA || !fileB || !leftKey || !rightKey) return;
    const rightMap = new Map<string, any>();
    fileB.rows.forEach((r: any) => {
      const key = String(r[rightKey] ?? '').trim();
      if (key && !rightMap.has(key)) {
        rightMap.set(key, r);
      }
    });

    const combinedHeaders = Array.from(new Set([...fileA.headers, ...fileB.headers]));
    const mergedRows = fileA.rows.map((rA: any) => {
      const kVal = String(rA[leftKey] ?? '').trim();
      const match = rightMap.get(kVal) || {};
      const mergedObj: Record<string, any> = { ...rA };
      fileB.headers.forEach((h: string) => {
        if (mergedObj[h] === undefined) {
          mergedObj[h] = match[h] ?? null;
        }
      });
      return mergedObj;
    });

    onDataLoaded({
      filename: `Combined_${fileA.filename}_and_${fileB.filename}.csv`,
      fileSize: 1000,
      sheetNames: ['Combined'],
      activeSheet: 'Combined',
      headers: combinedHeaders,
      rows: mergedRows,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Hero Welcome */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Turn Any Sheet, Table, or Image into a Live Excel Dashboard
        </h2>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          Upload messy data with full peace of mind. Sheet2Dashboard classifies column types, detects mixed units, flags anomalies, and creates a formula-driven, native-chart .xlsx workbook.
        </p>
      </div>

      {/* Error & Notice Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-950">Notice processing file</div>
              <div className="text-amber-800 leading-relaxed">{errorMessage}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {failedImage && (
              <>
                <button
                  onClick={handleRetryOcr}
                  className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold transition"
                >
                  🔄 Retry AI OCR
                </button>
                <button
                  onClick={handleOpenManualReviewGrid}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  ✏️ Open Review Grid with Image
                </button>
              </>
            )}
            <button
              onClick={() => setErrorMessage(null)}
              className="text-amber-700 hover:text-amber-900 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 bg-white ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls,.txt,.md,image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {isLoading ? (
          <div className="space-y-4 py-6">
            <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700">{loadingMessage}</p>
            <p className="text-xs text-slate-500">Checking data formats, encodings, and headers...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="text-base font-semibold text-slate-800">
                Drag and drop your file here, or{' '}
                <span className="text-blue-600 underline">browse files</span>
              </div>
              <p className="text-xs text-slate-500">
                Supports CSV, TSV, Excel (.xlsx, .xls), TXT, Markdown tables, and table screenshots/receipts (PNG, JPG, WEBP)
              </p>
            </div>

            {/* Badges for supported formats */}
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                CSV / XLSX
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Text / Markdown
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                Table Photo / OCR
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Loaded Instant Test Datasets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Instant 1-Click Sample Datasets
            </h3>
          </div>
          <span className="text-xs text-slate-400">Test the platform in 5 seconds</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSampleClick(sample)}
              className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition group flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                    {sample.name}
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {sample.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {sample.description}
                </p>
              </div>

              <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
                Load this dataset <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Feature: Multi-File Joiner */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800">
              Multi-File Combiner & Join Key Validator
            </span>
          </div>
          <button
            onClick={() => setIsCombining(!isCombining)}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            {isCombining ? 'Hide Combiner' : 'Combine Multiple Files'}
          </button>
        </div>

        {isCombining && (
          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-4 text-xs">
            <p className="text-slate-500">
              Core Rule: Never join tables on similar column names alone. Sheet2Dashboard validates actual key values and row overlap before merging.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-700">Primary Table (File A)</div>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const text = await f.text();
                      const p = parseDelimitedText(text, f.name);
                      setFileA(p);
                      if (p.headers.length > 0) setLeftKey(p.headers[0]);
                    }
                  }}
                  className="w-full text-xs"
                />
                {fileA && (
                  <div>
                    <span className="text-slate-500">{fileA.filename} ({fileA.rows.length} rows)</span>
                    <select
                      value={leftKey}
                      onChange={(e) => setLeftKey(e.target.value)}
                      className="mt-1 w-full p-1.5 border rounded bg-slate-50"
                    >
                      {fileA.headers.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-3 rounded border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-700">Lookup / Secondary Table (File B)</div>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const text = await f.text();
                      const p = parseDelimitedText(text, f.name);
                      setFileB(p);
                      if (p.headers.length > 0) setRightKey(p.headers[0]);
                    }
                  }}
                  className="w-full text-xs"
                />
                {fileB && (
                  <div>
                    <span className="text-slate-500">{fileB.filename} ({fileB.rows.length} rows)</span>
                    <select
                      value={rightKey}
                      onChange={(e) => setRightKey(e.target.value)}
                      className="mt-1 w-full p-1.5 border rounded bg-slate-50"
                    >
                      {fileB.headers.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {fileA && fileB && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleValidateJoin}
                  className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium hover:bg-slate-700"
                >
                  Validate Key Overlap
                </button>

                {joinValidation && (
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold ${
                        joinValidation.valid ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      Match: {joinValidation.matchCount} shared keys ({joinValidation.overlapPercentage.toFixed(1)}% overlap)
                    </span>
                    {joinValidation.valid && (
                      <button
                        onClick={executeJoin}
                        className="px-3 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                      >
                        Merge & Load Combined Dataset
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

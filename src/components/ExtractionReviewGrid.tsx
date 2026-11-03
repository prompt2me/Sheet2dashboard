import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { OcrExtractionData, OcrCell } from '../types/dashboard';

interface ExtractionReviewGridProps {
  ocrData: OcrExtractionData;
  imagePreviewUrl?: string;
  onConfirm: (confirmedData: OcrExtractionData) => void;
  onCancel: () => void;
}

export const ExtractionReviewGrid: React.FC<ExtractionReviewGridProps> = ({
  ocrData,
  imagePreviewUrl,
  onConfirm,
  onCancel,
}) => {
  const [data, setData] = useState<OcrExtractionData>(JSON.parse(JSON.stringify(ocrData)));
  const [activeCell, setActiveCell] = useState<{ rIdx: number; cIdx: number } | null>(null);

  const handleCellChange = (rIdx: number, cIdx: number, newValue: string) => {
    const updated = { ...data };
    const cell = updated.rows[rIdx].cells[cIdx];
    cell.value = newValue;
    cell.isEdited = true;
    cell.confidence = 1.0; // User confirmed/edited
    setData(updated);
  };

  const handleHeaderChange = (cIdx: number, newHeader: string) => {
    const updated = { ...data };
    const oldHeader = updated.columns[cIdx];
    updated.columns[cIdx] = newHeader;
    updated.rows.forEach((r) => {
      if (r.cells[cIdx]) {
        r.cells[cIdx].column = newHeader;
      }
    });
    setData(updated);
  };

  const addRow = () => {
    const updated = { ...data };
    const newCells: OcrCell[] = data.columns.map((col) => ({
      column: col,
      value: '',
      confidence: 1.0,
      type: 'text',
      isEdited: true,
    }));
    updated.rows.push({ cells: newCells });
    setData(updated);
  };

  const deleteRow = (rIdx: number) => {
    const updated = { ...data };
    updated.rows.splice(rIdx, 1);
    setData(updated);
  };

  const addColumn = () => {
    const colName = `Col_${data.columns.length + 1}`;
    const updated = { ...data };
    updated.columns.push(colName);
    updated.rows.forEach((r) => {
      r.cells.push({
        column: colName,
        value: '',
        confidence: 1.0,
        type: 'text',
        isEdited: true,
      });
    });
    setData(updated);
  };

  // Calculate overall extraction stats
  let totalCells = 0;
  let highConf = 0;
  let medConf = 0;
  let lowConf = 0;

  data.rows.forEach((r) => {
    r.cells.forEach((c) => {
      totalCells++;
      if (c.confidence >= 0.9) highConf++;
      else if (c.confidence >= 0.7) medConf++;
      else lowConf++;
    });
  });

  const getConfidenceBadge = (confidence: number, isEdited?: boolean) => {
    if (isEdited) {
      return (
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
          User Verified
        </span>
      );
    }
    if (confidence >= 0.9) {
      return (
        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
          {Math.round(confidence * 100)}%
        </span>
      );
    }
    if (confidence >= 0.7) {
      return (
        <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
          {Math.round(confidence * 100)}%
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1 py-0.2 rounded animate-pulse">
        {Math.round(confidence * 100)}% Review
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              OCR Extraction Review & Quality Verification
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Core Philosophy: Source data is authoritative. Inspect extracted cells and resolve low-confidence values before building the dashboard.
          </p>
        </div>

        {/* Confidence Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200">
            <span className="text-slate-500">Confidence:</span>
            <span className="text-emerald-700 font-semibold">{highConf} High</span>
            <span className="text-slate-300">/</span>
            <span className="text-amber-700 font-semibold">{medConf} Med</span>
            <span className="text-slate-300">/</span>
            <span className="text-rose-700 font-semibold">{lowConf} Low</span>
          </div>
        </div>
      </div>

      {/* Main Review Area: Image on left (if available), Editable Grid on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {imagePreviewUrl && (
          <div className="lg:col-span-4 bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
              <span>Original Uploaded Image</span>
              <span className="text-[11px] text-slate-500">Compare source</span>
            </div>
            <div className="max-h-[500px] overflow-auto rounded border border-slate-200 bg-white p-2">
              <img
                src={imagePreviewUrl}
                alt="Source OCR table"
                className="w-full h-auto object-contain"
              />
            </div>
            {data.notes && data.notes.length > 0 && (
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Model Extraction Notes:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                  {data.notes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Editable Table Grid */}
        <div className={`${imagePreviewUrl ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">
              Extracted Table Structure ({data.rows.length} rows, {data.columns.length} columns)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={addColumn}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Column
              </button>
              <button
                onClick={addRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[500px] shadow-inner bg-slate-50">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10 text-slate-700 font-semibold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-slate-400 text-center">#</th>
                  {data.columns.map((col, cIdx) => (
                    <th key={cIdx} className="py-2 px-3 min-w-[140px] border-r border-slate-200">
                      <input
                        type="text"
                        value={col}
                        onChange={(e) => handleHeaderChange(cIdx, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </th>
                  ))}
                  <th className="py-2 px-2 w-10 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-blue-50/40 transition">
                    <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                      {rIdx + 1}
                    </td>
                    {row.cells.map((cell, cIdx) => {
                      const isLow = cell.confidence < 0.7 && !cell.isEdited;
                      const isMed = cell.confidence >= 0.7 && cell.confidence < 0.9 && !cell.isEdited;

                      return (
                        <td
                          key={cIdx}
                          className={`py-1 px-2 border-r border-slate-200 relative ${
                            isLow
                              ? 'bg-rose-50/80 border-rose-300'
                              : isMed
                              ? 'bg-amber-50/50'
                              : ''
                          }`}
                        >
                          <div className="space-y-0.5">
                            <input
                              type="text"
                              value={String(cell.value ?? '')}
                              onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                              onFocus={() => setActiveCell({ rIdx, cIdx })}
                              className={`w-full text-xs rounded px-1.5 py-1 border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isLow
                                  ? 'border-rose-400 font-semibold text-rose-900 bg-white'
                                  : 'border-slate-200 bg-transparent text-slate-800'
                              }`}
                            />
                            <div className="flex items-center justify-between text-[10px]">
                              {getConfidenceBadge(cell.confidence, cell.isEdited)}
                              <span className="text-slate-400 font-mono text-[9px] uppercase">
                                {cell.type}
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-1 px-2 text-center">
                      <button
                        onClick={() => deleteRow(rIdx)}
                        className="text-slate-400 hover:text-rose-600 transition p-1"
                        title="Delete this row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Tip: Click any cell to modify. Cells with red borders represent low-confidence extractions from blurry or handwritten text.
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
        >
          Cancel & Upload Different File
        </button>

        <button
          onClick={() => onConfirm(data)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
        >
          <CheckCircle className="w-4 h-4" />
          Confirm Extraction & Proceed to Data Audit
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

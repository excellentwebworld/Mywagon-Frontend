/**
 * ImportModal — CSV import for lane price entries (Google Places sheet).
 *
 * Two-step flow:
 * 1. Choose: Download template OR Upload file (+ column / accepted values reference)
 * 2. Preview: Valid/Duplicate/Invalid counts, preview table, Import button
 *
 * @API: POST /api/v1/price-lists/lanes/import
 */

import { useCallback, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { formatMetricLabel, formatMetricValueLabel } from '../../../../api/utils/laneMetricDisplay';
import {
  ACCEPTED_VALUES,
  CSV_COLUMNS_EL,
  CSV_COLUMNS_EN,
  buildTemplateCsv,
  getValidImportRows,
  isRowImportable,
  matchStatusLabel,
  parseCsvText,
  rowsToImportApiPayload,
} from '../../../../api/utils/laneCsvSchema';
import { useToast } from '../../../../hooks/useToast';
import { priceListsService } from '../../../../api/services/priceListsService';

export default function ImportModal({ open, onClose, onImported, existingLanes }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const toast = useToast();
  const lang = i18n.language?.startsWith('el') ? 'el' : 'en';
  const fileRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const columns = lang === 'el' ? CSV_COLUMNS_EL : CSV_COLUMNS_EN;

  const handleClose = useCallback(() => {
    setPreview(null);
    setReferenceOpen(false);
    setParseError('');
    setImportResult(null);
    setDragOver(false);
    onClose();
  }, [onClose]);

  const downloadTemplate = useCallback(() => {
    const csv = buildTemplateCsv(lang);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MYVAGON_PriceList_Template_${lang === 'el' ? 'GR' : 'EN'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [lang]);

  const processFileText = useCallback((text) => {
    setParseError('');
    setImportResult(null);
    const result = parseCsvText(text, {
      existingLanes,
    });
    if (!result) {
      setPreview(null);
      setParseError(t(
        'priceLists.import.parseError',
        'Could not read this file. Check that it includes Origin, Destination, and Price columns.',
      ));
      return;
    }
    setPreview(result);
  }, [existingLanes, t]);

  const handleFileBlob = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      processFileText(String(ev.target?.result || ''));
    };
    reader.readAsText(file, 'UTF-8');
  }, [processFileText]);

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    handleFileBlob(file);
  }, [handleFileBlob]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileBlob(file);
  }, [handleFileBlob]);

  const doImport = useCallback(async () => {
    if (!preview) return;

    const validRows = getValidImportRows(preview.rows);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportResult(null);
    try {
      const payload = rowsToImportApiPayload(validRows);
      const result = await priceListsService.importLanes(payload);

      const created = result?.created ?? 0;
      const skipped = result?.skipped ?? 0;
      const errors = Array.isArray(result?.errors) ? result.errors : [];

      if (onImported) {
        await onImported(result);
      }

      if (created === 0 || errors.length > 0) {
        setImportResult({ created, skipped, errors });
        if (created === 0) {
          // Keep preview so user can review; show server errors
          return;
        }
      }

      setPreview(null);
      setImportResult(null);
    } catch (error) {
      console.error('Import failed', error);
      toast.error(t('priceLists.import.failed', 'Import failed. Please try again.'));
    } finally {
      setImporting(false);
    }
  }, [preview, onImported, t, toast]);

  const getRowStatusLabel = useCallback((row) => {
    if (row.dupe) return t('priceLists.import.duplicates', 'Duplicate');
    if (row.errors.length > 0 || row.groupError) {
      return row.errors[0]?.message || t('priceLists.import.invalidRow', 'Invalid row');
    }
    if (!row.validO || !row.validD) return t('priceLists.import.invalidCity', 'Invalid city');
    return t('priceLists.import.ok', 'OK');
  }, [t]);

  if (!open) return null;

  const validLaneCount = preview ? new Set(getValidImportRows(preview.rows).map((r) => r.laneGroupKey)).size : 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-[720px] max-h-[88vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}>

        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
            {t('priceLists.import.title', 'Import CSV')}
          </h3>
          <button onClick={handleClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!preview ? (
            <>
              <div
                className="mb-4 rounded-xl px-3 py-2.5"
                style={{ background: T.bg, border: `1px solid ${T.bd}`, fontSize: 12, color: T.t2, lineHeight: 1.45 }}
              >
                {t(
                  'priceLists.import.howTo',
                  'Download the template or Export existing lanes, then edit Origin / Destination labels, cities, addresses, and coordinates before uploading.',
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={downloadTemplate}
                  className="flex flex-col items-center gap-2 p-6 rounded-xl cursor-pointer border-none"
                  style={{ background: T.bg, border: `1px solid ${T.bd}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.ac; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.bd; }}>
                  <Download size={28} style={{ color: T.ac }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{t('priceLists.import.downloadTemplate', 'Download Template')}</span>
                  <span style={{ fontSize: 11, color: T.t3, textAlign: 'center' }}>{t('priceLists.import.downloadSub', 'Get the CSV template with sample data')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className="flex flex-col items-center gap-2 p-6 rounded-xl cursor-pointer border-none"
                  style={{
                    background: T.bg,
                    border: `1px ${dragOver ? 'dashed' : 'solid'} ${dragOver ? T.ac : T.bd}`,
                  }}
                >
                  <Upload size={28} style={{ color: T.ac }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{t('priceLists.import.uploadFile', 'Upload File')}</span>
                  <span style={{ fontSize: 11, color: T.t3, textAlign: 'center' }}>
                    {t('priceLists.import.uploadSub', 'CSV, TSV, or TXT — click or drag & drop')}
                  </span>
                </button>
              </div>

              {!!parseError && (
                <div className="mt-3 rounded-lg px-3 py-2" style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 12 }}>
                  {parseError}
                </div>
              )}

              <div className="mt-4 rounded-xl" style={{ border: `1px solid ${T.bd}` }}>
                <button
                  type="button"
                  onClick={() => setReferenceOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 cursor-pointer border-none rounded-xl"
                  style={{ background: T.bg, color: T.t1, fontSize: 13, fontWeight: 600 }}
                >
                  <span>{t('priceLists.import.acceptedValues', 'Sheet columns & accepted values')}</span>
                  {referenceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {referenceOpen && (
                  <div className="px-4 py-3 space-y-3" style={{ fontSize: 11, color: T.t2, borderTop: `1px solid ${T.bd}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: T.t1, marginBottom: 6 }}>
                        {t('priceLists.import.ref.columns', 'Columns (in order)')}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.6, color: T.t3 }}>
                        {columns.join(' · ')}
                      </div>
                    </div>
                    <div><strong>{t('priceLists.import.ref.originDest', 'Origin / Destination')}:</strong> {t('priceLists.import.ref.originDestHint', 'Google place label (e.g. Name · City).')}</div>
                    <div><strong>{t('priceLists.import.ref.cities', 'Origin / Destination City')}:</strong> {t('priceLists.import.ref.citiesHint', 'Required match key for calculator and listing.')}</div>
                    <div><strong>{t('priceLists.import.ref.coords', 'Origin / Destination Lat & Lng')}:</strong> {t('priceLists.import.ref.coordsHint', 'Required for import. Filled automatically on Export from saved lane stops.')}</div>
                    <div><strong>{t('priceLists.import.ref.tripType', 'Trip type')}:</strong> {ACCEPTED_VALUES.trip_type.join(', ')}</div>
                    <div><strong>{t('priceLists.import.ref.metric', 'Metric')}:</strong> {ACCEPTED_VALUES.metric.join(', ')}</div>
                    <div><strong>{t('priceLists.import.ref.metricValue', 'Metric value')}:</strong></div>
                    <ul className="list-disc pl-5 m-0">
                      <li>weight: {ACCEPTED_VALUES.metric_value.weight.join(', ')}</li>
                      <li>unit_transport: {ACCEPTED_VALUES.metric_value.unit_transport.join(', ')}</li>
                      <li>load_any_size: {ACCEPTED_VALUES.metric_value.load_any_size.join(', ')}</li>
                      <li>ftl_truck_type: {t('priceLists.import.ref.ftlHint', 'vehicle type slug')}</li>
                    </ul>
                    <div><strong>{t('priceLists.import.ref.status', 'Status')}:</strong> {ACCEPTED_VALUES.status.join(', ')}</div>
                    <div><strong>{t('priceLists.import.ref.scope', 'Scope')}:</strong> {ACCEPTED_VALUES.scope.join(', ')}</div>
                    <div><strong>{t('priceLists.import.ref.scopeDirection', 'Scope direction')}:</strong> buy, sell</div>
                    <div style={{ color: T.t3 }}>{t('priceLists.import.ref.multiRowHint', 'One CSV row = one pricing metric. Rows with the same route, dates, scope, and notes are grouped into one lane (max 4 metrics).')}</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div style={{ fontSize: 12, color: T.t2 }}>
                  {t('priceLists.import.preview', 'Preview')} — {t('priceLists.import.detected', 'Detected')} {preview.rows.length} {t('priceLists.import.rows', 'rows')}
                </div>
                <button
                  type="button"
                  onClick={() => { setPreview(null); setImportResult(null); setParseError(''); }}
                  className="px-2.5 py-1 rounded-md cursor-pointer border-none"
                  style={{ background: T.bg, color: T.ac, fontSize: 11, fontWeight: 600 }}
                >
                  {t('priceLists.import.chooseAnother', 'Choose another file')}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3" style={{ fontSize: 12 }}>
                <span>{t('priceLists.import.validLabel', 'Valid')}: <span style={{ color: '#10B981', fontWeight: 600 }}>{preview.valid}</span></span>
                <span>{t('priceLists.import.duplicates', 'Duplicates')}: <span style={{ color: '#F59E0B', fontWeight: 600 }}>{preview.dupes}</span></span>
                <span>{t('priceLists.import.invalidCity', 'Invalid city')}: <span style={{ color: '#EF4444', fontWeight: 600 }}>{preview.invalidCity}</span></span>
                <span>{t('priceLists.import.invalidMetric', 'Invalid metric')}: <span style={{ color: '#EF4444', fontWeight: 600 }}>{preview.invalidMetric}</span></span>
                <span>{t('priceLists.import.groupErrors', 'Group errors')}: <span style={{ color: '#EF4444', fontWeight: 600 }}>{preview.groupErrors}</span></span>
              </div>

              {importResult && (
                <div className="mb-3 rounded-lg px-3 py-2" style={{ background: importResult.created > 0 ? '#ECFDF5' : '#FEE2E2', color: importResult.created > 0 ? '#065F46' : '#991B1B', fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    {t('priceLists.import.resultSummary', 'Import result')}: {importResult.created} {t('priceLists.import.lanes', 'lanes')}, {importResult.skipped} {t('priceLists.import.skippedRows', 'rows skipped')}
                  </div>
                  {importResult.errors?.slice(0, 5).map((err, idx) => (
                    <div key={idx} style={{ marginTop: 4, opacity: 0.9 }}>
                      {err.line != null ? `#${err.line}: ` : ''}{err.message}
                    </div>
                  ))}
                  {(importResult.errors?.length || 0) > 5 && (
                    <div style={{ marginTop: 4 }}>… +{importResult.errors.length - 5} more</div>
                  )}
                </div>
              )}

              <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${T.bd}`, maxHeight: 320 }}>
                <table className="w-full" style={{ fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.bg }}>
                      {[
                        '#',
                        t('priceLists.modal.origin', 'Origin'),
                        t('priceLists.modal.destination', 'Dest'),
                        t('priceLists.import.col.match', 'Match'),
                        t('priceLists.col.metric', 'Metric'),
                        t('priceLists.col.price', 'Price'),
                        t('priceLists.col.status', 'Status'),
                      ].map((h, i) => (
                        <th key={i} className="text-left px-2 py-1.5" style={{ color: T.t3, fontWeight: 600, borderBottom: `1px solid ${T.bd}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => {
                      const isErr = !isRowImportable(r);
                      return (
                        <tr key={i} style={{ background: isErr ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                          <td className="px-2 py-1" style={{ color: T.t3 }}>{r.line}</td>
                          <td className="px-2 py-1" style={{ color: T.t1, maxWidth: 140 }}>
                            <div className="truncate">{r.oRaw}{!r.validO ? ' ⚠' : ''}</div>
                            {r.oLat != null && r.oLng != null ? (
                              <div style={{ fontSize: 9, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>{r.oLat}, {r.oLng}</div>
                            ) : null}
                          </td>
                          <td className="px-2 py-1" style={{ color: T.t1, maxWidth: 140 }}>
                            <div className="truncate">{r.dRaw}{!r.validD ? ' ⚠' : ''}</div>
                            {r.dLat != null && r.dLng != null ? (
                              <div style={{ fontSize: 9, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>{r.dLat}, {r.dLng}</div>
                            ) : null}
                          </td>
                          <td className="px-2 py-1" style={{ color: T.t3, fontSize: 10, whiteSpace: 'nowrap' }}>
                            {matchStatusLabel(r.oMatch, t)} → {matchStatusLabel(r.dMatch, t)}
                          </td>
                          <td className="px-2 py-1" style={{ color: T.t2 }}>
                            <div>{formatMetricLabel(r.metric, t)}</div>
                            <div style={{ fontSize: 10, color: T.t3 }}>{formatMetricValueLabel(r.metric, r.metricValue, t)}</div>
                          </td>
                          <td className="px-2 py-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.t1 }}>{r.price} {r.cur}</td>
                          <td className="px-2 py-1" style={{ color: isErr ? '#EF4444' : '#10B981', maxWidth: 140 }}>
                            {getRowStatusLabel(r)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button onClick={handleClose} disabled={importing} className="px-4 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: T.bg, color: T.t2, fontSize: 13, fontWeight: 500 }}>{t('common.cancel', 'Cancel')}</button>
          {preview && validLaneCount > 0 && (
            <button onClick={doImport} disabled={importing} className="px-4 py-2 rounded-lg cursor-pointer border-none text-white"
              style={{ background: T.ac, fontSize: 13, fontWeight: 600, opacity: importing ? 0.7 : 1 }}>
              {importing
                ? t('priceLists.import.importing', 'Importing…')
                : `${t('priceLists.import.importBtn', 'Import')} ${validLaneCount} ${t('priceLists.import.lanes', 'lanes')}`}
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

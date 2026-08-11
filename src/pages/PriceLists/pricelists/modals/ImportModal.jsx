/**
 * ImportModal — CSV import for lane price entries.
 *
 * Supports:
 * - Simple 9-column template (city-only, manual entry)
 * - Full 21-column export format (re-import with coordinates)
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
  EXPORT_CSV_COLUMNS_EL,
  EXPORT_CSV_COLUMNS_EN,
  SIMPLE_CSV_COLUMNS_EL,
  SIMPLE_CSV_COLUMNS_EN,
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

  const columns = lang === 'el' ? SIMPLE_CSV_COLUMNS_EL : SIMPLE_CSV_COLUMNS_EN;
  const exportColumns = lang === 'el' ? EXPORT_CSV_COLUMNS_EL : EXPORT_CSV_COLUMNS_EN;

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
        'We could not read this file. Make sure the first row includes Origin City, Destination City, and Price column headers, then try again.',
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
      toast.error(t('priceLists.import.failed', 'Import failed. Check your file and try again.'));
    } finally {
      setImporting(false);
    }
  }, [preview, onImported, t, toast]);

  const getRowStatusLabel = useCallback((row) => {
    if (row.dupe) return t('priceLists.import.duplicates', 'Already exists');
    if (row.errors.length > 0 || row.groupError) {
      return row.errors[0]?.message || t('priceLists.import.invalidRow', 'Invalid row');
    }
    if (!row.validO || !row.validD) return t('priceLists.import.invalidCity', 'Missing city');
    return t('priceLists.import.ok', 'Ready');
  }, [t]);

  if (!open) return null;

  const validLaneCount = preview ? new Set(getValidImportRows(preview.rows).map((r) => r.laneGroupKey)).size : 0;
  const hasCityOnlyRows = preview?.rows.some((r) => r.oMatch === 'city_only' || r.dMatch === 'city_only') ?? false;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-[720px] max-h-[88vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}>

        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
              {t('priceLists.import.title', 'Import lane prices')}
            </h3>
            <p style={{ fontSize: 12, color: T.t3, margin: '4px 0 0' }}>
              {t('priceLists.import.subtitle', 'Add new routes from a spreadsheet or bulk-update prices from an export file.')}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!preview ? (
            <>
              <div
                className="mb-4 rounded-xl px-4 py-3 space-y-2.5"
                style={{ background: T.bg, border: `1px solid ${T.bd}`, fontSize: 12, color: T.t2, lineHeight: 1.5 }}
              >
                <div style={{ fontWeight: 600, color: T.t1 }}>
                  {t('priceLists.import.howToTitle', 'How it works')}
                </div>
                <ol className="m-0 space-y-1.5" style={{ paddingLeft: 18 }}>
                  <li>
                    {t(
                      'priceLists.import.howToStep1',
                      'New lanes — download the simple template, fill in origin city, destination city, metric, and price (one row per price).',
                    )}
                  </li>
                  <li>
                    {t(
                      'priceLists.import.howToStep2',
                      'Bulk edits — use Export on the lane list, change prices or dates in Excel, then upload the exported file here.',
                    )}
                  </li>
                  <li>
                    {t(
                      'priceLists.import.howToStep3',
                      'Review the preview, then confirm import. Rows with the same route and dates are grouped into one lane (up to 4 prices each).',
                    )}
                  </li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={downloadTemplate}
                  className="flex flex-col items-center gap-2 p-6 rounded-xl cursor-pointer border-none"
                  style={{ background: T.bg, border: `1px solid ${T.bd}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.ac; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.bd; }}>
                  <Download size={28} style={{ color: T.ac }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{t('priceLists.import.downloadTemplate', 'Download simple template')}</span>
                  <span style={{ fontSize: 11, color: T.t3, textAlign: 'center' }}>{t('priceLists.import.downloadSub', '9 columns · city names only · includes sample rows')}</span>
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{t('priceLists.import.uploadFile', 'Upload your file')}</span>
                  <span style={{ fontSize: 11, color: T.t3, textAlign: 'center' }}>
                    {t('priceLists.import.uploadSub', 'Simple template or exported file · CSV, TSV, or TXT')}
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
                  <span>{t('priceLists.import.acceptedValues', 'Column guide & allowed values')}</span>
                  {referenceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {referenceOpen && (
                  <div className="px-4 py-3 space-y-3" style={{ fontSize: 11, color: T.t2, borderTop: `1px solid ${T.bd}` }}>
                    <div style={{ lineHeight: 1.5 }}>
                      {t(
                        'priceLists.import.ref.intro',
                        'Use the simple template for new lanes. Only city names are required — no addresses or map coordinates. Currency is always EUR; status defaults to active and scope to Default unless you use an export file.',
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: T.t1, marginBottom: 6 }}>
                        {t('priceLists.import.ref.columns', 'Simple template columns')}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.6, color: T.t3 }}>
                        {columns.join(' · ')}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: T.t1, marginBottom: 4 }}>
                        {t('priceLists.import.ref.required', 'Required fields')}
                      </div>
                      <ul className="list-disc pl-5 m-0 space-y-0.5">
                        <li><strong>{t('priceLists.import.ref.cities', 'Origin City / Destination City')}</strong> — {t('priceLists.import.ref.citiesHint', 'City name used in the lane list and quote calculator.')}</li>
                        <li><strong>{t('priceLists.import.ref.metric', 'Metric')}</strong> — {ACCEPTED_VALUES.metric.join(', ')}</li>
                        <li><strong>{t('priceLists.import.ref.metricValue', 'Metric Value')}</strong> — {t('priceLists.import.ref.metricValueHint', 'see values below')}</li>
                        <li><strong>{t('priceLists.col.price', 'Price')}</strong> — {t('priceLists.import.ref.priceHint', 'Amount in EUR, greater than zero.')}</li>
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: T.t1, marginBottom: 4 }}>
                        {t('priceLists.import.ref.optional', 'Optional fields')}
                      </div>
                      <ul className="list-disc pl-5 m-0 space-y-0.5">
                        <li><strong>{t('priceLists.import.ref.tripType', 'Trip Type')}</strong> — {ACCEPTED_VALUES.trip_type.join(', ')} ({t('priceLists.import.ref.tripDefaultHint', 'default: direct')})</li>
                        <li><strong>{t('priceLists.import.ref.effectiveFrom', 'Effective From / To')}</strong> — {t('priceLists.import.ref.datesHint', 'YYYY-MM-DD. From defaults to today; leave To blank for no end date.')}</li>
                        <li><strong>{t('priceLists.import.ref.notes', 'Notes')}</strong> — {t('priceLists.import.ref.notesHint', 'Free text, optional.')}</li>
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: T.t1, marginBottom: 4 }}>
                        {t('priceLists.import.ref.metricValuesTitle', 'Allowed metric values')}
                      </div>
                      <ul className="list-disc pl-5 m-0 space-y-0.5">
                        <li>weight — {ACCEPTED_VALUES.metric_value.weight.join(', ')}</li>
                        <li>unit transport — {ACCEPTED_VALUES.metric_value.unit_transport.join(', ')}</li>
                        <li>load any size — {ACCEPTED_VALUES.metric_value.load_any_size.join(', ')}</li>
                        <li>ftl truck type — {t('priceLists.import.ref.ftlHint', 'any vehicle type name or slug')}</li>
                      </ul>
                    </div>

                    <div style={{ color: T.t3, lineHeight: 1.5 }}>
                      {t(
                        'priceLists.import.ref.multiRowHint',
                        'Each row is one price. Rows with the same origin, destination, trip type, dates, scope, and notes are merged into a single lane (maximum 4 prices per lane).',
                      )}
                    </div>

                    <div
                      className="rounded-lg px-3 py-2"
                      style={{ background: T.sf, border: `1px solid ${T.bd}`, lineHeight: 1.5 }}
                    >
                      <div style={{ fontWeight: 600, color: T.t1, marginBottom: 4 }}>
                        {t('priceLists.import.ref.exportTitle', 'Re-importing an export file')}
                      </div>
                      <div style={{ color: T.t3, marginBottom: 6 }}>
                        {t(
                          'priceLists.import.ref.fullFormatHint',
                          'Export uses the same city-only columns as the template, plus Status and Scope. Legacy files with addresses or coordinates can still be imported.',
                        )}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, lineHeight: 1.5, color: T.t3 }}>
                        {exportColumns.join(' · ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div style={{ fontSize: 12, color: T.t2 }}>
                  {t('priceLists.import.preview', 'Import preview')} — {preview.rows.length} {t('priceLists.import.rows', 'rows')}
                  {' · '}
                  {preview.format === 'full'
                    ? t('priceLists.import.formatFull', 'export file detected')
                    : t('priceLists.import.formatSimple', 'simple template detected')}
                </div>
                <button
                  type="button"
                  onClick={() => { setPreview(null); setImportResult(null); setParseError(''); }}
                  className="px-2.5 py-1 rounded-md cursor-pointer border-none"
                  style={{ background: T.bg, color: T.ac, fontSize: 11, fontWeight: 600 }}
                >
                  {t('priceLists.import.chooseAnother', 'Upload a different file')}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3" style={{ fontSize: 12 }}>
                <span>{t('priceLists.import.validLabel', 'Ready to import')}: <span style={{ color: '#10B981', fontWeight: 600 }}>{preview.valid}</span></span>
                <span>{t('priceLists.import.duplicates', 'Already exists')}: <span style={{ color: '#F59E0B', fontWeight: 600 }}>{preview.dupes}</span></span>
                <span>{t('priceLists.import.invalidCity', 'Missing city')}: <span style={{ color: '#EF4444', fontWeight: 600 }}>{preview.invalidCity}</span></span>
                <span>{t('priceLists.import.invalidMetric', 'Invalid metric')}: <span style={{ color: '#EF4444', fontWeight: 600 }}>{preview.invalidMetric}</span></span>
                <span>{t('priceLists.import.groupErrors', 'Too many prices')}: <span style={{ color: '#EF4444', fontWeight: 600 }}>{preview.groupErrors}</span></span>
              </div>

              {hasCityOnlyRows && (
                <div className="mb-3 rounded-lg px-3 py-2" style={{ background: T.bg, border: `1px solid ${T.bd}`, fontSize: 12, color: T.t2 }}>
                  {t(
                    'priceLists.import.cityOnlyHint',
                    'Some routes use city names only (no map pin yet). You can set the exact pickup and drop-off location after import by editing the lane.',
                  )}
                </div>
              )}

              {importResult && (
                <div className="mb-3 rounded-lg px-3 py-2" style={{ background: importResult.created > 0 ? '#ECFDF5' : '#FEE2E2', color: importResult.created > 0 ? '#065F46' : '#991B1B', fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    {t('priceLists.import.resultSummary', 'Result')}: {importResult.created} {t('priceLists.import.lanes', 'lanes imported')}, {importResult.skipped} {t('priceLists.import.skippedRows', 'rows skipped')}
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
                        t('priceLists.import.col.match', 'Location'),
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
                : `${t('priceLists.import.importBtn', 'Import')} ${validLaneCount} ${validLaneCount === 1 ? t('priceLists.import.laneSingular', 'lane') : t('priceLists.import.lanes', 'lanes')}`}
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

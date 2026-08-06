/**
 * ImportModal — CSV import for lane price entries.
 *
 * Two-step flow:
 * 1. Choose: Download template OR Upload file
 * 2. Preview: Valid/Duplicate/Invalid counts, preview table, Import button
 *
 * Features:
 * - Bilingual template download (EN/EL headers)
 * - Auto-separator detection (tab → semicolon → comma)
 * - Bilingual column header matching
 * - Duplicate detection against existing lanes
 * - City name resolution (EN or EL input)
 *
 * @API: POST /api/v1/price-lists/import
 */

import { useCallback, useRef, useState } from 'react';
import { X, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { CITIES, resolveCity, cityLabel } from '../../../../mocks/priceListsData';

const METRIC_VALUE_OPTIONS = {
  weight: ['kg', 'ton'],
  unit_transport: ['eur_pallet', 'us_pallet', 'box', 'unit', 'big_bag'],
  ftl_truck_type: ['vehicle_type'],
  load_any_size: ['per_load'],
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function parseMetricValue(metric, value) {
  const raw = normalizeText(value);
  if (metric === 'weight') {
    if (raw.includes('ton')) return { unit: 'ton' };
    return { unit: 'kg' };
  }
  if (metric === 'unit_transport') {
    if (raw.includes('us')) return { type: 'us_pallet' };
    if (raw.includes('box')) return { type: 'box' };
    if (raw.includes('unit')) return { type: 'unit' };
    if (raw.includes('big')) return { type: 'big_bag' };
    return { type: 'eur_pallet' };
  }
  if (metric === 'ftl_truck_type') return { vehicle_type: value || 'vehicle_type' };
  return { type: 'per_load' };
}

function metricLabel(metric, t) {
  if (metric === 'weight') return t('priceLists.phase2.metric.weight', 'Weight');
  if (metric === 'unit_transport') return t('priceLists.phase2.metric.unitTransport', 'Unit of transport');
  if (metric === 'ftl_truck_type') return t('priceLists.phase2.metric.ftlTruckType', 'FTL truck type');
  if (metric === 'load_any_size') return t('priceLists.phase2.metric.loadAnySize', 'Load (any size)');
  return metric;
}

function metricValueLabel(metric, metricValue, t) {
  if (metric === 'weight') return metricValue?.unit === 'ton' ? t('priceLists.phase2.metricValue.ton', 'ton') : t('priceLists.phase2.metricValue.kg', 'kg');
  if (metric === 'unit_transport') {
    const value = metricValue?.type || 'eur_pallet';
    if (value === 'us_pallet') return t('priceLists.phase2.unit.usPallet', 'US pallets');
    if (value === 'box') return t('priceLists.phase2.unit.box', 'Boxes');
    if (value === 'unit') return t('priceLists.phase2.unit.unit', 'Units');
    if (value === 'big_bag') return t('priceLists.phase2.unit.bigBag', 'Big Bags');
    return t('priceLists.phase2.unit.eurPallet', 'EUR pallets');
  }
  if (metric === 'ftl_truck_type') return metricValue?.vehicle_type || t('priceLists.phase2.metricValue.vehicleType', 'Vehicle type');
  return t('priceLists.phase2.metricValue.perLoad', 'per load');
}

function legacyUnitToMetric(unit) {
  const normalized = normalizeText(unit);
  if (normalized.includes('pallet')) return 'unit_transport';
  if (normalized.includes('kg') || normalized.includes('ton')) return 'weight';
  return 'load_any_size';
}

export default function ImportModal({ open, onClose, onImport, existingLanes }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = i18n.language;
  const fileRef = useRef(null);

  const [preview, setPreview] = useState(null); // { rows, valid, dupes, invalid }

  const handleClose = useCallback(() => {
    setPreview(null);
    onClose();
  }, [onClose]);

  // ─── Download template ───
  const downloadTemplate = useCallback(() => {
    const hdrEN = ['origin_city', 'destination_city', 'trip_type', 'metric', 'metric_value', 'price', 'currency', 'effective_from', 'effective_to', 'status', 'scope', 'scope_direction', 'notes'];
    const hdrEL = ['πόλη_αφετηρίας', 'πόλη_προορισμού', 'τύπος_δρομολογίου', 'μετρική', 'τιμή_μετρικής', 'τιμή', 'νόμισμα', 'ισχύς_από', 'ισχύς_έως', 'κατάσταση', 'πεδίο', 'κατεύθυνση_πεδίου', 'σημειώσεις'];
    const hdr = lang === 'el' ? hdrEL : hdrEN;
    const rows = [
      [lang === 'el' ? 'Αθήνα' : 'Athens', lang === 'el' ? 'Θεσσαλονίκη' : 'Thessaloniki', 'direct', 'load_any_size', 'per_load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
      [lang === 'el' ? 'Πάτρα' : 'Patras', lang === 'el' ? 'Ηράκλειο' : 'Heraklion', 'direct', 'unit_transport', 'eur_pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
      [lang === 'el' ? 'Βόλος' : 'Volos', lang === 'el' ? 'Λάρισα' : 'Larissa', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ];
    const csv = '\uFEFF' + hdr.join(',') + '\n' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
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

  // ─── Parse CSV ───
  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const txt = ev.target.result;
      // Auto-detect separator
      const firstLine = txt.split('\n')[0];
      const sep = txt.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
      const lines = txt.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;

      const hdr = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const colMap = { o: -1, d: -1, trip: -1, metric: -1, metricValue: -1, unit: -1, price: -1, cur: -1, from: -1, to: -1, status: -1, scope: -1, scopeDirection: -1, notes: -1 };
      hdr.forEach((h, i) => {
        if (h.includes('origin') || h.includes('αφετ')) colMap.o = i;
        if (h.includes('dest') || h.includes('προορ')) colMap.d = i;
        if (h.includes('trip') || h.includes('δρομολογ')) colMap.trip = i;
        if (h.includes('metric') || h.includes('μετρικ')) colMap.metric = i;
        if (h.includes('metric_value') || h.includes('τιμή_μετρικής') || h.includes('μετρική_τιμή')) colMap.metricValue = i;
        if (h.includes('unit') || h.includes('μονάδ')) colMap.unit = i;
        if (h.includes('price') || h.includes('τιμή') || h.includes('τιμη')) colMap.price = i;
        if (h.includes('curr') || h.includes('νόμισ') || h.includes('νομισ')) colMap.cur = i;
        if (h.includes('from') || h.includes('από') || h.includes('απο')) colMap.from = i;
        if (h.includes('to') || h.includes('έως') || h.includes('εως')) colMap.to = i;
        if (h.includes('status') || h.includes('κατάσ') || h.includes('κατασ')) colMap.status = i;
        if (h.includes('scope') || h.includes('πεδίο') || h.includes('πεδιο')) colMap.scope = i;
        if (h.includes('direction') || h.includes('κατεύθυν')) colMap.scopeDirection = i;
        if (h.includes('note') || h.includes('σημεί')) colMap.notes = i;
      });

      if (colMap.o < 0 || colMap.d < 0 || colMap.price < 0) return;

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map(x => x.replace(/^"|"$/g, '').trim());
        const oRaw = vals[colMap.o] || '';
        const dRaw = vals[colMap.d] || '';
        const price = parseFloat(vals[colMap.price]) || 0;
        if (!oRaw || !dRaw || !price) continue;

        const oCity = resolveCity(oRaw);
        const dCity = resolveCity(dRaw);
        const validO = !!oCity;
        const validD = !!dCity;
        const metric = colMap.metric >= 0
          ? normalizeText(vals[colMap.metric])
          : legacyUnitToMetric(colMap.unit >= 0 ? vals[colMap.unit] : '');
        const metricValueRaw = colMap.metricValue >= 0 ? vals[colMap.metricValue] : (colMap.unit >= 0 ? vals[colMap.unit] : 'per_load');
        const metricValue = parseMetricValue(metric, metricValueRaw);
        const cur = colMap.cur >= 0 ? vals[colMap.cur] || 'EUR' : 'EUR';
        const from = colMap.from >= 0 ? vals[colMap.from] || new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const to = colMap.to >= 0 ? vals[colMap.to] || '' : '';
        const status = colMap.status >= 0 && normalizeText(vals[colMap.status]) === 'inactive' ? 'inactive' : 'active';
        const scope = colMap.scope >= 0 ? vals[colMap.scope] || 'Default' : 'Default';
        const tripType = colMap.trip >= 0 && normalizeText(vals[colMap.trip]) === 'roundtrip' ? 'roundtrip' : 'direct';
        const scopeDirection = colMap.scopeDirection >= 0 ? normalizeText(vals[colMap.scopeDirection]) || null : null;
        const notes = colMap.notes >= 0 ? vals[colMap.notes] || '' : '';

        const dupe = existingLanes?.some(l =>
          l.stops[0]?.city?.toLowerCase() === (oCity || '').toLowerCase() &&
          l.stops[l.stops.length - 1]?.city?.toLowerCase() === (dCity || '').toLowerCase() &&
          l.status === 'active' &&
          (l.tripType || (l.isRoundTrip ? 'roundtrip' : 'direct')) === tripType
        );

        rows.push({
          line: i + 1,
          oRaw,
          dRaw,
          oCity,
          dCity,
          validO,
          validD,
          metric,
          metricValue,
          price,
          cur,
          from,
          to,
          status,
          scope,
          tripType,
          scopeDirection,
          notes,
          dupe,
        });
      }

      const valid = rows.filter(r => !r.dupe && r.validO && r.validD);
      const dupes = rows.filter(r => r.dupe);
      const invalid = rows.filter(r => !r.validO || !r.validD);
      setPreview({ rows, valid: valid.length, dupes: dupes.length, invalid: invalid.length });
    };
    reader.readAsText(file, 'UTF-8');
  }, [existingLanes]);

  // ─── Do import ───
  const doImport = useCallback(() => {
    if (!preview) return;
    const validRows = preview.rows.filter(r => !r.dupe && r.validO && r.validD);
    onImport(validRows);
    setPreview(null);
  }, [preview, onImport]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-[580px] max-h-[75vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
            {t('priceLists.import.title', 'Import CSV')}
          </h3>
          <button onClick={handleClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!preview ? (
            /* Step 1: Choose */
            <div className="grid grid-cols-2 gap-3">
              <button onClick={downloadTemplate}
                className="flex flex-col items-center gap-2 p-6 rounded-xl cursor-pointer border-none"
                style={{ background: T.bg, border: `1px solid ${T.bd}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.ac; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.bd; }}>
                <Download size={28} style={{ color: T.ac }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{t('priceLists.import.downloadTemplate', 'Download Template')}</span>
                <span style={{ fontSize: 11, color: T.t3, textAlign: 'center' }}>{t('priceLists.import.downloadSub', 'Get the CSV template with sample data')}</span>
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 p-6 rounded-xl cursor-pointer border-none"
                style={{ background: T.bg, border: `1px solid ${T.bd}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.ac; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.bd; }}>
                <Upload size={28} style={{ color: T.ac }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{t('priceLists.import.uploadFile', 'Upload File')}</span>
                <span style={{ fontSize: 11, color: T.t3, textAlign: 'center' }}>{t('priceLists.import.uploadSub', 'CSV, TSV, or TXT file')}</span>
              </button>
            </div>
          ) : (
            /* Step 2: Preview */
            <>
              <div style={{ fontSize: 12, color: T.t2, marginBottom: 8 }}>
                {t('priceLists.import.preview', 'Preview')} — {t('priceLists.import.detected', 'Detected')} {preview.rows.length} {t('priceLists.import.rows', 'rows')}
              </div>
              <div className="flex items-center gap-4 mb-3" style={{ fontSize: 12 }}>
                <span>{t('priceLists.import.validLabel', 'Valid')}: <span style={{ color: '#10B981', fontWeight: 600 }}>{preview.valid}</span></span>
                <span>{t('priceLists.import.duplicates', 'Duplicates')}: <span style={{ color: '#F59E0B', fontWeight: 600 }}>{preview.dupes}</span></span>
                <span>{t('priceLists.import.invalidCity', 'Invalid city')}: <span style={{ color: '#EF4444', fontWeight: 600 }}>{preview.invalid}</span></span>
              </div>
              <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${T.bd}`, maxHeight: 300 }}>
                <table className="w-full" style={{ fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.bg }}>
                      {['#', t('priceLists.modal.origin', 'Origin'), t('priceLists.modal.destination', 'Dest'), t('priceLists.col.metric', 'Metric'), t('priceLists.col.price', 'Price'), t('priceLists.col.status', 'Status')].map((h, i) => (
                        <th key={i} className="text-left px-2 py-1.5" style={{ color: T.t3, fontWeight: 600, borderBottom: `1px solid ${T.bd}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => {
                      const isErr = r.dupe || !r.validO || !r.validD;
                      return (
                        <tr key={i} style={{ background: isErr ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                          <td className="px-2 py-1" style={{ color: T.t3 }}>{r.line}</td>
                          <td className="px-2 py-1" style={{ color: T.t1 }}>{r.oRaw}{!r.validO ? ' ⚠️' : ''}</td>
                          <td className="px-2 py-1" style={{ color: T.t1 }}>{r.dRaw}{!r.validD ? ' ⚠️' : ''}</td>
                          <td className="px-2 py-1" style={{ color: T.t2 }}>
                            <div>{metricLabel(r.metric, t)}</div>
                            <div style={{ fontSize: 10, color: T.t3 }}>{metricValueLabel(r.metric, r.metricValue, t)}</div>
                          </td>
                          <td className="px-2 py-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: T.t1 }}>{r.price} {r.cur}</td>
                          <td className="px-2 py-1">{r.dupe
                            ? <span style={{ color: '#F59E0B' }}>{t('priceLists.import.duplicates', 'Duplicate')}</span>
                            : (!r.validO || !r.validD)
                              ? <span style={{ color: '#EF4444' }}>{t('priceLists.import.invalidCity', 'Invalid city')}</span>
                              : <span style={{ color: '#10B981' }}>OK</span>
                          }</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button onClick={handleClose} className="px-4 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: T.bg, color: T.t2, fontSize: 13, fontWeight: 500 }}>{t('common.cancel', 'Cancel')}</button>
          {preview && preview.valid > 0 && (
            <button onClick={doImport} className="px-4 py-2 rounded-lg cursor-pointer border-none text-white"
              style={{ background: T.ac, fontSize: 13, fontWeight: 600 }}>
              ✅ {t('priceLists.import.importBtn', 'Import')} {preview.valid} {t('priceLists.import.lanes', 'lanes')}
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

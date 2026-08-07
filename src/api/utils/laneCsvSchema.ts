import type { PriceLaneMetric, StorePriceLanePayload } from '../types/priceLists';
import { resolveLanePricingRows, type LaneLike } from './laneMetricDisplay';
import { cityLabel, resolveCity } from '../../mocks/priceListsData';

const isLikelyIsoCode = (s: string) => /^[A-Za-z]{2}$/.test(s);

/** Human-readable stop name for CSV — prefer real city / AB name over ISO codes. */
function formatStopForCsv(
  stop: { city?: string; label?: string; value?: string; location_id?: string | number | null } | string | undefined,
  lang: 'en' | 'el',
): string {
  if (!stop) return '';
  if (typeof stop === 'string') return cityLabel(stop, lang);
  const city = String(stop.city || '').trim();
  const label = String(stop.label || '').trim();
  const value = String(stop.value || '').trim();
  // Prefer city; if label is "Name · City", use the city part when city is ISO/empty
  let raw =
    (city && !isLikelyIsoCode(city) ? city : '') ||
    label ||
    city ||
    value;
  const dotParts = raw.split(/\s*·\s*/);
  if (dotParts.length >= 2) {
    const maybeCity = dotParts[dotParts.length - 1].trim();
    if (maybeCity && !isLikelyIsoCode(maybeCity)) raw = maybeCity;
  }
  return cityLabel(raw, lang);
}

function stopLocationId(
  stop: { location_id?: string | number | null; locationId?: string | number | null } | undefined,
): string {
  if (!stop) return '';
  const id = stop.location_id ?? stop.locationId ?? '';
  return id != null && String(id).trim() !== '' ? String(id) : '';
}

export const CSV_COLUMNS_EN = [
  'Origin City',
  'Destination City',
  'Origin Location ID',
  'Destination Location ID',
  'Trip Type',
  'Metric',
  'Metric Value',
  'Price',
  'Currency',
  'Effective From',
  'Effective To',
  'Status',
  'Scope',
  'Scope Direction',
  'Notes',
] as const;

export const CSV_COLUMNS_EL = [
  'Πόλη Αφετηρίας',
  'Πόλη Προορισμού',
  'ID Τοποθεσίας Αφετηρίας',
  'ID Τοποθεσίας Προορισμού',
  'Τύπος Δρομολογίου',
  'Μετρική',
  'Τιμή Μετρικής',
  'Τιμή',
  'Νόμισμα',
  'Ισχύς Από',
  'Ισχύς Έως',
  'Κατάσταση',
  'Πεδίο',
  'Κατεύθυνση Πεδίου',
  'Σημειώσεις',
] as const;

export const VALID_METRICS: PriceLaneMetric[] = [
  'weight',
  'unit_transport',
  'ftl_truck_type',
  'load_any_size',
];

export const ACCEPTED_VALUES = {
  trip_type: ['direct', 'roundtrip'],
  metric: ['weight', 'unit transport', 'ftl truck type', 'load any size'],
  metric_value: {
    weight: ['kg', 'ton'],
    unit_transport: ['eur pallet', 'us pallet', 'box', 'unit', 'big bag'],
    load_any_size: ['per load'],
    ftl_truck_type: ['vehicle_type slug (any non-empty text)'],
  },
  status: ['active', 'inactive', 'archived'],
  scope: ['Default', 'Specific'],
  scope_direction: ['buy', 'sell', ''],
  currency: ['EUR'],
} as const;

export const CSV_TEMPLATE_SAMPLE_ROWS = {
  en: [
    ['Athens', 'Thessaloniki', '', '', 'direct', 'load any size', 'per load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Patras', 'Heraklion', '', '', 'direct', 'unit transport', 'eur pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Volos', 'Larissa', '', '', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
  ],
  el: [
    ['Αθήνα', 'Θεσσαλονίκη', '', '', 'direct', 'load any size', 'per load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Πάτρα', 'Ηράκλειο', '', '', 'direct', 'unit transport', 'eur pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Βόλος', 'Λάρισα', '', '', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
  ],
};

export type CsvRowError = {
  code: string;
  field: string;
  message: string;
};

export type ParsedCsvRow = {
  line: number;
  oRaw: string;
  dRaw: string;
  oCity: string | null;
  dCity: string | null;
  oLocationId: string;
  dLocationId: string;
  validO: boolean;
  validD: boolean;
  metric: string;
  metricValue: Record<string, unknown>;
  metricValueRaw: string;
  price: number;
  cur: string;
  from: string;
  to: string;
  status: 'active' | 'inactive' | 'archived';
  scope: string;
  scopeApi: 'default' | 'specific';
  tripType: 'direct' | 'roundtrip';
  scopeDirection: 'buy' | 'sell' | null;
  notes: string;
  laneGroupKey: string;
  dupe: boolean;
  errors: CsvRowError[];
  groupError?: boolean;
};

export type CsvParseResult = {
  rows: ParsedCsvRow[];
  valid: number;
  dupes: number;
  invalidCity: number;
  invalidMetric: number;
  groupErrors: number;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function legacyUnitToMetric(unit: string): string {
  const normalized = normalizeText(unit);
  if (normalized.includes('pallet')) return 'unit_transport';
  if (normalized.includes('kg') || normalized.includes('ton')) return 'weight';
  return 'load_any_size';
}

export function parseMetricValue(metric: string, value: string): { metricValue: Record<string, unknown>; error?: CsvRowError } {
  const raw = normalizeText(value).replace(/\s+/g, '_');
  const trimmed = String(value || '').trim();

  if (metric === 'weight') {
    if (raw === 'kg' || raw.includes('kg')) return { metricValue: { unit: 'kg' } };
    if (raw === 'ton' || raw.includes('ton')) return { metricValue: { unit: 'ton' } };
    return {
      metricValue: {},
      error: { code: 'INVALID_METRIC_VALUE', field: 'metric_value', message: 'Weight metric requires kg or ton.' },
    };
  }

  if (metric === 'unit_transport') {
    const types = ['eur_pallet', 'us_pallet', 'box', 'unit', 'big_bag'] as const;
    const match = types.find((type) => raw === type || raw.includes(type.replace('_', ' ')));
    if (match) return { metricValue: { type: match } };
    if (raw.includes('us')) return { metricValue: { type: 'us_pallet' } };
    if (raw.includes('box')) return { metricValue: { type: 'box' } };
    if (raw.includes('unit')) return { metricValue: { type: 'unit' } };
    if (raw.includes('big')) return { metricValue: { type: 'big_bag' } };
    if (raw.includes('eur') || raw.includes('pallet')) return { metricValue: { type: 'eur_pallet' } };
    return {
      metricValue: {},
      error: {
        code: 'INVALID_METRIC_VALUE',
        field: 'metric_value',
        message: 'Unit transport requires: eur pallet, us pallet, box, unit, or big bag.',
      },
    };
  }

  if (metric === 'ftl_truck_type') {
    if (!trimmed) {
      return {
        metricValue: {},
        error: { code: 'INVALID_METRIC_VALUE', field: 'metric_value', message: 'FTL truck type requires a vehicle type slug.' },
      };
    }
    return { metricValue: { vehicle_type: trimmed, truck_type_ids: [] } };
  }

  if (raw === 'per_load' || raw === '' || metric === 'load_any_size') {
    return { metricValue: { type: 'per_load' } };
  }

  return {
    metricValue: {},
    error: { code: 'INVALID_METRIC_VALUE', field: 'metric_value', message: 'Load metric requires per load.' },
  };
}

export function formatMetricForCsv(metric: string): string {
  return String(metric || '').replace(/_/g, ' ');
}

export function metricValueToCsvCell(metric: string, metricValue?: Record<string, unknown>): string {
  let val = '';
  if (metric === 'weight') val = String(metricValue?.unit || 'kg');
  else if (metric === 'unit_transport') val = String(metricValue?.type || 'eur_pallet');
  else if (metric === 'ftl_truck_type') val = String(metricValue?.vehicle_type || '');
  else val = String(metricValue?.type || 'per_load');

  return val.replace(/_/g, ' ');
}

export function scopeToCsvLabel(scope?: string): string {
  if (scope === 'specific') return 'Specific';
  return 'Default';
}

export function scopeFromCsvLabel(scope: string): 'default' | 'specific' {
  return normalizeText(scope) === 'specific' ? 'specific' : 'default';
}

export function buildLaneGroupKey(row: {
  oCity?: string | null;
  oRaw?: string;
  dCity?: string | null;
  dRaw?: string;
  tripType?: string;
  from?: string;
  to?: string;
  status?: string;
  scope?: string;
  scopeDirection?: string | null;
  notes?: string;
}): string {
  return [
    row.oCity || row.oRaw || '',
    row.dCity || row.dRaw || '',
    row.tripType || 'direct',
    row.from || '',
    row.to || '',
    row.status || 'active',
    row.scope || 'Default',
    row.scopeDirection || '',
    row.notes || '',
  ].join('|');
}

function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  if (text.includes('\t')) return '\t';
  if (firstLine.split(';').length > firstLine.split(',').length) return ';';
  return ',';
}

function mapHeaders(hdr: string[]): Record<string, number> {
  const colMap: Record<string, number> = {
    o: -1, d: -1, oLoc: -1, dLoc: -1, trip: -1, metric: -1, metricValue: -1, unit: -1,
    price: -1, cur: -1, from: -1, to: -1, status: -1, scope: -1,
    scopeDirection: -1, notes: -1,
  };

  hdr.forEach((h, i) => {
    const clean = h.replace(/_/g, ' ').trim().toLowerCase();
    if (
      clean.includes('origin location')
      || clean.includes('origin_location')
      || (clean.includes('αφετ') && clean.includes('id'))
    ) {
      colMap.oLoc = i;
      return;
    }
    if (
      clean.includes('destination location')
      || clean.includes('dest location')
      || clean.includes('destination_location')
      || (clean.includes('προορ') && clean.includes('id'))
    ) {
      colMap.dLoc = i;
      return;
    }
    if ((clean.includes('origin') || clean.includes('αφετ')) && colMap.o < 0) colMap.o = i;
    if ((clean.includes('dest') || clean.includes('προορ')) && colMap.d < 0) colMap.d = i;
    if (clean.includes('trip') || clean.includes('δρομολογ')) colMap.trip = i;
    if (clean.includes('metric value') || clean.includes('τιμη μετρικης') || clean.includes('μετρικη τιμη') || clean.includes('τιμή μετρικής')) colMap.metricValue = i;
    else if (clean.includes('metric') || clean.includes('μετρικ')) colMap.metric = i;
    if (clean.includes('unit') || clean.includes('μοναδ') || clean.includes('μονάδ')) colMap.unit = i;
    if ((clean.includes('price') || clean.includes('τιμη') || clean.includes('τιμή')) && !clean.includes('metric')) colMap.price = i;
    if (clean.includes('curr') || clean.includes('νομισ') || clean.includes('νόμισ')) colMap.cur = i;
    if (clean.includes('effective from') || clean.includes('ισχυς απο') || clean.includes('ισχύς από')) colMap.from = i;
    if (clean.includes('effective to') || clean.includes('ισχυς εως') || clean.includes('ισχύς έως')) colMap.to = i;
    if (clean.includes('status') || clean.includes('κατασ') || clean.includes('κατάσ')) colMap.status = i;
    if (clean.includes('scope direction') || clean.includes('κατευθυν') || clean.includes('κατεύθυν')) colMap.scopeDirection = i;
    else if (clean.includes('scope') || clean.includes('πεδιο') || clean.includes('πεδίο')) colMap.scope = i;
    if (clean.includes('note') || clean.includes('σημει') || clean.includes('σημεί')) colMap.notes = i;
  });

  return colMap;
}

function parseStatus(raw: string): 'active' | 'inactive' | 'archived' {
  const normalized = normalizeText(raw);
  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'archived') return 'archived';
  return 'active';
}

function parseScopeDirection(raw: string): 'buy' | 'sell' | null {
  const normalized = normalizeText(raw);
  if (normalized === 'buy') return 'buy';
  if (normalized === 'sell') return 'sell';
  return null;
}

function isDuplicateRoute(
  oCity: string,
  dCity: string,
  tripType: string,
  existingLanes: LaneLike[] | undefined,
): boolean {
  return !!existingLanes?.some((lane) => {
    const origin = lane.stops?.[0]?.city?.toLowerCase() || '';
    const dest = lane.stops?.[lane.stops.length - 1]?.city?.toLowerCase() || '';
    const laneTrip = lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct');
    return origin === oCity.toLowerCase()
      && dest === dCity.toLowerCase()
      && lane.status === 'active'
      && laneTrip === tripType;
  });
}

function applyGroupErrors(rows: ParsedCsvRow[]): void {
  const groups = new Map<string, ParsedCsvRow[]>();

  rows.forEach((row) => {
    if (!groups.has(row.laneGroupKey)) groups.set(row.laneGroupKey, []);
    groups.get(row.laneGroupKey)!.push(row);
  });

  groups.forEach((groupRows) => {
    if (groupRows.length > 4) {
      groupRows.forEach((row) => {
        row.groupError = true;
        row.errors.push({
          code: 'LANE_GROUP_TOO_MANY_METRICS',
          field: 'metric',
          message: 'A lane cannot have more than 4 pricing metrics.',
        });
      });
    }
  });
}

export function parseCsvText(text: string, existingLanes?: LaneLike[]): CsvParseResult | null {
  const sep = detectSeparator(text);
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return null;

  const hdr = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const colMap = mapHeaders(hdr);
  if (colMap.o < 0 || colMap.d < 0 || colMap.price < 0) return null;

  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map((x) => x.replace(/^"|"$/g, '').trim());
    const oRaw = vals[colMap.o] || '';
    const dRaw = vals[colMap.d] || '';
    const price = parseFloat(vals[colMap.price]) || 0;

    if (!oRaw && !dRaw) continue;

    const errors: CsvRowError[] = [];
    // Accept Address Book / free-text cities — not only the Greek CITIES mock list
    const resolvedO = resolveCity(oRaw);
    const resolvedD = resolveCity(dRaw);
    const oCity = resolvedO || (oRaw.trim() ? oRaw.trim() : null);
    const dCity = resolvedD || (dRaw.trim() ? dRaw.trim() : null);
    const oLocationId = colMap.oLoc >= 0 ? String(vals[colMap.oLoc] || '').trim() : '';
    const dLocationId = colMap.dLoc >= 0 ? String(vals[colMap.dLoc] || '').trim() : '';
    // City text is required; Address Book location IDs are optional (round-trip from export).
    const validO = Boolean(oCity);
    const validD = Boolean(dCity);

    if (!validO) {
      errors.push({ code: 'INVALID_ORIGIN_CITY', field: 'origin_city', message: 'Missing origin city.' });
    }
    if (!validD) {
      errors.push({ code: 'INVALID_DESTINATION_CITY', field: 'destination_city', message: 'Missing destination city.' });
    }
    if (!price || price <= 0) {
      errors.push({ code: 'INVALID_PRICE', field: 'price', message: 'Price must be greater than zero.' });
    }

    const rawMetricInput = colMap.metric >= 0
      ? vals[colMap.metric]
      : (colMap.unit >= 0 ? vals[colMap.unit] : '');
    const metricRaw = normalizeText(rawMetricInput).replace(/\s+/g, '_');

    if (!VALID_METRICS.includes(metricRaw as PriceLaneMetric)) {
      errors.push({
        code: 'INVALID_METRIC',
        field: 'metric',
        message: 'Metric must be one of: weight, unit transport, ftl truck type, load any size.',
      });
    }

    const metricValueRaw = colMap.metricValue >= 0
      ? (vals[colMap.metricValue] || '')
      : (colMap.unit >= 0 ? vals[colMap.unit] : 'per_load');

    const { metricValue, error: metricValueError } = parseMetricValue(metricRaw, metricValueRaw);
    if (metricValueError) errors.push(metricValueError);

    const tripType = colMap.trip >= 0 && normalizeText(vals[colMap.trip]) === 'roundtrip' ? 'roundtrip' : 'direct';
    const scopeLabel = colMap.scope >= 0 ? (vals[colMap.scope] || 'Default') : 'Default';
    const scopeApi = scopeFromCsvLabel(scopeLabel);
    const from = colMap.from >= 0 ? (vals[colMap.from] || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    const to = colMap.to >= 0 ? (vals[colMap.to] || '') : '';
    const status = colMap.status >= 0 ? parseStatus(vals[colMap.status] || 'active') : 'active';
    const scopeDirection = colMap.scopeDirection >= 0 ? parseScopeDirection(vals[colMap.scopeDirection] || '') : null;
    const notes = colMap.notes >= 0 ? (vals[colMap.notes] || '') : '';
    const cur = colMap.cur >= 0 ? (vals[colMap.cur] || 'EUR') : 'EUR';

    const laneGroupKey = buildLaneGroupKey({
      oCity, oRaw, dCity, dRaw, tripType, from, to, status, scope: scopeLabel, scopeDirection, notes,
    });

    const dupe = validO && validD
      ? isDuplicateRoute(String(oCity || oRaw), String(dCity || dRaw), tripType, existingLanes)
      : false;

    rows.push({
      line: i + 1,
      oRaw,
      dRaw,
      oCity,
      dCity,
      oLocationId,
      dLocationId,
      validO,
      validD,
      metric: metricRaw,
      metricValue,
      metricValueRaw,
      price,
      cur,
      from,
      to,
      status,
      scope: scopeLabel,
      scopeApi,
      tripType,
      scopeDirection,
      notes,
      laneGroupKey,
      dupe,
      errors,
    });
  }

  applyGroupErrors(rows);

  const isRowValid = (row: ParsedCsvRow) =>
    !row.dupe
    && row.errors.length === 0
    && !row.groupError
    && row.validO
    && row.validD;

  return {
    rows,
    valid: rows.filter(isRowValid).length,
    dupes: rows.filter((r) => r.dupe).length,
    invalidCity: rows.filter((r) => !r.validO || !r.validD).length,
    invalidMetric: rows.filter((r) => r.errors.some((e) => e.code.startsWith('INVALID_METRIC'))).length,
    groupErrors: rows.filter((r) => r.groupError).length,
  };
}

export function buildTemplateCsv(lang: 'en' | 'el' = 'en'): string {
  const hdr = lang === 'el' ? CSV_COLUMNS_EL : CSV_COLUMNS_EN;
  const rows = CSV_TEMPLATE_SAMPLE_ROWS[lang];
  return `\uFEFF${hdr.join(',')}\n${rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n')}`;
}

export function serializeLanesToCsv(lanes: LaneLike[], lang: 'en' | 'el' = 'en'): string {
  const hdr = lang === 'el' ? CSV_COLUMNS_EL : CSV_COLUMNS_EN;
  const rows = lanes.flatMap((lane) => {
    const pricingRows = resolveLanePricingRows(lane);
    const stops = lane.stops || [];
    const origin = formatStopForCsv(stops[0], lang);
    const destination = formatStopForCsv(stops[stops.length - 1], lang);
    const tripType = lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct');

    return pricingRows.map((row) => [
      origin,
      destination,
      stopLocationId(stops[0]),
      stopLocationId(stops[stops.length - 1]),
      tripType,
      formatMetricForCsv(String(row.metric)),
      metricValueToCsvCell(String(row.metric), row.metricValue),
      Number(row.priceEur || 0),
      'EUR',
      lane.effectiveFrom || '',
      lane.effectiveTo || '',
      lane.status || 'active',
      scopeToCsvLabel(lane.scope),
      lane.scopeDirection || '',
      lane.notes || '',
    ]);
  });

  return `\uFEFF${hdr.join(',')}\n${rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n')}`;
}

export function getValidImportRows(rows: ParsedCsvRow[]): ParsedCsvRow[] {
  return rows.filter(
    (row) => !row.dupe && row.errors.length === 0 && !row.groupError && row.validO && row.validD,
  );
}

export function rowsToImportApiPayload(rows: ParsedCsvRow[]) {
  return rows.map((row) => ({
    line: row.line,
    origin_city: row.oCity || row.oRaw,
    destination_city: row.dCity || row.dRaw,
    origin_location_id: row.oLocationId || null,
    destination_location_id: row.dLocationId || null,
    trip_type: row.tripType,
    metric: row.metric,
    metric_value: row.metricValueRaw || metricValueToCsvCell(row.metric, row.metricValue),
    price: row.price,
    currency: row.cur,
    effective_from: row.from,
    effective_to: row.to || null,
    status: row.status,
    scope: row.scope,
    scope_direction: row.scopeDirection,
    notes: row.notes,
  }));
}

export function groupRowsIntoLanePayloads(rows: ParsedCsvRow[]): StorePriceLanePayload[] {
  const validRows = getValidImportRows(rows);
  const grouped = new Map<string, ParsedCsvRow[]>();

  validRows.forEach((row) => {
    if (!grouped.has(row.laneGroupKey)) grouped.set(row.laneGroupKey, []);
    grouped.get(row.laneGroupKey)!.push(row);
  });

  return Array.from(grouped.values()).map((groupRows) => {
    const first = groupRows[0];
    const oCity = first.oCity || first.oRaw;
    const dCity = first.dCity || first.dRaw;
    return {
      origin_city: oCity,
      destination_city: dCity,
      stops: [
        {
          city: oCity,
          label: first.oRaw || oCity,
          type: 'city',
          value: oCity,
          location_id: first.oLocationId || null,
        },
        {
          city: dCity,
          label: first.dRaw || dCity,
          type: 'city',
          value: dCity,
          location_id: first.dLocationId || null,
        },
      ],
      trip_type: first.tripType,
      pricing_rows: groupRows.map((row) => ({
        metric: row.metric as PriceLaneMetric,
        price_eur: row.price,
        metric_value: row.metricValue,
      })),
      effective_from: first.from,
      effective_to: first.to || null,
      scope: first.scopeApi,
      scope_partner_ids: [],
      scope_direction: first.scopeDirection,
      notes: first.notes,
      status: first.status,
    };
  });
}

export function isRowImportable(row: ParsedCsvRow): boolean {
  return !row.dupe && row.errors.length === 0 && !row.groupError && row.validO && row.validD;
}

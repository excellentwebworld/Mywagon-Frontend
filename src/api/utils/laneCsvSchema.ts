import type { PriceLaneMetric, StorePriceLanePayload } from '../types/priceLists';
import { resolveLanePricingRows, type LaneLike } from './laneMetricDisplay';
import { resolveCity } from '../../mocks/priceListsData';

export const CSV_COLUMNS_EN = [
  'origin_city',
  'destination_city',
  'trip_type',
  'metric',
  'metric_value',
  'price',
  'currency',
  'effective_from',
  'effective_to',
  'status',
  'scope',
  'scope_direction',
  'notes',
] as const;

export const CSV_COLUMNS_EL = [
  'πόλη_αφετηρίας',
  'πόλη_προορισμού',
  'τύπος_δρομολογίου',
  'μετρική',
  'τιμή_μετρικής',
  'τιμή',
  'νόμισμα',
  'ισχύς_από',
  'ισχύς_έως',
  'κατάσταση',
  'πεδίο',
  'κατεύθυνση_πεδίου',
  'σημειώσεις',
] as const;

export const VALID_METRICS: PriceLaneMetric[] = [
  'weight',
  'unit_transport',
  'ftl_truck_type',
  'load_any_size',
];

export const ACCEPTED_VALUES = {
  trip_type: ['direct', 'roundtrip'],
  metric: VALID_METRICS,
  metric_value: {
    weight: ['kg', 'ton'],
    unit_transport: ['eur_pallet', 'us_pallet', 'box', 'unit', 'big_bag'],
    load_any_size: ['per_load'],
    ftl_truck_type: ['vehicle_type slug (any non-empty text)'],
  },
  status: ['active', 'inactive', 'archived'],
  scope: ['Default', 'Specific'],
  scope_direction: ['buy', 'sell', ''],
  currency: ['EUR'],
} as const;

export const CSV_TEMPLATE_SAMPLE_ROWS = {
  en: [
    ['Athens', 'Thessaloniki', 'direct', 'load_any_size', 'per_load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Patras', 'Heraklion', 'direct', 'unit_transport', 'eur_pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Volos', 'Larissa', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
  ],
  el: [
    ['Αθήνα', 'Θεσσαλονίκη', 'direct', 'load_any_size', 'per_load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Πάτρα', 'Ηράκλειο', 'direct', 'unit_transport', 'eur_pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Βόλος', 'Λάρισα', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
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
  const raw = normalizeText(value);
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
        message: 'Unit transport requires: eur_pallet, us_pallet, box, unit, or big_bag.',
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
    error: { code: 'INVALID_METRIC_VALUE', field: 'metric_value', message: 'Load metric requires per_load.' },
  };
}

export function metricValueToCsvCell(metric: string, metricValue?: Record<string, unknown>): string {
  if (metric === 'weight') return String(metricValue?.unit || 'kg');
  if (metric === 'unit_transport') return String(metricValue?.type || 'eur_pallet');
  if (metric === 'ftl_truck_type') return String(metricValue?.vehicle_type || '');
  return String(metricValue?.type || 'per_load');
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
    o: -1, d: -1, trip: -1, metric: -1, metricValue: -1, unit: -1,
    price: -1, cur: -1, from: -1, to: -1, status: -1, scope: -1,
    scopeDirection: -1, notes: -1,
  };

  hdr.forEach((h, i) => {
    if (h.includes('origin') || h.includes('αφετ')) colMap.o = i;
    if (h.includes('dest') || h.includes('προορ')) colMap.d = i;
    if (h.includes('trip') || h.includes('δρομολογ')) colMap.trip = i;
    if (h.includes('metric_value') || h.includes('τιμή_μετρικής') || h.includes('μετρική_τιμή')) colMap.metricValue = i;
    else if (h.includes('metric') || h.includes('μετρικ')) colMap.metric = i;
    if (h.includes('unit') || h.includes('μονάδ')) colMap.unit = i;
    if (h.includes('price') || h === 'τιμή' || h.includes('τιμη')) colMap.price = i;
    if (h.includes('curr') || h.includes('νόμισ') || h.includes('νομισ')) colMap.cur = i;
    if (h.includes('effective_from') || h.includes('ισχύς_από') || h.includes('από') || h.includes('απο')) colMap.from = i;
    if (h.includes('effective_to') || h.includes('ισχύς_έως') || h.includes('έως') || h.includes('εως')) colMap.to = i;
    if (h.includes('status') || h.includes('κατάσ') || h.includes('κατασ')) colMap.status = i;
    if (h.includes('scope_direction') || h.includes('κατεύθυν')) colMap.scopeDirection = i;
    else if (h.includes('scope') || h.includes('πεδίο') || h.includes('πεδιο')) colMap.scope = i;
    if (h.includes('note') || h.includes('σημεί')) colMap.notes = i;
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

    const metrics = new Map<string, ParsedCsvRow[]>();
    groupRows.forEach((row) => {
      if (!metrics.has(row.metric)) metrics.set(row.metric, []);
      metrics.get(row.metric)!.push(row);
    });

    metrics.forEach((metricRows) => {
      if (metricRows.length > 1) {
        metricRows.forEach((row) => {
          row.groupError = true;
          row.errors.push({
            code: 'DUPLICATE_METRIC_IN_LANE',
            field: 'metric',
            message: 'Duplicate metric in the same lane group.',
          });
        });
      }
    });
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
    const oCity = resolveCity(oRaw);
    const dCity = resolveCity(dRaw);
    const validO = !!oCity;
    const validD = !!dCity;

    if (!oRaw || !validO) {
      errors.push({ code: 'INVALID_ORIGIN_CITY', field: 'origin_city', message: 'Unknown or missing origin city.' });
    }
    if (!dRaw || !validD) {
      errors.push({ code: 'INVALID_DESTINATION_CITY', field: 'destination_city', message: 'Unknown or missing destination city.' });
    }
    if (!price || price <= 0) {
      errors.push({ code: 'INVALID_PRICE', field: 'price', message: 'Price must be greater than zero.' });
    }

    const metricRaw = colMap.metric >= 0
      ? normalizeText(vals[colMap.metric])
      : legacyUnitToMetric(colMap.unit >= 0 ? vals[colMap.unit] : '');

    if (!VALID_METRICS.includes(metricRaw as PriceLaneMetric)) {
      errors.push({
        code: 'INVALID_METRIC',
        field: 'metric',
        message: 'Metric must be one of: weight, unit_transport, ftl_truck_type, load_any_size.',
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
      ? isDuplicateRoute(oCity!, dCity!, tripType, existingLanes)
      : false;

    rows.push({
      line: i + 1,
      oRaw,
      dRaw,
      oCity,
      dCity,
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
    const origin = lane.stops?.[0]?.city || lane.stops?.[0]?.value || '';
    const destination = lane.stops?.[lane.stops.length - 1]?.city || lane.stops?.[lane.stops.length - 1]?.value || '';
    const tripType = lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct');

    return pricingRows.map((row) => [
      origin,
      destination,
      tripType,
      row.metric,
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
    return {
      origin_city: first.oCity || first.oRaw,
      destination_city: first.dCity || first.dRaw,
      stops: [
        { city: first.oCity || first.oRaw, label: first.oRaw || first.oCity || '', type: 'city', value: first.oCity || first.oRaw },
        { city: first.dCity || first.dRaw, label: first.dRaw || first.dCity || '', type: 'city', value: first.dCity || first.dRaw },
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

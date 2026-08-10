import type { PriceLaneMetric, StorePriceLanePayload } from '../types/priceLists';
import { resolveLanePricingRows, type LaneLike } from './laneMetricDisplay';
import { cityLabel, resolveCity } from '../../mocks/priceListsData';

const isLikelyIsoCode = (s: string) => /^[A-Za-z]{2}$/.test(s);

/** Google Places stop shape used for CSV import/export. */
export type CsvLaneStopFields = {
  label?: string;
  city?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  place_id?: string | null;
};

/** Display label for CSV Origin/Destination columns. */
function formatStopLabelForCsv(
  stop: {
    city?: string;
    label?: string;
    value?: string;
    location_id?: string | number | null;
  } | string | undefined,
  lang: 'en' | 'el',
): string {
  if (!stop) return '';
  if (typeof stop === 'string') return cityLabel(stop, lang);
  const label = String(stop.label || '').trim();
  if (label) return label;
  const city = String(stop.city || '').trim();
  const value = String(stop.value || '').trim();
  const raw = (city && !isLikelyIsoCode(city) ? city : '') || value || city;
  return cityLabel(raw, lang);
}

/** Denormalized city cell for CSV. */
function formatStopCityForCsv(
  stop: { city?: string; label?: string; value?: string } | string | undefined,
  lang: 'en' | 'el',
): string {
  if (!stop) return '';
  if (typeof stop === 'string') return cityLabel(stop, lang);
  const city = String(stop.city || '').trim();
  if (city && !isLikelyIsoCode(city)) return cityLabel(city, lang);
  const label = String(stop.label || '').trim();
  const dotParts = label.split(/\s*·\s*/);
  if (dotParts.length >= 2) {
    const maybeCity = dotParts[dotParts.length - 1].trim();
    if (maybeCity && !isLikelyIsoCode(maybeCity)) return cityLabel(maybeCity, lang);
  }
  const value = String(stop.value || '').trim();
  return cityLabel(city || value || '', lang);
}

function stopLatLng(
  stop: { lat?: number | null; lng?: number | null } | undefined,
): { lat: string; lng: string } {
  if (!stop) return { lat: '', lng: '' };
  const lat = stop.lat;
  const lng = stop.lng;
  return {
    lat: lat != null && Number.isFinite(Number(lat)) ? String(lat) : '',
    lng: lng != null && Number.isFinite(Number(lng)) ? String(lng) : '',
  };
}

/** Google Places–first column order (no Address Book IDs). */
export const CSV_COLUMNS_EN = [
  'Origin',
  'Origin City',
  'Origin Address',
  'Origin Lat',
  'Origin Lng',
  'Destination',
  'Destination City',
  'Destination Address',
  'Destination Lat',
  'Destination Lng',
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
  'Αφετηρία',
  'Πόλη Αφετηρίας',
  'Διεύθυνση Αφετηρίας',
  'Γ.Πλ. Αφετηρίας',
  'Μ.Πλ. Αφετηρίας',
  'Προορισμός',
  'Πόλη Προορισμού',
  'Διεύθυνση Προορισμού',
  'Γ.Πλ. Προορισμού',
  'Μ.Πλ. Προορισμού',
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
    ['Patras Port · Patras', 'Patras', 'Patras Port, Patras, Greece', '38.2466', '21.7346', 'Empire Business Hub · Patras', 'Patras', 'Empire Business Hub, Patras, Greece', '38.2500', '21.7350', 'direct', 'load any size', 'per load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Warehouse Patras · Patras', 'Patras', 'Warehouse Patras, Patras, Greece', '38.2466', '21.7346', 'Port Heraklion · Heraklion', 'Heraklion', 'Port Heraklion, Heraklion, Greece', '35.3387', '25.1442', 'direct', 'unit transport', 'eur pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Volos Depot · Volos', 'Volos', 'Volos Depot, Volos, Greece', '39.3666', '22.9507', 'Larissa Hub · Larissa', 'Larissa', 'Larissa Hub, Larissa, Greece', '39.6390', '22.4191', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
  ],
  el: [
    ['Αποθήκη Αθήνα · Αθήνα', 'Αθήνα', 'Αθήνα, Ελλάδα', '37.9838', '23.7275', 'Κέντρο Θεσσαλονίκη · Θεσσαλονίκη', 'Θεσσαλονίκη', 'Θεσσαλονίκη, Ελλάδα', '40.6401', '22.9444', 'direct', 'load any size', 'per load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Αποθήκη Πάτρα · Πάτρα', 'Πάτρα', 'Πάτρα, Ελλάδα', '38.2466', '21.7346', 'Λιμάνι Ηράκλειο · Ηράκλειο', 'Ηράκλειο', 'Ηράκλειο, Ελλάδα', '35.3387', '25.1442', 'direct', 'unit transport', 'eur pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Βόλος Depot · Βόλος', 'Βόλος', 'Βόλος, Ελλάδα', '39.3666', '22.9507', 'Λάρισα Hub · Λάρισα', 'Λάρισα', 'Λάρισα, Ελλάδα', '39.6390', '22.4191', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
  ],
};

export type CsvRowError = {
  code: string;
  field: string;
  message: string;
};

export type StopMatchStatus = 'coords' | 'city_only' | 'missing';

export type ParsedCsvRow = {
  line: number;
  oRaw: string;
  dRaw: string;
  oCity: string | null;
  dCity: string | null;
  oAddress: string;
  dAddress: string;
  oLat: number | null;
  oLng: number | null;
  dLat: number | null;
  dLng: number | null;
  oMatch: StopMatchStatus;
  dMatch: StopMatchStatus;
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

export type ParseCsvOptions = {
  existingLanes?: LaneLike[];
};

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function cityFromLabel(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  const parts = text.split(/\s*·\s*/);
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  return text;
}

function parseCoordinate(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function resolveStopFromCsv(args: {
  raw: string;
  cityCol: string;
  addressCol: string;
  latCol: string;
  lngCol: string;
}): {
  label: string;
  city: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  match: StopMatchStatus;
  valid: boolean;
  warning?: CsvRowError;
} {
  const { raw, cityCol, addressCol, latCol, lngCol } = args;
  const label = raw.trim();
  let cityHint = cityCol.trim() || cityFromLabel(label);
  const resolvedMock = resolveCity(cityHint) || resolveCity(label);
  if (resolvedMock) cityHint = resolvedMock;

  const address = addressCol.trim();
  const lat = parseCoordinate(latCol);
  const lng = parseCoordinate(lngCol);
  const city = (cityHint || label).trim() || null;
  const hasCoords = lat != null && lng != null;
  const valid = Boolean(city) && hasCoords;

  if (!city) {
    return {
      label: label || '',
      city: null,
      address,
      lat,
      lng,
      match: 'missing',
      valid: false,
    };
  }

  if (!hasCoords) {
    return {
      label: label || city,
      city,
      address,
      lat,
      lng,
      match: 'city_only',
      valid: false,
      warning: {
        code: 'INVALID_COORDS',
        field: 'lat',
        message: 'Latitude and longitude are required for each stop.',
      },
    };
  }

  return {
    label: label || city,
    city,
    address,
    lat,
    lng,
    match: 'coords',
    valid: true,
  };
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
  oLat?: number | null;
  oLng?: number | null;
  dLat?: number | null;
  dLng?: number | null;
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
  const originKey = row.oLat != null && row.oLng != null
    ? `${row.oLat},${row.oLng}`
    : (row.oCity || row.oRaw || '');
  const destKey = row.dLat != null && row.dLng != null
    ? `${row.dLat},${row.dLng}`
    : (row.dCity || row.dRaw || '');
  return [
    originKey,
    destKey,
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

/**
 * Map headers for Google Places sheet + legacy AB/city-first sheets.
 */
function mapHeaders(hdr: string[]): Record<string, number> {
  const colMap: Record<string, number> = {
    o: -1, d: -1, oCity: -1, dCity: -1, oAddress: -1, dAddress: -1,
    oLat: -1, oLng: -1, dLat: -1, dLng: -1,
    trip: -1, metric: -1, metricValue: -1, unit: -1,
    price: -1, cur: -1, from: -1, to: -1, status: -1, scope: -1,
    scopeDirection: -1, notes: -1,
  };

  hdr.forEach((h, i) => {
    const clean = h.replace(/_/g, ' ').trim().toLowerCase();

    if (
      clean === 'origin city'
      || clean === 'origin_city'
      || clean === 'πόλη αφετηρίας'
      || (clean.includes('origin') && clean.includes('city'))
      || (clean.includes('πόλη') && clean.includes('αφετ'))
    ) {
      colMap.oCity = i;
      return;
    }
    if (
      clean === 'destination city'
      || clean === 'destination_city'
      || clean === 'πόλη προορισμού'
      || (clean.includes('dest') && clean.includes('city'))
      || (clean.includes('πόλη') && clean.includes('προορ'))
    ) {
      colMap.dCity = i;
      return;
    }

    if (
      clean === 'origin address'
      || clean === 'origin_address'
      || (clean.includes('origin') && clean.includes('address'))
      || (clean.includes('διεύθ') && clean.includes('αφετ'))
      || (clean.includes('διευθ') && clean.includes('αφετ'))
    ) {
      colMap.oAddress = i;
      return;
    }
    if (
      clean === 'destination address'
      || clean === 'destination_address'
      || (clean.includes('dest') && clean.includes('address'))
      || (clean.includes('διεύθ') && clean.includes('προορ'))
      || (clean.includes('διευθ') && clean.includes('προορ'))
    ) {
      colMap.dAddress = i;
      return;
    }

    if (
      clean === 'origin lat'
      || clean === 'origin_lat'
      || clean === 'origin latitude'
      || (clean.includes('origin') && clean.includes('lat'))
      || (clean.includes('γ.πλ') && clean.includes('αφετ'))
    ) {
      colMap.oLat = i;
      return;
    }
    if (
      clean === 'origin lng'
      || clean === 'origin_lng'
      || clean === 'origin longitude'
      || (clean.includes('origin') && (clean.includes('lng') || clean.includes('lon')))
      || (clean.includes('μ.πλ') && clean.includes('αφετ'))
    ) {
      colMap.oLng = i;
      return;
    }
    if (
      clean === 'destination lat'
      || clean === 'destination_lat'
      || clean === 'destination latitude'
      || (clean.includes('dest') && clean.includes('lat'))
      || (clean.includes('γ.πλ') && clean.includes('προορ'))
    ) {
      colMap.dLat = i;
      return;
    }
    if (
      clean === 'destination lng'
      || clean === 'destination_lng'
      || clean === 'destination longitude'
      || (clean.includes('dest') && (clean.includes('lng') || clean.includes('lon')))
      || (clean.includes('μ.πλ') && clean.includes('προορ'))
    ) {
      colMap.dLng = i;
      return;
    }

    if (
      clean === 'origin'
      || clean === 'αφετηρία'
      || clean === 'αφετηρια'
    ) {
      colMap.o = i;
      return;
    }
    if (
      clean === 'destination'
      || clean === 'dest'
      || clean === 'προορισμός'
      || clean === 'προορισμος'
    ) {
      colMap.d = i;
      return;
    }

    if ((clean.includes('origin') || clean.includes('αφετ')) && colMap.o < 0 && colMap.oCity < 0) {
      colMap.o = i;
      return;
    }
    if ((clean.includes('dest') || clean.includes('προορ')) && colMap.d < 0 && colMap.dCity < 0) {
      colMap.d = i;
      return;
    }

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

  if (colMap.o < 0 && colMap.oCity >= 0) colMap.o = colMap.oCity;
  if (colMap.d < 0 && colMap.dCity >= 0) colMap.d = colMap.dCity;

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

function stopCoords(
  stop: { lat?: number | null; lng?: number | null; place_id?: string | null; city?: string; value?: string; label?: string } | undefined,
): { lat: number | null; lng: number | null } {
  if (!stop) return { lat: null, lng: null };
  const lat = parseCoordinate(stop.lat);
  const lng = parseCoordinate(stop.lng);
  return { lat, lng };
}

function stopsMatchEndpoint(
  a: { lat?: number | null; lng?: number | null; place_id?: string | null; city?: string; value?: string; label?: string } | undefined,
  b: { lat?: number | null; lng?: number | null; place_id?: string | null; city?: string; value?: string; label?: string } | undefined,
): boolean {
  if (!a || !b) return false;

  const aPlaceId = a.place_id ?? null;
  const bPlaceId = b.place_id ?? null;
  if (aPlaceId && bPlaceId && String(aPlaceId) === String(bPlaceId)) return true;

  const aCity = normalizeText(a.city || a.value || a.label || '');
  const bCity = normalizeText(b.city || b.value || b.label || '');
  const { lat: aLat, lng: aLng } = stopCoords(a);
  const { lat: bLat, lng: bLng } = stopCoords(b);

  if (aLat != null && aLng != null && bLat != null && bLng != null) {
    const threshold = 0.001;
    if (aCity && bCity && aCity === bCity
      && Math.abs(aLat - bLat) <= threshold
      && Math.abs(aLng - bLng) <= threshold) {
      return true;
    }
  }

  return Boolean(aCity && bCity && aCity === bCity);
}

function isDuplicateRoute(
  oLat: number | null,
  oLng: number | null,
  dLat: number | null,
  dLng: number | null,
  oCity: string,
  dCity: string,
  tripType: string,
  existingLanes: LaneLike[] | undefined,
): boolean {
  return !!existingLanes?.some((lane) => {
    if (lane.status !== 'active') return false;
    const laneTrip = lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct');
    if (laneTrip !== tripType) return false;

    const stops = lane.stops || [];
    const lFirst = stops[0];
    const lLast = stops[stops.length - 1];

    return stopsMatchEndpoint(
      { lat: oLat, lng: oLng, city: oCity },
      lFirst,
    ) && stopsMatchEndpoint(
      { lat: dLat, lng: dLng, city: dCity },
      lLast,
    );
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

export function parseCsvText(
  text: string,
  existingLanesOrOptions?: LaneLike[] | ParseCsvOptions,
): CsvParseResult | null {
  const options: ParseCsvOptions = Array.isArray(existingLanesOrOptions)
    ? { existingLanes: existingLanesOrOptions }
    : (existingLanesOrOptions || {});
  const { existingLanes } = options;

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
    const oCityCol = colMap.oCity >= 0 ? String(vals[colMap.oCity] || '') : '';
    const dCityCol = colMap.dCity >= 0 ? String(vals[colMap.dCity] || '') : '';
    // When legacy maps o === oCity, don't double-read city from same cell as empty city hint override
    const oCityHint = colMap.oCity >= 0 && colMap.oCity !== colMap.o ? oCityCol : (colMap.oCity === colMap.o ? '' : oCityCol);
    const dCityHint = colMap.dCity >= 0 && colMap.dCity !== colMap.d ? dCityCol : (colMap.dCity === colMap.d ? '' : dCityCol);

    const oResolved = resolveStopFromCsv({
      raw: oRaw,
      cityCol: oCityHint || oCityCol,
      addressCol: colMap.oAddress >= 0 ? String(vals[colMap.oAddress] || '') : '',
      latCol: colMap.oLat >= 0 ? String(vals[colMap.oLat] || '') : '',
      lngCol: colMap.oLng >= 0 ? String(vals[colMap.oLng] || '') : '',
    });
    const dResolved = resolveStopFromCsv({
      raw: dRaw,
      cityCol: dCityHint || dCityCol,
      addressCol: colMap.dAddress >= 0 ? String(vals[colMap.dAddress] || '') : '',
      latCol: colMap.dLat >= 0 ? String(vals[colMap.dLat] || '') : '',
      lngCol: colMap.dLng >= 0 ? String(vals[colMap.dLng] || '') : '',
    });

    if (!oResolved.valid) {
      errors.push({ code: 'INVALID_ORIGIN_CITY', field: 'origin_city', message: 'Missing origin city or coordinates.' });
    }
    if (!dResolved.valid) {
      errors.push({ code: 'INVALID_DESTINATION_CITY', field: 'destination_city', message: 'Missing destination city or coordinates.' });
    }
    if (oResolved.warning) errors.push(oResolved.warning);
    if (dResolved.warning) errors.push(dResolved.warning);

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

    const oCity = oResolved.city;
    const dCity = dResolved.city;
    const validO = oResolved.valid;
    const validD = dResolved.valid;

    const laneGroupKey = buildLaneGroupKey({
      oLat: oResolved.lat,
      oLng: oResolved.lng,
      dLat: dResolved.lat,
      dLng: dResolved.lng,
      oCity,
      oRaw: oResolved.label,
      dCity,
      dRaw: dResolved.label,
      tripType,
      from,
      to,
      status,
      scope: scopeLabel,
      scopeDirection,
      notes,
    });

    const dupe = validO && validD
      ? isDuplicateRoute(
        oResolved.lat,
        oResolved.lng,
        dResolved.lat,
        dResolved.lng,
        String(oCity || oResolved.label),
        String(dCity || dResolved.label),
        tripType,
        existingLanes,
      )
      : false;

    rows.push({
      line: i + 1,
      oRaw: oResolved.label || oRaw,
      dRaw: dResolved.label || dRaw,
      oCity,
      dCity,
      oAddress: oResolved.address,
      dAddress: dResolved.address,
      oLat: oResolved.lat,
      oLng: oResolved.lng,
      dLat: dResolved.lat,
      dLng: dResolved.lng,
      oMatch: oResolved.match,
      dMatch: dResolved.match,
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
    const origin = formatStopLabelForCsv(stops[0], lang);
    const destination = formatStopLabelForCsv(stops[stops.length - 1], lang);
    const originCity = formatStopCityForCsv(stops[0], lang);
    const destinationCity = formatStopCityForCsv(stops[stops.length - 1], lang);
    const oCoords = stopLatLng(stops[0]);
    const dCoords = stopLatLng(stops[stops.length - 1]);
    const tripType = lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct');

    return pricingRows.map((row) => [
      origin,
      originCity,
      String(stops[0]?.address || ''),
      oCoords.lat,
      oCoords.lng,
      destination,
      destinationCity,
      String(stops[stops.length - 1]?.address || ''),
      dCoords.lat,
      dCoords.lng,
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
    origin_city: row.oCity || cityFromLabel(row.oRaw) || row.oRaw,
    destination_city: row.dCity || cityFromLabel(row.dRaw) || row.dRaw,
    origin_label: row.oRaw || null,
    destination_label: row.dRaw || null,
    origin_address: row.oAddress || null,
    destination_address: row.dAddress || null,
    origin_lat: row.oLat,
    origin_lng: row.oLng,
    destination_lat: row.dLat,
    destination_lng: row.dLng,
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
    const oCity = first.oCity || cityFromLabel(first.oRaw) || first.oRaw;
    const dCity = first.dCity || cityFromLabel(first.dRaw) || first.dRaw;
    return {
      origin_city: oCity,
      destination_city: dCity,
      stops: [
        {
          city: oCity,
          label: first.oRaw || oCity,
          type: 'place',
          value: oCity,
          address: first.oAddress || undefined,
          lat: first.oLat ?? undefined,
          lng: first.oLng ?? undefined,
        },
        {
          city: dCity,
          label: first.dRaw || dCity,
          type: 'place',
          value: dCity,
          address: first.dAddress || undefined,
          lat: first.dLat ?? undefined,
          lng: first.dLng ?? undefined,
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

export function matchStatusLabel(status: StopMatchStatus, t: (key: string, fallback: string) => string): string {
  switch (status) {
    case 'coords':
      return t('priceLists.import.match.coords', 'Coords');
    case 'city_only':
      return t('priceLists.import.match.cityOnly', 'City only');
    default:
      return t('priceLists.import.match.missing', 'Missing');
  }
}

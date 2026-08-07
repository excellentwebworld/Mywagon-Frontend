import type { PriceLaneMetric, StorePriceLanePayload } from '../types/priceLists';
import { resolveLanePricingRows, type LaneLike } from './laneMetricDisplay';
import { cityLabel, resolveCity } from '../../mocks/priceListsData';

const isLikelyIsoCode = (s: string) => /^[A-Za-z]{2}$/.test(s);

/** Address Book location shape used for CSV resolve (subset of AppContext LocationItem). */
export type CsvAddressBookLocation = {
  id: string | number;
  name?: string;
  city?: string;
  status?: string;
};

/** AB display label for CSV Origin/Destination columns. */
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

function stopLocationId(
  stop: { location_id?: string | number | null; locationId?: string | number | null } | undefined,
): string {
  if (!stop) return '';
  const id = stop.location_id ?? stop.locationId ?? '';
  return id != null && String(id).trim() !== '' ? String(id) : '';
}

/** New Address Book–first column order. */
export const CSV_COLUMNS_EN = [
  'Origin',
  'Origin Location ID',
  'Destination',
  'Destination Location ID',
  'Origin City',
  'Destination City',
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
  'ID Τοποθεσίας Αφετηρίας',
  'Προορισμός',
  'ID Τοποθεσίας Προορισμού',
  'Πόλη Αφετηρίας',
  'Πόλη Προορισμού',
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
    ['9834 fruit truck · Ahmedabad', '', 'Empire Business Hub · Ahmedabad', '', 'Ahmedabad', 'Ahmedabad', 'direct', 'load any size', 'per load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Warehouse Patras · Patras', '', 'Port Heraklion · Heraklion', '', 'Patras', 'Heraklion', 'direct', 'unit transport', 'eur pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Volos Depot · Volos', '', 'Larissa Hub · Larissa', '', 'Volos', 'Larissa', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
  ],
  el: [
    ['Αποθήκη Αθήνα · Αθήνα', '', 'Κέντρο Θεσσαλονίκη · Θεσσαλονίκη', '', 'Αθήνα', 'Θεσσαλονίκη', 'direct', 'load any size', 'per load', '450', 'EUR', '2026-03-01', '2026-12-31', 'active', 'Default', '', ''],
    ['Αποθήκη Πάτρα · Πάτρα', '', 'Λιμάνι Ηράκλειο · Ηράκλειο', '', 'Πάτρα', 'Ηράκλειο', 'direct', 'unit transport', 'eur pallet', '42', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
    ['Βόλος Depot · Βόλος', '', 'Λάρισα Hub · Λάρισα', '', 'Βόλος', 'Λάρισα', 'roundtrip', 'weight', 'kg', '180', 'EUR', '2026-03-01', '', 'active', 'Default', '', ''],
  ],
};

export type CsvRowError = {
  code: string;
  field: string;
  message: string;
};

export type LocationMatchStatus = 'id' | 'matched' | 'city_only' | 'unknown_id' | 'missing';

export type ParsedCsvRow = {
  line: number;
  oRaw: string;
  dRaw: string;
  oCity: string | null;
  dCity: string | null;
  oLocationId: string;
  dLocationId: string;
  oMatch: LocationMatchStatus;
  dMatch: LocationMatchStatus;
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
  locations?: CsvAddressBookLocation[];
};

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function locationDisplayLabel(loc: CsvAddressBookLocation): string {
  const name = String(loc.name || '').trim();
  const city = String(loc.city || '').trim();
  if (name && city && name.toLowerCase() !== city.toLowerCase()) return `${name} · ${city}`;
  return name || city || String(loc.id);
}

function cityFromLabel(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  const parts = text.split(/\s*·\s*/);
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  return text;
}

function findLocationById(
  locations: CsvAddressBookLocation[] | undefined,
  id: string,
): CsvAddressBookLocation | null {
  if (!id || !locations?.length) return null;
  return locations.find((l) => String(l.id) === String(id)) || null;
}

/**
 * Resolve Address Book location from label/city text.
 * Only auto-matches when the candidate is unique among active locations.
 */
function resolveLocationFromText(
  locations: CsvAddressBookLocation[] | undefined,
  raw: string,
  cityHint?: string,
): CsvAddressBookLocation | null {
  if (!locations?.length) return null;
  const active = locations.filter((l) => !l.status || l.status === 'active');
  const pool = active.length > 0 ? active : locations;
  const needle = normalizeText(raw);
  const cityNeedle = normalizeText(cityHint || cityFromLabel(raw));
  if (!needle && !cityNeedle) return null;

  const byLabel = pool.filter((l) => normalizeText(locationDisplayLabel(l)) === needle);
  if (byLabel.length === 1) return byLabel[0];

  const byName = pool.filter((l) => normalizeText(l.name) === needle);
  if (byName.length === 1) return byName[0];

  if (cityNeedle) {
    const byCity = pool.filter((l) => normalizeText(l.city) === cityNeedle);
    if (byCity.length === 1) return byCity[0];
  }

  return null;
}

function resolveStopIdentity(args: {
  raw: string;
  cityCol: string;
  locationIdCol: string;
  locations?: CsvAddressBookLocation[];
}): {
  label: string;
  city: string | null;
  locationId: string;
  match: LocationMatchStatus;
  valid: boolean;
  warning?: CsvRowError;
} {
  const { raw, cityCol, locationIdCol, locations } = args;
  const label = raw.trim();
  let cityHint = cityCol.trim() || cityFromLabel(label);
  const resolvedMock = resolveCity(cityHint) || resolveCity(label);
  if (resolvedMock) cityHint = resolvedMock;

  if (locationIdCol) {
    const byId = findLocationById(locations, locationIdCol);
    if (byId) {
      const city = String(byId.city || cityHint || '').trim() || null;
      return {
        label: label || locationDisplayLabel(byId),
        city,
        locationId: String(byId.id),
        match: 'id',
        valid: true,
      };
    }
    // Keep explicit ID even if not in local AB cache; city/label still required for DB
    const city = cityHint.trim() || null;
    const valid = Boolean(label || city);
    return {
      label: label || city || locationIdCol,
      city,
      locationId: locationIdCol,
      match: 'unknown_id',
      valid,
      warning: valid
        ? {
          code: 'UNKNOWN_LOCATION_ID',
          field: 'location_id',
          message: 'Location ID not found in Address Book; imported as provided.',
        }
        : {
          code: 'INVALID_ORIGIN_CITY',
          field: 'origin_city',
          message: 'Missing origin/destination when Location ID is unknown.',
        },
    };
  }

  const matched = resolveLocationFromText(locations, label, cityHint);
  if (matched) {
    return {
      label: label || locationDisplayLabel(matched),
      city: String(matched.city || cityHint || '').trim() || null,
      locationId: String(matched.id),
      match: 'matched',
      valid: true,
    };
  }

  const city = (cityHint || label).trim() || null;
  const valid = Boolean(city);
  return {
    label: label || city || '',
    city,
    locationId: '',
    match: valid ? 'city_only' : 'missing',
    valid,
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
  oLocationId?: string;
  dLocationId?: string;
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
  const originKey = row.oLocationId || row.oCity || row.oRaw || '';
  const destKey = row.dLocationId || row.dCity || row.dRaw || '';
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
 * Map headers for new AB-first sheet + legacy city-first sheets.
 * New: Origin, Origin Location ID, Destination, Destination Location ID, Origin City, Destination City
 * Legacy: Origin City, Destination City, Origin Location ID, Destination Location ID
 */
function mapHeaders(hdr: string[]): Record<string, number> {
  const colMap: Record<string, number> = {
    o: -1, d: -1, oLoc: -1, dLoc: -1, oCity: -1, dCity: -1,
    trip: -1, metric: -1, metricValue: -1, unit: -1,
    price: -1, cur: -1, from: -1, to: -1, status: -1, scope: -1,
    scopeDirection: -1, notes: -1,
  };

  hdr.forEach((h, i) => {
    const clean = h.replace(/_/g, ' ').trim().toLowerCase();

    if (
      clean === 'origin location id'
      || clean === 'origin_location_id'
      || (clean.includes('origin') && clean.includes('location') && clean.includes('id'))
      || (clean.includes('αφετ') && clean.includes('id') && clean.includes('τοποθ'))
      || (clean.includes('αφετ') && clean.includes('id'))
    ) {
      colMap.oLoc = i;
      return;
    }
    if (
      clean === 'destination location id'
      || clean === 'destination_location_id'
      || (clean.includes('dest') && clean.includes('location') && clean.includes('id'))
      || (clean.includes('προορ') && clean.includes('id'))
    ) {
      colMap.dLoc = i;
      return;
    }

    // City columns (new + legacy "Origin City")
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

    // Label columns: exact "Origin" / "Destination" / Greek Αφετηρία / Προορισμός
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

    // Legacy: "Origin City" already handled; if only "origin" with extra words left
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

  // Legacy city-first sheets: Origin City mapped to oCity — also use as label column if o missing
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

function isDuplicateRoute(
  oLocationId: string,
  dLocationId: string,
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
    const lOId = stopLocationId(lFirst);
    const lDId = stopLocationId(lLast);

    if (oLocationId && dLocationId && lOId && lDId) {
      return oLocationId === lOId && dLocationId === lDId;
    }
    // Mixed AB vs legacy — not the same route identity
    if ((oLocationId && dLocationId) || (lOId && lDId)) return false;

    const origin = (lFirst?.city || lFirst?.value || lFirst?.label || '').toLowerCase();
    const dest = (lLast?.city || lLast?.value || lLast?.label || '').toLowerCase();
    return origin === oCity.toLowerCase() && dest === dCity.toLowerCase();
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
  const { existingLanes, locations } = options;

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

    const oResolved = resolveStopIdentity({
      raw: oRaw,
      cityCol: oCityHint || oCityCol,
      locationIdCol: colMap.oLoc >= 0 ? String(vals[colMap.oLoc] || '').trim() : '',
      locations,
    });
    const dResolved = resolveStopIdentity({
      raw: dRaw,
      cityCol: dCityHint || dCityCol,
      locationIdCol: colMap.dLoc >= 0 ? String(vals[colMap.dLoc] || '').trim() : '',
      locations,
    });

    if (!oResolved.valid) {
      errors.push({ code: 'INVALID_ORIGIN_CITY', field: 'origin_city', message: 'Missing origin location or city.' });
    }
    if (!dResolved.valid) {
      errors.push({ code: 'INVALID_DESTINATION_CITY', field: 'destination_city', message: 'Missing destination location or city.' });
    }
    // unknown_id warning is informational — do not block import
    if (oResolved.warning && oResolved.warning.code !== 'UNKNOWN_LOCATION_ID') errors.push(oResolved.warning);
    if (dResolved.warning && dResolved.warning.code !== 'UNKNOWN_LOCATION_ID') errors.push(dResolved.warning);

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
    const oLocationId = oResolved.locationId;
    const dLocationId = dResolved.locationId;
    const validO = oResolved.valid;
    const validD = dResolved.valid;

    const laneGroupKey = buildLaneGroupKey({
      oLocationId,
      dLocationId,
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
        oLocationId,
        dLocationId,
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
      oLocationId,
      dLocationId,
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
    const tripType = lane.tripType || (lane.isRoundTrip ? 'roundtrip' : 'direct');

    return pricingRows.map((row) => [
      origin,
      stopLocationId(stops[0]),
      destination,
      stopLocationId(stops[stops.length - 1]),
      originCity,
      destinationCity,
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
    const oCity = first.oCity || cityFromLabel(first.oRaw) || first.oRaw;
    const dCity = first.dCity || cityFromLabel(first.dRaw) || first.dRaw;
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

export function matchStatusLabel(status: LocationMatchStatus, t: (key: string, fallback: string) => string): string {
  switch (status) {
    case 'id':
      return t('priceLists.import.match.id', 'AB ID');
    case 'matched':
      return t('priceLists.import.match.matched', 'AB matched');
    case 'unknown_id':
      return t('priceLists.import.match.unknownId', 'Unknown ID');
    case 'city_only':
      return t('priceLists.import.match.cityOnly', 'City only');
    default:
      return t('priceLists.import.match.missing', 'Missing');
  }
}

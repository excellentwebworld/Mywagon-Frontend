import type { PriceLaneMetric } from '../types/priceLists';

export type LanePricingRow = {
  metric: PriceLaneMetric | string;
  priceEur: number;
  metricValue?: Record<string, unknown>;
};

export type LaneLike = {
  pricingRows?: LanePricingRow[];
  pricing?: {
    perLoad?: number | null;
    perPallet?: number | null;
    perKm?: number | null;
    perKg?: number | null;
    perTonne?: number | null;
  };
  stops?: Array<{ city?: string; value?: string; label?: string }>;
  tripType?: string;
  isRoundTrip?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  status?: string;
  scope?: string;
  scopePartnerIds?: string[];
  scopeDirection?: string | null;
  notes?: string;
};

export const EXPIRING_SOON_DAYS = 14;

export type TranslateFn = (key: string, fallback?: string) => string;

export const METRIC_SORT_ORDER: Record<string, number> = {
  ftl_truck_type: 0,
  unit_transport: 1,
  weight: 2,
  load_any_size: 3,
};

export const METRIC_PILL: Record<string, { labelKey: string; bg: string; fg: string }> = {
  ftl_truck_type: { labelKey: 'priceLists.phase2.metric.ftlTruckType', bg: '#DBEAFE', fg: '#2563EB' },
  unit_transport: { labelKey: 'priceLists.phase2.metric.unitTransport', bg: '#EDE9FE', fg: '#7C3AED' },
  weight: { labelKey: 'priceLists.phase2.metric.weight', bg: '#ECFDF5', fg: '#059669' },
  load_any_size: { labelKey: 'priceLists.phase2.metric.loadAnySize', bg: '#FEF3C7', fg: '#92400E' },
};

const PRIMARY_METRIC_PRIORITY: PriceLaneMetric[] = [
  'ftl_truck_type',
  'unit_transport',
  'weight',
  'load_any_size',
];

function normalizePricingRow(row: LanePricingRow) {
  return {
    metric: row.metric,
    priceEur: Number(row.priceEur || 0),
    metricValue: row.metricValue || {},
  };
}

export function resolveLanePricingRows(lane: LaneLike | null | undefined): LanePricingRow[] {
  const rows = Array.isArray(lane?.pricingRows)
    ? lane.pricingRows.map(normalizePricingRow).filter((row) => row.metric)
    : [];

  if (rows.length > 0) return rows;

  const legacy = lane?.pricing || {};
  const fallbackRows: LanePricingRow[] = [];

  if (legacy.perLoad != null) {
    fallbackRows.push({ metric: 'load_any_size', metricValue: { type: 'per_load' }, priceEur: Number(legacy.perLoad) });
  }
  if (legacy.perPallet != null) {
    fallbackRows.push({ metric: 'unit_transport', metricValue: { type: 'eur_pallet' }, priceEur: Number(legacy.perPallet) });
  }
  if (legacy.perKg != null) {
    fallbackRows.push({ metric: 'weight', metricValue: { unit: 'kg' }, priceEur: Number(legacy.perKg) });
  }
  if (legacy.perTonne != null) {
    fallbackRows.push({ metric: 'weight', metricValue: { unit: 'ton' }, priceEur: Number(legacy.perTonne) });
  }
  if (legacy.perKm != null && fallbackRows.length === 0) {
    fallbackRows.push({ metric: 'load_any_size', metricValue: { type: 'per_load' }, priceEur: Number(legacy.perKm) });
  }

  return fallbackRows;
}

export function getPrimaryMetricKey(lane: LaneLike | null | undefined): string {
  const rows = resolveLanePricingRows(lane);
  if (rows.length === 0) return 'load_any_size';

  for (const metric of PRIMARY_METRIC_PRIORITY) {
    if (rows.some((row) => row.metric === metric)) return metric;
  }

  return String(rows[0]?.metric || 'load_any_size');
}

export function getPrimaryMetricPrice(lane: LaneLike | null | undefined): number {
  const rows = resolveLanePricingRows(lane);
  if (rows.length === 0) return 0;

  const primaryKey = getPrimaryMetricKey(lane);
  const primaryRow = rows.find((row) => row.metric === primaryKey) || rows[0];
  return Number(primaryRow?.priceEur || 0);
}

/** Legacy unit key for backward-compatible consumers (filters, KPI tiles). */
export function metricKeyToLegacyUnit(metric: string, metricValue?: Record<string, unknown>): string {
  if (metric === 'unit_transport') return 'pallet';
  if (metric === 'weight') return metricValue?.unit === 'kg' ? 'kg' : 'tonne';
  if (metric === 'ftl_truck_type') return 'load';
  return 'load';
}

export function formatMetricLabel(metric: string, t: TranslateFn): string {
  if (metric === 'weight') return t('priceLists.phase2.metric.weight', 'Weight');
  if (metric === 'unit_transport') return t('priceLists.phase2.metric.unitTransport', 'Unit of transport');
  if (metric === 'ftl_truck_type') return t('priceLists.phase2.metric.ftlTruckType', 'FTL truck type');
  if (metric === 'load_any_size') return t('priceLists.phase2.metric.loadAnySize', 'Load (any size)');
  return metric;
}

export function formatMetricValueLabel(
  metric: string,
  metricValue: Record<string, unknown> | undefined,
  t: TranslateFn,
): string {
  if (metric === 'weight') {
    return metricValue?.unit === 'ton'
      ? t('priceLists.phase2.metricValue.ton', 'ton')
      : t('priceLists.phase2.metricValue.kg', 'kg');
  }
  if (metric === 'unit_transport') {
    const value = metricValue?.type || 'eur_pallet';
    if (value === 'us_pallet') return t('priceLists.phase2.unit.usPallet', 'US pallets');
    if (value === 'box') return t('priceLists.phase2.unit.box', 'Boxes');
    if (value === 'unit') return t('priceLists.phase2.unit.unit', 'Units');
    if (value === 'big_bag') return t('priceLists.phase2.unit.bigBag', 'Big Bags');
    return t('priceLists.phase2.unit.eurPallet', 'EUR pallets');
  }
  if (metric === 'ftl_truck_type') {
    return String(metricValue?.vehicle_type || t('priceLists.phase2.metricValue.vehicleType', 'Vehicle type'));
  }
  return t('priceLists.phase2.metricValue.perLoad', 'per load');
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

function normalizeStopKey(stop: { city?: string; value?: string; label?: string } | undefined): string {
  if (!stop) return '';
  return String(stop.city || stop.value || stop.label || '').trim().toLowerCase();
}

function normalizePricingRowsForFingerprint(rows: LanePricingRow[]): string {
  return [...rows]
    .sort((a, b) => String(a.metric).localeCompare(String(b.metric)))
    .map((row) => `${row.metric}:${row.priceEur}:${stableStringify(row.metricValue || {})}`)
    .join('|');
}

export function buildLaneFingerprint(lane: LaneLike | null | undefined): string {
  const stops = Array.isArray(lane?.stops) ? lane.stops : [];
  const origin = normalizeStopKey(stops[0]);
  const destination = normalizeStopKey(stops[stops.length - 1]);
  const tripType = lane?.tripType || (lane?.isRoundTrip ? 'roundtrip' : 'direct');
  const stopKeys = stops.map(normalizeStopKey).join('>');
  const pricingPart = normalizePricingRowsForFingerprint(resolveLanePricingRows(lane));
  const scopePartnerIds = [...(lane?.scopePartnerIds || [])].sort().join(',');
  const scopeDirection = lane?.scopeDirection || '';
  const scope = lane?.scope || 'default';
  const effectiveFrom = lane?.effectiveFrom || '';
  const effectiveTo = lane?.effectiveTo || '';
  const notes = (lane?.notes || '').trim();

  return [
    origin,
    destination,
    tripType,
    stopKeys,
    pricingPart,
    effectiveFrom,
    effectiveTo || '',
    scope,
    scopePartnerIds,
    scopeDirection,
    notes,
  ].join('::');
}

export function buildLaneFingerprintFromEntry(entry: {
  stops?: Array<{ city?: string; value?: string; label?: string }>;
  tripType?: string;
  isRoundTrip?: boolean;
  pricingRows?: LanePricingRow[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  scope?: string;
  scopePartnerIds?: string[];
  scopeDirection?: string | null;
  notes?: string;
}): string {
  return buildLaneFingerprint({
    stops: entry.stops,
    tripType: entry.tripType,
    isRoundTrip: entry.isRoundTrip,
    pricingRows: entry.pricingRows,
    effectiveFrom: entry.effectiveFrom,
    effectiveTo: entry.effectiveTo,
    scope: entry.scope,
    scopePartnerIds: entry.scopePartnerIds,
    scopeDirection: entry.scopeDirection,
    notes: entry.notes,
  });
}

export function laneHasMetric(lane: LaneLike | null | undefined, metric: PriceLaneMetric | string): boolean {
  return resolveLanePricingRows(lane).some((row) => row.metric === metric);
}

export function laneIsFtl(lane: LaneLike | null | undefined): boolean {
  return laneHasMetric(lane, 'ftl_truck_type');
}

export function laneIsDirectTrip(lane: LaneLike | null | undefined): boolean {
  return !lane?.isRoundTrip;
}

export function laneIsSimpleLane(lane: LaneLike | null | undefined): boolean {
  return Array.isArray(lane?.stops) && lane.stops.length === 2;
}

export function laneIsMultistop(lane: LaneLike | null | undefined): boolean {
  return Array.isArray(lane?.stops) && lane.stops.length > 2;
}

export function laneIsExpiringSoonActive(lane: LaneLike | null | undefined, days = EXPIRING_SOON_DAYS): boolean {
  if (!lane?.effectiveTo || lane.status !== 'active') return false;
  const end = new Date(lane.effectiveTo);
  const now = new Date();
  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff > 0 && diff <= days;
}

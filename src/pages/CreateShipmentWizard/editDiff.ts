import type {
  ApiCargoLine,
  ApiComparableItineraryRow,
  ApiEditPreviewDiff,
  ApiItineraryDiffField,
  ApiStop,
} from '../../api/types/createShipment';

export type CompareView = 'current' | 'updated';

export type StopDiffHighlights = {
  address_id?: boolean;
  date?: boolean;
  time?: boolean;
  date_to?: boolean;
  time_to?: boolean;
};

export type LineDiffHighlights = {
  qty?: boolean;
  weight?: boolean;
  product_id?: boolean;
  order_id?: boolean;
  type?: boolean;
};

export type EditDiffHighlights = {
  /** Per stop index */
  stops: Record<number, StopDiffHighlights>;
  /** Key `${stopIndex}:${lineIndex}` */
  lines: Record<string, LineDiffHighlights>;
};

const STOP_FIELDS = ['address_id', 'date', 'time', 'date_to', 'time_to'] as const;
const LINE_FIELDS = ['qty', 'weight', 'product_id', 'order_id', 'type'] as const;

function fieldChanged(entry: ApiItineraryDiffField | undefined): boolean {
  if (!entry) return false;
  const oldVal = entry.old != null ? String(entry.old).trim() : '';
  const newVal = entry.new != null ? String(entry.new).trim() : '';
  if (entry.old !== undefined && entry.new !== undefined) {
    return oldVal !== newVal;
  }
  return (entry.old !== undefined && oldVal !== '') || (entry.new !== undefined && newVal !== '');
}

function normalizeDate(value: unknown): string {
  const raw = value != null ? String(value).trim() : '';
  if (!raw) return '';
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : raw;
}

function normalizeTime(value: unknown): string {
  const raw = value != null ? String(value).trim() : '';
  return raw ? raw.slice(0, 5) : '';
}

/** Walk stops → lines in the same order as BE `wizardItineraryRows`. */
export function walkWizardLineIndexes(
  stops: ApiStop[]
): Array<{ stopIndex: number; lineIndex: number }> {
  const out: Array<{ stopIndex: number; lineIndex: number }> = [];
  (stops || []).forEach((stop, stopIndex) => {
    (stop.lines || []).forEach((_, lineIndex) => {
      out.push({ stopIndex, lineIndex });
    });
  });
  return out;
}

/**
 * Build red-field highlights for Updated Load.
 * Schedule fields (date/time) are refined against old_itinerary by shipment_location_id
 * so time-only edits never redden the date (and vice versa). New stops get no field reds.
 */
export function buildEditDiffHighlights(
  stops: ApiStop[],
  difference: ApiEditPreviewDiff['difference'] | null | undefined,
  oldItinerary?: ApiComparableItineraryRow[] | null
): EditDiffHighlights {
  const result: EditDiffHighlights = { stops: {}, lines: {} };
  if (!difference) return result;

  const oldByLocId = new Map<number, ApiComparableItineraryRow>();
  (oldItinerary || []).forEach((row) => {
    const id = row.shipment_location_id != null ? Number(row.shipment_location_id) : 0;
    if (id > 0) oldByLocId.set(id, row);
  });

  const flat = walkWizardLineIndexes(stops);
  flat.forEach(({ stopIndex, lineIndex }, flatIndex) => {
    const stop = stops[stopIndex];
    const line = stop?.lines?.[lineIndex];
    const locId = line ? resolveLineShipmentLocationId(line) : null;

    // Brand-new line/stop: NEW badge only — never red field highlights.
    if (locId == null || (oldByLocId.size > 0 && !oldByLocId.has(locId))) {
      return;
    }

    const rowDiff = difference[String(flatIndex)] ?? difference[flatIndex as unknown as string];
    if (!rowDiff) return;

    for (const field of STOP_FIELDS) {
      if (fieldChanged(rowDiff[field])) {
        if (!result.stops[stopIndex]) result.stops[stopIndex] = {};
        result.stops[stopIndex][field] = true;
      }
    }

    const lineKey = `${stopIndex}:${lineIndex}`;
    for (const field of LINE_FIELDS) {
      if (fieldChanged(rowDiff[field])) {
        if (!result.lines[lineKey]) result.lines[lineKey] = {};
        result.lines[lineKey][field] = true;
      }
    }
  });

  // Correct schedule flags against live row. Never invent date/time reds from
  // timezone noise when the backend did not report a schedule change.
  refineScheduleHighlights(stops, result, oldByLocId);

  return result;
}

function refineScheduleHighlights(
  stops: ApiStop[],
  result: EditDiffHighlights,
  oldByLocId: Map<number, ApiComparableItineraryRow>
): void {
  if (oldByLocId.size === 0) return;

  (stops || []).forEach((stop, stopIndex) => {
    const existing = result.stops[stopIndex];
    if (!existing) return;

    const matchedOld = (stop.lines || [])
      .map((line) => {
        const id = resolveLineShipmentLocationId(line);
        return id != null ? oldByLocId.get(id) : undefined;
      })
      .find((row): row is ApiComparableItineraryRow => Boolean(row));

    if (!matchedOld) {
      // Entirely new stop — clear any schedule/address reds that leaked in.
      delete result.stops[stopIndex];
      return;
    }

    const hadSchedule = Boolean(
      existing.date || existing.time || existing.date_to || existing.time_to
    );
    if (!hadSchedule) {
      // Backend did not flag schedule — do not invent reds from minor TZ skew.
      return;
    }

    const dateChanged = normalizeDate(stop.dateFrom) !== normalizeDate(matchedOld.date);
    const timeChanged = normalizeTime(stop.timeFrom) !== normalizeTime(matchedOld.time);
    const dateToChanged = normalizeDate(stop.dateTo || '') !== normalizeDate(matchedOld.date_to || '');
    const timeToChanged = normalizeTime(stop.timeTo || '') !== normalizeTime(matchedOld.time_to || '');

    delete existing.date;
    delete existing.time;
    delete existing.date_to;
    delete existing.time_to;

    // Re-apply only fields that actually differ (moves a mis-labeled date flag onto time, etc.).
    if (dateChanged) existing.date = true;
    if (timeChanged) existing.time = true;
    if (dateToChanged) existing.date_to = true;
    if (timeToChanged) existing.time_to = true;

    if (!hasAnyStopHighlight(existing) && Object.keys(existing).length === 0) {
      delete result.stops[stopIndex];
    }
  });
}

function rowGroupKey(row: ApiComparableItineraryRow): string {
  return [
    String(row.address_id ?? ''),
    String(row.date ?? ''),
    String(row.time ?? ''),
    String(row.date_to ?? ''),
    String(row.time_to ?? ''),
    String(row.type ?? ''),
  ].join('|');
}

function typeToAction(type: string | undefined): 'pickup' | 'dropoff' {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'delivery' || normalized === 'dropoff' || normalized === 'drop-off') {
    return 'dropoff';
  }
  return 'pickup';
}

/**
 * Group flat live itinerary rows into wizard-like stops for the Current Load tab.
 * Consecutive rows sharing address + schedule + type become one stop.
 */
export function oldItineraryToDisplayStops(rows: ApiComparableItineraryRow[]): ApiStop[] {
  if (!rows?.length) return [];

  const stops: ApiStop[] = [];
  let currentKey = '';
  let currentStop: ApiStop | null = null;

  rows.forEach((row, index) => {
    const key = rowGroupKey(row);
    if (!currentStop || key !== currentKey) {
      currentKey = key;
      const hasRange = Boolean(row.date_to || row.time_to);
      currentStop = {
        id: `old-stop-${index}`,
        locationId: String(row.address_id ?? ''),
        locationName: '',
        dateFrom: String(row.date ?? ''),
        timeFrom: String(row.time ?? ''),
        appointmentMode: hasRange ? 'self_scheduling' : 'fixed',
        lines: [],
      };
      if (hasRange) {
        currentStop.dateTo = String(row.date_to ?? '');
        currentStop.timeTo = String(row.time_to ?? '');
      }
      stops.push(currentStop);
    }

    const line: ApiCargoLine = {
      id: `old-line-${index}`,
      productId: String(row.product_id ?? ''),
      productName: '',
      orderId: String(row.order_id ?? ''),
      orderRef: String(row.order_reference ?? row.order_id ?? ''),
      action: typeToAction(row.type),
      qty: row.qty ?? '',
      weight: row.weight ?? '',
      shipmentLocationId: row.shipment_location_id != null ? Number(row.shipment_location_id) : undefined,
    };
    currentStop.lines = [...(currentStop.lines || []), line];
  });

  return stops;
}

export function hasAnyStopHighlight(h?: StopDiffHighlights): boolean {
  if (!h) return false;
  return Boolean(h.address_id || h.date || h.time || h.date_to || h.time_to);
}

export function resolveLineShipmentLocationId(line: {
  shipmentLocationId?: number | string;
  id?: string;
}): number | null {
  if (line.shipmentLocationId != null && line.shipmentLocationId !== '') {
    const n = Number(line.shipmentLocationId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const match = String(line.id || '').match(/^loc-(\d+)$/);
  if (match) {
    const parsed = parseInt(match[1], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function isNewLine(
  line: ApiCargoLine | { shipmentLocationId?: number | string; id?: string },
  oldItinerary?: ApiComparableItineraryRow[] | null
): boolean {
  const locId = resolveLineShipmentLocationId(line);
  if (locId == null) {
    return true;
  }
  if (!oldItinerary || oldItinerary.length === 0) {
    return false;
  }
  return !oldItinerary.some((r) => Number(r.shipment_location_id) === locId);
}

export function isNewStop(
  stop: ApiStop,
  oldItinerary?: ApiComparableItineraryRow[] | null
): boolean {
  if (!stop.lines || stop.lines.length === 0) {
    return !stop.id || !stop.id.startsWith('old-');
  }
  const oldLocationIds = new Set(
    (oldItinerary || [])
      .map((r) => (r.shipment_location_id != null ? Number(r.shipment_location_id) : null))
      .filter((id): id is number => id != null && id > 0)
  );
  if (oldLocationIds.size > 0) {
    return !stop.lines.some((line) => {
      const locId = resolveLineShipmentLocationId(line);
      return locId != null && oldLocationIds.has(locId);
    });
  }
  return !stop.lines.some((line) => resolveLineShipmentLocationId(line) != null);
}

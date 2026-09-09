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
  return entry != null && (entry.old !== undefined || entry.new !== undefined);
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

export function buildEditDiffHighlights(
  stops: ApiStop[],
  difference: ApiEditPreviewDiff['difference'] | null | undefined
): EditDiffHighlights {
  const result: EditDiffHighlights = { stops: {}, lines: {} };
  if (!difference) return result;

  const flat = walkWizardLineIndexes(stops);
  flat.forEach(({ stopIndex, lineIndex }, flatIndex) => {
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

  return result;
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
      orderRef: String(row.order_id ?? ''),
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

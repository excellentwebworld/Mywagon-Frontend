import type { ApiShipmentListCarrier, ApiShipmentListItem } from '../../api/types/shipments';
import { formatEuro } from '../../pages/ManageShipments/utils/listingUtils';
import { parseUtcInstant } from '../../utils/timezone';

export type ScheduleEventKind = 'pickup' | 'dropoff';

export interface ScheduleEvent {
  key: string;
  shipmentId: number;
  autoId: string;
  kind: ScheduleEventKind;
  /** Sortable epoch ms */
  sortAt: number;
  timeLabel: string;
  lane: string;
  overallLane?: string;
  priceLabel: string;
  status: string;
  atRisk: boolean;
  carrier: ApiShipmentListCarrier | null;
  bidsReceived: number;
  bidsSent: number;
  interestedCount: number;
  needsAction: boolean;
  awaitingResponse: boolean;
}

export interface TodayScheduleCounts {
  loads: number;
  pickups: number;
  dropoffs: number;
}

function parseIso(value?: string | null): Date | null {
  return parseUtcInstant(value);
}

/** Local calendar day match (browser timezone). */
export function isLocalToday(iso?: string | null, now = new Date()): boolean {
  const d = parseIso(iso);
  if (!d) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function formatTimeRange(startIso?: string | null, endIso?: string | null): string {
  const start = parseIso(startIso);
  const end = parseIso(endIso);

  const startLabel = start
    ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const endLabel = end
    ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  if (startLabel && endLabel && startLabel !== endLabel) {
    return `${startLabel} - ${endLabel}`;
  }
  if (startLabel) return startLabel;
  if (endLabel) return endLabel;
  return '—';
}

function priceFromItem(item: ApiShipmentListItem): string {
  const raw = item.agreed_price ?? item.quoted_price ?? item.total;
  const num = typeof raw === 'string' ? Number(raw) : raw;
  return formatEuro(num) ?? '—';
}

function laneFromItem(item: ApiShipmentListItem): string {
  const origin = item.origin?.trim() || '—';
  const dest = item.dest?.trim() || '—';
  return `${origin} → ${dest}`;
}

function isUnassigned(item: ApiShipmentListItem): boolean {
  return !item.carrier?.name;
}

interface PhysicalStopInfo {
  id: number | string;
  type: 'pickup' | 'delivery';
  location: string;
  startIso?: string | null;
  endIso?: string | null;
}

function resolveItemStops(item: ApiShipmentListItem): PhysicalStopInfo[] {
  if (item.stops && item.stops.length > 0) {
    const deduped: PhysicalStopInfo[] = [];
    const seen = new Set<string>();

    item.stops.forEach((stop, idx) => {
      const type: 'pickup' | 'delivery' = stop.type === 'pickup' ? 'pickup' : 'delivery';
      const startIso = stop.date_iso || (stop.date && stop.time_start ? `${stop.date} ${stop.time_start}` : stop.date);
      const endIso = stop.to_date_iso || (stop.date && stop.time_end ? `${stop.date} ${stop.time_end}` : undefined);
      const loc = stop.location || stop.address || '';

      // Group same physical stop (same type, location/address, and start/end time)
      const groupKey = `${type}|${loc.trim().toLowerCase()}|${startIso || ''}|${endIso || ''}`;
      if (seen.has(groupKey)) {
        return;
      }
      seen.add(groupKey);

      deduped.push({
        id: stop.id ?? idx + 1,
        type,
        location: loc,
        startIso,
        endIso,
      });
    });

    if (deduped.length > 0) {
      return deduped;
    }
  }

  // Fallback to top-level pickup/delivery fields
  const fallback: PhysicalStopInfo[] = [];
  const pickupIso = item.pickup_at_iso || item.pickup_at;
  const pickupToIso = item.pickup_to_iso || item.pickup_to;
  if (pickupIso || pickupToIso) {
    fallback.push({
      id: `${item.id}-pickup`,
      type: 'pickup',
      location: item.origin || '',
      startIso: pickupIso,
      endIso: pickupToIso,
    });
  }

  const dropoffIso = item.delivery_at_iso || item.delivery_at;
  const dropoffToIso = item.delivery_to_iso || item.delivery_to;
  if (dropoffIso || dropoffToIso) {
    fallback.push({
      id: `${item.id}-dropoff`,
      type: 'delivery',
      location: item.dest || '',
      startIso: dropoffIso,
      endIso: dropoffToIso,
    });
  }

  return fallback;
}

/**
 * Expand active list items into today's pickup/dropoff schedule events.
 * Iterates across all stops for multi-stop shipments.
 */
export function buildTodayScheduleEvents(
  items: ApiShipmentListItem[],
  now = new Date()
): { events: ScheduleEvent[]; counts: TodayScheduleCounts } {
  const events: ScheduleEvent[] = [];

  for (const item of items) {
    const atRisk =
      Boolean(item.at_risk) ||
      (item.status === 'pending' && isUnassigned(item));

    const overallLane = laneFromItem(item);
    const base = {
      shipmentId: item.id,
      autoId: item.auto_id || String(item.id),
      lane: overallLane,
      overallLane,
      priceLabel: priceFromItem(item),
      status: item.status,
      atRisk,
      carrier: item.carrier ?? null,
      bidsReceived: item.bids_received ?? 0,
      bidsSent: item.bids_sent ?? 0,
      interestedCount: item.interested_count ?? 0,
      needsAction: Boolean(item.needs_action),
      awaitingResponse: Boolean(item.awaiting_response),
    };

    const stops = resolveItemStops(item);
    const isMultiStop =
      (item.stop_count ?? 0) > 2 ||
      (item.intermediate_stops ?? 0) > 0 ||
      (item.stops?.length ?? 0) > 2 ||
      stops.length > 2;

    let matchedToday = 0;

    stops.forEach((stop, idx) => {
      const isStopToday = isLocalToday(stop.startIso, now) || isLocalToday(stop.endIso, now);
      if (isStopToday) {
        matchedToday++;
        const sortAt = parseIso(stop.startIso)?.getTime() ?? parseIso(stop.endIso)?.getTime() ?? 0;
        const stopLoc = stop.location?.trim();
        const laneLabel = isMultiStop && stopLoc ? stopLoc : overallLane;
        events.push({
          ...base,
          lane: laneLabel,
          key: `${item.id}-stop-${stop.id || idx}`,
          kind: stop.type === 'pickup' ? 'pickup' : 'dropoff',
          sortAt,
          timeLabel: formatTimeRange(stop.startIso, stop.endIso),
        });
      }
    });

    // If shipment is currently in-transit on the road today (on_trip / ready) and no stops were matched today
    if (matchedToday === 0 && (item.status === 'on_trip' || item.status === 'ready')) {
      const isReady = item.status === 'ready';
      if (isReady) {
        const pickupStop = stops.find((s) => s.type === 'pickup') || stops[0];
        const startIso = pickupStop?.startIso ?? (item.pickup_at_iso || item.pickup_at);
        const endIso = pickupStop?.endIso ?? (item.pickup_to_iso || item.pickup_to);
        const sortAt = parseIso(startIso)?.getTime() ?? parseIso(endIso)?.getTime() ?? now.getTime();
        const stopLoc = pickupStop?.location?.trim();
        const laneLabel = isMultiStop && stopLoc ? stopLoc : overallLane;
        events.push({
          ...base,
          lane: laneLabel,
          key: `${item.id}-transit-ready`,
          kind: 'pickup',
          sortAt,
          timeLabel: formatTimeRange(startIso, endIso),
        });
      } else {
        // on_trip: in transit to destination
        const dropoffStop = [...stops].reverse().find((s) => s.type === 'delivery') || stops[stops.length - 1];
        const startIso = dropoffStop?.startIso ?? (item.delivery_at_iso || item.delivery_at);
        const endIso = dropoffStop?.endIso ?? (item.delivery_to_iso || item.delivery_to);
        const sortAt = parseIso(startIso)?.getTime() ?? parseIso(endIso)?.getTime() ?? now.getTime();
        const stopLoc = dropoffStop?.location?.trim();
        const laneLabel = isMultiStop && stopLoc ? stopLoc : overallLane;
        events.push({
          ...base,
          lane: laneLabel,
          key: `${item.id}-transit-ontrip`,
          kind: 'dropoff',
          sortAt,
          timeLabel: formatTimeRange(startIso, endIso),
        });
      }
    }
  }

  events.sort((a, b) => a.sortAt - b.sortAt || a.shipmentId - b.shipmentId);

  const loadIds = new Set(events.map((e) => e.shipmentId));
  return {
    events,
    counts: {
      loads: loadIds.size,
      pickups: events.filter((e) => e.kind === 'pickup').length,
      dropoffs: events.filter((e) => e.kind === 'dropoff').length,
    },
  };
}

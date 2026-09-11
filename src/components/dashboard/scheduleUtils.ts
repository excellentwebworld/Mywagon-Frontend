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

function formatTimeLabel(iso?: string | null): string {
  const d = parseIso(iso);
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
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

/**
 * Expand active list items into today's pickup/dropoff schedule events.
 * Uses first pickup / last delivery timestamps from the list API.
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

    const base = {
      shipmentId: item.id,
      autoId: item.auto_id || String(item.id),
      lane: laneFromItem(item),
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

    const pickupIso = item.pickup_at_iso || item.pickup_at;
    const isPickupToday = isLocalToday(pickupIso, now);
    if (isPickupToday) {
      const sortAt = parseIso(pickupIso)?.getTime() ?? 0;
      events.push({
        ...base,
        key: `${item.id}-pickup`,
        kind: 'pickup',
        sortAt,
        timeLabel: formatTimeLabel(pickupIso),
      });
    }

    const dropoffIso = item.delivery_at_iso || item.delivery_at;
    const isDropoffToday = isLocalToday(dropoffIso, now);
    if (isDropoffToday) {
      const sortAt = parseIso(dropoffIso)?.getTime() ?? 0;
      events.push({
        ...base,
        key: `${item.id}-dropoff`,
        kind: 'dropoff',
        sortAt,
        timeLabel: formatTimeLabel(dropoffIso),
      });
    }

    // If shipment is currently in-transit on the road today (on_trip / ready) and neither pickup nor dropoff were matched today
    if (!isPickupToday && !isDropoffToday && (item.status === 'on_trip' || item.status === 'ready')) {
      const sortAt = parseIso(pickupIso)?.getTime() ?? now.getTime();
      events.push({
        ...base,
        key: `${item.id}-${item.status}`,
        kind: item.status === 'ready' ? 'pickup' : 'dropoff',
        sortAt,
        timeLabel: formatTimeLabel(pickupIso) !== '—' ? formatTimeLabel(pickupIso) : formatTimeLabel(dropoffIso),
      });
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

/**
 * Measures the lanes behind a sticky Create draft tap, before it is sent.
 *
 * Sticky Create runs the one-shot / batch draft tools directly, with no
 * confirmation card, so the confirm request that normally carries the browser's
 * road distance (`measureRoute.ts`) never happens and the draft used to save
 * with its locations but no route ("Missing: Route - Needed to publish").
 *
 * So the page measures each lane it can resolve to Address Book coordinates and
 * sends the result on the forceTool as `route_summaries`, keyed by the stop
 * location ids it measured between. The gateway applies one only to a draft
 * whose stops are exactly those locations, so a lane resolved differently on the
 * server simply stays unmeasured - never a distance for the wrong stops.
 *
 * A lane with a stop the page cannot place (no seed, not in the book, never
 * geocoded) is skipped, exactly as `canMeasureRoute` refuses it elsewhere.
 */
import type { LocationItem } from '../../context/AppContext';
import type { ErpDraftLocationSeed } from './seedDraftFromErpOrder';
import { canMeasureRoute, measureRoute, type RouteMeasurement, type RoutePoint } from './measureRoute';

export interface StickyRouteSummary {
  stop_location_ids: string[];
  total_dist_km: number;
  total_drive_min?: number;
}

/** Give up on a lane rather than hold the tap hostage to a slow Maps load. */
const MEASURE_TIMEOUT_MS = 8000;

function normalizeLocationId(id: unknown): string {
  const raw = typeof id === 'string' || typeof id === 'number' ? String(id).trim() : '';
  const digits = raw.match(/(\d+)/);
  return digits ? digits[1]! : raw;
}

/**
 * The map position of an Address Book location, or null when it has none.
 * The book maps an empty coordinate to 0, so 0,0 is "never geocoded".
 */
export function pointForLocation(locationId: string, book: LocationItem[]): RoutePoint | null {
  const id = normalizeLocationId(locationId);
  if (!id) return null;
  const hit = book.find((loc) => normalizeLocationId(loc.id) === id);
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export interface StickyLane {
  stopLocationIds: string[];
  points: RoutePoint[];
}

/** One entry per distinct pickup -> delivery lane whose stops both have coordinates. */
export function stickyLanesToMeasure(seeds: ErpDraftLocationSeed[], book: LocationItem[]): StickyLane[] {
  const lanes = new Map<string, StickyLane>();
  for (const seed of seeds) {
    const pickupId = normalizeLocationId(seed.pickup?.locationId);
    const deliveryId = normalizeLocationId(seed.delivery?.locationId);
    if (!pickupId || !deliveryId) continue;
    const key = `${pickupId}>${deliveryId}`;
    if (lanes.has(key)) continue;
    const points = [pointForLocation(pickupId, book), pointForLocation(deliveryId, book)];
    if (!canMeasureRoute(points)) continue;
    lanes.set(key, { stopLocationIds: [pickupId, deliveryId], points });
  }
  return [...lanes.values()];
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/** Measures every lane it can; never rejects, and returns [] when none can be measured. */
export async function measureStickyLanes(
  seeds: ErpDraftLocationSeed[],
  book: LocationItem[],
  measure: (points: RoutePoint[]) => Promise<RouteMeasurement> = measureRoute,
  timeoutMs: number = MEASURE_TIMEOUT_MS,
): Promise<StickyRouteSummary[]> {
  const lanes = stickyLanesToMeasure(seeds, book);
  const measured = await Promise.all(
    lanes.map(async (lane) => {
      const result = await withTimeout(measure(lane.points), timeoutMs);
      if (!result || !(result.totalDistKm > 0)) return null;
      return {
        stop_location_ids: lane.stopLocationIds,
        total_dist_km: result.totalDistKm,
        ...(result.totalDriveMin > 0 ? { total_drive_min: result.totalDriveMin } : {}),
      } satisfies StickyRouteSummary;
    }),
  );
  return measured.filter((entry): entry is StickyRouteSummary => entry !== null);
}
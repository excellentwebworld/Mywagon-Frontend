/**
 * Measuring the route for "Publish now" (CONTRACT.md §6.7, §8.5, §18.3).
 *
 * The gateway can't produce a road distance, so the browser measures it with the page's existing `measureRoute.ts`
 * (Directions first, straight-line fallback — the same maths as the wizard) and sends it as `routeSummary` with
 * the finish request. Until that exists Publish stays off with a visible reason; Save as draft is never blocked.
 *
 * The one thing the contract leaves open: WHERE the stop coordinates come from (the summary event has none — see
 * `IntakeSummaryEvent.route`). This reads the optional `route.points` and nothing else; absent ⇒ "cannot measure".
 */
import { canMeasureRoute as pointsAreMeasurable, type RouteMeasurement, type RoutePoint } from '../measureRoute';
import type { IntakeSummaryEvent, RouteSummary } from './contract';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The stops' positions in itinerary order, `null` for a stop with no map position; or null when the event has none. */
export function routePointsOf(event: Pick<IntakeSummaryEvent, 'route'>): (RoutePoint | null)[] | null {
  const raw = event.route?.points;
  if (!Array.isArray(raw)) return null;
  return raw.map((p) => (p && isNum(p.lat) && isNum(p.lng) ? { lat: p.lat, lng: p.lng } : null));
}

/** True when every stop has a real position, so a route can honestly be measured (same rule as the chat's Confirm). */
export function canMeasureRouteFor(event: Pick<IntakeSummaryEvent, 'route'>): boolean {
  const points = routePointsOf(event);
  return points !== null && pointsAreMeasurable(points);
}

/** A measured route, and whether it is only a straight-line estimate (`usedGoogle === false`, §19.8). The flag is for the UI: R5 never gets it. */
export interface RouteInfo { route: RouteSummary; estimated: boolean }

/**
 * The route for R5, or null when it cannot be measured (no positions, or a zero distance — MYVAGON refuses
 * a load without a distance, so a 0 is as good as none). Never throws.
 * `estimated` is `!usedGoogle`: `measureRoute.ts` fell back to a straight line at 60 km/h. It is NOT part of `routeSummary`.
 */
export async function measureIntakeRouteInfo(
  event: Pick<IntakeSummaryEvent, 'route'>,
  measure: (points: RoutePoint[]) => Promise<RouteMeasurement>,
): Promise<RouteInfo | null> {
  const points = routePointsOf(event);
  if (!points || !pointsAreMeasurable(points)) return null;
  try {
    const m = await measure(points);
    return m.totalDistKm > 0
      ? { route: { total_dist_km: m.totalDistKm, total_drive_min: m.totalDriveMin }, estimated: m.usedGoogle === false }
      : null;
  } catch {
    return null;
  }
}

export async function measureIntakeRoute(
  event: Pick<IntakeSummaryEvent, 'route'>,
  measure: (points: RoutePoint[]) => Promise<RouteMeasurement>,
): Promise<RouteSummary | null> {
  return (await measureIntakeRouteInfo(event, measure))?.route ?? null;
}

/** Same stops ⇒ same key, so a summary is measured once however often it re-renders. */
export const routeKeyOf = (event: Pick<IntakeSummaryEvent, 'route'>): string | null => {
  const points = routePointsOf(event);
  return points && pointsAreMeasurable(points) ? points.map((p) => `${p.lat},${p.lng}`).join('|') : null;
};

/** The distance as shown: a whole number of km. */
export const kmText = (km: number): string => String(Math.round(km));

/**
 * What to send with a finish (§18.3, §6.7): the route when the summary needs one and it can be measured.
 *  - Publish with `routeNeeded` and no measurable route ⇒ `blocked` (the caller says why; nothing is posted).
 *  - Save as draft is NEVER blocked by the route: unmeasurable ⇒ saved without one.
 *  - `routeNeeded:false` ⇒ nothing to measure.
 */
export async function routeForFinish(
  event: IntakeSummaryEvent,
  intent: 'save_draft' | 'publish',
  measure: ((event: IntakeSummaryEvent) => Promise<RouteSummary | null>) | undefined,
  canMeasure: ((event: IntakeSummaryEvent) => boolean) | undefined,
): Promise<{ routeSummary?: RouteSummary; blocked: boolean }> {
  if (!event.routeNeeded) return { blocked: false };
  const measured = measure && (!canMeasure || canMeasure(event)) ? await measure(event).catch(() => null) : null;
  if (measured) return { routeSummary: measured, blocked: false };
  return { blocked: intent === 'publish' };
}

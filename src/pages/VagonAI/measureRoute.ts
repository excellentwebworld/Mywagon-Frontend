/**
 * Measures the road route across a shipment's stops, in the browser.
 *
 * ## Why this exists at all
 *
 * `POST /create-shipment/drafts/{id}/publish` refuses without
 * `route_summary.total_dist_km`, and so does step 2 in `complete` mode. Nothing
 * on the server can produce that number: the chat gateway makes no outbound
 * Google calls by design, and there is no endpoint that computes a distance from
 * two coordinates. The wizard has always measured it here, in the page, with the
 * Directions API — so a load built in the chat can only ever be published if the
 * chat measures it the same way and sends it up.
 *
 * That is the whole job. The confirmation card carries each stop's coordinates
 * (the gateway resolves them from the Address Book when it validates the
 * proposal), this turns them into a distance and a drive time, and the confirm
 * request carries them back.
 *
 * ## Same maths as the wizard, deliberately
 *
 * Directions first, straight-line fallback second, exactly as
 * `itinerary/useRouteLegs.ts` does — including the 60 km/h assumption behind the
 * fallback's drive time. A shipment created here and one created in the wizard
 * have to record the same distance for the same stops, because they are the same
 * shipment and the shipper prices it against that figure.
 *
 * The fallback matters more here than it does there. In the wizard a failed
 * Directions call still leaves a shipper looking at a map who can see what
 * happened; here it is the difference between publishing and being sent to the
 * web app. `usedGoogle` says which of the two produced the answer, so the caller
 * can be honest about it rather than presenting an estimate as a measurement.
 */

import { loadGoogleMaps } from '../../components/AddressBook/GoogleMapAddressField';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteMeasurement {
  totalDistKm: number;
  totalDriveMin: number;
  /** False when Directions was unavailable and this is a straight-line estimate. */
  usedGoogle: boolean;
}

/** The wizard's own assumption for turning a straight line into a drive time. */
const FALLBACK_SPEED_KMH = 60;

function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function straightLine(points: RoutePoint[]): RouteMeasurement {
  let km = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    km += haversineKm(points[i], points[i + 1]);
  }
  return {
    totalDistKm: Math.round(km),
    totalDriveMin: Math.round((km / FALLBACK_SPEED_KMH) * 60),
    usedGoogle: false,
  };
}

/**
 * True when every stop has a real map position.
 *
 * A site the shipper never geocoded has no coordinates, and the Address Book
 * stores those as empty strings — the gateway sends them up as `null`. There is
 * no honest way to route through a stop whose location is unknown, so the caller
 * uses this to disable publishing rather than to measure a shorter route through
 * the stops it does know.
 */
export function canMeasureRoute(points: (RoutePoint | null)[]): points is RoutePoint[] {
  return points.length >= 2 && points.every((point) => point !== null);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Measures the route, falling back to a straight line rather than failing.
 *
 * Never rejects. A load that cannot be measured at all is a load that cannot be
 * published, and that decision belongs to `canMeasureRoute` before this is ever
 * called — once we are here, some answer is better than none, and `usedGoogle`
 * carries the caveat.
 */
export async function measureRoute(points: RoutePoint[]): Promise<RouteMeasurement> {
  if (points.length < 2) return { totalDistKm: 0, totalDriveMin: 0, usedGoogle: false };

  const fallback = straightLine(points);
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  if (!mapsKey) return fallback;

  try {
    await loadGoogleMaps(mapsKey);
    const google = (window as any).google;
    if (!google?.maps) return fallback;

    const service = new google.maps.DirectionsService();
    const origin = points[0];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, -1).map((point) => ({
      location: new google.maps.LatLng(point.lat, point.lng),
      stopover: true,
    }));

    const result = await new Promise<any>((resolve) => {
      service.route(
        {
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (response: any, status: string) => resolve(status === 'OK' ? response : null),
      );
    });

    const route = result?.routes?.[0];
    if (!route?.legs?.length) return fallback;

    let metres = 0;
    let seconds = 0;
    route.legs.forEach((leg: any) => {
      metres += leg.distance?.value || 0;
      seconds += leg.duration?.value || 0;
    });

    if (metres <= 0) return fallback;

    return {
      // Rounded to whole kilometres, as the wizard rounds its own total. The
      // draft records one number for one itinerary either way.
      totalDistKm: Math.round(metres / 1000),
      totalDriveMin: Math.round(seconds / 60),
      usedGoogle: true,
    };
  } catch {
    return fallback;
  }
}

/**
 * Pulls the stop coordinates off a `create_shipment` proposal.
 *
 * The gateway attaches `location_lat` / `location_lng` to each stop when it
 * validates the proposal, resolved from the shipper's own Address Book — so
 * these are the same positions the wizard would route through, and they are
 * `null` for exactly the sites the wizard could not route through either.
 */
export function stopCoordinates(args: Record<string, unknown>): (RoutePoint | null)[] {
  const stops = Array.isArray(args.stops) ? (args.stops as Record<string, unknown>[]) : [];
  return stops.map((stop) => {
    const lat = typeof stop.location_lat === 'number' ? stop.location_lat : null;
    const lng = typeof stop.location_lng === 'number' ? stop.location_lng : null;
    return lat !== null && lng !== null ? { lat, lng } : null;
  });
}

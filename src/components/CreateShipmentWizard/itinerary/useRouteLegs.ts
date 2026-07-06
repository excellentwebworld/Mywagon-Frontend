import { useEffect, useMemo, useState } from 'react';
import { loadGoogleMaps } from '../../AddressBook/GoogleMapAddressField';
import type { EnrichedStop } from './types';
import type { RouteLeg } from './types';
import { buildHaversineLegs } from './scheduleWarnings';

export interface RouteLegsResult {
  loading: boolean;
  error: string | null;
  legs: RouteLeg[];
  totalDistKm: number;
  totalDriveMin: number;
  polylinePath: { lat: number; lng: number }[];
  directionsResult: unknown | null;
  usedGoogle: boolean;
}

function sumLegs(legs: RouteLeg[]) {
  return {
    totalDistKm: Math.round(legs.reduce((a, l) => a + l.distKm, 0)),
    totalDriveMin: legs.reduce((a, l) => a + l.durationMin, 0),
  };
}

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b = 0;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

function extractRoutePath(route: any, fallback: { lat: number; lng: number }[]): { lat: number; lng: number }[] {
  const overview = route?.overview_polyline?.points;
  if (overview) {
    const decoded = decodePolyline(overview);
    if (decoded.length >= 2) return decoded;
  }

  const path: { lat: number; lng: number }[] = [];
  (route?.legs || []).forEach((leg: any) => {
    (leg?.steps || []).forEach((step: any) => {
      const encoded = step?.polyline?.points;
      if (encoded) {
        path.push(...decodePolyline(encoded));
      }
    });
  });

  if (path.length >= 2) return path;
  return fallback;
}

export function useRouteLegs(enrichedStops: EnrichedStop[]): RouteLegsResult {
  const coordStops = useMemo(
    () =>
      enrichedStops
        .map((s, stopIndex) => ({ s, stopIndex }))
        .filter(
          ({ s }) =>
            s.lat != null && s.lng != null && Number.isFinite(s.lat) && Number.isFinite(s.lng)
        ),
    [enrichedStops]
  );

  const coords = useMemo(
    () => coordStops.map(({ s }) => ({ lat: s.lat as number, lng: s.lng as number })),
    [coordStops]
  );

  const buildFallback = (pts: { lat: number; lng: number }[]) => {
    if (pts.length < 2) {
      return { legs: [] as RouteLeg[], polylinePath: pts, ...sumLegs([]) };
    }
    const rawLegs = buildHaversineLegs(pts);
    const legs = rawLegs.map((leg, i) => ({
      ...leg,
      from: coordStops[i]?.stopIndex ?? leg.from,
      to: coordStops[i + 1]?.stopIndex ?? leg.to,
    }));
    return { legs, polylinePath: pts, ...sumLegs(legs) };
  };

  const fallback = useMemo(() => buildFallback(coords), [coords, coordStops]);

  const [state, setState] = useState<RouteLegsResult>({
    loading: false,
    error: null,
    legs: fallback.legs,
    totalDistKm: fallback.totalDistKm,
    totalDriveMin: fallback.totalDriveMin,
    polylinePath: fallback.polylinePath,
    directionsResult: null,
    usedGoogle: false,
  });

  useEffect(() => {
    if (coords.length < 2) {
      setState({
        loading: false,
        error: null,
        legs: [],
        totalDistKm: 0,
        totalDriveMin: 0,
        polylinePath: coords,
        directionsResult: null,
        usedGoogle: false,
      });
      return;
    }

    const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
    if (!mapsKey) {
      setState({
        loading: false,
        error: null,
        legs: fallback.legs,
        totalDistKm: fallback.totalDistKm,
        totalDriveMin: fallback.totalDriveMin,
        polylinePath: fallback.polylinePath,
        directionsResult: null,
        usedGoogle: false,
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    loadGoogleMaps(mapsKey)
      .then(() => {
        if (cancelled || !(window as any).google) return;

        const google = (window as any).google;
        const service = new google.maps.DirectionsService();
        const origin = coords[0];
        const destination = coords[coords.length - 1];
        const waypoints =
          coords.length > 2
            ? coords.slice(1, -1).map((c) => ({
                location: new google.maps.LatLng(c.lat, c.lng),
                stopover: true,
              }))
            : [];

        service.route(
          {
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result: any, status: string) => {
            if (cancelled) return;

            if (status !== 'OK' || !result?.routes?.[0]) {
              setState({
                loading: false,
                error: null,
                legs: fallback.legs,
                totalDistKm: fallback.totalDistKm,
                totalDriveMin: fallback.totalDriveMin,
                polylinePath: fallback.polylinePath,
                directionsResult: null,
                usedGoogle: false,
              });
              return;
            }

            const route = result.routes[0];
            const legs: RouteLeg[] = [];
            route.legs.forEach((gLeg: any, i: number) => {
              const distKm = (gLeg.distance?.value || 0) / 1000;
              const durationMin = Math.round((gLeg.duration?.value || 0) / 60);
              legs.push({
                from: coordStops[i]?.stopIndex ?? i,
                to: coordStops[i + 1]?.stopIndex ?? i + 1,
                distKm: Math.round(distKm * 10) / 10,
                durationMin,
                label: gLeg.duration?.text || `${durationMin}min`,
              });
            });

            const polylinePath = extractRoutePath(route, coords);
            const totals = sumLegs(legs);

            setState({
              loading: false,
              error: null,
              legs,
              polylinePath,
              directionsResult: result,
              usedGoogle: true,
              ...totals,
            });
          }
        );
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          legs: fallback.legs,
          totalDistKm: fallback.totalDistKm,
          totalDriveMin: fallback.totalDriveMin,
          polylinePath: fallback.polylinePath,
          directionsResult: null,
          usedGoogle: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [coords, coordStops, fallback.legs, fallback.polylinePath, fallback.totalDistKm, fallback.totalDriveMin]);

  return state;
}

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../components/AddressBook/GoogleMapAddressField';

export type LatLng = { lat: number; lng: number };

export type LiveDropoffEta = {
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  etaAt: string | null;
  durationText: string | null;
};

function isValidLatLng(point: LatLng | null | undefined): point is LatLng {
  return (
    !!point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    !(point.lat === 0 && point.lng === 0)
  );
}

/**
 * Ask Google once per page load for driving ETA from the truck's last known
 * position to dropoff. Subsequent live GPS updates do not trigger another call.
 */
export function useLiveDropoffEta(options: {
  blocked: boolean;
  origin: LatLng | null;
  destination: LatLng | null;
}): LiveDropoffEta {
  const { blocked, origin, destination } = options;
  const [state, setState] = useState<LiveDropoffEta>({
    status: 'idle',
    etaAt: null,
    durationText: null,
  });
  const fetchedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (blocked) {
      fetchedRef.current = true;
      setState({ status: 'unavailable', etaAt: null, durationText: null });
      return;
    }

    if (fetchedRef.current) return;
    if (!isValidLatLng(origin) || !isValidLatLng(destination)) return;

    const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
    if (!mapsKey) {
      fetchedRef.current = true;
      setState({ status: 'unavailable', etaAt: null, durationText: null });
      return;
    }

    fetchedRef.current = true;
    const originLat = origin.lat;
    const originLng = origin.lng;
    const destLat = destination.lat;
    const destLng = destination.lng;

    setState({ status: 'loading', etaAt: null, durationText: null });

    loadGoogleMaps(mapsKey)
      .then(() => {
        if (!mountedRef.current) return;
        const google = (window as unknown as { google?: any }).google;
        if (!google?.maps?.DirectionsService) {
          setState({ status: 'unavailable', etaAt: null, durationText: null });
          return;
        }

        const service = new google.maps.DirectionsService();
        service.route(
          {
            origin: new google.maps.LatLng(originLat, originLng),
            destination: new google.maps.LatLng(destLat, destLng),
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: { departureTime: new Date() },
          },
          (result: any, status: string) => {
            if (!mountedRef.current) return;
            const leg = result?.routes?.[0]?.legs?.[0];
            const seconds = Number(leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? 0);
            if (status !== 'OK' || !Number.isFinite(seconds) || seconds <= 0) {
              setState({ status: 'unavailable', etaAt: null, durationText: null });
              return;
            }
            setState({
              status: 'ready',
              etaAt: new Date(Date.now() + seconds * 1000).toISOString(),
              durationText: String(leg?.duration_in_traffic?.text || leg?.duration?.text || ''),
            });
          }
        );
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setState({ status: 'unavailable', etaAt: null, durationText: null });
      });
  }, [blocked, origin, destination]);

  return state;
}

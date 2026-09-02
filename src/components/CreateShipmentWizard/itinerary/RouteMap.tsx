import React, { useEffect, useRef, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { loadGoogleMaps } from '../../AddressBook/GoogleMapAddressField';
import { numberedMarkerIconUrl } from './stopColors';
import type { EnrichedStop } from './types';

interface RouteMapProps {
  stops: EnrichedStop[];
  polylinePath: { lat: number; lng: number }[];
  directionsResult?: unknown | null;
  expanded?: boolean;
  loading?: boolean;
  routeLabel?: string;
  mapType?: 'roadmap' | 'satellite';
  height?: number;
  /** Highlight / open this stop’s marker (0-based). */
  activeStopIndex?: number | null;
  /** Fired when a numbered map marker is clicked. */
  onStopSelect?: (index: number) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .replace(/,+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isRedundantLabel(candidate: string, ...against: string[]): boolean {
  const c = normalizeLabel(candidate);
  if (!c) return true;
  return against.some((other) => {
    const o = normalizeLabel(other);
    if (!o) return false;
    return c === o || o.includes(c) || c.includes(o);
  });
}

/** Laravel-style map tooltip: type label + primary address (+ optional distinct place name). */
function buildStopInfoContent(
  stop: EnrichedStop,
  t: RouteMapProps['t']
): string {
  const pickupTitle = t('pickupLocation') || 'Pickup Location';
  const dropoffTitle = t('dropoffLocation') || 'Drop-off Location';

  let title: string;
  let kindClass: string;

  if (stop.hasPickup && stop.hasDropoff) {
    title = `${pickupTitle} / ${dropoffTitle}`;
    kindClass = 'is-mixed';
  } else if (stop.hasDropoff) {
    title = dropoffTitle;
    kindClass = 'is-dropoff';
  } else {
    title = pickupTitle;
    kindClass = 'is-pickup';
  }

  const name = (stop.resolvedName || stop.locationName || '').trim();
  const address = (
    stop.resolvedAddress ||
    stop.resolvedCity ||
    stop.locationCity ||
    name ||
    '—'
  ).trim();
  const company = (stop.resolvedCompany || '').trim();

  // Prefer a meaningful place/business name only when it isn't the same as the address/city.
  const placeName =
    name && !isRedundantLabel(name, address)
      ? name
      : company && !isRedundantLabel(company, address, name)
        ? company
        : '';

  const primaryLine = address || name || company || '—';

  return `<div class="wizard-map-tooltip ${kindClass}">
    <div class="wizard-map-tooltip-title">${escapeHtml(title)}</div>
    ${placeName ? `<div class="wizard-map-tooltip-place">${escapeHtml(placeName)}</div>` : ''}
    <div class="wizard-map-tooltip-address">${escapeHtml(primaryLine)}</div>
  </div>`;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  stops,
  polylinePath,
  directionsResult = null,
  expanded = false,
  loading = false,
  routeLabel,
  mapType = 'roadmap',
  height: heightProp,
  activeStopIndex = null,
  onStopSelect,
  t,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersByIndexRef = useRef<Record<number, any>>({});
  const infoWindowsByIndexRef = useRef<Record<number, any>>({});
  const mapRef = useRef<any>(null);
  const onStopSelectRef = useRef(onStopSelect);
  onStopSelectRef.current = onStopSelect;
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  const safePolylinePath = useMemo(() => {
    if (!Array.isArray(polylinePath)) return [];
    return polylinePath
      .map((p: any) => {
        const lat = typeof p?.lat === 'number' ? p.lat : parseFloat(p?.lat ?? p?.latitude);
        const lng = typeof p?.lng === 'number' ? p.lng : parseFloat(p?.lng ?? p?.long ?? p?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      })
      .filter((p): p is { lat: number; lng: number } => p !== null);
  }, [polylinePath]);

  const pathSignature = safePolylinePath.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
  const stopMarkerSignature = stops
    .map(
      (s, i) =>
        `${i}:${s.lat},${s.lng},${s.hasPickup ? 1 : 0},${s.hasDropoff ? 1 : 0},${s.resolvedName},${s.resolvedAddress},${s.resolvedCompany}`
    )
    .join('|');

  const label =
    routeLabel ||
    stops
      .map((s) => s.resolvedCity || s.resolvedName.split(' ')[0])
      .filter(Boolean)
      .join(' → ');

  useEffect(() => {
    if (!mapsKey || !containerRef.current || safePolylinePath.length === 0) return;

    let renderer: any = null;
    let polyline: any = null;
    let markers: any[] = [];
    let infoWindows: any[] = [];
    let map: any = null;
    let mapClickListener: any = null;

    const closeAllInfoWindows = () => {
      infoWindows.forEach((iw) => iw.close());
    };

    loadGoogleMaps(mapsKey)
      .then(() => {
        const google = (window as any).google;
        if (!google?.maps || !containerRef.current) return;

        map = new google.maps.Map(containerRef.current, {
          mapTypeId: mapType,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });
        mapRef.current = map;

        mapClickListener = map.addListener('click', () => {
          closeAllInfoWindows();
        });

        const addStopMarkers = () => {
          stops.forEach((stop, index) => {
            const rawLat = parseFloat(String(stop.lat));
            const rawLng = parseFloat(String(stop.lng));
            if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return;

            const position = { lat: rawLat, lng: rawLng };
            const markerNum = index + 1;
            const iconUrl = numberedMarkerIconUrl(markerNum, stop.hasPickup, stop.hasDropoff);

            const marker = new google.maps.Marker({
              position,
              map,
              title: `${stop.resolvedName || `Stop ${markerNum}`}`,
              icon: {
                url: iconUrl,
                scaledSize: new google.maps.Size(32, 40),
                anchor: new google.maps.Point(16, 40),
              },
              zIndex: 100 + index,
            });

            const infoContent = buildStopInfoContent(stop, t);
            const infoWindow = new google.maps.InfoWindow({
              content: infoContent,
            });

            marker.addListener('click', () => {
              closeAllInfoWindows();
              infoWindow.open({ anchor: marker, map });
              onStopSelectRef.current?.(index);
            });

            markers.push(marker);
            infoWindows.push(infoWindow);
            markersByIndexRef.current[index] = marker;
            infoWindowsByIndexRef.current[index] = infoWindow;
          });
        };

        if (directionsResult) {
          renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
              strokeColor: '#5E3BEE',
              strokeOpacity: 0.9,
              strokeWeight: 4,
            },
          });
          renderer.setDirections(directionsResult);
          addStopMarkers();
          const bounds = new google.maps.LatLngBounds();
          safePolylinePath.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
          if (!bounds.isEmpty()) map.fitBounds(bounds);
          return;
        }

        const bounds = new google.maps.LatLngBounds();
        safePolylinePath.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
        map.fitBounds(bounds);

        polyline = new google.maps.Polyline({
          path: safePolylinePath.map((p) => ({ lat: p.lat, lng: p.lng })),
          geodesic: false,
          strokeColor: '#5E3BEE',
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
        polyline.setMap(map);
        addStopMarkers();
      })
      .catch(() => {
        /* fallback handled in render */
      });

    return () => {
      if (mapClickListener && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.removeListener(mapClickListener);
      }
      closeAllInfoWindows();
      if (renderer) renderer.setMap(null);
      if (polyline) polyline.setMap(null);
      markers.forEach((m) => m.setMap(null));
      markersByIndexRef.current = {};
      infoWindowsByIndexRef.current = {};
      mapRef.current = null;
    };
  }, [mapsKey, pathSignature, stopMarkerSignature, directionsResult, stops, mapType, t, safePolylinePath]);

  // Sync list → map: open info + bounce the selected stop marker
  useEffect(() => {
    const google = (window as any).google;
    if (!google?.maps || activeStopIndex == null) return;

    const marker = markersByIndexRef.current[activeStopIndex];
    const infoWindow = infoWindowsByIndexRef.current[activeStopIndex];
    const map = mapRef.current;
    if (!marker || !infoWindow || !map) return;

    Object.values(infoWindowsByIndexRef.current).forEach((iw: any) => iw.close());
    infoWindow.open({ anchor: marker, map });

    marker.setAnimation(google.maps.Animation.BOUNCE);
    const timer = window.setTimeout(() => marker.setAnimation(null), 1400);
    return () => window.clearTimeout(timer);
  }, [activeStopIndex]);

  const height = heightProp ?? (expanded ? 340 : 300);

  if (!mapsKey || safePolylinePath.length === 0) {
    const center = safePolylinePath[0] || { lat: 37.983819, lng: 23.727539 };
    const osmUrl =
      safePolylinePath.length >= 2
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...safePolylinePath.map((p) => p.lng)) - 0.5}%2C${Math.min(...safePolylinePath.map((p) => p.lat)) - 0.3}%2C${Math.max(...safePolylinePath.map((p) => p.lng)) + 0.5}%2C${Math.max(...safePolylinePath.map((p) => p.lat)) + 0.3}&layer=mapnik`
        : `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.08}%2C${center.lat - 0.05}%2C${center.lng + 0.08}%2C${center.lat + 0.05}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;

    return (
      <div
        className="wizard-route-map-fallback flex flex-col items-center justify-center"
        style={{ height, background: 'var(--surface-alt)' }}
      >
        {polylinePath.length >= 2 ? (
          <iframe title={label} src={osmUrl} loading="lazy" style={{ width: '100%', height: '100%', border: 0 }} />
        ) : (
          <>
            <MapPin size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
            <div className="text-xs mt-2 truncate max-w-[280px]" style={{ color: 'var(--text-tertiary)' }}>
              {label || t('step2MapPlaceholder')}
            </div>
          </>
        )}
        {loading && (
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('loading')}...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wizard-route-map" style={{ height, position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs"
          style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--text-secondary)' }}
        >
          {t('loading')}...
        </div>
      )}
    </div>
  );
};

export default RouteMap;

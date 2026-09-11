import React, { useEffect, useRef, useMemo, useState } from 'react';
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
  strokeColor?: string;
  height?: number;
  /** Highlight / open this stop’s marker (0-based). */
  activeStopIndex?: number | null;
  /** Fired when a numbered map marker is clicked. */
  onStopSelect?: (index: number) => void;
  /** Live driver GPS position (public tracking / on-trip). */
  livePosition?: { lat: number; lng: number } | null;
  /** Keep camera following the live marker (default true when livePosition is set). */
  followLive?: boolean;
  liveIcon?: {
    /** SVG path symbol (Laravel traking.js style) */
    path?: string;
    /** Or image URL / data-URI (more reliable / visible) */
    url?: string;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
    scale?: number;
    rotation?: number;
    anchor?: { x: number; y: number };
    scaledSize?: { width: number; height: number };
  };
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
  strokeColor = '#9B51E0',
  height: heightProp,
  activeStopIndex = null,
  onStopSelect,
  livePosition = null,
  followLive = true,
  liveIcon,
  t,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersByIndexRef = useRef<Record<number, any>>({});
  const infoWindowsByIndexRef = useRef<Record<number, any>>({});
  const mapRef = useRef<any>(null);
  const liveMarkerRef = useRef<any>(null);
  const liveAnimFrameRef = useRef<number | null>(null);
  const onStopSelectRef = useRef(onStopSelect);
  onStopSelectRef.current = onStopSelect;
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const [mapsFailed, setMapsFailed] = useState(false);
  /** Bumped whenever Google Map instance is (re)created so live marker can re-attach. */
  const [mapReadyToken, setMapReadyToken] = useState(0);
  const followLiveRef = useRef(followLive);
  followLiveRef.current = followLive;

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
    if (!mapsKey || !containerRef.current || safePolylinePath.length === 0 || mapsFailed) return;

    let renderer: any = null;
    let polyline: any = null;
    let markers: any[] = [];
    let infoWindows: any[] = [];
    let map: any = null;
    let mapClickListener: any = null;
    let cancelled = false;

    const closeAllInfoWindows = () => {
      infoWindows.forEach((iw) => iw.close());
    };

    loadGoogleMaps(mapsKey)
      .then(() => {
        if (cancelled) return;
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
        setMapReadyToken((n) => n + 1);

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
              strokeColor: strokeColor || '#9B51E0',
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
          strokeColor: strokeColor || '#9B51E0',
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
        polyline.setMap(map);
        addStopMarkers();
      })
      .catch(() => {
        if (!cancelled) setMapsFailed(true);
      });

    return () => {
      cancelled = true;
      if (liveAnimFrameRef.current != null) {
        cancelAnimationFrame(liveAnimFrameRef.current);
        liveAnimFrameRef.current = null;
      }
      if (mapClickListener && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.removeListener(mapClickListener);
      }
      closeAllInfoWindows();
      if (renderer) renderer.setMap(null);
      if (polyline) polyline.setMap(null);
      markers.forEach((m) => m.setMap(null));
      if (liveMarkerRef.current) {
        liveMarkerRef.current.setMap(null);
        liveMarkerRef.current = null;
      }
      markersByIndexRef.current = {};
      infoWindowsByIndexRef.current = {};
      mapRef.current = null;
    };
  }, [mapsKey, pathSignature, stopMarkerSignature, directionsResult, stops, mapType, t, safePolylinePath, mapsFailed, strokeColor]);

  // Sync list → map: open info + bounce the selected stop marker
  useEffect(() => {
    if (mapsFailed) return;
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
  }, [activeStopIndex, mapsFailed, mapReadyToken]);

  // Live driver marker (socket updates) — re-attach after map remounts
  useEffect(() => {
    if (mapsFailed) return;
    const google = (window as any).google;
    const map = mapRef.current;
    if (!google?.maps || !map || mapReadyToken === 0) return;

    if (!livePosition || !Number.isFinite(livePosition.lat) || !Number.isFinite(livePosition.lng)) {
      if (liveMarkerRef.current) {
        liveMarkerRef.current.setMap(null);
        liveMarkerRef.current = null;
      }
      return;
    }

    const end = { lat: livePosition.lat, lng: livePosition.lng };

    const buildIcon = (rotation?: number) => {
      if (liveIcon?.url) {
        return {
          url: liveIcon.url,
          scaledSize: new google.maps.Size(
            liveIcon.scaledSize?.width ?? 40,
            liveIcon.scaledSize?.height ?? 40
          ),
          anchor: new google.maps.Point(
            liveIcon.anchor?.x ?? (liveIcon.scaledSize?.width ?? 40) / 2,
            liveIcon.anchor?.y ?? (liveIcon.scaledSize?.height ?? 40) / 2
          ),
        };
      }
      if (liveIcon?.path) {
        return {
          path: liveIcon.path,
          fillColor: liveIcon.fillColor || '#6C3AED',
          fillOpacity: liveIcon.fillOpacity ?? 1,
          strokeColor: liveIcon.strokeColor || '#ffffff',
          strokeWeight: liveIcon.strokeWeight ?? 2,
          scale: liveIcon.scale ?? 1.2,
          rotation: rotation ?? liveIcon.rotation ?? 0,
          anchor: liveIcon.anchor
            ? new google.maps.Point(liveIcon.anchor.x, liveIcon.anchor.y)
            : new google.maps.Point(8, 8),
        };
      }
      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#6C3AED',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 10,
      };
    };

    const headingBetween = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const toDeg = (r: number) => (r * 180) / Math.PI;
      const dLon = toRad(to.lng - from.lng);
      const lat1 = toRad(from.lat);
      const lat2 = toRad(to.lat);
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      return (toDeg(Math.atan2(y, x)) + 360) % 360;
    };

    const ensureVisible = (pos: { lat: number; lng: number }) => {
      if (!followLiveRef.current) return;
      const bounds = map.getBounds?.();
      const latLng = new google.maps.LatLng(pos.lat, pos.lng);
      if (!bounds || !bounds.contains(latLng)) {
        map.panTo(latLng);
        const z = map.getZoom?.() ?? 12;
        if (z < 12) map.setZoom(14);
        return;
      }
      map.panTo(latLng);
    };

    if (!liveMarkerRef.current) {
      liveMarkerRef.current = new google.maps.Marker({
        map,
        position: end,
        icon: buildIcon(liveIcon?.rotation),
        zIndex: 999,
        title: 'Live driver position',
        optimized: false,
      });
      ensureVisible(end);
      return;
    }

    const marker = liveMarkerRef.current;
    const startLatLng = marker.getPosition?.();
    if (!startLatLng) {
      marker.setPosition(end);
      marker.setIcon(buildIcon(liveIcon?.rotation));
      ensureVisible(end);
      return;
    }

    const start = { lat: startLatLng.lat(), lng: startLatLng.lng() };
    const dist =
      Math.abs(start.lat - end.lat) + Math.abs(start.lng - end.lng);
    // Tiny jitter — snap; otherwise animate toward new fix (Laravel-style)
    if (dist < 0.00001) {
      marker.setPosition(end);
      return;
    }

    if (liveAnimFrameRef.current != null) {
      cancelAnimationFrame(liveAnimFrameRef.current);
      liveAnimFrameRef.current = null;
    }

    const heading = headingBetween(start, end);
    if (liveIcon?.path && !liveIcon?.url) {
      marker.setIcon(buildIcon(heading));
    }

    const duration = Math.min(4000, Math.max(600, dist * 80000));
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const fraction = Math.min(1, (timestamp - startTime) / duration);
      const lat = start.lat + fraction * (end.lat - start.lat);
      const lng = start.lng + fraction * (end.lng - start.lng);
      const next = { lat, lng };
      marker.setPosition(next);
      if (fraction < 1) {
        liveAnimFrameRef.current = requestAnimationFrame(animate);
      } else {
        liveAnimFrameRef.current = null;
        ensureVisible(end);
      }
    };

    liveAnimFrameRef.current = requestAnimationFrame(animate);
    ensureVisible(end);

    return () => {
      if (liveAnimFrameRef.current != null) {
        cancelAnimationFrame(liveAnimFrameRef.current);
        liveAnimFrameRef.current = null;
      }
    };
  }, [livePosition, liveIcon, mapsFailed, mapReadyToken]);

  const height = heightProp ?? (expanded ? 340 : 300);

  const useOsmFallback = !mapsKey || safePolylinePath.length === 0 || mapsFailed;

  if (useOsmFallback) {
    const center =
      livePosition && Number.isFinite(livePosition.lat) && Number.isFinite(livePosition.lng)
        ? livePosition
        : safePolylinePath[0] || { lat: 37.983819, lng: 23.727539 };
    // When live GPS exists, zoom OSM around the driver so the pin is visible
    // (driver may be far from the Athens route — e.g. simulator GPS).
    const pathForBounds =
      livePosition && Number.isFinite(livePosition.lat) && Number.isFinite(livePosition.lng)
        ? [livePosition]
        : safePolylinePath.length >= 2
          ? safePolylinePath
          : [center];
    const padLng = livePosition ? 0.08 : 0.5;
    const padLat = livePosition ? 0.05 : 0.3;
    const osmUrl =
      pathForBounds.length >= 1
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...pathForBounds.map((p) => p.lng)) - padLng}%2C${Math.min(...pathForBounds.map((p) => p.lat)) - padLat}%2C${Math.max(...pathForBounds.map((p) => p.lng)) + padLng}%2C${Math.max(...pathForBounds.map((p) => p.lat)) + padLat}&layer=mapnik&marker=${center.lat}%2C${center.lng}`
        : `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.08}%2C${center.lat - 0.05}%2C${center.lng + 0.08}%2C${center.lat + 0.05}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;

    return (
      <div
        className="wizard-route-map-fallback flex flex-col items-center justify-center"
        style={{ height, background: 'var(--surface-alt)', position: 'relative' }}
      >
        {pathForBounds.length >= 1 ? (
          <iframe title={label} src={osmUrl} loading="lazy" style={{ width: '100%', height: '100%', border: 0 }} />
        ) : (
          <>
            <MapPin size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
            <div className="text-xs mt-2 truncate max-w-[280px]" style={{ color: 'var(--text-tertiary)' }}>
              {label || t('step2MapPlaceholder')}
            </div>
          </>
        )}
        {livePosition ? (
          <div
            className="absolute left-2 bottom-2 rounded-md px-2 py-1 text-[11px] font-semibold"
            style={{ background: 'rgba(15,23,42,0.85)', color: '#fff' }}
          >
            Live: {livePosition.lat.toFixed(5)}, {livePosition.lng.toFixed(5)}
          </div>
        ) : null}
        {mapsFailed ? (
          <div
            className="absolute left-2 top-2 rounded-md px-2 py-1 text-[10px]"
            style={{ background: 'rgba(255,255,255,0.92)', color: '#64748b' }}
          >
            Map fallback (Google Maps blocked)
          </div>
        ) : null}
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
      {livePosition && Number.isFinite(livePosition.lat) && Number.isFinite(livePosition.lng) ? (
        <div
          className="absolute right-2 top-2 rounded-md px-2 py-1 text-[11px] font-semibold pointer-events-none"
          style={{ background: 'rgba(108,58,237,0.92)', color: '#fff', zIndex: 2 }}
        >
          ● Live driver
        </div>
      ) : null}
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

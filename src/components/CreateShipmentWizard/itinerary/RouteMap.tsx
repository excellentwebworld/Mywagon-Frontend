import React, { useEffect, useRef } from 'react';
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

function buildStopInfoContent(
  stop: EnrichedStop,
  t: RouteMapProps['t']
): string {
  const isDropoffPrimary = !!stop.hasDropoff;
  const pickupTitle = t('pickupLocation') || 'Pickup Location';
  const dropoffTitle = t('dropoffLocation') || 'Drop-off Location';

  let title: string;
  let iconColor: string;
  let iconPath: string;

  if (stop.hasPickup && stop.hasDropoff) {
    title = `${pickupTitle} / ${dropoffTitle}`;
    iconColor = '#111827';
    iconPath =
      'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z';
  } else if (isDropoffPrimary) {
    title = dropoffTitle;
    iconColor = '#DC2626';
    iconPath = 'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z';
  } else {
    title = pickupTitle;
    iconColor = '#059669';
    iconPath =
      'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z';
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
  const showName = name && name !== address;

  return `<div class="wizard-map-tooltip">
    <div class="wizard-map-tooltip-head">
      <svg class="wizard-map-tooltip-icon" width="14" height="14" viewBox="0 0 24 24" fill="${iconColor}" aria-hidden="true">
        <path d="${iconPath}"/>
      </svg>
      <p>${escapeHtml(title)}</p>
    </div>
    ${showName ? `<div class="wizard-map-tooltip-name">${escapeHtml(name)}</div>` : ''}
    <span>${escapeHtml(address)}</span>
    ${company ? `<div class="wizard-map-tooltip-company">${escapeHtml(company)}</div>` : ''}
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
  t,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const pathSignature = polylinePath.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
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
    if (!mapsKey || !containerRef.current || polylinePath.length === 0) return;

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
        if (!containerRef.current || !(window as any).google) return;
        const google = (window as any).google;

        map = new google.maps.Map(containerRef.current, {
          zoom: 8,
          mapTypeId: mapType,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapClickListener = map.addListener('click', closeAllInfoWindows);

        const addStopMarkers = () => {
          markers = stops
            .map((s, idx) => ({ stop: s, idx }))
            .filter(({ stop }) => stop.lat != null && stop.lng != null)
            .map(({ stop, idx }) => {
              const isDropoff = !!stop.hasDropoff;
              const iconUrl = numberedMarkerIconUrl(idx + 1, !!stop.hasPickup, isDropoff);
              const size = idx + 1 >= 10 ? 32 : 28;
              const marker = new google.maps.Marker({
                position: { lat: stop.lat as number, lng: stop.lng as number },
                map,
                icon: {
                  url: iconUrl,
                  scaledSize: new google.maps.Size(size, 28),
                  anchor: new google.maps.Point(size / 2, 14),
                },
                // Keep a plain fallback for accessibility; rich details use InfoWindow
                title: '',
                zIndex: isDropoff ? 2 : 1,
              });

              const infoWindow = new google.maps.InfoWindow({
                content: buildStopInfoContent(stop, t),
                maxWidth: 280,
              });
              infoWindows.push(infoWindow);

              const openInfo = () => {
                closeAllInfoWindows();
                infoWindow.open({ anchor: marker, map });
              };

              marker.addListener('mouseover', openInfo);
              marker.addListener('click', openInfo);

              return marker;
            });
        };

        if (directionsResult && google.maps.DirectionsRenderer) {
          renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
              strokeColor: '#5E3BEE',
              strokeOpacity: 0.9,
              strokeWeight: 4,
            },
          });
          renderer.setDirections(directionsResult);
          addStopMarkers();
          const bounds = new google.maps.LatLngBounds();
          polylinePath.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
          if (!bounds.isEmpty()) map.fitBounds(bounds);
          return;
        }

        const bounds = new google.maps.LatLngBounds();
        polylinePath.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
        map.fitBounds(bounds);

        polyline = new google.maps.Polyline({
          path: polylinePath.map((p) => ({ lat: p.lat, lng: p.lng })),
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
    };
  }, [mapsKey, pathSignature, stopMarkerSignature, directionsResult, stops, mapType, t]);

  const height = heightProp ?? (expanded ? 340 : 300);

  if (!mapsKey || polylinePath.length === 0) {
    const center = polylinePath[0] || { lat: 37.983819, lng: 23.727539 };
    const osmUrl =
      polylinePath.length >= 2
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...polylinePath.map((p) => p.lng)) - 0.5}%2C${Math.min(...polylinePath.map((p) => p.lat)) - 0.3}%2C${Math.max(...polylinePath.map((p) => p.lng)) + 0.5}%2C${Math.max(...polylinePath.map((p) => p.lat)) + 0.3}&layer=mapnik`
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

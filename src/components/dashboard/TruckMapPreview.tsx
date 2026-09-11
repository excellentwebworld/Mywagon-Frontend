import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import type { AvailableTruck } from '../../pages/SearchTrucks/types';
import { formatMoney } from '../../pages/SearchTrucks/utils/money';
import { useTranslation } from '../../hooks/useTranslation';

type AnyMaps = any;

function mapsApi(): AnyMaps | undefined {
  return (window as any).google?.maps as AnyMaps | undefined;
}

interface TruckMapPreviewProps {
  trucks: AvailableTruck[];
  onActivate: () => void;
}

export const TruckMapPreview: React.FC<TruckMapPreviewProps> = ({ trucks, onActivate }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyMaps>(null);
  const overlaysRef = useRef<AnyMaps[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        const maps = mapsApi();
        if (cancelled || !containerRef.current || !maps) return;
        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: { lat: 39.07, lng: 21.82 },
            zoom: 6,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false,
            clickableIcons: false,
            gestureHandling: 'none',
            draggable: false,
            disableDefaultUI: true,
          });
          maps.event.addListener(mapRef.current, 'click', () => onActivate());
          setMapReady(true);
        }
        maps.event.trigger(mapRef.current, 'resize');
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [apiKey, onActivate]);

  // ResizeObserver to ensure Google Map always fills full flex height of the card
  useEffect(() => {
    if (!mapReady || !containerRef.current) return;
    const maps = mapsApi();
    if (!maps || !mapRef.current) return;

    const ro = new ResizeObserver(() => {
      if (mapRef.current && maps) {
        maps.event.trigger(mapRef.current, 'resize');
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [mapReady]);

  // Geocode any trucks with missing coordinates (e.g. only city name or "Greece")
  useEffect(() => {
    if (!mapReady || trucks.length === 0) return;
    const maps = mapsApi();
    if (!maps?.Geocoder) return;
    const geocoder = new maps.Geocoder();

    trucks.forEach((truck) => {
      const hasCoords =
        Number.isFinite(truck.pickupLat) &&
        Number.isFinite(truck.pickupLng) &&
        (truck.pickupLat !== 0 || truck.pickupLng !== 0);
      if (hasCoords || geocodedCoords[truck.id]) return;

      const query = (truck.pickupAddress || truck.pickup || '').trim();
      if (!query || query === '—' || query === 'Any') {
        // Default Greek center for whole-country / unspecified pickup
        setGeocodedCoords((prev: Record<string, { lat: number; lng: number }>) => ({
          ...prev,
          [truck.id]: { lat: 39.0742, lng: 21.8243 },
        }));
        return;
      }

      geocoder.geocode({ address: query }, (results: any, statusCode: any) => {
        if (statusCode === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          setGeocodedCoords((prev: Record<string, { lat: number; lng: number }>) => ({
            ...prev,
            [truck.id]: { lat: loc.lat(), lng: loc.lng() },
          }));
        } else if (/greece|ελλάδα/i.test(query)) {
          setGeocodedCoords((prev: Record<string, { lat: number; lng: number }>) => ({
            ...prev,
            [truck.id]: { lat: 39.0742, lng: 21.8243 },
          }));
        }
      });
    });
  }, [mapReady, trucks, geocodedCoords]);

  useEffect(() => {
    const maps = mapsApi();
    const map = mapRef.current;
    if (!maps || !map || !mapReady) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const resolvedTrucks = trucks.map((truck) => {
      const hasDirectCoords =
        Number.isFinite(truck.pickupLat) &&
        Number.isFinite(truck.pickupLng) &&
        (truck.pickupLat !== 0 || truck.pickupLng !== 0);
      const geo = geocodedCoords[truck.id];
      const lat = hasDirectCoords ? truck.pickupLat : geo?.lat ?? null;
      const lng = hasDirectCoords ? truck.pickupLng : geo?.lng ?? null;

      return {
        ...truck,
        resolvedLat: lat,
        resolvedLng: lng,
        hasCoords: lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng),
      };
    });

    const withCoords = resolvedTrucks.filter(
      (t): t is typeof t & { resolvedLat: number; resolvedLng: number } => Boolean(t.hasCoords)
    );

    withCoords.forEach((truck) => {
      const overlay = new maps.OverlayView();
      let div: HTMLDivElement | null = null;

      overlay.onAdd = () => {
        div = document.createElement('div');
        div.className = [
          'dash-truck-map-marker',
          truck.vis === 'private' ? 'private' : '',
        ]
          .filter(Boolean)
          .join(' ');
        div.style.position = 'absolute';
        div.style.cursor = 'pointer';
        const showPrice = truck.price != null && !truck.priceBlurred;
        const label = showPrice ? formatMoney(truck.price, truck.currency) : 'Offer';
        div.innerHTML = `<div class="dash-truck-map-pin"><div class="dash-truck-map-price">${label}</div><div class="dash-truck-map-tail"></div></div>`;
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          onActivate();
        });
        overlay.getPanes()?.overlayMouseTarget.appendChild(div);
      };

      overlay.draw = () => {
        if (!div) return;
        const projection = overlay.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(
          new maps.LatLng(truck.resolvedLat, truck.resolvedLng)
        );
        if (!point) return;
        div.style.left = `${point.x}px`;
        div.style.top = `${point.y}px`;
        div.style.transform = 'translate(-50%, -100%)';
      };

      overlay.onRemove = () => {
        div?.remove();
        div = null;
      };

      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    if (withCoords.length === 0) {
      map.setCenter({ lat: 39.07, lng: 21.82 });
      map.setZoom(6);
      return;
    }

    const bounds = new maps.LatLngBounds();
    withCoords.forEach((truck) => {
      bounds.extend({ lat: truck.resolvedLat, lng: truck.resolvedLng });
    });
    if (withCoords.length === 1) {
      map.setCenter({ lat: withCoords[0].resolvedLat, lng: withCoords[0].resolvedLng });
      map.setZoom(8);
    } else {
      map.fitBounds(bounds, 24);
    }
  }, [mapReady, trucks, geocodedCoords, onActivate]);

  if (!apiKey) {
    return (
      <button type="button" className="dash-truck-map-preview dash-truck-map-fallback" onClick={onActivate}>
        <span>{t('dashTruckMapPreview')}</span>
      </button>
    );
  }

  return (
    <div
      className="dash-truck-map-host"
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      aria-label={t('dashTruckMapPreview')}
    >
      <div ref={containerRef} className="dash-truck-map-canvas" />
      {trucks.length === 0 && (
        <div className="dash-truck-map-empty">
          <span>{t('dashTruckMapPreview')}</span>
        </div>
      )}
    </div>
  );
};

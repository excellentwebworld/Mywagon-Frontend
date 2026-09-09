import React, { useEffect, useRef } from 'react';
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
  const readyRef = useRef(false);
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
          readyRef.current = true;
          maps.event.addListener(mapRef.current, 'click', () => onActivate());
        }
        maps.event.trigger(mapRef.current, 'resize');
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [apiKey, onActivate]);

  useEffect(() => {
    const maps = mapsApi();
    const map = mapRef.current;
    if (!maps || !map || !readyRef.current) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const withCoords = trucks.filter(
      (truck) =>
        Number.isFinite(truck.pickupLat) &&
        Number.isFinite(truck.pickupLng) &&
        (truck.pickupLat !== 0 || truck.pickupLng !== 0)
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
        const label = showPrice ? formatMoney(truck.price, truck.currency) : '•';
        div.innerHTML = `<div class="dash-truck-map-pin"><div class="dash-truck-map-price">${label}</div></div>`;
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
          new maps.LatLng(truck.pickupLat, truck.pickupLng)
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

    if (withCoords.length === 0) return;

    const bounds = new maps.LatLngBounds();
    withCoords.forEach((truck) => {
      bounds.extend({ lat: truck.pickupLat, lng: truck.pickupLng });
    });
    if (withCoords.length === 1) {
      map.setCenter({ lat: withCoords[0].pickupLat, lng: withCoords[0].pickupLng });
      map.setZoom(8);
    } else {
      map.fitBounds(bounds, 24);
    }
  }, [trucks, onActivate]);

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

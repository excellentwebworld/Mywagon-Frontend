import React, { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import type { AvailableTruck } from '../../pages/SearchTrucks/types';

interface AvailabilityMapProps {
  trucks: AvailableTruck[];
  hoveredId: string | null;
  selectedId: string | null;
  mapExpanded: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: () => void;
  onCloseMobile?: () => void;
  isMobileOverlay?: boolean;
  t: (key: string) => string;
}

type AnyMaps = typeof window extends { google?: { maps: infer M } } ? M : any;

function createPriceOverlay(
  maps: AnyMaps,
  map: unknown,
  truck: AvailableTruck,
  opts: {
    isActive: boolean;
    isHovered: boolean;
    onClick: () => void;
  }
) {
  const overlay = new maps.OverlayView();
  let div: HTMLDivElement | null = null;

  overlay.onAdd = () => {
    div = document.createElement('div');
    div.className = [
      'sat-map-marker',
      truck.vis === 'private' ? 'private' : '',
      opts.isActive ? 'active' : '',
      opts.isHovered ? 'hovered' : '',
    ]
      .filter(Boolean)
      .join(' ');
    div.style.position = 'absolute';
    div.style.cursor = 'pointer';
    div.style.zIndex = opts.isActive || opts.isHovered ? '25' : '10';

    const showPrice = truck.price != null && !truck.priceBlurred;
    const label = showPrice ? `€ ${truck.price!.toLocaleString()}` : 'Offer';
    const priceClass = showPrice ? '' : 'no-price';
    div.innerHTML = `<div class="sat-mm-pin"><div class="sat-mm-price ${priceClass}">${label}</div><div class="sat-mm-tail"></div></div>`;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onClick();
    });
    overlay.getPanes()?.overlayMouseTarget.appendChild(div);
  };

  overlay.draw = () => {
    if (!div) return;
    const projection = overlay.getProjection();
    if (!projection) return;
    const pos = projection.fromLatLngToDivPixel(
      new maps.LatLng(truck.pickupLat, truck.pickupLng)
    );
    if (!pos) return;
    div.style.left = `${pos.x}px`;
    div.style.top = `${pos.y}px`;
    div.style.transform = 'translate(-50%, -100%)';
  };

  overlay.onRemove = () => {
    div?.remove();
    div = null;
  };

  overlay.setMap(map);
  return overlay;
}

export const AvailabilityMap: React.FC<AvailabilityMapProps> = ({
  trucks,
  hoveredId,
  selectedId,
  mapExpanded,
  onSelect,
  onToggleExpand,
  onCloseMobile,
  isMobileOverlay,
  t,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const destObjectsRef = useRef<any[]>([]);
  const readyRef = useRef(false);
  const [, setTick] = React.useState(0);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(containerRef.current, {
            center: { lat: 39.07, lng: 21.82 },
            zoom: 7,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          });
          readyRef.current = true;
          setTick((n) => n + 1);
        }
        // Ensure map paints into the fixed column height after layout
        requestAnimationFrame(() => {
          if (mapRef.current && window.google?.maps?.event) {
            window.google.maps.event.trigger(mapRef.current, 'resize');
          }
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps?.event) return;
    const id = window.setTimeout(() => {
      window.google?.maps?.event?.trigger(mapRef.current, 'resize');
    }, 50);
    return () => window.clearTimeout(id);
  }, [mapExpanded, isMobileOverlay]);

  useEffect(() => {
    const maps = window.google?.maps as AnyMaps | undefined;
    const map = mapRef.current;
    if (!maps || !map || !readyRef.current) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    destObjectsRef.current.forEach((o) => o.setMap(null));
    destObjectsRef.current = [];

    const hasSelection = Boolean(selectedId);
    const bounds = new maps.LatLngBounds();
    let hasBounds = false;

    // Spec v2: when a truck is selected, hide other pickup pins (do not dim).
    const visibleTrucks = hasSelection
      ? trucks.filter((truck) => truck.id === selectedId)
      : trucks;

    visibleTrucks.forEach((truck) => {
      const isActive = truck.id === selectedId;
      const isHovered = truck.id === hoveredId;
      const overlay = createPriceOverlay(maps, map, truck, {
        isActive,
        isHovered,
        onClick: () => onSelect(truck.id),
      });
      overlaysRef.current.push(overlay);
      bounds.extend({ lat: truck.pickupLat, lng: truck.pickupLng });
      hasBounds = true;
    });

    const selected = trucks.find((x) => x.id === selectedId);
    if (selected?.destLat != null && selected.destLng != null) {
      const destMarker = new maps.Marker({
        position: { lat: selected.destLat, lng: selected.destLng },
        map,
        title: selected.dest,
        label: { text: 'D', color: '#fff', fontWeight: '700' },
      });
      destObjectsRef.current.push(destMarker);

      const line = new maps.Polyline({
        path: [
          { lat: selected.pickupLat, lng: selected.pickupLng },
          { lat: selected.destLat, lng: selected.destLng },
        ],
        geodesic: true,
        strokeColor: '#6C3AED',
        strokeOpacity: 0.65,
        strokeWeight: 3,
        map,
      });
      destObjectsRef.current.push(line);
      bounds.extend({ lat: selected.destLat, lng: selected.destLng });
    }

    if (hasSelection && selected) {
      if (selected.destLat != null && selected.destLng != null) {
        const focusBounds = new maps.LatLngBounds();
        focusBounds.extend({ lat: selected.pickupLat, lng: selected.pickupLng });
        focusBounds.extend({ lat: selected.destLat, lng: selected.destLng });
        map.fitBounds(focusBounds, 80);
      } else {
        map.setCenter({ lat: selected.pickupLat, lng: selected.pickupLng });
        map.setZoom(10);
      }
    } else if (hasBounds) {
      map.fitBounds(bounds, 48);
    }
  }, [trucks, hoveredId, selectedId, onSelect, apiKey]);

  return (
    <div
      className={`sat-map-col ${mapExpanded ? 'expanded' : ''} ${isMobileOverlay ? 'mobile-overlay' : ''}`}
    >
      <div className="sat-map-toolbar">
        <span className="sat-map-title">🗺️ {t('satTrucksMap')}</span>
        <span className="sat-map-count">
          {trucks.length} {t('satResults')}
        </span>
        {isMobileOverlay && onCloseMobile ? (
          <button type="button" className="sat-map-ctrl" onClick={onCloseMobile} aria-label={t('close')}>
            ✕
          </button>
        ) : (
          <button
            type="button"
            className="sat-map-ctrl"
            onClick={onToggleExpand}
            aria-label={mapExpanded ? t('satCollapseMap') : t('satExpandMap')}
            title={mapExpanded ? t('satCollapseMap') : t('satExpandMap')}
          >
            {mapExpanded ? '⤡' : '⤢'}
          </button>
        )}
      </div>

      <div className="sat-map-wrap">
        {apiKey ? (
          <div
            ref={containerRef}
            className="sat-map-canvas"
            role="application"
            aria-label={t('satTrucksMap')}
          />
        ) : (
          <div className="sat-map-placeholder">
            <div>{t('satMapUnavailable')}</div>
            <div className="sat-muted" style={{ marginTop: 8 }}>
              {trucks.length} {t('satResults')}
            </div>
            <div className="sat-map-fake-pins">
              {(selectedId
                ? trucks.filter((truck) => truck.id === selectedId)
                : trucks
              )
                .slice(0, 8)
                .map((truck) => {
                  const showPrice = truck.price != null && !truck.priceBlurred;
                  return (
                    <button
                      key={truck.id}
                      type="button"
                      className={`sat-map-marker ${truck.vis === 'private' ? 'private' : ''} ${
                        selectedId === truck.id ? 'active' : ''
                      } ${hoveredId === truck.id ? 'hovered' : ''}`}
                      style={{ position: 'relative', transform: 'none', margin: 4 }}
                      onClick={() => onSelect(truck.id)}
                    >
                      <div className="sat-mm-pin">
                        <div className={`sat-mm-price ${showPrice ? '' : 'no-price'}`}>
                          {showPrice ? `€ ${truck.price!.toLocaleString()}` : 'Offer'}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

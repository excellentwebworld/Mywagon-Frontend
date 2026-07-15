import React, { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import type { AvailableTruck, MapPickupBounds } from '../../pages/SearchTrucks/types';

interface AvailabilityMapProps {
  trucks: AvailableTruck[];
  hoveredId: string | null;
  selectedId: string | null;
  mapExpanded: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: () => void;
  onCloseMobile?: () => void;
  isMobileOverlay?: boolean;
  loading?: boolean;
  pinCount?: number;
  pinsCapped?: boolean;
  mapBoundsActive?: boolean;
  mapBoundsDirty?: boolean;
  onMapBoundsDirty?: () => void;
  onSearchThisArea?: (bounds: MapPickupBounds) => void;
  t: (key: string) => string;
}

// Window google.maps typings in this repo only declare Places Autocomplete.
type AnyMaps = any;

function mapsApi(): AnyMaps | undefined {
  return (window as any).google?.maps as AnyMaps | undefined;
}

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

function createRouteEndpointLabel(
  maps: AnyMaps,
  map: unknown,
  opts: {
    lat: number;
    lng: number;
    kind: 'pickup' | 'dropoff';
    kindLabel: string;
    placeLabel: string;
    anchor: 'above' | 'below';
  }
) {
  const overlay = new maps.OverlayView();
  let div: HTMLDivElement | null = null;

  overlay.onAdd = () => {
    div = document.createElement('div');
    div.className = [
      'sat-map-endpoint',
      `sat-map-endpoint--${opts.kind}`,
      opts.anchor === 'below' ? 'sat-map-endpoint--below' : 'sat-map-endpoint--above',
    ].join(' ');
    div.style.position = 'absolute';
    div.style.zIndex = opts.kind === 'dropoff' ? '22' : '18';
    div.title = `${opts.kindLabel}: ${opts.placeLabel}`;
    const place = opts.placeLabel
      ? `<span class="sat-map-endpoint__place">${opts.placeLabel}</span>`
      : '';
    div.innerHTML = `<div class="sat-map-endpoint__chip"><span class="sat-map-endpoint__kind">${opts.kindLabel}</span>${place}</div>`;
    overlay.getPanes()?.overlayMouseTarget.appendChild(div);
  };

  overlay.draw = () => {
    if (!div) return;
    const projection = overlay.getProjection();
    if (!projection) return;
    const pos = projection.fromLatLngToDivPixel(new maps.LatLng(opts.lat, opts.lng));
    if (!pos) return;
    div.style.left = `${pos.x}px`;
    div.style.top = `${pos.y}px`;
    div.style.transform =
      opts.anchor === 'below' ? 'translate(-50%, 10px)' : 'translate(-50%, -100%)';
  };

  overlay.onRemove = () => {
    div?.remove();
    div = null;
  };

  overlay.setMap(map);
  return overlay;
}

export const AvailabilityMap: React.FC<AvailabilityMapProps> = ({
  loading = false,
  pinCount,
  pinsCapped = false,
  trucks,
  hoveredId,
  selectedId,
  mapExpanded,
  onSelect,
  onToggleExpand,
  onCloseMobile,
  isMobileOverlay,
  mapBoundsActive = false,
  mapBoundsDirty = false,
  onMapBoundsDirty,
  onSearchThisArea,
  t,
}) => {
  const displayedCount = pinCount ?? trucks.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const destObjectsRef = useRef<any[]>([]);
  const readyRef = useRef(false);
  const skipNextIdleDirty = useRef(true);
  const dirtyCbRef = useRef(onMapBoundsDirty);
  dirtyCbRef.current = onMapBoundsDirty;
  const [, setTick] = React.useState(0);
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
            zoom: 7,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          });
          skipNextIdleDirty.current = true;
          maps.event.addListener(mapRef.current, 'idle', () => {
            if (skipNextIdleDirty.current) {
              skipNextIdleDirty.current = false;
              return;
            }
            dirtyCbRef.current?.();
          });
          readyRef.current = true;
          setTick((n) => n + 1);
        }
        // Ensure map paints into the fixed column height after layout
        requestAnimationFrame(() => {
          if (mapRef.current && maps.event) {
            maps.event.trigger(mapRef.current, 'resize');
          }
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    const maps = mapsApi();
    if (!mapRef.current || !maps?.event) return;
    const id = window.setTimeout(() => {
      maps.event.trigger(mapRef.current, 'resize');
    }, 50);
    return () => window.clearTimeout(id);
  }, [mapExpanded, isMobileOverlay]);

  useEffect(() => {
    const maps = mapsApi();
    const map = mapRef.current;
    if (!maps || !map || !readyRef.current) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

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
    const hasDest = selected?.destLat != null && selected.destLng != null;

    // Viewport for unselected / pickup-only; dest selection handled by route effect.
    if (hasSelection && selected && !hasDest) {
      skipNextIdleDirty.current = true;
      map.setCenter({ lat: selected.pickupLat, lng: selected.pickupLng });
      map.setZoom(10);
    } else if (!hasSelection && hasBounds) {
      skipNextIdleDirty.current = true;
      map.fitBounds(bounds, 48);
    }
  }, [trucks, hoveredId, selectedId, onSelect, apiKey]);

  const selectedRoute = React.useMemo(() => {
    const selected = trucks.find((x) => x.id === selectedId);
    if (!selected || selected.destLat == null || selected.destLng == null) return null;
    return {
      id: selected.id,
      pickup: selected.pickup,
      dest: selected.dest,
      pickupLat: selected.pickupLat,
      pickupLng: selected.pickupLng,
      destLat: selected.destLat,
      destLng: selected.destLng,
    };
  }, [trucks, selectedId]);

  useEffect(() => {
    const maps = mapsApi();
    const map = mapRef.current;
    if (!maps || !map || !readyRef.current) return;

    destObjectsRef.current.forEach((o) => {
      if (typeof o.setMap === 'function') o.setMap(null);
    });
    destObjectsRef.current = [];

    if (!selectedRoute) return;

    const origin = { lat: selectedRoute.pickupLat, lng: selectedRoute.pickupLng };
    const destination = { lat: selectedRoute.destLat, lng: selectedRoute.destLng };
    let cancelled = false;

    const pickupLabel = createRouteEndpointLabel(maps, map, {
      lat: origin.lat,
      lng: origin.lng,
      kind: 'pickup',
      kindLabel: t('satMapPickup'),
      placeLabel: selectedRoute.pickup,
      anchor: 'below',
    });
    destObjectsRef.current.push(pickupLabel);

    const dropoffLabel = createRouteEndpointLabel(maps, map, {
      lat: destination.lat,
      lng: destination.lng,
      kind: 'dropoff',
      kindLabel: t('satMapDropoff'),
      placeLabel: selectedRoute.dest,
      anchor: 'above',
    });
    destObjectsRef.current.push(dropoffLabel);

    const fitPickupAndDest = () => {
      const focusBounds = new maps.LatLngBounds();
      focusBounds.extend(origin);
      focusBounds.extend(destination);
      skipNextIdleDirty.current = true;
      map.fitBounds(focusBounds, 80);
    };
    fitPickupAndDest();

    const drawStraightFallback = () => {
      if (cancelled) return;
      const line = new maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: '#6C3AED',
        strokeOpacity: 0.65,
        strokeWeight: 3,
        map,
      });
      destObjectsRef.current.push(line);
    };

    if (typeof maps.DirectionsService === 'function') {
      const service = new maps.DirectionsService();
      service.route(
        {
          origin,
          destination,
          travelMode: maps.TravelMode?.DRIVING ?? 'DRIVING',
        },
        (result: any, status: string) => {
          if (cancelled) return;
          if (status === 'OK' && result?.routes?.[0]) {
            const renderer = new maps.DirectionsRenderer({
              map,
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: '#6C3AED',
                strokeOpacity: 0.85,
                strokeWeight: 4,
              },
            });
            renderer.setDirections(result);
            destObjectsRef.current.push(renderer);

            const routeBounds = result.routes[0].bounds;
            if (routeBounds) {
              skipNextIdleDirty.current = true;
              map.fitBounds(routeBounds, 80);
            }
          } else {
            drawStraightFallback();
          }
        }
      );
    } else {
      drawStraightFallback();
    }

    return () => {
      cancelled = true;
      destObjectsRef.current.forEach((o) => {
        if (typeof o.setMap === 'function') o.setMap(null);
      });
      destObjectsRef.current = [];
    };
  }, [
    apiKey,
    t,
    selectedRoute?.id,
    selectedRoute?.pickup,
    selectedRoute?.dest,
    selectedRoute?.pickupLat,
    selectedRoute?.pickupLng,
    selectedRoute?.destLat,
    selectedRoute?.destLng,
  ]);

  return (
    <div
      className={`sat-map-col ${mapExpanded ? 'expanded' : ''} ${isMobileOverlay ? 'mobile-overlay' : ''}`}
    >
      <div className="sat-map-toolbar">
        <span className="sat-map-title">🗺️ {t('satTrucksMap')}</span>
        <span className="sat-map-count">
          {loading ? '…' : displayedCount} {t('satResults')}
          {!loading && pinsCapped ? ` · ${t('satMapPinCap')}` : ''}
        </span>
        {mapBoundsActive && (
          <span className="sat-map-bounds-chip">{t('satMapBoundsActive')}</span>
        )}
        {mapBoundsDirty && onSearchThisArea && (
          <button
            type="button"
            className="sat-btn sat-btn-sm sat-btn-pr sat-map-search-area"
            onClick={() => {
              const maps = mapsApi();
              const map = mapRef.current;
              const b = map?.getBounds?.();
              if (!maps || !b) return;
              const ne = b.getNorthEast();
              const sw = b.getSouthWest();
              onSearchThisArea({
                neLat: ne.lat(),
                neLng: ne.lng(),
                swLat: sw.lat(),
                swLng: sw.lng(),
              });
              skipNextIdleDirty.current = true;
            }}
          >
            {t('satSearchThisArea')}
          </button>
        )}
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
            {!loading && (
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
            )}
          </div>
        )}
        {loading && (
          <div className="sat-map-skeleton" aria-busy="true" aria-label={t('satLoading')} />
        )}
        {!loading && trucks.length === 0 && (
          <div className="sat-map-empty-hint">{t('satMapEmpty')}</div>
        )}
      </div>
    </div>
  );
};

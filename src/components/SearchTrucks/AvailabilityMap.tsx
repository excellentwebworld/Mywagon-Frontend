import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import type { AvailableTruck, DrawerMode, MapPickupBounds } from '../../pages/SearchTrucks/types';
import { formatMoney } from '../../pages/SearchTrucks/utils/money';
import { AvailabilityDetailPanel } from './AvailabilityDetailPanel';
import { AvailabilityPrice } from './AvailabilityPrice';

interface AvailabilityMapProps {
  trucks: AvailableTruck[];
  hoveredId: string | null;
  selectedId: string | null;
  mapExpanded: boolean;
  onSelect: (id: string | null) => void;
  onToggleExpand: () => void;
  onCloseMobile?: () => void;
  isMobileOverlay?: boolean;
  loading?: boolean;
  pinCount?: number;
  pinsCapped?: boolean;
  onSearchThisArea?: (bounds: MapPickupBounds) => void;
  /** Selected truck for details (expanded map overlay / mobile bottom sheet) */
  selectedTruck?: AvailableTruck | null;
  onBook?: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  onMessage?: (carrier: string) => void;
  onProfile?: (truck: AvailableTruck) => void;
  creatingShipment?: boolean;
  onClearSelection?: () => void;
  canViewBidsCount?: boolean;
  canViewBestBid?: boolean;
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
    div.style.zIndex = opts.isHovered ? '30' : opts.isActive ? '25' : '10';

    const showPrice = truck.price != null && !truck.priceBlurred;
    const label = showPrice ? formatMoney(truck.price, truck.currency) : 'Offer';
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

function routeFitPadding(sheetOpen: boolean, sheetExpanded: boolean) {
  if (!sheetOpen) return 80;
  return {
    top: 56,
    right: 48,
    left: 48,
    bottom: sheetExpanded ? 360 : 168,
  };
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
  onSearchThisArea,
  selectedTruck = null,
  onBook,
  onMessage,
  onProfile,
  creatingShipment = false,
  onClearSelection,
  canViewBidsCount = false,
  canViewBestBid = false,
  t,
}) => {
  const displayedCount = pinCount ?? trucks.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const destObjectsRef = useRef<any[]>([]);
  const routeBoundsRef = useRef<any>(null);
  const readyRef = useRef(false);
  const skipNextIdleSearch = useRef(true);
  const searchAreaCbRef = useRef(onSearchThisArea);
  searchAreaCbRef.current = onSearchThisArea;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const autoBoundsTimerRef = useRef<number | null>(null);
  const [, setTick] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  const AUTO_BOUNDS_DEBOUNCE_MS = 600;

  const clearAutoBoundsTimer = () => {
    if (autoBoundsTimerRef.current != null) {
      window.clearTimeout(autoBoundsTimerRef.current);
      autoBoundsTimerRef.current = null;
    }
  };

  // While a truck detail is open, do not auto-refetch from map pan/zoom.
  useEffect(() => {
    if (selectedId) clearAutoBoundsTimer();
  }, [selectedId]);

  /** Bottom sheet only on mobile overlay; desktop expanded map uses left overlay. */
  const showSheet =
    Boolean(selectedTruck) &&
    Boolean(onBook && onMessage && onProfile && onClearSelection) &&
    Boolean(isMobileOverlay);

  const showExpandedOverlay =
    Boolean(mapExpanded) &&
    !isMobileOverlay &&
    Boolean(selectedTruck) &&
    Boolean(onBook && onMessage && onProfile && onClearSelection);

  useEffect(() => {
    setSheetExpanded(false);
  }, [selectedTruck?.id]);

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
          skipNextIdleSearch.current = true;
          maps.event.addListener(mapRef.current, 'idle', () => {
            if (skipNextIdleSearch.current) {
              skipNextIdleSearch.current = false;
              return;
            }
            // Detail open (list overlay, expanded panel, or mobile sheet): ignore pan/zoom.
            if (selectedIdRef.current) {
              clearAutoBoundsTimer();
              return;
            }
            clearAutoBoundsTimer();
            autoBoundsTimerRef.current = window.setTimeout(() => {
              autoBoundsTimerRef.current = null;
              if (selectedIdRef.current) return;
              const b = mapRef.current?.getBounds?.();
              if (!b || !searchAreaCbRef.current) return;
              const ne = b.getNorthEast();
              const sw = b.getSouthWest();
              searchAreaCbRef.current({
                neLat: ne.lat(),
                neLng: ne.lng(),
                swLat: sw.lat(),
                swLng: sw.lng(),
              });
              skipNextIdleSearch.current = true;
            }, AUTO_BOUNDS_DEBOUNCE_MS);
          });
          readyRef.current = true;
          setTick((n) => n + 1);
        }
        requestAnimationFrame(() => {
          if (mapRef.current && maps.event) {
            maps.event.trigger(mapRef.current, 'resize');
          }
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      clearAutoBoundsTimer();
    };
  }, [apiKey]);

  useEffect(() => {
    const maps = mapsApi();
    if (!mapRef.current || !maps?.event) return;
    const id = window.setTimeout(() => {
      maps.event.trigger(mapRef.current, 'resize');
    }, 50);
    return () => window.clearTimeout(id);
  }, [mapExpanded, isMobileOverlay, showSheet, sheetExpanded, showExpandedOverlay]);

  useEffect(() => {
    const maps = mapsApi();
    const map = mapRef.current;
    if (!maps || !map || !readyRef.current) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const hasSelection = Boolean(selectedId);
    const bounds = new maps.LatLngBounds();
    let hasBounds = false;

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

    if (hasSelection && selected && !hasDest) {
      skipNextIdleSearch.current = true;
      map.setCenter({ lat: selected.pickupLat, lng: selected.pickupLng });
      map.setZoom(10);
    } else if (!hasSelection && hasBounds) {
      skipNextIdleSearch.current = true;
      map.fitBounds(bounds, 48);
    }
  }, [trucks, hoveredId, selectedId, onSelect, apiKey]);

  const selectedRoute = React.useMemo(() => {
    const selected = trucks.find((x) => x.id === selectedId);
    if (!selected) return null;
    const dest = (selected.destAddress || selected.dest || '').trim();
    if (!dest || dest === 'Any') return null;
    if (selected.destLat == null || selected.destLng == null) return null;
    if (selected.destLat === 0 && selected.destLng === 0) return null;
    return {
      id: selected.id,
      pickup: selected.pickupAddress || selected.pickup,
      dest,
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
    routeBoundsRef.current = null;

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

    const padding = () => routeFitPadding(showSheet, sheetExpanded);

    const fitPickupAndDest = () => {
      const focusBounds = new maps.LatLngBounds();
      focusBounds.extend(origin);
      focusBounds.extend(destination);
      routeBoundsRef.current = focusBounds;
      skipNextIdleSearch.current = true;
      map.fitBounds(focusBounds, padding());
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
              routeBoundsRef.current = routeBounds;
              skipNextIdleSearch.current = true;
              map.fitBounds(routeBounds, padding());
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
      routeBoundsRef.current = null;
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

  // Re-fit when sheet opens/expands without rebuilding the route.
  useEffect(() => {
    const map = mapRef.current;
    const bounds = routeBoundsRef.current;
    if (!map || !bounds || !selectedRoute) return;
    skipNextIdleSearch.current = true;
    map.fitBounds(bounds, routeFitPadding(showSheet, sheetExpanded));
  }, [showSheet, sheetExpanded, selectedRoute?.id]);

  const destLabel =
    (selectedTruck?.destAddress || selectedTruck?.dest) === 'Any'
      ? t('satAnyDirection')
      : selectedTruck?.destAddress || selectedTruck?.dest || '';

  return (
    <div
      className={`sat-map-col ${mapExpanded ? 'expanded' : ''} ${isMobileOverlay ? 'mobile-overlay' : ''}${
        showSheet ? ' sat-map-col--sheet' : ''
      }${showExpandedOverlay ? ' sat-map-col--detail' : ''}`}
    >
      <div className="sat-map-toolbar">
        <span className="sat-map-title">🗺️ {t('satTrucksMap')}</span>
        <span className="sat-map-count">
          {loading ? '…' : displayedCount} {t('satResults')}
          {!loading && pinsCapped ? ` · ${t('satMapPinCap')}` : ''}
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
            {mapExpanded ? (
              /* Collapse: corner brackets pointing inward */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              /* Expand: corner brackets pointing outward */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
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
                            {showPrice ? formatMoney(truck.price, truck.currency) : 'Offer'}
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

        {showExpandedOverlay && selectedTruck && onBook && onMessage && onProfile && onClearSelection ? (
          <AvailabilityDetailPanel
            truck={selectedTruck}
            onClose={onClearSelection}
            onBook={onBook}
            onMessage={onMessage}
            onProfile={onProfile}
            creatingShipment={creatingShipment}
            variant="overlay"
            canViewBidsCount={canViewBidsCount}
            canViewBestBid={canViewBestBid}
            t={t}
          />
        ) : null}

        {showSheet && selectedTruck && onBook && onMessage && onProfile && onClearSelection ? (
          <div
            className={`sat-map-sheet${sheetExpanded ? ' sat-map-sheet--expanded' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={t('satProviderProfile')}
          >
            <button
              type="button"
              className="sat-map-sheet__handle"
              onClick={() => setSheetExpanded((v) => !v)}
              aria-expanded={sheetExpanded}
              aria-label={
                sheetExpanded
                  ? t('satSheetCollapse') || 'Collapse details'
                  : t('satSheetExpand') || 'Expand details'
              }
            >
              <span className="sat-map-sheet__grip" aria-hidden />
            </button>

            <div className="sat-map-sheet__peek">
              <div className="sat-map-sheet__peek-main">
                <div className="sat-map-sheet__carrier">
                  <div className="sat-cr-av sat-map-sheet__av">{selectedTruck.initials}</div>
                  <div className="sat-map-sheet__carrier-text">
                    <div className="sat-map-sheet__name">{selectedTruck.carrier}</div>
                    <div className="sat-map-sheet__meta">
                      ★ {selectedTruck.rating.toFixed(1)} · {selectedTruck.type}
                    </div>
                  </div>
                </div>
                <div className="sat-map-sheet__route">
                  {selectedTruck.pickupAddress || selectedTruck.pickup} → {destLabel}
                </div>
              </div>
              <div className="sat-map-sheet__peek-actions">
                <div className="sat-map-sheet__price">
                  <AvailabilityPrice
                    truck={selectedTruck}
                    canViewBestBid={canViewBestBid}
                    className="sat-price"
                    size="sm"
                    t={t}
                  />
                </div>
                <button
                  type="button"
                  className="sat-btn sat-btn-pr sat-btn-sm"
                  disabled={creatingShipment}
                  onClick={() => onBook(selectedTruck, 'pending')}
                >
                  {t('satBookBid')}
                </button>
                <button
                  type="button"
                  className="sat-map-sheet__toggle"
                  onClick={() => setSheetExpanded((v) => !v)}
                  aria-label={
                    sheetExpanded
                      ? t('satSheetCollapse') || 'Collapse details'
                      : t('satSheetExpand') || 'Expand details'
                  }
                >
                  {sheetExpanded ? '▾' : '▴'}
                </button>
                <button
                  type="button"
                  className="sat-map-sheet__close"
                  onClick={onClearSelection}
                  aria-label={t('close')}
                >
                  ✕
                </button>
              </div>
            </div>

            {sheetExpanded ? (
              <div className="sat-map-sheet__body">
                <AvailabilityDetailPanel
                  truck={selectedTruck}
                  onClose={onClearSelection}
                  onBook={onBook}
                  onMessage={onMessage}
                  onProfile={onProfile}
                  creatingShipment={creatingShipment}
                  variant="sheet"
                  hideHeader
                  canViewBidsCount={canViewBidsCount}
                  canViewBestBid={canViewBestBid}
                  t={t}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

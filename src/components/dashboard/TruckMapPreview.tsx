import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export const TruckMapPreview: React.FC<TruckMapPreviewProps> = ({ trucks, onActivate }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyMaps>(null);
  const overlaysRef = useRef<AnyMaps[]>([]);
  const routeObjectsRef = useRef<AnyMaps[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<AvailableTruck | null>(null);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  // Initialize interactive Google Map
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
            zoomControl: true,
            clickableIcons: false,
            gestureHandling: 'cooperative',
            draggable: true,
          });

          // Clicking on empty map space deselects the current truck
          maps.event.addListener(mapRef.current, 'click', () => {
            setSelectedTruck(null);
          });

          setMapReady(true);
        }
        maps.event.trigger(mapRef.current, 'resize');
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

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

  // Geocode any trucks with missing coordinates (e.g. city name or "Greece")
  useEffect(() => {
    if (!mapReady || trucks.length === 0) return;
    const maps = mapsApi();
    if (!maps?.Geocoder) return;
    const geocoder = new maps.Geocoder();

    trucks.forEach((truck) => {
      // Check pickup
      const hasPickupCoords =
        Number.isFinite(truck.pickupLat) &&
        Number.isFinite(truck.pickupLng) &&
        (truck.pickupLat !== 0 || truck.pickupLng !== 0);
      if (!hasPickupCoords && !geocodedCoords[`pickup_${truck.id}`]) {
        const query = (truck.pickupAddress || truck.pickup || '').trim();
        if (!query || query === '—' || query === 'Any') {
          setGeocodedCoords((prev) => ({
            ...prev,
            [`pickup_${truck.id}`]: { lat: 39.0742, lng: 21.8243 },
          }));
        } else {
          geocoder.geocode({ address: query }, (results: any, statusCode: any) => {
            if (statusCode === 'OK' && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              setGeocodedCoords((prev) => ({
                ...prev,
                [`pickup_${truck.id}`]: { lat: loc.lat(), lng: loc.lng() },
              }));
            } else if (/greece|ελλάδα/i.test(query)) {
              setGeocodedCoords((prev) => ({
                ...prev,
                [`pickup_${truck.id}`]: { lat: 39.0742, lng: 21.8243 },
              }));
            }
          });
        }
      }

      // Check destination
      const hasDestCoords =
        truck.destLat != null &&
        truck.destLng != null &&
        Number.isFinite(truck.destLat) &&
        Number.isFinite(truck.destLng) &&
        (truck.destLat !== 0 || truck.destLng !== 0);
      if (!hasDestCoords && !geocodedCoords[`dest_${truck.id}`]) {
        const destQuery = (truck.destAddress || truck.dest || '').trim();
        if (destQuery && destQuery !== '—' && destQuery !== 'Any') {
          geocoder.geocode({ address: destQuery }, (results: any, statusCode: any) => {
            if (statusCode === 'OK' && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              setGeocodedCoords((prev) => ({
                ...prev,
                [`dest_${truck.id}`]: { lat: loc.lat(), lng: loc.lng() },
              }));
            }
          });
        }
      }
    });
  }, [mapReady, trucks, geocodedCoords]);

  // Resolve truck pickup & dest coordinates
  const resolvedTrucks = useMemo(() => {
    return trucks.map((truck) => {
      const hasDirectPickup =
        Number.isFinite(truck.pickupLat) &&
        Number.isFinite(truck.pickupLng) &&
        (truck.pickupLat !== 0 || truck.pickupLng !== 0);
      const geoPickup = geocodedCoords[`pickup_${truck.id}`];
      const pLat = hasDirectPickup ? truck.pickupLat : geoPickup?.lat ?? null;
      const pLng = hasDirectPickup ? truck.pickupLng : geoPickup?.lng ?? null;

      const hasDirectDest =
        truck.destLat != null &&
        truck.destLng != null &&
        Number.isFinite(truck.destLat) &&
        Number.isFinite(truck.destLng) &&
        (truck.destLat !== 0 || truck.destLng !== 0);
      const geoDest = geocodedCoords[`dest_${truck.id}`];
      const dLat = hasDirectDest ? truck.destLat : geoDest?.lat ?? null;
      const dLng = hasDirectDest ? truck.destLng : geoDest?.lng ?? null;

      return {
        ...truck,
        resolvedPickupLat: pLat,
        resolvedPickupLng: pLng,
        resolvedDestLat: dLat,
        resolvedDestLng: dLng,
        hasCoords: pLat != null && pLng != null && Number.isFinite(pLat) && Number.isFinite(pLng),
      };
    });
  }, [trucks, geocodedCoords]);

  // Render truck price markers
  useEffect(() => {
    const maps = mapsApi();
    const map = mapRef.current;
    if (!maps || !map || !mapReady) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const withCoords = resolvedTrucks.filter(
      (t): t is typeof t & { resolvedPickupLat: number; resolvedPickupLng: number } =>
        Boolean(t.hasCoords)
    );

    withCoords.forEach((truck) => {
      const overlay = new maps.OverlayView();
      let div: HTMLDivElement | null = null;
      const isSelected = selectedTruck?.id === truck.id;
      const isHovered = hoveredId === truck.id;

      overlay.onAdd = () => {
        div = document.createElement('div');
        div.className = [
          'sat-map-marker',
          truck.vis === 'private' ? 'private' : '',
          isSelected ? 'active' : '',
          isHovered ? 'hovered' : '',
          selectedTruck && !isSelected ? 'dimmed' : '',
        ]
          .filter(Boolean)
          .join(' ');
        div.style.position = 'absolute';
        div.style.cursor = 'pointer';
        div.style.zIndex = isHovered ? '30' : isSelected ? '25' : '10';

        const showPrice = truck.price != null && !truck.priceBlurred;
        const label = showPrice ? formatMoney(truck.price, truck.currency) : 'Offer';
        const priceClass = showPrice ? '' : 'no-price';
        div.innerHTML = `<div class="sat-mm-pin"><div class="sat-mm-price ${priceClass}">${label}</div><div class="sat-mm-tail"></div></div>`;

        div.addEventListener('mouseenter', () => setHoveredId(truck.id));
        div.addEventListener('mouseleave', () => setHoveredId(null));
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedTruck(truck);
        });

        overlay.getPanes()?.overlayMouseTarget.appendChild(div);
      };

      overlay.draw = () => {
        if (!div) return;
        const projection = overlay.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(
          new maps.LatLng(truck.resolvedPickupLat, truck.resolvedPickupLng)
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
  }, [mapReady, resolvedTrucks, selectedTruck, hoveredId]);

  // Handle selected truck route polyline and camera fitting
  useEffect(() => {
    const maps = mapsApi();
    const map = mapRef.current;
    if (!maps || !map || !mapReady) return;

    routeObjectsRef.current.forEach((o) => {
      if (typeof o.setMap === 'function') o.setMap(null);
    });
    routeObjectsRef.current = [];

    if (!selectedTruck) {
      // Overview bounds for all trucks
      const withCoords = resolvedTrucks.filter((t) => t.hasCoords);
      if (withCoords.length === 0) {
        map.setCenter({ lat: 39.07, lng: 21.82 });
        map.setZoom(6);
        return;
      }
      const bounds = new maps.LatLngBounds();
      withCoords.forEach((t) => {
        if (t.resolvedPickupLat != null && t.resolvedPickupLng != null) {
          bounds.extend({ lat: t.resolvedPickupLat, lng: t.resolvedPickupLng });
        }
      });
      if (withCoords.length === 1) {
        map.setCenter({
          lat: withCoords[0].resolvedPickupLat!,
          lng: withCoords[0].resolvedPickupLng!,
        });
        map.setZoom(8);
      } else {
        map.fitBounds(bounds, 32);
      }
      return;
    }

    // A truck is selected
    const activeTruck = resolvedTrucks.find((t) => t.id === selectedTruck.id) || selectedTruck;
    const pLat = (activeTruck as any).resolvedPickupLat ?? activeTruck.pickupLat;
    const pLng = (activeTruck as any).resolvedPickupLng ?? activeTruck.pickupLng;
    const dLat = (activeTruck as any).resolvedDestLat ?? activeTruck.destLat;
    const dLng = (activeTruck as any).resolvedDestLng ?? activeTruck.destLng;

    if (pLat == null || pLng == null) return;

    const hasValidDest =
      dLat != null &&
      dLng != null &&
      Number.isFinite(dLat) &&
      Number.isFinite(dLng) &&
      (dLat !== 0 || dLng !== 0) &&
      activeTruck.dest &&
      activeTruck.dest !== 'Any' &&
      activeTruck.dest !== '—';

    const origin = { lat: pLat, lng: pLng };

    if (!hasValidDest) {
      map.setCenter(origin);
      map.setZoom(9);
      return;
    }

    const destination = { lat: dLat, lng: dLng };

    // Place Pickup & Dropoff chips
    const pickupLabel = createRouteEndpointLabel(maps, map, {
      lat: origin.lat,
      lng: origin.lng,
      kind: 'pickup',
      kindLabel: t('satMapPickup', 'Pickup'),
      placeLabel: activeTruck.pickupAddress || activeTruck.pickup,
      anchor: 'below',
    });
    routeObjectsRef.current.push(pickupLabel);

    const dropoffLabel = createRouteEndpointLabel(maps, map, {
      lat: destination.lat,
      lng: destination.lng,
      kind: 'dropoff',
      kindLabel: t('satMapDropoff', 'Drop-off'),
      placeLabel: activeTruck.destAddress || activeTruck.dest,
      anchor: 'above',
    });
    routeObjectsRef.current.push(dropoffLabel);

    // Draw route line
    const fitRoute = (routeBounds: any) => {
      map.fitBounds(routeBounds, {
        top: 40,
        right: 40,
        left: 40,
        bottom: 120, // Leave room for floating card at bottom
      });
    };

    const focusBounds = new maps.LatLngBounds();
    focusBounds.extend(origin);
    focusBounds.extend(destination);
    fitRoute(focusBounds);

    let cancelled = false;

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
                strokeColor: activeTruck.vis === 'private' ? '#7C3AED' : '#6C3AED',
                strokeOpacity: 0.85,
                strokeWeight: 4,
              },
            });
            renderer.setDirections(result);
            routeObjectsRef.current.push(renderer);

            const b = result.routes[0].bounds;
            if (b) fitRoute(b);
          } else {
            // Straight fallback polyline
            const polyline = new maps.Polyline({
              path: [origin, destination],
              geodesic: true,
              strokeColor: activeTruck.vis === 'private' ? '#7C3AED' : '#6C3AED',
              strokeOpacity: 0.75,
              strokeWeight: 3,
              map,
            });
            routeObjectsRef.current.push(polyline);
          }
        }
      );
    }

    return () => {
      cancelled = true;
    };
  }, [mapReady, selectedTruck, resolvedTrucks, t]);

  if (!apiKey) {
    return (
      <button type="button" className="dash-truck-map-preview dash-truck-map-fallback" onClick={onActivate}>
        <span>{t('dashTruckMapPreview', 'Search Available Trucks')}</span>
      </button>
    );
  }

  return (
    <div className="dash-truck-map-host">
      <div ref={containerRef} className="dash-truck-map-canvas" />

      {trucks.length === 0 && (
        <div className="dash-truck-map-empty">
          <span>{t('dashTruckMapPreview', 'No posted trucks available right now')}</span>
        </div>
      )}

      {/* Interactive Selected Truck Floating Card */}
      {selectedTruck && (
        <div className="dash-truck-map-popup" onClick={(e) => e.stopPropagation()}>
          <div className="dash-truck-popup-hd">
            <div className="dash-truck-popup-carrier">
              <span className="dash-truck-popup-name">
                {selectedTruck.carrier || t('carrier', 'Carrier')}
              </span>
              {selectedTruck.rating != null && (
                <span className="dash-truck-popup-rating">
                  ★ {Number(selectedTruck.rating).toFixed(1)}
                </span>
              )}
              <span
                className={`dash-truck-popup-badge ${
                  selectedTruck.vis === 'private' ? 'private' : 'public'
                }`}
              >
                {selectedTruck.vis === 'private'
                  ? t('partner', 'Partner')
                  : t('public', 'Public')}
              </span>
            </div>
            <button
              type="button"
              className="dash-truck-popup-close"
              onClick={() => setSelectedTruck(null)}
              aria-label={t('close', 'Close')}
            >
              ✕
            </button>
          </div>

          <div className="dash-truck-popup-lane">
            <span className="dash-truck-popup-loc">
              {selectedTruck.pickup || selectedTruck.pickupAddress || '—'}
            </span>
            <span className="dash-truck-popup-arr">→</span>
            <span className="dash-truck-popup-loc">
              {selectedTruck.dest || selectedTruck.destAddress || t('anyLocation', 'Any')}
            </span>
          </div>

          <div className="dash-truck-popup-meta">
            <span className="dash-truck-popup-type">{selectedTruck.truckType || '—'}</span>
            {selectedTruck.capacity && (
              <span className="dash-truck-popup-cap">{selectedTruck.capacity}</span>
            )}
            {selectedTruck.posted && (
              <span className="dash-truck-popup-time">{selectedTruck.posted}</span>
            )}
          </div>

          <div className="dash-truck-popup-ft">
            <div className="dash-truck-popup-price">
              {selectedTruck.price != null && !selectedTruck.priceBlurred
                ? formatMoney(selectedTruck.price, selectedTruck.currency)
                : t('offer', 'Offer')}
            </div>
            <button
              type="button"
              className="dash-truck-popup-cta"
              onClick={() => onActivate()}
            >
              <span>{t('dashSearchTrucks', 'View in Search Trucks')}</span> →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

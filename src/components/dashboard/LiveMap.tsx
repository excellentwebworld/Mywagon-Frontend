import React, { useEffect, useMemo, useState } from 'react';
import { shipmentsService } from '../../api';
import type { Shipment, ShipmentStop } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { RouteMap } from '../CreateShipmentWizard/itinerary/RouteMap';
import { useRouteLegs } from '../CreateShipmentWizard/itinerary/useRouteLegs';
import type { EnrichedStop } from '../CreateShipmentWizard/itinerary/types';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import { formatDashError, translateDashMessage } from './dashErrorUtils';
import { DashMapSkeleton } from './DashboardSkeletons';

interface LiveMapProps {
  selectedShipmentId: number | null;
}

function groupPhysicalMapStops(
  stops: ShipmentStop[]
): Array<{ stop: ShipmentStop; originalIndex: number }> {
  const result: Array<{ stop: ShipmentStop; originalIndex: number }> = [];
  const seen = new Set<string>();

  stops.forEach((stop, idx) => {
    const normLocation = (stop.location || '').trim().toLowerCase();
    const normAddress = (stop.address || '').trim().toLowerCase();
    const groupKey = `${stop.type}|${normLocation}|${normAddress}`;
    if (seen.has(groupKey)) return;
    seen.add(groupKey);
    result.push({ stop, originalIndex: idx });
  });

  return result;
}

const EMPTY_STOPS: ShipmentStop[] = [];
const EMPTY_ENRICHED_STOPS: EnrichedStop[] = [];

export const LiveMap: React.FC<LiveMapProps> = ({ selectedShipmentId }) => {
  const { t } = useTranslation();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<number, { lat: number; lng: number }>>({});

  useEffect(() => {
    if (selectedShipmentId == null) {
      setShipment(null);
      setError(null);
      setLoading(false);
      setGeocodedCoords({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setGeocodedCoords({});

    shipmentsService
      .getMapped(selectedShipmentId)
      .then((data) => {
        if (!cancelled) setShipment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setShipment(null);
        setError(formatDashError(err, 'dashMapLoadFailed').key);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedShipmentId]);

  const stops = shipment?.stops ?? EMPTY_STOPS;

  useEffect(() => {
    const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
    if (!mapsKey || stops.length === 0) return;

    loadGoogleMaps(mapsKey).then(() => {
      if (!(window as any).google?.maps?.Geocoder) return;
      const geocoder = new (window as any).google.maps.Geocoder();

      stops.forEach((s, idx) => {
        if (s.lat != null && s.lng != null) return;
        const query = s.address || s.location;
        if (!query) return;
        geocoder.geocode({ address: query }, (results: any, statusCode: any) => {
          if (statusCode === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            setGeocodedCoords((prev) => ({
              ...prev,
              [idx]: { lat: loc.lat(), lng: loc.lng() },
            }));
          }
        });
      });
    });
  }, [stops]);

  const enrichedStops: EnrichedStop[] = useMemo(() => {
    if (stops.length === 0) return EMPTY_ENRICHED_STOPS;

    return groupPhysicalMapStops(stops).map(({ stop: s, originalIndex }, idx) => {
      const lat = s.lat != null ? Number(s.lat) : geocodedCoords[originalIndex]?.lat ?? null;
      const lng = s.lng != null ? Number(s.lng) : geocodedCoords[originalIndex]?.lng ?? null;

      return {
        id: String(s.id || idx + 1),
        type: s.type === 'pickup' ? 1 : 2,
        location_id: s.id || idx + 1,
        location_name: s.location || '',
        address: s.address || '',
        city: s.location || '',
        lat,
        lng,
        resolvedName: s.location || '',
        resolvedCity: s.location || '',
        resolvedCompany: s.customers?.[0]?.name || s.location || '',
        resolvedAddress: s.address || s.location || '',
        hasPickup: s.type === 'pickup',
        hasDropoff: s.type === 'delivery',
        customers:
          s.customers?.map((c) => ({
            name: c.name,
            orderId: c.orders?.[0]?.id,
            orderRef: c.orders?.[0]?.id,
          })) || [],
        lines: [],
      };
    });
  }, [stops, geocodedCoords]);

  const routeLegs = useRouteLegs(enrichedStops);
  const stopCount = enrichedStops.length;
  const statusLabel = shipment?.status ? t(shipment.status) : '—';

  return (
    <div className="card map-wrap">
      <div className="map-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span>{t('liveMap')}</span>
        </h3>
        {shipment?.autoId ? (
          <span className="map-selected-sid">#{shipment.autoId}</span>
        ) : null}
      </div>

      <div className="map-body dash-live-map-body">
        {selectedShipmentId == null && (
          <div className="map-placeholder">
            <span>{t('mapSelectLoad')}</span>
          </div>
        )}

        {selectedShipmentId != null && loading && <DashMapSkeleton />}

        {selectedShipmentId != null && !loading && error && (
          <div className="map-placeholder">
            <span>{translateDashMessage(t, error)}</span>
          </div>
        )}

        {selectedShipmentId != null && !loading && !error && enrichedStops.length === 0 && (
          <div className="map-placeholder">
            <span>{t('mapNoStops')}</span>
          </div>
        )}

        {selectedShipmentId != null && !loading && !error && enrichedStops.length > 0 && (
          <RouteMap
            stops={enrichedStops}
            polylinePath={routeLegs.polylinePath}
            directionsResult={routeLegs.directionsResult}
            loading={routeLegs.loading}
            height={300}
            expanded
            t={t as (key: string, params?: Record<string, unknown>) => string}
          />
        )}
      </div>

      {shipment && (
        <div className="map-stats">
          <div className="map-stat">
            <div className="map-stat-val" style={{ color: 'var(--text-primary)' }}>
              {stopCount}
            </div>
            {t('mapStops')}
          </div>
          <div className="map-stat">
            <div className="map-stat-val" style={{ color: 'var(--info)' }}>
              {statusLabel}
            </div>
            {t('status')}
          </div>
        </div>
      )}
    </div>
  );
};

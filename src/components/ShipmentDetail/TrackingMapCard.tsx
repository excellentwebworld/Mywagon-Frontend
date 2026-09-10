import React, { useState, useEffect, useMemo } from 'react';
import { Map, Share2 } from 'lucide-react';
import type {
  TrackingStats,
  TripSummary,
} from '../../pages/ShipmentDetail/detailViewModel';
import type { ShipmentStop } from '../../context/AppContext';
import { CollapsibleCard } from './CollapsibleCard';
import { RouteMap } from '../CreateShipmentWizard/itinerary/RouteMap';
import { useRouteLegs } from '../CreateShipmentWizard/itinerary/useRouteLegs';
import type { EnrichedStop } from '../CreateShipmentWizard/itinerary/types';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';

interface TrackingMapCardProps {
  stops?: ShipmentStop[];
  status: string;
  tracking: TrackingStats;
  trip?: TripSummary;
  isDelayed?: boolean;
  delayText?: string;
  actualRouteCoordinates?: Array<{ lat: number; lng: number }> | null;
  hasActualRoute?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onShare: () => void;
  t: (key: string, fallback?: string) => string;
}

// Fallback coordinate lookups for standard demo & staging locations
const KNOWN_COORDS: Record<string, { lat: number; lng: number }> = {
  kalupur: { lat: 23.0300, lng: 72.5980 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  gota: { lat: 23.0883, lng: 72.5312 },
  iscon: { lat: 23.0278, lng: 72.5074 },
  amritsar: { lat: 31.6340, lng: 74.8723 },
  punjab: { lat: 31.1471, lng: 75.3412 },
  athens: { lat: 37.9838, lng: 23.7275 },
  thessaloniki: { lat: 40.6401, lng: 22.9444 },
  patras: { lat: 38.2466, lng: 21.7346 },
  larissa: { lat: 39.6390, lng: 22.4191 },
  heraklion: { lat: 35.3387, lng: 25.1442 },
};

function guessCoords(text?: string | null): { lat: number; lng: number } | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_COORDS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  return null;
}

/**
 * One map pin per physical itinerary stop (Laravel / StopsCard behavior).
 * Multi-product loads return one API row per product line; without grouping,
 * RouteMap numbers 1..N and stacked pins leave the last labels (e.g. 3, 4) on top.
 */
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

const EMPTY_ENRICHED_STOPS: EnrichedStop[] = [];

export const TrackingMapCard: React.FC<TrackingMapCardProps> = ({
  stops = [],
  status,
  trip,
  isDelayed = false,
  delayText = '+15m delay',
  actualRouteCoordinates = [],
  hasActualRoute = false,
  expanded,
  onToggle,
  onShare,
  t,
}) => {
  const normStatus = (status || '').toLowerCase();
  const isOnTrip = normStatus === 'on_trip' || normStatus === 'in_progress';
  const isCompleted =
    normStatus === 'fullfilled' ||
    normStatus === 'partially_fullfilled' ||
    normStatus === 'delivered' ||
    normStatus === 'not_fullfilled';

  const [routeMode, setRouteMode] = useState<'actual' | 'suggested'>('suggested');
  const [geocodedCoords, setGeocodedCoords] = useState<Record<number, { lat: number; lng: number }>>({});

  // Geocode any stops that are missing coordinates
  useEffect(() => {
    const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
    if (!mapsKey || stops.length === 0) return;

    loadGoogleMaps(mapsKey).then(() => {
      if (!(window as any).google?.maps?.Geocoder) return;
      const geocoder = new (window as any).google.maps.Geocoder();

      stops.forEach((s, idx) => {
        if (s.lat == null || s.lng == null) {
          const query = s.address || s.location;
          if (query && !geocodedCoords[idx]) {
            geocoder.geocode({ address: query }, (results: any, statusCode: any) => {
              if (statusCode === 'OK' && results?.[0]?.geometry?.location) {
                const loc = results[0].geometry.location;
                setGeocodedCoords((prev) => ({
                  ...prev,
                  [idx]: { lat: loc.lat(), lng: loc.lng() },
                }));
              }
            });
          }
        }
      });
    });
  }, [stops]);

  // Convert physical (grouped) stops to EnrichedStop — marker labels = index + 1
  const enrichedStops: EnrichedStop[] = useMemo(() => {
    if (stops.length === 0) return EMPTY_ENRICHED_STOPS;

    return groupPhysicalMapStops(stops).map(({ stop: s, originalIndex }, idx) => {
      let lat = s.lat != null ? Number(s.lat) : geocodedCoords[originalIndex]?.lat ?? null;
      let lng = s.lng != null ? Number(s.lng) : geocodedCoords[originalIndex]?.lng ?? null;

      if (lat == null || lng == null) {
        const guessed = guessCoords(s.address) || guessCoords(s.location);
        if (guessed) {
          lat = guessed.lat;
          lng = guessed.lng;
        }
      }

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

  const activePolylinePath =
    routeMode === 'actual' && actualRouteCoordinates && actualRouteCoordinates.length > 0
      ? actualRouteCoordinates
      : routeLegs.polylinePath;

  const activeDirectionsResult =
    routeMode === 'actual' ? null : routeLegs.directionsResult;

  if (isOnTrip) {
    return (
      <CollapsibleCard
        id="tracking"
        icon={
          <span
            className="rounded-full flex-shrink-0"
            style={{
              width: 8,
              height: 8,
              background: isDelayed ? '#F59E0B' : '#10B981',
              boxShadow: isDelayed ? '0 0 0 3px #FEF3C7' : '0 0 0 3px #D1FAE5',
            }}
            aria-hidden="true"
          />
        }
        title={t('liveTracking', 'Live tracking')}
        expanded={expanded}
        onToggle={onToggle}
      >
        <div>
          {/* Top Status: On Time vs Delayed */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: isDelayed ? '#FEF3C7' : '#ECFDF5',
                color: isDelayed ? '#B45309' : '#059669',
              }}
            >
              <span
                className="rounded-full animate-pulse"
                style={{ width: 6, height: 6, background: 'currentColor' }}
              />
              {isDelayed ? t('delayed', `Delayed (${delayText})`) : t('onTime', 'On Time')}
            </span>
          </div>

          {/* Real Route Map */}
          <div className="rounded-xl overflow-hidden mb-3 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
            <RouteMap
              stops={enrichedStops}
              polylinePath={routeLegs.polylinePath}
              directionsResult={routeLegs.directionsResult}
              loading={routeLegs.loading}
              height={260}
              expanded={expanded}
              t={t as any}
            />
          </div>

          {/* Share live tracking button */}
          <button
            type="button"
            onClick={onShare}
            className="w-full py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
          >
            <Share2 size={13} />
            <span>{t('shareLiveTracking', 'Share live tracking')}</span>
          </button>
        </div>
      </CollapsibleCard>
    );
  }

  // Route map for other statuses (Ready, Scheduled, Pending, Draft, Completed, etc.)
  return (
    <CollapsibleCard
      id="map"
      icon={<Map size={15} />}
      title={t('routeMap', 'Route map')}
      expanded={expanded}
      onToggle={onToggle}
    >
      {/* Final status & Route type toggle: visible for completed shipments */}
      {isCompleted && (
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          {/* Final Delivery Status: On Time vs Delayed */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isDelayed
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span
              className="rounded-full"
              style={{ width: 6, height: 6, background: 'currentColor' }}
            />
            {isDelayed ? t('delayed', `Delayed (${delayText})`) : t('onTime', 'On Time')}
          </span>

          {/* Route toggle */}
          <div className="flex items-center gap-2 p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit">
            <button
              type="button"
              onClick={() => setRouteMode('actual')}
              className={`px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                routeMode === 'actual'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t('actualRoute', 'Actual Route')}
            </button>
            <button
              type="button"
              onClick={() => setRouteMode('suggested')}
              className={`px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                routeMode === 'suggested'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t('suggestedRoute', 'Suggested Route')}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
        <RouteMap
          stops={enrichedStops}
          polylinePath={activePolylinePath}
          directionsResult={activeDirectionsResult}
          loading={routeLegs.loading}
          height={280}
          expanded={expanded}
          t={t as any}
        />
      </div>
    </CollapsibleCard>
  );
};

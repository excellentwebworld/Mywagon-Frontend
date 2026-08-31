import React from 'react';
import { Navigation, Map, Share2, Radio, MapPin } from 'lucide-react';
import type {
  TrackingStats,
  TripSummary,
} from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface TrackingMapCardProps {
  status: string;
  tracking: TrackingStats;
  trip?: TripSummary;
  expanded: boolean;
  onToggle: () => void;
  onShare: () => void;
  t: (key: string, fallback?: string) => string;
}

export const TrackingMapCard: React.FC<TrackingMapCardProps> = ({
  status,
  tracking,
  trip,
  expanded,
  onToggle,
  onShare,
  t,
}) => {
  const normStatus = (status || '').toLowerCase();
  const isOnTrip = normStatus === 'on_trip' || normStatus === 'in_progress';

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
              background: '#10B981',
              boxShadow: '0 0 0 3px #D1FAE5',
            }}
            aria-hidden="true"
          />
        }
        title={t('liveTracking', 'Live tracking')}
        expanded={expanded}
        onToggle={onToggle}
      >
        <div>
          {/* Live stats header */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: '#ECFDF5', color: '#059669' }}
            >
              <span
                className="rounded-full animate-pulse"
                style={{ width: 6, height: 6, background: 'currentColor' }}
              />
              {tracking.movement || 'Moving 68 km/h'}
            </span>
            <span className="text-[11px]" style={{ color: '#8E8E9A' }}>
              {t('lastGpsPing', 'Last GPS ping')}:{' '}
              <strong style={{ color: '#18181B' }}>1 min ago</strong>
            </span>
          </div>

          {/* Map viewport preview */}
          <div
            className="relative rounded-xl overflow-hidden mb-3 bg-[#EEF2F6] flex flex-col items-center justify-center p-4 text-center min-h-[150px]"
            style={{
              border: '1px solid #E4E4E8',
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-md mb-1"
              style={{ color: '#7C3AED' }}
            >
              <Radio size={16} className="animate-pulse" />
            </div>
            <div className="text-[12px] font-semibold" style={{ color: '#18181B' }}>
              {t('liveVehicleTracking', 'Live vehicle on route (E75)')}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: '#8E8E9A' }}>
              {tracking.speed || '68 km/h'} · {tracking.kmRemaining || '87 km'} {t('remaining', 'remaining')}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg" style={{ background: '#F5F5F7' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#8E8E9A' }}>
                {t('distanceRemaining', 'Distance remaining')}
              </div>
              <div className="text-[13px] font-bold mt-0.5" style={{ color: '#18181B' }}>
                {tracking.kmRemaining || '87 km'}
              </div>
            </div>
            <div className="p-2 rounded-lg" style={{ background: '#F5F5F7' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#8E8E9A' }}>
                {t('etaStatus', 'ETA status')}
              </div>
              <div
                className="text-[13px] font-bold mt-0.5"
                style={{
                  color: tracking.etaVariance?.includes('delay') || tracking.etaVariance?.includes('+') ? '#D97706' : '#059669',
                }}
              >
                {tracking.etaVariance || 'On time'}
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={onShare}
            className="w-full mt-3 py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-black/5 cursor-pointer"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E8',
              color: '#5E5E6E',
            }}
          >
            <Share2 size={13} />
            <span>{t('shareTrackingLink', 'Share live tracking link')}</span>
          </button>
        </div>
      </CollapsibleCard>
    );
  }

  // Not on-trip: Route map preview
  return (
    <CollapsibleCard
      id="map"
      icon={<Map size={15} />}
      title={t('routeMap', 'Route map')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div>
        <div
          className="relative rounded-xl overflow-hidden bg-[#EEF2F6] flex flex-col items-center justify-center p-4 text-center min-h-[140px]"
          style={{
            border: '1px solid #E4E4E8',
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-md mb-1"
            style={{ color: '#9B51E0' }}
          >
            <MapPin size={16} />
          </div>
          <div className="text-[12px] font-semibold" style={{ color: '#18181B' }}>
            {t('plannedRoutePreview', 'Planned Route Preview')}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: '#8E8E9A' }}>
            {trip ? `${trip.distanceKm} km · ${trip.duration} ${t('transit', 'transit')}` : 'Transit route planned'}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
};

import React from 'react';
import { Map, Share2, Radio, MapPin, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type {
  TrackingStats,
  TripSummary,
} from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface TrackingMapCardProps {
  status: string;
  tracking: TrackingStats;
  trip?: TripSummary;
  isDelayed?: boolean;
  delayText?: string;
  expanded: boolean;
  onToggle: () => void;
  onShare: () => void;
  onReportDelay?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const TrackingMapCard: React.FC<TrackingMapCardProps> = ({
  status,
  tracking,
  trip,
  isDelayed = false,
  delayText = '+15 min delay',
  expanded,
  onToggle,
  onShare,
  onReportDelay,
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

            {onReportDelay && (
              <button
                type="button"
                onClick={onReportDelay}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#D97706] hover:underline cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                <Clock size={12} />
                <span>{t('reportDelay', 'Report delay')}</span>
              </button>
            )}
          </div>

          {/* Map Viewport Preview */}
          <div
            className="relative rounded-xl overflow-hidden mb-3 bg-[#EEF2F6] flex flex-col items-center justify-center p-4 text-center min-h-[160px]"
            style={{
              border: '1px solid #E4E4E8',
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-md mb-1.5"
              style={{ color: '#7C3AED' }}
            >
              <Radio size={18} className="animate-pulse" />
            </div>
            <div className="text-[13px] font-bold text-[#18181B]">
              {t('vehicleActiveOnRoute', 'Vehicle active on route (E75 highway)')}
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              {trip ? `${trip.distanceKm} km · ${trip.duration}` : 'Live GPS telemetry streaming'}
            </div>
          </div>

          {/* Performance on this Load */}
          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
              {t('performanceOnThisLoad', 'Performance on this load')}
            </div>
            <div className="flex items-center justify-between text-[12px] font-medium text-[#18181B] flex-wrap gap-2">
              <span className="flex items-center gap-1 text-[#059669]">
                <CheckCircle2 size={13} />
                <span>{t('pickupOnTime', 'Pickup completed on schedule')}</span>
              </span>
              <span className="text-[11px] text-[#64748B]">
                {t('drivingSpeedNormal', 'Normal transit speed')}
              </span>
            </div>
          </div>

          {/* Share live tracking button */}
          <button
            type="button"
            onClick={onShare}
            className="w-full py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-black/5 cursor-pointer"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E8',
              color: '#5E5E6E',
            }}
          >
            <Share2 size={13} />
            <span>{t('shareLiveTracking', 'Share live tracking')}</span>
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
          className="relative rounded-xl overflow-hidden bg-[#EEF2F6] flex flex-col items-center justify-center p-4 text-center min-h-[160px]"
          style={{
            border: '1px solid #E4E4E8',
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-md mb-1.5"
            style={{ color: '#9B51E0' }}
          >
            <MapPin size={18} />
          </div>
          <div className="text-[13px] font-bold text-[#18181B]">
            {t('plannedRoutePreview', 'Planned Route Preview')}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">
            {trip ? `${trip.distanceKm} km · ${trip.duration} transit` : 'Itinerary itinerary route'}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
};

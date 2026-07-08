import React from 'react';
import type { TrackingStats } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface TrackingCardProps {
  tracking: TrackingStats;
  expanded: boolean;
  onToggle: () => void;
  onShare: () => void;
  t: (key: string) => string;
}

export const TrackingCard: React.FC<TrackingCardProps> = ({
  tracking,
  expanded,
  onToggle,
  onShare,
  t,
}) => (
  <CollapsibleCard id="tracking" title={<>📡 {t('liveTracking')}</>} expanded={expanded} onToggle={onToggle}>
    <div className="ld-tk-stat">
      <div className="ld-tk-item">
        <label>{t('movement')}</label>
        <div className="val" style={{ color: 'var(--success)' }}>
          {tracking.movement}
        </div>
      </div>
      <div className="ld-tk-item">
        <label>{t('etaVariance')}</label>
        <div className="val" style={{ color: tracking.etaVariance === 'On time' ? 'var(--success)' : 'var(--warning)' }}>
          {tracking.etaVariance}
        </div>
      </div>
      <div className="ld-tk-item">
        <label>{t('kmRemaining')}</label>
        <div className="val">{tracking.kmRemaining}</div>
      </div>
      <div className="ld-tk-item">
        <label>{t('speed')}</label>
        <div className="val">{tracking.speed}</div>
      </div>
    </div>
    <div className="ld-tk-map">
      <div style={{ fontSize: 24, opacity: 0.3 }}>📍</div>
      <div>{t('routePreview')}</div>
      <div>Google Maps / Mapbox embed</div>
    </div>
    <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={onShare}>
      🔗 {t('shareTracking')}
    </button>
  </CollapsibleCard>
);

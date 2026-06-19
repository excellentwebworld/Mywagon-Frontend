import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export const LiveMap: React.FC = () => {
  const { t } = useTranslation();
  const [mapFilter, setMapFilter] = useState<'all' | 'at_risk' | 'delayed'>('all');

  const inTransitCount = 3;
  const atRiskCount = 1;
  const avgEta = "2.4h";

  const getActiveShipmentsText = () => {
    if (mapFilter === 'all') {
      return t('mapActiveAll');
    } else if (mapFilter === 'at_risk') {
      return t('mapActiveAtRisk');
    }
    return t('mapActiveDelayed');
  };

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
        <div className="map-toggle">
          <button
            className={`map-tog-btn ${mapFilter === 'all' ? 'active' : ''}`}
            onClick={() => setMapFilter('all')}
          >
            {t('all')}
          </button>
          <button
            className={`map-tog-btn ${mapFilter === 'at_risk' ? 'active' : ''}`}
            onClick={() => setMapFilter('at_risk')}
          >
            {t('atRisk')}
          </button>
          <button
            className={`map-tog-btn ${mapFilter === 'delayed' ? 'active' : ''}`}
            onClick={() => setMapFilter('delayed')}
          >
            {t('delayed')}
          </button>
        </div>
      </div>
      <div className="map-body" style={{ minHeight: '340px' }}>
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ zIndex: 1, opacity: 0.8 }}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span style={{ fontWeight: 500, zIndex: 1 }}>{getActiveShipmentsText()}</span>
        <span style={{ fontSize: '11px', opacity: 0.5, zIndex: 1 }}>
          {t('mapEmbed')}
        </span>

        <div className="map-stats" style={{ zIndex: 1 }}>
          <div className="map-stat">
            <div className="map-stat-val" style={{ color: 'var(--info)' }}>{inTransitCount}</div>
            {t('inTransit')}
          </div>
          <div className="map-stat">
            <div className="map-stat-val" style={{ color: 'var(--danger)' }}>{atRiskCount}</div>
            {t('atRisk')}
          </div>
          <div className="map-stat">
            <div className="map-stat-val" style={{ color: 'var(--text-primary)' }}>{avgEta}</div>
            {t('avgEta')}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { AvailableTruck, DrawerMode } from '../../pages/SearchTrucks/types';

interface AvailabilityDetailPanelProps {
  truck: AvailableTruck;
  onClose: () => void;
  onBook: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  onMessage: (carrier: string) => void;
  onProfile: () => void;
  t: (key: string) => string;
}

export const AvailabilityDetailPanel: React.FC<AvailabilityDetailPanelProps> = ({
  truck,
  onClose,
  onBook,
  onMessage,
  onProfile,
  t,
}) => {
  const preferredTag = truck.preferred ? (
    <span className="sat-bg sat-bg-ac" style={{ fontSize: 9, marginLeft: 4 }}>
      {t('satPreferred')}
    </span>
  ) : null;

  return (
    <div className="sat-detail-overlay" role="dialog" aria-modal="true" aria-label={t('satProviderProfile')}>
      <button type="button" className="sat-detail-close" onClick={onClose} aria-label={t('close')}>
        ✕
      </button>

      <div className="sat-detail-scroll">
        <div className="sat-exp-section">
          <h4>🚛 {t('satProviderProfile')}</h4>
          <div className="sat-cr-cell" style={{ marginBottom: 10 }}>
            <div className="sat-cr-av" style={{ width: 40, height: 40, fontSize: 14 }}>
              {truck.initials}
            </div>
            <div>
              <div className="sat-cr-name" style={{ fontSize: 15 }}>
                {truck.carrier}
              </div>
              <div className="sat-cr-rate">
                ★ {truck.rating.toFixed(1)} · {truck.type}
                {preferredTag}
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {truck.price != null ? (
                <span className="sat-price" style={{ fontSize: 20 }}>
                  € {truck.price.toLocaleString()}
                </span>
              ) : (
                <span className="sat-offer-b">{t('satOfferBased')}</span>
              )}
            </div>
          </div>
          <div className="sat-exp-stat">
            <span>{t('satOnTimePickup')}</span>
            <span style={{ color: 'var(--success)' }}>{truck.onTimePickup ?? 94}%</span>
          </div>
          <div className="sat-exp-stat">
            <span>{t('satCancellationRate')}</span>
            <span>{truck.cancellationRate ?? 3}%</span>
          </div>
          <div className="sat-exp-stat">
            <span>{t('satAvgResponse')}</span>
            <span>{truck.avgResponseMin ?? 18} min</span>
          </div>
          <div className="sat-exp-actions">
            <button type="button" className="sat-btn sat-btn-sm" onClick={() => onMessage(truck.carrier)}>
              💬 {t('satMessage')}
            </button>
            <button type="button" className="sat-btn sat-btn-sm" onClick={onProfile}>
              👤 {t('satProfile')}
            </button>
          </div>
        </div>

        <div className="sat-mp-route">
          <div className="sat-mp-stop">
            <div className="sat-mp-stop-label">{t('satColPickup')}</div>
            <div className="sat-mp-stop-city">{truck.pickup}</div>
            <div className="sat-mp-stop-dt">
              {truck.startDt} {truck.startTm}
            </div>
          </div>
          <span className="sat-card-arrow">→</span>
          <div className="sat-mp-stop">
            <div className="sat-mp-stop-label">{t('satColDest')}</div>
            <div className="sat-mp-stop-city">
              {truck.dest === 'Any' ? t('satAnyDirection') : truck.dest}
            </div>
            <div className="sat-mp-stop-dt">
              {truck.endDt} {truck.endTm}
            </div>
          </div>
        </div>

        <div className="sat-mp-chips">
          <span className="sat-mp-chip">
            {truck.truckType} · {truck.specs}
          </span>
          <span className="sat-mp-chip">{truck.capacity}</span>
          <span className="sat-mp-chip">{truck.trip}</span>
        </div>

        {truck.recurring && truck.occurrences.length > 0 ? (
          <div className="sat-exp-section" style={{ marginTop: 14 }}>
            <h4>
              🔁 {t('satOccurrences')} ({truck.occurrences.length})
            </h4>
            {truck.occurrences.map((occ) => (
              <div key={occ} className="sat-occ-item">
                <span>📅 {occ}</span>
                <button type="button" onClick={() => onBook(truck, 'pending', occ)}>
                  {t('satBookThis')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="sat-exp-section" style={{ marginTop: 14 }}>
            <h4>ℹ️ {t('satCompatibility')}</h4>
            <div className="sat-exp-stat">
              <span>{t('satMultiStop')}</span>
              <span>{truck.trip === 'Multi-stop OK' ? '✅ Yes' : '❌ No'}</span>
            </div>
            <div className="sat-exp-stat">
              <span>{t('satCapacity')}</span>
              <span>{truck.capacity}</span>
            </div>
            <div className="sat-exp-stat">
              <span>{t('satRadiusFromPickup')}</span>
              <span>{truck.radius} km</span>
            </div>
          </div>
        )}

        <button type="button" className="sat-btn sat-btn-pr sat-btn-block" style={{ marginTop: 14 }} onClick={() => onBook(truck, 'pending')}>
          📋 {t('satBookPending')}
        </button>
        <button type="button" className="sat-btn sat-btn-block" onClick={() => onBook(truck, 'new')}>
          + {t('satCreateNewForThis')}
        </button>
      </div>
    </div>
  );
};

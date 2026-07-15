import React from 'react';
import type { AvailableTruck, DrawerMode } from '../../pages/SearchTrucks/types';

interface ExpansionPanelProps {
  truck: AvailableTruck;
  onBook: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  onMessage: (carrier: string) => void;
  onProfile: () => void;
  t: (key: string) => string;
}

export const ExpansionPanel: React.FC<ExpansionPanelProps> = ({
  truck,
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
    <tr className="sat-exp">
      <td colSpan={10}>
        <div className="sat-exp-inner">
          <div className="sat-exp-section">
            <h4>🚛 {t('satProviderProfile')}</h4>
            <div className="sat-cr-cell" style={{ marginBottom: 10 }}>
              <div className="sat-cr-av" style={{ width: 36, height: 36, fontSize: 13 }}>
                {truck.initials}
              </div>
              <div>
                <div className="sat-cr-name" style={{ fontSize: 14 }}>
                  {truck.carrier}
                </div>
                <div className="sat-cr-rate">
                  ★ {truck.rating.toFixed(1)} · {truck.type}
                  {preferredTag}
                </div>
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
              <button
                type="button"
                className="sat-btn sat-btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage(truck.carrier);
                }}
              >
                💬 {t('satMessage')}
              </button>
              <button
                type="button"
                className="sat-btn sat-btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onProfile();
                }}
              >
                👤 {t('satProfile')}
              </button>
            </div>
          </div>

          {truck.recurring && truck.occurrences.length > 0 ? (
            <div className="sat-exp-section">
              <h4>
                🔁 {t('satOccurrences')} ({truck.occurrences.length})
              </h4>
              {truck.occurrences.map((occ) => (
                <div key={occ} className="sat-occ-item">
                  <span>📅 {occ}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBook(truck, 'pending', occ);
                    }}
                  >
                    {t('satBookThis')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="sat-exp-section">
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
              <div className="sat-exp-stat">
                <span>{t('satDestConstraint')}</span>
                <span>{truck.dest}</span>
              </div>
            </div>
          )}

          <div className="sat-exp-section">
            <h4>⚡ {t('satQuickActions')}</h4>
            <button
              type="button"
              className="sat-btn sat-btn-block"
              onClick={(e) => {
                e.stopPropagation();
                onBook(truck, 'pending');
              }}
            >
              📋 {t('satBookPending')}
            </button>
            <button
              type="button"
              className="sat-btn sat-btn-block"
              onClick={(e) => {
                e.stopPropagation();
                onBook(truck, 'new');
              }}
            >
              + {t('satCreateNewForThis')}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

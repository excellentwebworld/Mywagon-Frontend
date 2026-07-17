import React, { useEffect, useState } from 'react';
import { availabilitiesService } from '../../api';
import { mapListItemToTruck } from '../../api/mappers/availabilitiesMapper';
import type { AvailableTruck, DrawerMode } from '../../pages/SearchTrucks/types';
import { formatMoney } from '../../pages/SearchTrucks/utils/money';

interface AvailabilityDetailPanelProps {
  truck: AvailableTruck;
  onClose: () => void;
  onBook: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  onMessage: (carrier: string) => void;
  onProfile: (truck: AvailableTruck) => void;
  creatingShipment?: boolean;
  t: (key: string) => string;
}

function formatStatPct(value: number | null | undefined): string {
  return value == null ? '—' : `${value}%`;
}

function DetailPanelSkeleton({
  onClose,
  t,
}: {
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className="sat-detail-overlay"
      role="status"
      aria-busy="true"
      aria-label={t('satCreatingShipment') || 'Opening Create Shipment…'}
    >
      <button type="button" className="sat-detail-close" onClick={onClose} aria-label={t('close')}>
        ✕
      </button>

      <div className="sat-detail-scroll sat-detail-skeleton">
        <div className="sat-exp-section">
          <div className="sat-sk-line sat-sk-line--section" />
          <div className="sat-detail-sk-profile">
            <div className="sat-sk-avatar" />
            <div className="sat-detail-sk-profile-text">
              <div className="sat-sk-line sat-sk-line--md" />
              <div className="sat-sk-line sat-sk-line--sm" />
            </div>
            <div className="sat-sk-line sat-sk-line--price" />
          </div>
          <div className="sat-detail-sk-stat">
            <div className="sat-sk-line sat-sk-line--label" />
            <div className="sat-sk-line sat-sk-line--xs" />
          </div>
          <div className="sat-detail-sk-stat">
            <div className="sat-sk-line sat-sk-line--label" />
            <div className="sat-sk-line sat-sk-line--xs" />
          </div>
          <div className="sat-detail-sk-stat">
            <div className="sat-sk-line sat-sk-line--label" />
            <div className="sat-sk-line sat-sk-line--xs" />
          </div>
          <div className="sat-detail-sk-actions">
            <div className="sat-sk-btn sat-sk-btn--sm" />
            <div className="sat-sk-btn sat-sk-btn--sm" />
          </div>
        </div>

        <div className="sat-detail-sk-route">
          <div className="sat-detail-sk-stop">
            <div className="sat-sk-line sat-sk-line--xs" />
            <div className="sat-sk-line sat-sk-line--md" />
            <div className="sat-sk-line sat-sk-line--sm" />
          </div>
          <div className="sat-sk-arrow" />
          <div className="sat-detail-sk-stop">
            <div className="sat-sk-line sat-sk-line--xs" />
            <div className="sat-sk-line sat-sk-line--md" />
            <div className="sat-sk-line sat-sk-line--sm" />
          </div>
        </div>

        <div className="sat-detail-sk-chips">
          <div className="sat-sk-chip" />
          <div className="sat-sk-chip sat-sk-chip--sm" />
          <div className="sat-sk-chip sat-sk-chip--md" />
        </div>

        <div className="sat-exp-section" style={{ marginTop: 14 }}>
          <div className="sat-sk-line sat-sk-line--section" />
          <div className="sat-detail-sk-stat">
            <div className="sat-sk-line sat-sk-line--label" />
            <div className="sat-sk-line sat-sk-line--xs" />
          </div>
          <div className="sat-detail-sk-stat">
            <div className="sat-sk-line sat-sk-line--label" />
            <div className="sat-sk-line sat-sk-line--xs" />
          </div>
          <div className="sat-detail-sk-stat">
            <div className="sat-sk-line sat-sk-line--label" />
            <div className="sat-sk-line sat-sk-line--xs" />
          </div>
        </div>

        <div className="sat-sk-btn sat-sk-btn--block" style={{ marginTop: 14 }} />
        <div className="sat-sk-btn sat-sk-btn--block sat-sk-btn--outline" />
        <div className="sat-detail-sk-hint">
          {t('satCreatingShipment') || 'Opening Create Shipment…'}
        </div>
      </div>
    </div>
  );
}

export const AvailabilityDetailPanel: React.FC<AvailabilityDetailPanelProps> = ({
  truck,
  onClose,
  onBook,
  onMessage,
  onProfile,
  creatingShipment = false,
  t,
}) => {
  const [detailTruck, setDetailTruck] = useState<AvailableTruck>(truck);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setDetailTruck(truck);
    setStatsLoading(true);
    let cancelled = false;
    const id = Number(truck.id);
    if (!Number.isFinite(id)) {
      setStatsLoading(false);
      return;
    }

    availabilitiesService
      .get(id)
      .then((detail) => {
        if (cancelled) return;
        const mapped = mapListItemToTruck(detail);
        setDetailTruck((prev) => ({
          ...prev,
          ...mapped,
          // Keep list-only UX fields that detail may not enrich.
          bidSent: prev.bidSent,
          occurrences: prev.occurrences?.length ? prev.occurrences : mapped.occurrences,
          recurrenceLabel: prev.recurrenceLabel || mapped.recurrenceLabel,
        }));
      })
      .catch(() => {
        /* keep list snapshot; stats stay unknown (—) */
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [truck.id]);

  if (creatingShipment) {
    return <DetailPanelSkeleton onClose={onClose} t={t} />;
  }

  const preferredTag = detailTruck.preferred ? (
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
              {detailTruck.initials}
            </div>
            <div>
              <div className="sat-cr-name" style={{ fontSize: 15 }}>
                {detailTruck.carrier}
              </div>
              <div className="sat-cr-rate">
                ★ {detailTruck.rating.toFixed(1)} · {detailTruck.type}
                {preferredTag}
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {detailTruck.price != null && !detailTruck.priceBlurred ? (
                <span className="sat-price" style={{ fontSize: 20 }}>
                  {formatMoney(detailTruck.price, detailTruck.currency)}
                </span>
              ) : (
                <span className="sat-offer-b">{t('satOfferBased')}</span>
              )}
            </div>
          </div>
          <div
            className="sat-exp-stats"
            aria-busy={statsLoading || undefined}
            aria-live="polite"
          >
            <div className="sat-exp-stat">
              <span>{t('satOnTimeDelivery') || t('satOnTimePickup')}</span>
              {statsLoading ? (
                <span className="sat-exp-stat-skel" aria-hidden />
              ) : (
                <span
                  style={{
                    color:
                      detailTruck.onTimeDeliveryPct != null
                        ? 'var(--success)'
                        : 'var(--text-tertiary)',
                  }}
                >
                  {formatStatPct(detailTruck.onTimeDeliveryPct)}
                </span>
              )}
            </div>
            <div className="sat-exp-stat">
              <span>{t('satCancellationRate')}</span>
              {statsLoading ? (
                <span className="sat-exp-stat-skel" aria-hidden />
              ) : (
                <span
                  style={{
                    color:
                      detailTruck.cancellationRate == null
                        ? 'var(--text-tertiary)'
                        : undefined,
                  }}
                >
                  {formatStatPct(detailTruck.cancellationRate)}
                </span>
              )}
            </div>
          </div>
          <div className="sat-exp-actions">
            <button
              type="button"
              className="sat-btn sat-btn-sm"
              disabled
              title={t('satActionComingSoon') || 'Coming soon'}
              onClick={() => onMessage(detailTruck.carrier)}
            >
              💬 {t('satMessage')}
            </button>
            <button
              type="button"
              className="sat-btn sat-btn-sm"
              disabled={statsLoading}
              onClick={() => onProfile(detailTruck)}
            >
              👤 {t('satProfile')}
            </button>
          </div>
        </div>

        <div className="sat-mp-route">
          <div className="sat-mp-stop">
            <div className="sat-mp-stop-label">{t('satColPickup')}</div>
            <div className="sat-mp-stop-city">{detailTruck.pickup}</div>
            <div className="sat-mp-stop-dt">
              {detailTruck.startDt} {detailTruck.startTm}
            </div>
          </div>
          <span className="sat-card-arrow">→</span>
          <div className="sat-mp-stop">
            <div className="sat-mp-stop-label">{t('satColDest')}</div>
            <div className="sat-mp-stop-city">
              {detailTruck.dest === 'Any' ? t('satAnyDirection') : detailTruck.dest}
            </div>
          </div>
        </div>

        <div className="sat-mp-chips">
          <span className="sat-mp-chip">
            {detailTruck.truckType} · {detailTruck.specs}
          </span>
          <span className="sat-mp-chip">{detailTruck.capacity}</span>
          <span className="sat-mp-chip">{detailTruck.trip}</span>
        </div>

        {detailTruck.recurring && detailTruck.occurrences.length > 0 ? (
          <div className="sat-exp-section" style={{ marginTop: 14 }}>
            <h4>
              🔁 {t('satOccurrences')} ({detailTruck.occurrences.length})
            </h4>
            {detailTruck.occurrences.map((occ) => (
              <div key={occ} className="sat-occ-item">
                <span>📅 {occ}</span>
                <button
                  type="button"
                  disabled={creatingShipment}
                  onClick={() => onBook(detailTruck, 'pending', occ)}
                >
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
              <span>{detailTruck.multiStop ? `✅ ${t('yes') || 'Yes'}` : `❌ ${t('no') || 'No'}`}</span>
            </div>
            <div className="sat-exp-stat">
              <span>{t('satCapacity')}</span>
              <span>{detailTruck.capacity}</span>
            </div>
            <div className="sat-exp-stat">
              <span>{t('satRadiusFromPickup')}</span>
              <span>{detailTruck.radius} km</span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="sat-btn sat-btn-pr sat-btn-block"
          style={{ marginTop: 14 }}
          disabled={creatingShipment}
          onClick={() => onBook(detailTruck, 'pending')}
        >
          📋 {t('satBookPending')}
        </button>
        <button
          type="button"
          className="sat-btn sat-btn-block"
          disabled={creatingShipment}
          onClick={() => onBook(detailTruck, 'new')}
        >
          + {t('satCreateNewForThis')}
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  statusBadgeClass,
} from '../../pages/ManageShipments/utils/listingUtils';
import { formatUtcToDisplayDateTime } from '../../utils/timezone';
import { ExpHeading } from './ExpHeading';
import { ExpRefreshButton } from './ExpRefreshButton';
import { ItineraryPreview } from './ItineraryPreview';
import {
  OrdersBlock,
  ProgressTimeline,
  QuickActions,
  StatusDetailGrid,
} from './ExpansionShared';
import { CarrierAvatar } from './CarrierAvatar';

interface RowExpansionStatusProps {
  shipment: Shipment;
  detailLoading?: boolean;
  onRefresh?: () => void;
  onEdit: () => void;
  onViewNewTab: () => void;
  onCancel: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const RowExpansionStatus: React.FC<RowExpansionStatusProps> = ({
  shipment,
  detailLoading = false,
  onRefresh,
  onEdit,
  onViewNewTab,
  onCancel,
  t,
}) => {
  const [qaBusy, setQaBusy] = useState<'edit' | 'view' | 'cancel' | null>(null);
  const priceType = shipment.price_type === 'contract' ? 'contract' : 'spot';
  const priceLabel = formatEuro(shipment.agreedPrice ?? shipment.quotedPrice);

  const runQa = (key: NonNullable<typeof qaBusy>, fn: () => void) => {
    if (qaBusy) return;
    setQaBusy(key);
    try {
      fn();
    } finally {
      window.setTimeout(() => setQaBusy(null), 400);
    }
  };

  return (
    <div className={`exp-inner exp-status-only${detailLoading ? ' is-refreshing' : ''}`}>
      <div className="exp-section">
        <div className="exp-section-head">
          <ExpHeading icon="progress">
            {t('progress')} —{' '}
            <span
              className={statusBadgeClass(shipment.status, Boolean(shipment.at_risk), {
                bidsReceived: shipment.bidsReceived ?? 0,
                bidsSent: shipment.bidsSent ?? 0,
                interestedCount: shipment.interestedCount ?? 0,
              })}
            >
              {t(shipment.status)}
            </span>
          </ExpHeading>
          <div className="exp-head-actions">
            <QuickActions
              shipment={shipment}
              busy={qaBusy}
              onEdit={() => runQa('edit', onEdit)}
              onView={() => runQa('view', onViewNewTab)}
              onCancel={() => runQa('cancel', onCancel)}
              t={t}
            />
            {onRefresh ? (
              <ExpRefreshButton loading={detailLoading} onRefresh={onRefresh} t={t} />
            ) : null}
          </div>
        </div>
        <ProgressTimeline
          shipment={shipment}
          t={t}
          enlarged
          loading={false}
        />

        <StatusDetailGrid shipment={shipment} t={t} />

        <div className="exp-below-grid">
          <div className="exp-below-left">
            <ExpHeading icon="carrier">{t('assignedTransporter')}</ExpHeading>
            {shipment.carrier ? (
              <div className="carrier-card">
                <CarrierAvatar
                  className="cc-av"
                  name={shipment.carrier}
                  initials={shipment.carrier_init}
                  avatar={shipment.carrierAvatar}
                />
                <div className="cc-info">
                  <div className="cc-name">{shipment.carrier}</div>
                  {(shipment.updatedAt || shipment.updated) && (
                    <div className="cc-meta">
                      {t('assigned')} ·{' '}
                      {formatUtcToDisplayDateTime(shipment.updatedAt || shipment.updated || '') || '—'}
                    </div>
                  )}
                </div>
                <div className="cc-price">
                  {priceLabel && <span className="price">{priceLabel}</span>}
                  {priceLabel && (
                    <span className={priceType === 'spot' ? 'chip-spot' : 'chip-cont'}>
                      {t(priceType)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="carrier-empty">{t('noCarrierAssigned')}</div>
            )}

            <OrdersBlock shipment={shipment} t={t} showHeading />
          </div>

          <div className="exp-below-right">
            <ItineraryPreview
              stops={shipment.stops}
              origin={shipment.origin}
              dest={shipment.dest}
              pickDt={shipment.pickDt}
              delDt={shipment.delDt}
              shipmentStatus={shipment.status}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

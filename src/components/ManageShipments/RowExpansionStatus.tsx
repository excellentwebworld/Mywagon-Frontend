import React, { useState } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  formatRelativeAgo,
  statusBadgeClass,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ExpHeading } from './ExpHeading';
import { ExpRefreshButton } from './ExpRefreshButton';
import { ItineraryPreview } from './ItineraryPreview';
import {
  OrdersBlock,
  ProgressTimeline,
  QuickActions,
  StatusDetailGrid,
  ordersHeaderMeta,
} from './ExpansionShared';

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
  const ordersMeta = ordersHeaderMeta(shipment, t);
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
            <span className={`badge ${statusBadgeClass(shipment.status)}`}>
              <span className="bdot" />
              {t(shipment.status)}
            </span>
          </ExpHeading>
          {onRefresh ? (
            <ExpRefreshButton loading={detailLoading} onRefresh={onRefresh} t={t} />
          ) : null}
        </div>
        <ProgressTimeline
          shipment={shipment}
          t={t}
          enlarged
          loading={false}
        />

        <StatusDetailGrid shipment={shipment} t={t} />

        {shipment.at_risk && !shipment.carrier && (
          <div className="exp-risk">
            <span className="badge badge-danger" style={{ fontSize: 12, padding: '6px 12px' }}>
              <span className="bdot" />
              {shipment.riskReason || t('riskPickupOverdue')}
            </span>
          </div>
        )}

        <ExpHeading icon="carrier" className="exp-h-gap">
          {t('assignedTransporter')}
        </ExpHeading>
        {shipment.carrier ? (
          <div className="carrier-card">
            <div className="cc-av">
              {shipment.carrier_init || shipment.carrier.substring(0, 2).toUpperCase()}
            </div>
            <div className="cc-info">
              <div className="cc-name">{shipment.carrier}</div>
              {(shipment.updatedAt || shipment.updated) && (
                <div className="cc-meta">
                  {t('assigned')} · {formatRelativeAgo(shipment.updatedAt || shipment.updated, t)}
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

        <ExpHeading icon="orders" className="exp-h-gap">
          {ordersMeta.label}
        </ExpHeading>
        <OrdersBlock shipment={shipment} t={t} />
        <ItineraryPreview
          stops={shipment.stops}
          origin={shipment.origin}
          dest={shipment.dest}
          pickDt={shipment.pickDt}
          delDt={shipment.delDt}
          t={t}
        />
      </div>

      <div className="exp-section exp-qa-col">
        <ExpHeading icon="qa">{t('quickActions')}</ExpHeading>
        <QuickActions
          busy={qaBusy}
          onEdit={() => runQa('edit', onEdit)}
          onView={() => runQa('view', onViewNewTab)}
          onCancel={() => runQa('cancel', onCancel)}
          t={t}
        />
      </div>
    </div>
  );
};

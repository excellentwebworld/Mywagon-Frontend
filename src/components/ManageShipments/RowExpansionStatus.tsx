import React from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  statusBadgeClass,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ExpHeading } from './ExpHeading';
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
  onEdit: () => void;
  onViewNewTab: () => void;
  onCancel: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const RowExpansionStatus: React.FC<RowExpansionStatusProps> = ({
  shipment,
  detailLoading = false,
  onEdit,
  onViewNewTab: _onViewNewTab,
  onCancel,
  t,
}) => {
  const ordersMeta = ordersHeaderMeta(shipment, t);
  const priceType = shipment.price_type === 'contract' ? 'contract' : 'spot';
  const priceLabel = formatEuro(shipment.agreedPrice ?? shipment.quotedPrice);

  return (
    <div className="exp-inner exp-status-only">
      <div className="exp-section">
        <ExpHeading icon="progress">
          {t('progress')} —{' '}
          <span className={`badge ${statusBadgeClass(shipment.status)}`}>
            <span className="bdot" />
            {t(shipment.status)}
          </span>
        </ExpHeading>
        <ProgressTimeline
          shipment={shipment}
          t={t}
          enlarged
          loading={detailLoading}
        />

        <StatusDetailGrid shipment={shipment} t={t} />

        {shipment.at_risk && shipment.riskReason && (
          <div className="exp-risk">
            <span className="badge badge-danger" style={{ fontSize: 12, padding: '6px 12px' }}>
              <span className="bdot" />
              {shipment.riskReason}
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
              {shipment.updated && (
                <div className="cc-meta">
                  {t('assigned')} · {shipment.updated}
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
      </div>

      <div className="exp-section exp-qa-col">
        <ExpHeading icon="qa">{t('quickActions')}</ExpHeading>
        <QuickActions onEdit={onEdit} onCancel={onCancel} t={t} />
      </div>
    </div>
  );
};

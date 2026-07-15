import React from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  statusBadgeClass,
} from '../../pages/ManageShipments/utils/listingUtils';
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
  onViewNewTab,
  onCancel,
  t,
}) => {
  const ordersMeta = ordersHeaderMeta(shipment, t);

  return (
    <div className="exp-inner exp-status-only">
      <div className="exp-section">
        <h4>
          {t('progress')} —{' '}
          <span className={`badge ${statusBadgeClass(shipment.status)}`}>
            <span className="bdot" />
            {t(shipment.status)}
          </span>
        </h4>
        <ProgressTimeline
          shipment={shipment}
          t={t}
          enlarged
          loading={detailLoading}
        />

        <StatusDetailGrid shipment={shipment} t={t} />

        <h4 style={{ marginTop: 8 }}>{t('assignedTransporter')}</h4>
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
              <span className="price">
                {formatEuro(shipment.agreedPrice ?? shipment.quotedPrice) ?? '—'}
              </span>
            </div>
          </div>
        ) : (
          <div className="carrier-empty">{t('noCarrierAssigned')}</div>
        )}

        <h4 style={{ marginTop: 12 }}>{ordersMeta.label}</h4>
        <OrdersBlock shipment={shipment} t={t} />
      </div>

      <div className="exp-section">
        <h4>{t('quickActions')}</h4>
        <QuickActions onEdit={onEdit} onView={onViewNewTab} onCancel={onCancel} t={t} />
      </div>
    </div>
  );
};

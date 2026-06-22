import React from 'react';
import type { ErpOrder } from '../../pages/ErpOrders/types';

const fmtD = (d: string) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

type Props = {
  t: (key: string) => string;
  order: ErpOrder | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onEdit: (order: ErpOrder) => void;
  statusLabel: (status: ErpOrder['status']) => string;
};

export const OrderDetailDrawer: React.FC<Props> = ({ t, order, loading, open, onClose, onEdit, statusLabel }) => {
  if (!open) return null;

  return (
    <div className={`drawer-bg${open ? ' show' : ''}`} onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-hd">
          <div>
            <div className="drawer-title">{order?.orderReference ?? t('erpOrdersDetail')}</div>
            {order && (
              <span className={`st st-${order.status.replace('_', '-')}`}>{statusLabel(order.status)}</span>
            )}
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {loading || !order ? (
            <div style={{ padding: 24 }}>{t('loading')}</div>
          ) : (
            <>
              {!order.canEdit && (
                <div className="erp-drawer-banner">{t('erpOrdersEditLocked')}</div>
              )}
              <div className="dm-grid">
                <div className="dm-item">
                  <div className="dm-label">{t('erpOrdersColCustomer')}</div>
                  <div className="dm-val">{order.customerName}</div>
                </div>
                <div className="dm-item">
                  <div className="dm-label">{t('erpOrdersErpId')}</div>
                  <div className="dm-val">{order.erpReference || '—'}</div>
                </div>
                <div className="dm-item">
                  <div className="dm-label">{t('erpOrdersColShipFrom')}</div>
                  <div className="dm-val">{order.shipFrom || '—'}</div>
                </div>
                <div className="dm-item">
                  <div className="dm-label">{t('erpOrdersColShipTo')}</div>
                  <div className="dm-val">{order.shipTo || '—'}</div>
                </div>
                <div className="dm-item">
                  <div className="dm-label">{t('erpOrdersShipDate')}</div>
                  <div className="dm-val">{fmtD(order.shipDate)}</div>
                </div>
                <div className="dm-item">
                  <div className="dm-label">{t('erpOrdersColDeliveryDate')}</div>
                  <div className="dm-val">{fmtD(order.deliveryDate)}</div>
                </div>
                <div className="dm-item">
                  <div className="dm-label">{t('erpOrdersColLastUpdate')}</div>
                  <div className="dm-val">{fmtD(order.updatedAt)}</div>
                </div>
              </div>
              {order.notes && (
                <div className="dm-notes">
                  <div className="dm-label">{t('notes')}</div>
                  <p>{order.notes}</p>
                </div>
              )}
              {order.lines.length > 0 && (
                <div className="dm-lines">
                  <div className="dm-label">{t('erpOrdersColProducts')}</div>
                  <table className="lt">
                    <thead>
                      <tr>
                        <th>{t('product')}</th>
                        <th>{t('qty')}</th>
                        <th>{t('unit')}</th>
                        <th>{t('weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.lines.map((line, i) => (
                        <tr key={line.id ?? i}>
                          <td>{line.productName}</td>
                          <td>{line.quantity ?? '—'}</td>
                          <td>{line.unit || '—'}</td>
                          <td>
                            {line.weight != null ? `${line.weight} ${line.weightUnit}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        {order?.canEdit && (
          <div className="drawer-ft">
            <button type="button" className="btn btn-p btn-sm" onClick={() => onEdit(order)}>
              {t('edit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

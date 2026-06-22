import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ErpOrder } from '../../pages/ErpOrders/types';

const ST_CLS: Record<string, string> = {
  unplanned: 'st-new',
  planned: 'st-planned',
  on_trip: 'st-transit',
  completed: 'st-completed',
  canceled: 'st-canceled',
};

const fmtD = (d: string) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDT = (d: string) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
  const lineTotals = useMemo(() => {
    if (!order?.lines.length) return null;
    let pallets = 0;
    let weightKg = 0;
    for (const line of order.lines) {
      const unit = (line.unit || '').toLowerCase();
      if (unit.includes('pallet') && line.quantity != null) {
        pallets += line.quantity;
      }
      if (line.weight != null) {
        const wUnit = (line.weightUnit || '').toLowerCase();
        weightKg += wUnit.startsWith('t') ? line.weight * 1000 : line.weight;
      }
    }
    const weightT = weightKg / 1000;
    return {
      pallets: pallets > 0 ? pallets : null,
      weightT: weightT > 0 ? weightT.toFixed(1) : null,
    };
  }, [order?.lines]);

  if (!open) return null;

  return (
    <>
      <div className="dr-overlay show" onClick={onClose} aria-hidden="false" />
      <div className="drawer show" role="dialog" aria-modal="true" aria-labelledby="erp-order-drawer-title">
        <div className="dr-head">
          <div className="dr-head-top">
            <div>
              <div className="dr-title" id="erp-order-drawer-title">
                {order?.orderReference ?? t('erpOrdersDetail')}
                {order && (
                  <span className={`st ${ST_CLS[order.status] || ''}`}>{statusLabel(order.status)}</span>
                )}
              </div>
              {order?.erpReference && (
                <div className="dr-erp">{order.erpReference}</div>
              )}
            </div>
            <button type="button" className="dr-close" onClick={onClose} aria-label={t('cancel')}>
              ✕
            </button>
          </div>

          {order && (
            <div className="dr-meta">
              <div>
                <div className="dm-label">{t('erpOrdersColCustomer')}</div>
                <div className="dm-val">{order.customerName}</div>
              </div>
              <div>
                <div className="dm-label">{t('erpOrdersShipDate')}</div>
                <div className="dm-val">{fmtD(order.shipDate)}</div>
              </div>
              <div>
                <div className="dm-label">{t('erpOrdersColDeliveryDate')}</div>
                <div className="dm-val">{fmtD(order.deliveryDate)}</div>
              </div>
              <div>
                <div className="dm-label">{t('erpOrdersColLastUpdate')}</div>
                <div className="dm-val">{fmtDT(order.updatedAt)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="dr-body">
          {loading && !order ? (
            <div className="dr-sec" style={{ textAlign: 'center', color: 'var(--text-tertiary, #8E8E9A)' }}>
              {t('loading')}
            </div>
          ) : !order ? (
            <div className="dr-sec" style={{ textAlign: 'center', color: 'var(--text-tertiary, #8E8E9A)' }}>
              {t('erpOrdersLoadError')}
            </div>
          ) : (
            <>
              {!order.canEdit && (
                <div className="dr-sec">
                  <div className="banner-warn">{t('erpOrdersEditLocked')}</div>
                </div>
              )}

              {order.notes && (
                <div className="dr-sec">
                  <div className="dr-sec-h">{t('notes')}</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #5E5E6E)', lineHeight: 1.5 }}>
                    {order.notes}
                  </p>
                </div>
              )}

              <div className="dr-sec">
                <div className="dr-sec-h">{t('erpOrdersAddresses')}</div>
                <div className="addr-grid">
                  <div className="addr-card">
                    <div className="addr-lbl">{t('erpOrdersColShipFrom')}</div>
                    <div className="addr-name">{order.shipFrom || '—'}</div>
                    {order.shipFromAddress && <div className="addr-detail">{order.shipFromAddress}</div>}
                  </div>
                  <div className="addr-card">
                    <div className="addr-lbl">{t('erpOrdersColShipTo')}</div>
                    <div className="addr-name">{order.shipTo || '—'}</div>
                    {order.shipToAddress && <div className="addr-detail">{order.shipToAddress}</div>}
                  </div>
                </div>
              </div>

              {order.lines.length > 0 && (
                <div className="dr-sec">
                  <div className="dr-sec-h">
                    {t('erpOrdersLineItems')} ({order.lines.length})
                  </div>
                  <table className="lt">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('product')}</th>
                        <th>{t('qty')}</th>
                        <th>{t('unit')}</th>
                        <th>{t('weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.lines.map((line, i) => (
                        <tr key={line.id ?? i}>
                          <td className="ai-td-num">{i + 1}</td>
                          <td>
                            <div>{line.productName}</div>
                            {line.sku && <div className="sku">{line.sku}</div>}
                          </td>
                          <td>{line.quantity ?? '—'}</td>
                          <td>{line.unit || '—'}</td>
                          <td>{line.weight != null ? `${line.weight} ${line.weightUnit}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lineTotals && (lineTotals.pallets != null || lineTotals.weightT != null) && (
                    <div className="lines-totals">
                      {lineTotals.pallets != null && (
                        <span>
                          {lineTotals.pallets} {t('erpOrdersPallets')}
                        </span>
                      )}
                      {lineTotals.weightT != null && (
                        <span>
                          {lineTotals.weightT} t {t('erpOrdersTotalWeight')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {order.linkedLoadSid && (
                <div className="dr-sec">
                  <div className="dr-sec-h">{t('erpOrdersColLinkedLoad')}</div>
                  <div className="load-card">
                    <Link to={`/shipments/${order.linkedLoadId || order.linkedLoadSid}`} className="load-sid">
                      {order.linkedLoadSid}
                    </Link>
                    {order.linkedLoadStatus && (
                      <span className="load-meta">{order.linkedLoadStatus}</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {order && (
          <div className="dr-foot">
            {order.canEdit && (
              <button type="button" className="btn btn-p btn-sm" onClick={() => onEdit(order)}>
                {t('edit')}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

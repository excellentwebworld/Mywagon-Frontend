import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ErpOrder } from '../../pages/ErpOrders/types';
import { PlusIcon, SyncIcon } from './erpOrderIcons';
import {
  ERP_SOURCE_STYLE,
  formatDateTime,
  formatShipDate,
  getOrderListTotals,
  getShipUrgency,
  shouldSuggestSplit,
} from '../../pages/ErpOrders/erpOrderUiUtils';

const ST_CLS: Record<string, string> = {
  unplanned: 'st-new',
  planned: 'st-planned',
  on_trip: 'st-transit',
  completed: 'st-completed',
  canceled: 'st-canceled',
};

type Props = {
  t: (key: string) => string;
  order: ErpOrder | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onEdit: (order: ErpOrder) => void;
  onCreateLoad: (orderId: string) => void;
  onResync: (order: ErpOrder) => void;
  statusLabel: (status: ErpOrder['status']) => string;
};

export const OrderDetailDrawer: React.FC<Props> = ({
  t,
  order,
  loading,
  open,
  onClose,
  onEdit,
  onCreateLoad,
  onResync,
  statusLabel,
}) => {
  const lineTotals = useMemo(
    () => (order ? getOrderListTotals(order) : { lineCount: 0, pallets: 0, weightTons: '0.0' }),
    [order]
  );
  const urgency = order ? getShipUrgency(order.shipDate, t) : null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="dr-overlay show erp-dr-overlay" onClick={onClose} aria-hidden="false" />
      <div className="drawer show drawer-ref" role="dialog" aria-modal="true" aria-labelledby="erp-order-drawer-title">
        <div className="dr-head">
          <div className="dr-head-top">
            <div className="dr-head-main">
              <div className="dr-title" id="erp-order-drawer-title">
                <span className="cell-id dr-order-id">{order?.orderReference ?? t('erpOrdersDetail')}</span>
                {order && <span className={`st ${ST_CLS[order.status] || ''}`}>{statusLabel(order.status)}</span>}
                {order?.highPriority && <span className="pri-badge urgent">⚡ {t('erpOrdersPriorityUrgent')}</span>}
                <span className="erp-source-pill">
                  <span>{ERP_SOURCE_STYLE.icon}</span>
                  <span>{t(ERP_SOURCE_STYLE.labelKey)}</span>
                </span>
              </div>
              {order?.erpReference && <div className="dr-erp">{order.erpReference}</div>}
            </div>
            <button type="button" className="dr-close" onClick={onClose} aria-label={t('cancel')}>
              ✕
            </button>
          </div>
        </div>

        <div className="dr-body dr-body-ref">
          {loading && !order ? (
            <div className="dr-sec dr-sec-center">{t('loading')}</div>
          ) : !order ? (
            <div className="dr-sec dr-sec-center">{t('erpOrdersLoadError')}</div>
          ) : (
            <>
              {!order.canEdit && (
                <div className="dr-sec">
                  <div className="banner-warn">{t('erpOrdersEditLocked')}</div>
                </div>
              )}

              <DrawerSection title={t('erpOrdersSectionMeta')}>
                <MetaRow label={t('erpOrdersColCustomer')} value={order.customerName} />
                <MetaRow label={t('erpOrdersShipDate')} value={formatShipDate(order.shipDate)} extra={urgency ? <span className="erp-urgency-badge sm" style={{ background: urgency.bg, color: urgency.fg, borderColor: urgency.bd }}>{urgency.label}</span> : null} />
                <MetaRow label={t('erpOrdersColDeliveryDate')} value={formatShipDate(order.deliveryDate)} />
                <MetaRow label={t('erpOrdersColLastSync')} value={formatDateTime(order.updatedAt)} />
              </DrawerSection>

              {order.notes && (
                <DrawerSection title={t('notes')}>
                  <div className="dr-notes">{order.notes}</div>
                </DrawerSection>
              )}

              <DrawerSection title={t('erpOrdersAddresses')}>
                <div className="addr-grid">
                  <div className="addr-card">
                    <div className="addr-lbl">📍 {t('erpOrdersColShipFrom')}</div>
                    <div className="addr-name">{order.shipFrom || '—'}</div>
                    {order.shipFromAddress && <div className="addr-detail">{order.shipFromAddress}</div>}
                  </div>
                  <div className="addr-card">
                    <div className="addr-lbl">🏁 {t('erpOrdersColShipTo')}</div>
                    <div className="addr-name">{order.shipTo || '—'}</div>
                    {order.shipToAddress && <div className="addr-detail">{order.shipToAddress}</div>}
                  </div>
                </div>
              </DrawerSection>

              {(order.lines?.length ?? 0) > 0 && (
                <DrawerSection title={`${t('erpOrdersLineItems')} (${order.lines!.length})`}>
                  <table className="lt">
                    <thead>
                      <tr>
                        <th>{t('product')}</th>
                        <th>SKU</th>
                        <th style={{ textAlign: 'right' }}>{t('qty')}</th>
                        <th style={{ textAlign: 'right' }}>{t('weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.lines ?? []).map((line, i) => (
                        <tr key={line.id ?? i}>
                          <td style={{ fontWeight: 500 }}>{line.productName}</td>
                          <td className="sku">{line.sku || '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                            {line.quantity ?? '—'} {line.unit || ''}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                            {line.weight != null ? `${line.weight} ${line.weightUnit}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="lines-totals dr-totals-box">
                    <span>
                      {lineTotals.lineCount} {t('erpOrdersLinesShort')} · {lineTotals.pallets} {t('erpOrdersPltShort')} · {lineTotals.weightTons}
                      {t('erpOrdersTonsShort')}
                    </span>
                  </div>
                </DrawerSection>
              )}

              <DrawerSection title={t('erpOrdersColLinkedLoad')}>
                {order.linkedLoadSid ? (
                  <div className="load-card">
                    <Link to={`/shipments/${order.linkedLoadId || order.linkedLoadSid}`} className="load-sid">
                      {order.linkedLoadSid}
                    </Link>
                    {order.linkedLoadStatus && <span className="load-meta">{order.linkedLoadStatus}</span>}
                  </div>
                ) : (
                  <div className="dr-muted">{t('erpOrdersNotYetPlanned')}</div>
                )}
              </DrawerSection>
            </>
          )}
        </div>

        {order && (
          <div className="dr-foot dr-foot-ref">
            {!order.linkedLoadSid && (
              <button type="button" className="btn btn-p btn-sm" onClick={() => onCreateLoad(order.id)}>
                <PlusIcon />
                {t('erpOrdersCreateLoad')}
              </button>
            )}
            {shouldSuggestSplit(order) && (
              <button type="button" className="btn btn-sm" disabled title={t('erpOrdersSuggestSplitSoon')}>
                ✂️ {t('erpOrdersSuggestSplit')}
              </button>
            )}
            {order.canEdit && (
              <button type="button" className="btn btn-sm" onClick={() => onEdit(order)}>
                {t('edit')}
              </button>
            )}
            <button type="button" className="btn btn-sm" onClick={() => onResync(order)}>
              <SyncIcon />
              {t('erpOrdersResync')}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dr-sec">
      <div className="dr-sec-h dr-sec-title">{title}</div>
      {children}
    </div>
  );
}

function MetaRow({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="dr-meta-row">
      <span className="dr-meta-label">{label}</span>
      <span className="dr-meta-value">
        {value}
        {extra}
      </span>
    </div>
  );
}

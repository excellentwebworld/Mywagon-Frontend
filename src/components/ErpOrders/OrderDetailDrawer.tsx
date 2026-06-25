import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ErpOrder } from '../../pages/ErpOrders/types';
import { OrderDetailSkeleton } from '../skeletons/OrderDetailSkeleton';
import { CloseIcon, PlusIcon, SyncIcon } from './erpOrderIcons';
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
  onCreateLoad: _onCreateLoad,
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="erp-order-drawer-root" role="presentation">
      <div className="erp-order-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="erp-order-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="erp-order-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <OrderDetailSkeleton onClose={onClose} t={t} />
        ) : (
          <>
            <div className="erp-order-drawer-head">
              <div className="erp-order-drawer-head-top">
                <div className="erp-order-drawer-head-main">
                  <div className="erp-order-drawer-title" id="erp-order-drawer-title">
                    <span className="erp-order-drawer-id">{order?.orderReference ?? t('erpOrdersDetail')}</span>
                    {order && <span className={`st ${ST_CLS[order.status] || ''}`}>{statusLabel(order.status)}</span>}
                    {order?.highPriority && (
                      <span className="erp-order-drawer-priority">⚡ {t('erpOrdersPriorityUrgent')}</span>
                    )}
                    <span className="erp-source-pill">
                      <span>{ERP_SOURCE_STYLE.icon}</span>
                      <span>{t(ERP_SOURCE_STYLE.labelKey)}</span>
                    </span>
                  </div>
                  {order?.erpReference && (
                    <div className="erp-order-drawer-erp">ERP: {order.erpReference}</div>
                  )}
                </div>
                <button type="button" className="erp-order-drawer-close" onClick={onClose} aria-label={t('cancel')}>
                  <CloseIcon />
                </button>
              </div>

              {order && (
                <div className="erp-order-drawer-meta">
                  <MetaCell label={t('erpOrdersColCustomer')} value={order.customerName} />
                  <MetaCell label={t('erpOrdersShipDate')} value={formatShipDate(order.shipDate)} />
                  <MetaCell label={t('erpOrdersColDeliveryDate')} value={formatShipDate(order.deliveryDate)} />
                  <MetaCell label={t('erpOrdersColLastSync')} value={formatDateTime(order.updatedAt)} />
                </div>
              )}
            </div>

            <div className="erp-order-drawer-body">
              {!order ? (
                <div className="erp-order-drawer-empty">{t('erpOrdersLoadError')}</div>
              ) : (
                <>
                  {!order.canEdit && (
                    <div className="erp-order-drawer-section">
                      <div className="banner-warn">{t('erpOrdersEditLocked')}</div>
                    </div>
                  )}

                  {order.notes && (
                    <DrawerSection title={t('notes')}>
                      <div className="erp-order-drawer-notes">{order.notes}</div>
                    </DrawerSection>
                  )}

                  <DrawerSection title={t('erpOrdersAddresses')}>
                    <div className="addr-grid erp-order-drawer-addr-grid">
                      <div className="addr-card">
                        <div className="addr-lbl">{t('erpOrdersColShipFrom')}</div>
                        <div className="addr-name">📍 {order.shipFrom || '—'}</div>
                        {order.shipFromAddress && <div className="addr-detail">{order.shipFromAddress}</div>}
                      </div>
                      <div className="addr-card">
                        <div className="addr-lbl">{t('erpOrdersColShipTo')}</div>
                        <div className="addr-name">📍 {order.shipTo || '—'}</div>
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
                    </DrawerSection>
                  )}

                  <DrawerSection title={t('erpOrdersSectionTotals')}>
                    <div className="erp-order-drawer-totals">
                      <TotalStat value={String(lineTotals.lineCount)} label={t('erpOrdersLinesShort')} />
                      <TotalStat value={String(lineTotals.pallets)} label={t('erpOrdersPltShort')} />
                      <TotalStat value={`${lineTotals.weightTons}${t('erpOrdersTonsShort')}`} label={t('erpOrdersTotalWeight')} />
                    </div>
                    {urgency && (
                      <div className="erp-order-drawer-urgency">
                        <span className="erp-urgency-badge" style={{ background: urgency.bg, color: urgency.fg, borderColor: urgency.bd }}>
                          {urgency.label}
                        </span>
                      </div>
                    )}
                  </DrawerSection>

                  <DrawerSection title={t('erpOrdersColLinkedLoad')}>
                    {order.linkedLoadSid ? (
                      <div className="load-card">
                        <Link to={`/shipments/${order.linkedLoadId || order.linkedLoadSid}`} className="load-sid">
                          {order.linkedLoadSid}
                        </Link>
                        {order.linkedLoadStatus && <span className="load-meta">{order.linkedLoadStatus}</span>}
                      </div>
                    ) : (
                      <div className="erp-order-drawer-muted">{t('erpOrdersNotYetPlanned')}</div>
                    )}
                  </DrawerSection>
                </>
              )}
            </div>

            {order && (
              <div className="erp-order-drawer-foot">
                {/* Create Load — temporarily hidden
            {!order.linkedLoadSid && (
              <button type="button" className="btn btn-p erp-order-drawer-create-load" onClick={() => _onCreateLoad(order.id)}>
                <PlusIcon />
                {t('erpOrdersCreateLoad')}
              </button>
            )}
            */}
                <div className="erp-order-drawer-actions">
                  {shouldSuggestSplit(order) && (
                    <button type="button" className="btn btn-sm erp-order-drawer-action" disabled>
                      ✂️ {t('erpOrdersSuggestSplit')}
                    </button>
                  )}
                  {order.canEdit && (
                    <button type="button" className="btn btn-sm erp-order-drawer-action" onClick={() => onEdit(order)}>
                      {t('edit')}
                    </button>
                  )}
                  {/* <button type="button" className="btn btn-sm erp-order-drawer-action" onClick={() => onResync(order)}>
                <SyncIcon />
                {t('erpOrdersResync')}
              </button> */}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="erp-order-drawer-section">
      <div className="erp-order-drawer-section-title">{title}</div>
      {children}
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="erp-order-drawer-meta-cell">
      <div className="erp-order-drawer-meta-label">{label}</div>
      <div className="erp-order-drawer-meta-value">{value}</div>
    </div>
  );
}

function TotalStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="erp-order-drawer-total-stat">
      <div className="erp-order-drawer-total-value">{value}</div>
      <div className="erp-order-drawer-total-label">{label}</div>
    </div>
  );
}

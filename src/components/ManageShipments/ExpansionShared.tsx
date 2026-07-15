import React, { type ReactNode } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  buildStopTimelineSteps,
  formatStatValue,
  stopTimelineCurrentIndex,
} from '../../pages/ManageShipments/utils/listingUtils';

export type ExpTranslate = (key: string, opts?: Record<string, unknown>) => string;

export function ProgressTimeline({
  shipment,
  t,
  enlarged = false,
  loading = false,
}: {
  shipment: Shipment;
  t: ExpTranslate;
  enlarged?: boolean;
  loading?: boolean;
}) {
  const steps = buildStopTimelineSteps(shipment, t);
  const cur = stopTimelineCurrentIndex(shipment.status, steps.length);

  if (loading && !shipment.stops?.length) {
    return <div className="sub">{t('loading')}</div>;
  }

  const timeline = (
    <div className="tl">
      {steps.map((label, idx) => (
        <React.Fragment key={`${label}-${idx}`}>
          <div className="tl-step">
            <div className={`tl-dot ${idx < cur ? 'done' : idx === cur ? 'cur' : ''}`} />
            <div className="tl-label">{label}</div>
          </div>
          {idx < steps.length - 1 && <div className={`tl-line ${idx < cur ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  return enlarged ? <div className="tl-big">{timeline}</div> : timeline;
}

export function OrdersBlock({ shipment, t }: { shipment: Shipment; t: ExpTranslate }) {
  const fromStops =
    shipment.stops?.flatMap((stop) =>
      stop.customers.flatMap((c) =>
        c.orders.map((o) => ({
          customer: c.name,
          id: o.id,
          products: o.products,
          qty: o.qty,
          qtyUnit: o.qtyUnit,
          weight: o.weight,
          weightUnit: o.weightUnit,
        }))
      )
    ) ?? [];

  if (fromStops.length > 0) {
    const byCustomer = new Map<string, typeof fromStops>();
    fromStops.forEach((row) => {
      const list = byCustomer.get(row.customer) || [];
      list.push(row);
      byCustomer.set(row.customer, list);
    });
    return (
      <>
        {Array.from(byCustomer.entries()).map(([name, rows]) => (
          <div key={name} className="exp-cust-group">
            <div className="exp-cust-head">
              <span className="cust-name">{name}</span>
              <span className="cust-count">
                {rows.length} {rows.length === 1 ? t('ordersWord') : t('orders').toLowerCase()}
              </span>
            </div>
            <div className="exp-cust-body open">
              {rows.map((o) => (
                <div key={`${o.id}-${o.products}`} className="ord">
                  <span className="ord-id">{o.id}</span>
                  {o.products ? ` · ${o.products}` : ''}
                  {(o.qty > 0 || o.weight > 0) && (
                    <span className="sub">
                      {' '}
                      ({o.qty > 0 ? `${o.qty} ${o.qtyUnit}` : ''}
                      {o.qty > 0 && o.weight > 0 ? ', ' : ''}
                      {o.weight > 0 ? `${o.weight} ${o.weightUnit}` : ''})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  if (shipment.customer.length) {
    return (
      <>
        {shipment.customer.map((c, idx) => (
          <div key={idx} className="exp-cust-group">
            <div className="exp-cust-head">
              <span className="cust-name">{c.name}</span>
              <span className="cust-count">
                {(c.orders as string[])?.length || 0}{' '}
                {(c.orders as string[])?.length === 1 ? t('ordersWord') : t('orders').toLowerCase()}
              </span>
            </div>
            {(c.orders as string[])?.length > 0 && (
              <div className="exp-cust-body open">
                {(c.orders as string[]).map((o) => (
                  <div key={o} className="ord">
                    <span className="ord-id">{o}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </>
    );
  }

  return <div className="sub">{t('noOrdersMapped')}</div>;
}

export function ordersHeaderMeta(shipment: Shipment, t: ExpTranslate): {
  orderCount: number;
  customerCount: number;
  label: ReactNode;
} {
  const fromStops =
    shipment.stops?.flatMap((stop) =>
      stop.customers.flatMap((c) => c.orders.map((o) => ({ customer: c.name, id: o.id })))
    ) ?? [];

  let orderCount = fromStops.length;
  let customerCount = new Set(fromStops.map((r) => r.customer)).size;

  if (orderCount === 0) {
    customerCount = shipment.customer.length;
    orderCount = shipment.customer.reduce(
      (sum, c) => sum + ((c.orders as string[])?.length || 0),
      0
    );
    if (orderCount === 0) orderCount = shipment.ordersCount ?? shipment.orderIds?.length ?? 0;
  }

  return {
    orderCount,
    customerCount,
    label: (
      <>
        {t('orders')} ({orderCount})
        {customerCount > 0 && (
          <span className="exp-cust-meta">
            {customerCount}{' '}
            {customerCount === 1 ? t('customer') : t('customers')}
          </span>
        )}
      </>
    ),
  };
}

export function CompactLoadMeta({ shipment, t }: { shipment: Shipment; t: ExpTranslate }) {
  const stops = shipment.stopCount ?? Math.max(shipment.stops?.length ?? 0, 2);
  const weight = formatStatValue(shipment.totalWeight, shipment.weightUnit);
  const qty = formatStatValue(shipment.totalQty, shipment.qtyUnit);
  return (
    <div className="exp-meta">
      {t('stops')}: {stops} · {t('weight')}: {weight} · {t('pallets')}: {qty}
    </div>
  );
}

export function StatusDetailGrid({ shipment, t }: { shipment: Shipment; t: ExpTranslate }) {
  const stops = shipment.stopCount ?? Math.max(shipment.stops?.length ?? 0, 2);
  const via =
    shipment.viaStops && shipment.viaStops.length > 0
      ? ` — ${shipment.viaStops.join(' → ')}`
      : '';
  const weight = formatStatValue(shipment.totalWeight, shipment.weightUnit);
  const qty = formatStatValue(shipment.totalQty, shipment.qtyUnit);

  return (
    <div className="status-detail">
      <div className="sd-item">
        <div className="sd-label">{t('pickup')}</div>
        <div className="sd-val">
          <span className="sd-dot sd-dot-pick" aria-hidden />
          {shipment.pickDt || '—'}
        </div>
      </div>
      <div className="sd-item">
        <div className="sd-label">{t('delivery')}</div>
        <div className="sd-val">
          <span className="sd-dot sd-dot-del" aria-hidden />
          {shipment.delDt || '—'}
        </div>
      </div>
      <div className="sd-item">
        <div className="sd-label">{t('stops')}</div>
        <div className="sd-val">
          {stops} {t('stops').toLowerCase()}
          {via}
        </div>
      </div>
      <div className="sd-item">
        <div className="sd-label">
          {t('weight')} / {t('pallets')}
        </div>
        <div className="sd-val">
          {weight} · {qty}
        </div>
      </div>
    </div>
  );
}

export function QuickActions({
  onEdit,
  onView,
  onCancel,
  t,
}: {
  onEdit: () => void;
  onView: () => void;
  onCancel: () => void;
  t: ExpTranslate;
}) {
  return (
    <div className="qa-row">
      <button type="button" className="f-pill" onClick={onEdit}>
        {t('rowActionEdit')}
      </button>
      <button type="button" className="f-pill" onClick={onView}>
        {t('rowActionView')}
      </button>
      <button type="button" className="f-pill qa-danger" onClick={onCancel}>
        {t('cancel')}
      </button>
    </div>
  );
}

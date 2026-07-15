import React, { useState, type ReactNode } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  buildLaravelProgressSteps,
  formatEuro,
  formatStatValue,
} from '../../pages/ManageShipments/utils/listingUtils';

export type ExpTranslate = (key: string, opts?: Record<string, unknown>) => string;

/** Progress bar — Laravel Load Details step sequence/logic. */
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
  const steps = buildLaravelProgressSteps(shipment, t);

  if (loading && !shipment.stops?.length && shipment.status !== 'pending') {
    return <div className="sub">{t('loading')}</div>;
  }

  if (steps.length === 0) {
    return null;
  }

  const timeline = (
    <div className={`tl${enlarged ? ' tl-enlarged' : ''}`} role="list">
      <div className="tl-track" aria-hidden />
      {steps.map((step) => (
        <div
          key={step.id}
          className={`tl-step tl-step--${step.state}`}
          role="listitem"
          tabIndex={0}
          aria-label={[step.label, step.sub].filter(Boolean).join(', ')}
        >
          <div className={`tl-dot ${step.state}`} />
          <div className="tl-tip" role="tooltip">
            <div className={`tl-tip-label tl-tip-label--${step.state}`}>{step.label}</div>
            {step.sub ? <div className="tl-tip-sub">{step.sub}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );

  return enlarged ? <div className="tl-big">{timeline}</div> : timeline;
}

type OrderRow = {
  customer: string;
  id: string;
  products?: string;
  qty?: number;
  qtyUnit?: string;
  weight?: number;
  weightUnit?: string;
};

function CustomerOrderGroup({
  name,
  rows,
  t,
}: {
  name: string;
  rows: OrderRow[];
  t: ExpTranslate;
}) {
  const [open, setOpen] = useState(false);
  const count = rows.length;
  const countLabel = `${count} ${count === 1 ? t('order') : t('orders').toLowerCase()}`;

  return (
    <div className="exp-cust-group">
      <div
        className="exp-cust-head"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
      >
        <span className={`cust-chev${open ? ' open' : ''}`}>▶</span>
        <span aria-hidden>🏪</span>
        <span className="cust-name">{name}</span>
        <span className="cust-count">{countLabel}</span>
      </div>
      <div className={`exp-cust-body${open ? ' open' : ''}`}>
        {rows.map((o) => (
          <div key={`${o.id}-${o.products ?? ''}`} className="ord">
            <span className="ord-id">{o.id}</span>
            {o.products ? (
              <span style={{ color: 'var(--text-tertiary)' }}> · {o.products}</span>
            ) : name ? (
              <span style={{ color: 'var(--text-tertiary)' }}> · {name}</span>
            ) : null}
            {(o.qty || 0) > 0 || (o.weight || 0) > 0 ? (
              <span className="sub">
                {' '}
                ({(o.qty || 0) > 0 ? `${o.qty} ${o.qtyUnit}` : ''}
                {(o.qty || 0) > 0 && (o.weight || 0) > 0 ? ', ' : ''}
                {(o.weight || 0) > 0 ? `${o.weight} ${o.weightUnit}` : ''})
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
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
    const byCustomer = new Map<string, OrderRow[]>();
    fromStops.forEach((row) => {
      const list = byCustomer.get(row.customer) || [];
      list.push(row);
      byCustomer.set(row.customer, list);
    });
    return (
      <>
        {Array.from(byCustomer.entries()).map(([name, rows]) => (
          <CustomerOrderGroup key={name} name={name} rows={rows} t={t} />
        ))}
      </>
    );
  }

  if (shipment.customer.length) {
    return (
      <>
        {shipment.customer.map((c, idx) => (
          <CustomerOrderGroup
            key={idx}
            name={c.name}
            rows={(c.orders as string[]).map((id) => ({ customer: c.name, id }))}
            t={t}
          />
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
            🏪 {customerCount}{' '}
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
  const tripKm =
    shipment.journeyDistanceKm != null && Number.isFinite(shipment.journeyDistanceKm)
      ? `${shipment.journeyDistanceKm.toLocaleString()} km`
      : '—';
  const cargo =
    shipment.cargoValue != null && Number.isFinite(shipment.cargoValue)
      ? formatEuro(shipment.cargoValue) || '—'
      : '—';
  const trucks =
    shipment.truckTypes && shipment.truckTypes.length > 0
      ? shipment.truckTypes.join(', ')
      : '—';

  return (
    <div className="exp-meta">
      {t('stops')}: {stops} · {t('weight')}: {weight} · {t('pallets')}: {qty} ·{' '}
      {t('tripLength')}: {tripKm} · {t('cargoValue')}: {cargo} · {t('truckTypes')}: {trucks}
    </div>
  );
}

export function StatusDetailGrid({ shipment, t }: { shipment: Shipment; t: ExpTranslate }) {
  const weight = formatStatValue(shipment.totalWeight, shipment.weightUnit);
  const qty = formatStatValue(shipment.totalQty, shipment.qtyUnit);
  const tripKm =
    shipment.journeyDistanceKm != null && Number.isFinite(shipment.journeyDistanceKm)
      ? `${shipment.journeyDistanceKm.toLocaleString()} km`
      : '—';
  const cargo =
    shipment.cargoValue != null && Number.isFinite(shipment.cargoValue)
      ? formatEuro(shipment.cargoValue) || '—'
      : '—';
  const trucks =
    shipment.truckTypes && shipment.truckTypes.length > 0
      ? shipment.truckTypes.join(', ')
      : '—';

  return (
    <div className="status-detail">
      <div className="sd-item">
        <div className="sd-label">{t('weight')}</div>
        <div className="sd-val">{weight}</div>
      </div>
      <div className="sd-item">
        <div className="sd-label">{t('tripLength')}</div>
        <div className="sd-val">{tripKm}</div>
      </div>
      <div className="sd-item">
        <div className="sd-label">{t('truckTypes')}</div>
        <div className="sd-val">{trucks}</div>
      </div>
      <div className="sd-item">
        <div className="sd-label">{t('quantity')}</div>
        <div className="sd-val">{qty}</div>
      </div>
      <div className="sd-item">
        <div className="sd-label">{t('cargoValue')}</div>
        <div className="sd-val">{cargo}</div>
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
        ✏️ {t('edit')}
      </button>
      <button type="button" className="f-pill" onClick={onView}>
        👁 {t('viewDetails')}
      </button>
      <button type="button" className="f-pill qa-danger" onClick={onCancel}>
        ❌ {t('cancel')}
      </button>
    </div>
  );
}

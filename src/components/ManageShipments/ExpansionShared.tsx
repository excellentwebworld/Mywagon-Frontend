import React, { useState, type ReactNode } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  buildLaravelProgressSteps,
  formatEuro,
  formatStatValue,
  isShipmentCancellable,
  isShipmentEditable,
  itineraryStopCount,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ExpHeading } from './ExpHeading';

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
  open,
  onToggle,
  t,
}: {
  name: string;
  rows: OrderRow[];
  open: boolean;
  onToggle: () => void;
  t: ExpTranslate;
}) {
  const count = rows.length;
  const countLabel = `${count} ${count === 1 ? t('order') : t('orders').toLowerCase()}`;

  return (
    <div className="exp-cust-group">
      <div
        className="exp-cust-head"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
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

function ExpandIcon({ expand }: { expand: boolean }) {
  return expand ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function ExpandCollapseButtons({
  onExpand,
  onCollapse,
  t,
}: {
  onExpand: () => void;
  onCollapse: () => void;
  t: ExpTranslate;
}) {
  return (
    <div className="exp-toggle-all">
      <button
        type="button"
        className="exp-toggle-btn exp-toggle-btn--icon"
        onClick={onExpand}
        title={t('expandAll')}
        aria-label={t('expandAll')}
      >
        <ExpandIcon expand />
      </button>
      <button
        type="button"
        className="exp-toggle-btn exp-toggle-btn--icon"
        onClick={onCollapse}
        title={t('collapseAll')}
        aria-label={t('collapseAll')}
      >
        <ExpandIcon expand={false} />
      </button>
    </div>
  );
}

export function OrdersBlock({
  shipment,
  t,
  showHeading = false,
}: {
  shipment: Shipment;
  t: ExpTranslate;
  /** When true, renders ORDERS heading + expand/collapse controls. */
  showHeading?: boolean;
}) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

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

  const groups: Array<[string, OrderRow[]]> = (() => {
    if (fromStops.length > 0) {
      const byCustomer = new Map<string, OrderRow[]>();
      fromStops.forEach((row) => {
        const list = byCustomer.get(row.customer) || [];
        list.push(row);
        byCustomer.set(row.customer, list);
      });
      return Array.from(byCustomer.entries());
    }
    if (shipment.customer.length) {
      return shipment.customer.map((c) => [
        c.name,
        (c.orders as string[]).map((id) => ({ customer: c.name, id })),
      ]);
    }
    return [];
  })();

  const isOpen = (name: string) => Boolean(openMap[name]);
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach(([name]) => {
      next[name] = true;
    });
    setOpenMap(next);
  };
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach(([name]) => {
      next[name] = false;
    });
    setOpenMap(next);
  };

  const meta = ordersHeaderMeta(shipment, t);
  const canToggle = groups.length > 0;

  const list =
    groups.length === 0 ? (
      <div className="sub">{t('noOrdersMapped')}</div>
    ) : (
      <>
        {groups.map(([name, rows]) => (
          <CustomerOrderGroup
            key={name}
            name={name}
            rows={rows}
            open={isOpen(name)}
            onToggle={() => setOpenMap((prev) => ({ ...prev, [name]: !prev[name] }))}
            t={t}
          />
        ))}
      </>
    );

  if (!showHeading) return list;

  return (
    <div className="exp-orders-block">
      <div className="exp-section-head exp-section-head--tight">
        <ExpHeading icon="orders" className="exp-h-gap">
          {meta.label}
        </ExpHeading>
        {canToggle ? <ExpandCollapseButtons onExpand={expandAll} onCollapse={collapseAll} t={t} /> : null}
      </div>
      {list}
    </div>
  );
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
  const stops = itineraryStopCount(shipment);
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
  shipment,
  onEdit,
  onView,
  onCancel,
  busy = null,
  t,
}: {
  shipment: Shipment;
  onEdit: () => void;
  onView: () => void;
  onCancel: () => void;
  busy?: 'edit' | 'view' | 'cancel' | null;
  t: ExpTranslate;
}) {
  const locked = busy != null;
  const canEdit = isShipmentEditable(shipment.status);
  const canCancel = isShipmentCancellable(shipment.status);

  return (
    <div className="qa-row">
      {canEdit ? (
        <button type="button" className="f-pill" disabled={locked} onClick={onEdit}>
          {busy === 'edit' ? <span className="exp-btn-spin" aria-hidden /> : null}
          {t('edit')}
        </button>
      ) : null}
      <button type="button" className="f-pill" disabled={locked} onClick={onView}>
        {busy === 'view' ? <span className="exp-btn-spin" aria-hidden /> : null}
        {t('viewDetails')}
      </button>
      {canCancel ? (
        <button type="button" className="f-pill qa-danger" disabled={locked} onClick={onCancel}>
          {busy === 'cancel' ? <span className="exp-btn-spin" aria-hidden /> : null}
          {t('cancel')}
        </button>
      ) : null}
    </div>
  );
}

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
      {steps.map((step) => {
        const dateLine = step.dateLine;
        const timeLine = step.timeLine;
        const tipSub = step.sub || [dateLine, timeLine].filter(Boolean).join(' ');
        return (
          <div
            key={step.id}
            className={`tl-step tl-step--${step.state}`}
            role="listitem"
            tabIndex={0}
            aria-label={[step.label, tipSub].filter(Boolean).join(', ')}
          >
            <div className={`tl-dot ${step.state}`} />
            {enlarged ? (
              <div className="tl-cap">
                <div className={`tl-cap-label tl-cap-label--${step.state}`}>{step.label}</div>
                {dateLine ? <div className="tl-cap-date">{dateLine}</div> : null}
                {timeLine ? <div className="tl-cap-time">{timeLine}</div> : null}
                {!dateLine && !timeLine && step.sub ? (
                  <div className="tl-cap-date">{step.sub}</div>
                ) : null}
              </div>
            ) : (
              <div className="tl-tip" role="tooltip">
                <div className={`tl-tip-label tl-tip-label--${step.state}`}>{step.label}</div>
                {tipSub ? <div className="tl-tip-sub">{tipSub}</div> : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return enlarged ? <div className="tl-big">{timeline}</div> : timeline;
}

type ProductLine = {
  products: string;
  qty: number;
  qtyUnit: string;
  weight: number;
  weightUnit: string;
};

type OrderGroup = {
  orderId: string;
  customer: string;
  lines: ProductLine[];
};

function lineSignature(line: ProductLine): string {
  return [line.products, line.qty, line.qtyUnit, line.weight, line.weightUnit].join('|');
}

/**
 * Unique orders with product lines (prefer pickup stops so pickup+delivery
 * of the same order/product are not double-counted).
 */
function buildOrderProductGroups(shipment: Shipment): OrderGroup[] {
  const stops = shipment.stops ?? [];
  const byOrder = new Map<string, OrderGroup & { seen: Set<string> }>();

  const ingest = (orderId: string, customer: string, line: ProductLine) => {
    const key = orderId.trim();
    if (!key) return;
    let group = byOrder.get(key);
    if (!group) {
      group = { orderId: key, customer: customer || '', lines: [], seen: new Set() };
      byOrder.set(key, group);
    }
    if (customer && !group.customer) group.customer = customer;
    const sig = lineSignature(line);
    if (group.seen.has(sig)) return;
    group.seen.add(sig);
    if (line.products || line.qty || line.weight) {
      group.lines.push(line);
    }
  };

  const ingestStops = (source: typeof stops) => {
    source.forEach((stop) => {
      (stop.customers || []).forEach((c) => {
        (c.orders || []).forEach((o) => {
          const orderId = (o.id || '').trim();
          if (!orderId) return;
          ingest(orderId, c.name || '', {
            products: o.products || '',
            qty: o.qty || 0,
            qtyUnit: o.qtyUnit || '',
            weight: o.weight || 0,
            weightUnit: o.weightUnit || '',
          });
        });
      });
    });
  };

  const pickupStops = stops.filter((s) => s.type === 'pickup');
  const deliveryStops = stops.filter((s) => s.type === 'delivery');
  ingestStops(pickupStops.length > 0 ? pickupStops : stops);

  // Prefer receiving (delivery) company name when available.
  deliveryStops.forEach((stop) => {
    (stop.customers || []).forEach((c) => {
      (c.orders || []).forEach((o) => {
        const orderId = (o.id || '').trim();
        if (!orderId || !c.name) return;
        const group = byOrder.get(orderId);
        if (group) group.customer = c.name;
      });
    });
  });

  // If pickups yielded order shells with no products, fill lines from remaining stops.
  if (pickupStops.length > 0 && Array.from(byOrder.values()).some((g) => g.lines.length === 0)) {
    ingestStops(stops.filter((s) => s.type !== 'pickup'));
  }

  if (byOrder.size > 0) {
    return Array.from(byOrder.values()).map(({ seen: _seen, ...rest }) => rest);
  }

  // Fallbacks when stops have no order lines yet.
  const knownIds = (shipment.orderIds ?? []).filter(Boolean);
  if (knownIds.length > 0) {
    return knownIds.map((orderId) => ({ orderId, customer: '', lines: [] }));
  }

  if (shipment.customer.length) {
    return shipment.customer.flatMap((c) => {
      const ids = (c.orders as unknown as Array<string | { id?: string }>).map((o) =>
        typeof o === 'string' ? o : o?.id || ''
      );
      return ids.filter(Boolean).map((orderId) => ({
        orderId,
        customer: c.name,
        lines: [] as ProductLine[],
      }));
    });
  }

  return [];
}

function OrderProductGroup({
  group,
  open,
  onToggle,
  t,
}: {
  group: OrderGroup;
  open: boolean;
  onToggle: () => void;
  t: ExpTranslate;
}) {
  const productCount = group.lines.length;
  const countLabel =
    productCount > 0
      ? `${productCount} ${productCount === 1 ? t('aiWizardProduct') : t('aiWizardProducts')}`
      : t('order');

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
        <div className="exp-order-head-main">
          {group.customer ? <span className="ord-company">{group.customer}</span> : null}
          <span className="cust-name">{group.orderId}</span>
        </div>
        <span className="cust-count">{countLabel}</span>
      </div>
      <div className={`exp-cust-body${open ? ' open' : ''}`}>
        {group.lines.length === 0 ? (
          <div className="ord sub">—</div>
        ) : (
          group.lines.map((line, idx) => (
            <div key={`${group.orderId}-${lineSignature(line)}-${idx}`} className="ord">
              <span className="ord-id">{line.products || '—'}</span>
              {(line.qty || 0) > 0 || (line.weight || 0) > 0 ? (
                <span className="sub">
                  {' '}
                  ({(line.qty || 0) > 0 ? `${line.qty} ${line.qtyUnit}` : ''}
                  {(line.qty || 0) > 0 && (line.weight || 0) > 0 ? ', ' : ''}
                  {(line.weight || 0) > 0 ? `${line.weight} ${line.weightUnit}` : ''})
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExpandIcon({ expand }: { expand: boolean }) {
  return expand ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

/** Single toggle: chevron down = expand all, up = collapse all. */
export function ExpandCollapseButtons({
  expanded,
  onToggle,
  t,
}: {
  expanded: boolean;
  onToggle: () => void;
  t: ExpTranslate;
}) {
  const label = expanded ? t('collapseAll') : t('expandAll');
  return (
    <div className="exp-toggle-all">
      <button
        type="button"
        className="exp-toggle-btn exp-toggle-btn--icon"
        onClick={onToggle}
        title={label}
        aria-label={label}
        aria-expanded={expanded}
      >
        <ExpandIcon expand={!expanded} />
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

  const groups = buildOrderProductGroups(shipment);
  const isOpen = (orderId: string) => Boolean(openMap[orderId]);
  const allExpanded = groups.length > 0 && groups.every((g) => openMap[g.orderId]);
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    const open = !allExpanded;
    groups.forEach((g) => {
      next[g.orderId] = open;
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
        {groups.map((group) => (
          <OrderProductGroup
            key={group.orderId}
            group={group}
            open={isOpen(group.orderId)}
            onToggle={() =>
              setOpenMap((prev) => ({ ...prev, [group.orderId]: !prev[group.orderId] }))
            }
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
        {canToggle ? (
          <ExpandCollapseButtons expanded={allExpanded} onToggle={toggleAll} t={t} />
        ) : null}
      </div>
      {list}
    </div>
  );
}

export function ordersHeaderMeta(shipment: Shipment, t: ExpTranslate): {
  orderCount: number;
  productCount: number;
  label: ReactNode;
} {
  const groups = buildOrderProductGroups(shipment);
  let orderCount = groups.length;
  let productCount = groups.reduce((sum, g) => sum + g.lines.length, 0);

  if (orderCount === 0) {
    orderCount = shipment.ordersCount ?? shipment.orderIds?.length ?? 0;
  }

  return {
    orderCount,
    productCount,
    label: (
      <>
        {t('orders')} ({orderCount})
        {productCount > 0 && (
          <span className="exp-cust-meta">
            📦 {productCount}{' '}
            {productCount === 1 ? t('aiWizardProduct') : t('aiWizardProducts')}
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

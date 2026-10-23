import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Link2, Loader2, Search, X } from 'lucide-react';
import { erpOrdersService, shipmentsService } from '../../api';
import type { ApiErpOrderListItem } from '../../api/types/erpOrders';
import {
  buildLinkOrderRequest,
  classifyLinkOrderError,
  orderLabel,
  type ExistingOrderHint,
  type LinkOrderRequest,
} from './linkOrderToDispatch';

/**
 * MS3-406 — inline "Link an order to dispatch this load" panel.
 *
 * Shown when a dispatch (accept / counter / book) is refused because the load
 * has no order, or before the click when the payload says so. The shipper picks
 * an existing order (GET erp-orders?available_for_shipment=1) or types a new
 * order number; POST shipments/{id}/link-order links it, then `onLinked` retries
 * the dispatch on the same screen.
 */
export interface LinkOrderToDispatchPanelProps {
  shipmentId: string | number;
  /** Retries the refused dispatch. Throw to keep the panel open with an error. */
  onLinked: () => Promise<void>;
  onCancel: () => void;
  t: (key: string, fallback?: string) => string;
  /** Label of the primary action, e.g. "Link order and accept". */
  submitLabel?: string;
  className?: string;
}

type Mode = 'existing' | 'new';

export const LinkOrderToDispatchPanel: React.FC<LinkOrderToDispatchPanelProps> = ({
  shipmentId,
  onLinked,
  onCancel,
  t,
  submitLabel,
  className = '',
}) => {
  const [mode, setMode] = useState<Mode>('existing');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<ApiErpOrderListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingHint, setExistingHint] = useState<ExistingOrderHint | null>(null);
  /** Order is linked but the retried dispatch failed — offer "Dispatch now". */
  const [linkedButNotDispatched, setLinkedButNotDispatched] = useState(false);

  const numericShipmentId = Number(shipmentId);

  useEffect(() => {
    if (mode !== 'existing') return undefined;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const result = await erpOrdersService.listOrders({
          search: search.trim() || undefined,
          available_for_shipment: true,
          exclude_shipment_id: Number.isFinite(numericShipmentId) ? numericShipmentId : undefined,
          per_page: 10,
          sort: 'updated_at',
          sort_dir: 'desc',
        });
        if (!cancelled) setOrders(result.items);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [mode, search, numericShipmentId]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId]
  );

  const dispatchAfterLink = async () => {
    try {
      await onLinked();
    } catch (err) {
      setLinkedButNotDispatched(true);
      setError(
        err instanceof Error && err.message
          ? `${t('dispatchOrderDispatchFailed', 'The order is linked, but the dispatch failed.')} ${err.message}`
          : t('dispatchOrderDispatchFailed', 'The order is linked, but the dispatch failed.')
      );
    }
  };

  const submit = async (request: LinkOrderRequest | null) => {
    if (!request) {
      setError(t('dispatchOrderChooseOne', 'Choose an order or enter an order number.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    setExistingHint(null);
    try {
      await shipmentsService.linkOrder(shipmentId, request);
      await dispatchAfterLink();
    } catch (err) {
      const failure = classifyLinkOrderError(err);
      switch (failure.kind) {
        case 'reference_in_use':
          setError(t('dispatchOrderInUse', 'This order ID is already in use.'));
          setExistingHint(failure.existing);
          break;
        case 'not_available':
          setError(t('dispatchOrderNotAvailable', 'This order is already planned on another load.'));
          break;
        case 'already_linked':
          // Someone linked an order meanwhile — just dispatch.
          await dispatchAfterLink();
          break;
        case 'not_linkable':
          setError(
            t(
              'dispatchOrderNotLinkable',
              'An order can only be linked to a load that has not been dispatched yet.'
            )
          );
          break;
        default:
          setError(failure.message || t('dispatchOrderLinkFailed', 'Could not link the order.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkedButNotDispatched) {
      setSubmitting(true);
      setError(null);
      void dispatchAfterLink().finally(() => setSubmitting(false));
      return;
    }
    void submit(
      mode === 'existing'
        ? buildLinkOrderRequest({ mode: 'existing', orderId: selectedId })
        : buildLinkOrderRequest({ mode: 'new', orderNumber, customerName })
    );
  };

  const tabClass = (active: boolean) =>
    `flex-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors ${
      active
        ? 'bg-[var(--mv-purple)] text-white border-transparent'
        : 'bg-[var(--surface)] text-slate-700 dark:text-slate-200 border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800'
    }`;

  const primaryLabel = linkedButNotDispatched
    ? t('dispatchOrderDispatchNow', 'Dispatch now')
    : submitLabel || t('dispatchOrderLinkAndDispatch', 'Link order and dispatch');

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-3 ${className}`}
      role="region"
      aria-label={t('dispatchOrderRequiredTitle', 'Link an order to dispatch this load')}
      data-testid="link-order-to-dispatch"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-slate-900 dark:text-white">
            {t('dispatchOrderRequiredTitle', 'Link an order to dispatch this load')}
          </div>
          <p className="text-[12px] text-slate-600 dark:text-slate-300 m-0 mt-0.5">
            {t(
              'dispatchOrderRequiredBody',
              'This load has no order yet. Choose an existing order or enter a new order number (the order is created from this load), then dispatch.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('cancel', 'Cancel')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-0 cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {!linkedButNotDispatched && (
        <>
          <div className="flex gap-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'existing'}
              className={tabClass(mode === 'existing')}
              onClick={() => {
                setMode('existing');
                setError(null);
              }}
            >
              {t('dispatchOrderExistingTab', 'Existing order')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'new'}
              className={tabClass(mode === 'new')}
              onClick={() => {
                setMode('new');
                setError(null);
              }}
            >
              {t('dispatchOrderNewTab', 'New order number')}
            </button>
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('dispatchOrderSearchPlaceholder', 'Search orders by number or customer')}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[13px] text-slate-900 dark:text-white"
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                {searching && orders.length === 0 ? (
                  <div className="px-3 py-2.5 text-[12px] text-slate-500 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    {t('dispatchOrderSearching', 'Searching…')}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="px-3 py-2.5 text-[12px] text-slate-500">
                    {t('dispatchOrderNoResults', 'No available orders found.')}
                  </div>
                ) : (
                  <ul className="m-0 p-0 list-none" role="listbox">
                    {orders.map((order) => {
                      const active = order.id === selectedId;
                      return (
                        <li key={order.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => setSelectedId(order.id)}
                            className={`w-full text-left px-3 py-2 flex items-center gap-2 border-0 cursor-pointer text-[12px] ${
                              active
                                ? 'bg-purple-50 dark:bg-purple-950/40'
                                : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="w-4 flex-shrink-0 text-[var(--mv-purple)]">
                              {active ? <Check size={14} /> : null}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {orderLabel(order)}
                            </span>
                            {order.customer_name ? (
                              <span className="text-slate-500 dark:text-slate-400 truncate">
                                · {order.customer_name}
                              </span>
                            ) : null}
                            {order.delivery_date ? (
                              <span className="ml-auto text-slate-400 tabular-nums flex-shrink-0">
                                {order.delivery_date}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {selectedOrder && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {orderLabel(selectedOrder)}
                  {selectedOrder.products_preview ? ` · ${selectedOrder.products_preview}` : ''}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] font-bold text-slate-900 dark:text-white mb-1 block">
                  {t('dispatchOrderNumberLabel', 'Order number')} <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={orderNumber}
                  maxLength={100}
                  autoFocus
                  onChange={(e) => {
                    setOrderNumber(e.target.value);
                    setExistingHint(null);
                  }}
                  placeholder={t('dispatchOrderNumberPlaceholder', 'e.g. SO-10234')}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[13px] text-slate-900 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-bold text-slate-900 dark:text-white mb-1 block">
                  {t('dispatchOrderCustomerLabel', 'Customer (optional)')}
                </span>
                <input
                  type="text"
                  value={customerName}
                  maxLength={255}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[13px] text-slate-900 dark:text-white"
                />
              </label>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="text-[12px] text-red-600 dark:text-red-400 flex flex-wrap items-center gap-2" role="alert">
          <span>{error}</span>
          {existingHint?.available && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit({ erp_order_id: existingHint.id })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-60"
            >
              <Link2 size={12} />
              {t('dispatchOrderUseExisting', 'Link the existing order')} {existingHint.label}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-60"
        >
          {t('cancel', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-[var(--mv-purple)] hover:bg-[var(--app-primary-hover)] border-0 cursor-pointer disabled:opacity-60"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
          {primaryLabel}
        </button>
      </div>
    </form>
  );
};

/** Same panel in a light overlay — for list screens (Manage Shipments) with no inline slot. */
export const LinkOrderToDispatchModal: React.FC<
  LinkOrderToDispatchPanelProps & { open: boolean }
> = ({ open, ...props }) => {
  if (!open) return null;
  return createPortal(
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && props.onCancel()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[560px] bg-[var(--surface)] rounded-2xl shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
        <LinkOrderToDispatchPanel {...props} className="!rounded-2xl" />
      </div>
    </div>,
    document.body
  );
};

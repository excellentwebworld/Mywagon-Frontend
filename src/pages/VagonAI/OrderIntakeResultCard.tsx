/**
 * Result of an order-intake import: created order refs + one-shot exceptions.
 * Always points at /orders — never a shipment draft.
 *
 * MS3-337: when unknown product/location/customer gaps exist, present them once
 * as grouped lists with a single Review & create CTA (products → locations via
 * widgets; customers → Partners, since there is no create_customer tool).
 */
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, PlusCircle, Users } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import type {
  OrderIntakeMasterGapItem,
  OrderIntakeMasterGaps,
  OrderIntakeResponse,
} from './api/orderIntakeService';
import { type ReviewCreatePayload } from './orderIntakeReviewCreate';
export type { ReviewCreatePayload } from './orderIntakeReviewCreate';
export { buildReviewCreatePrompt } from './orderIntakeReviewCreate';


interface Props {
  result: OrderIntakeResponse;
  T: ThemeTokens;
  onDismiss?: () => void;
  /** MS3-337 — start sequenced create_product / create_location (and Partners for customers). */
  onReviewAndCreate?: (gaps: ReviewCreatePayload) => void;
}

function fallbackGaps(result: OrderIntakeResponse): OrderIntakeMasterGaps {
  if (result.master_gaps) return result.master_gaps;
  const products: OrderIntakeMasterGapItem[] = [];
  const locations: OrderIntakeMasterGapItem[] = [];
  const customers: OrderIntakeMasterGapItem[] = [];
  const seen = new Set<string>();
  const push = (list: OrderIntakeMasterGapItem[], item: OrderIntakeMasterGapItem) => {
    const key = `${item.kind}|${item.name.trim().toLowerCase()}|${(item.sku ?? '').trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push(item);
  };
  for (const ex of result.exceptions) {
    const name = (ex.prefill?.name ?? ex.value ?? '').trim();
    if (!name && !(ex.prefill?.sku ?? '').trim()) continue;
    const display = name || `SKU ${ex.prefill?.sku}`;
    const refs = ex.orderReference ? [ex.orderReference] : [];
    if (ex.kind === 'unknown_product') {
      push(products, {
        kind: 'product',
        name: display,
        sku: ex.prefill?.sku?.trim() || null,
        role: null,
        orderReferences: refs,
        creatableViaWidget: true,
      });
    } else if (ex.kind === 'unknown_location') {
      const role =
        ex.prefill?.role === 'origin' || ex.field === 'origin'
          ? 'origin'
          : ex.prefill?.role === 'dest' || ex.field === 'dest'
            ? 'dest'
            : null;
      push(locations, {
        kind: 'location',
        name: display,
        sku: null,
        role,
        orderReferences: refs,
        creatableViaWidget: true,
      });
    } else if (ex.kind === 'unknown_customer') {
      push(customers, {
        kind: 'customer',
        name: display,
        sku: null,
        role: null,
        orderReferences: refs,
        creatableViaWidget: false,
      });
    }
  }
  return {
    products,
    locations,
    customers,
    counts: {
      products: products.length,
      locations: locations.length,
      customers: customers.length,
      creatable: products.length + locations.length,
    },
  };
}

function GapList({
  title,
  items,
  T,
  renderMeta,
}: {
  title: string;
  items: OrderIntakeMasterGapItem[];
  T: ThemeTokens;
  renderMeta?: (item: OrderIntakeMasterGapItem) => string | null;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="text-[12px] font-bold mb-1" style={{ color: T.t1 }}>
        {title}
      </div>
      <ul className="space-y-1 m-0 pl-0 list-none max-h-36 overflow-auto">
        {items.map((item) => (
          <li
            key={`${item.kind}-${item.name}-${item.sku ?? ''}`}
            className="rounded-lg px-2.5 py-1.5 text-[12px]"
            style={{ background: 'rgba(245,158,11,0.12)', color: T.t1 }}
          >
            <strong>{item.name}</strong>
            {item.sku ? ` · SKU ${item.sku}` : ''}
            {renderMeta?.(item) ? ` · ${renderMeta(item)}` : ''}
            {item.orderReferences.length > 0
              ? ` · from ${item.orderReferences.slice(0, 3).join(', ')}`
              : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OrderIntakeResultCard({ result, T, onDismiss, onReviewAndCreate }: Props) {
  const gaps = fallbackGaps(result);
  const hasMasterGaps =
    gaps.counts.products > 0 || gaps.counts.locations > 0 || gaps.counts.customers > 0;
  const canReviewCreate = gaps.counts.creatable > 0 || gaps.counts.customers > 0;

  const summaryBits: string[] = [];
  if (gaps.counts.products > 0) {
    const n = gaps.counts.products;
    summaryBits.push(
      `${n} product${n === 1 ? " isn't" : "s aren't"} in your Product Master`,
    );
  }
  if (gaps.counts.locations > 0) {
    const n = gaps.counts.locations;
    summaryBits.push(
      `${n} address${n === 1 ? " isn't" : "es aren't"} in your Address Book`,
    );
  }
  if (gaps.counts.customers > 0) {
    const n = gaps.counts.customers;
    summaryBits.push(`${n} customer${n === 1 ? " isn't" : "s aren't"} in Partners`);
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
      data-testid="order-intake-result"
    >
      <div className="flex items-start gap-2 mb-3">
        <ClipboardList size={16} className="mt-0.5 flex-shrink-0" style={{ color: T.t2 }} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold">Order intake</div>
          <div className="text-[12px]" style={{ color: T.t2 }}>
            {result.created.length} created · {result.exceptions.length} exception
            {result.exceptions.length === 1 ? '' : 's'} · {result.parsed.rowCount} data row
            {result.parsed.rowCount === 1 ? '' : 's'} ({result.parsed.source})
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[12px] font-semibold"
            style={{ color: T.t2 }}
          >
            Dismiss
          </button>
        ) : null}
      </div>

      {result.created.length > 0 ? (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5" style={{ color: '#047857' }}>
            <CheckCircle2 size={13} />
            Created in Orders (unplanned)
          </div>
          <ul className="space-y-1.5 m-0 pl-0 list-none">
            {result.created.map((row) => (
              <li
                key={row.order_id || row.reference}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                style={{ background: T.sa }}
              >
                <span>
                  <strong>{row.reference}</strong>
                  {row.customer_name ? ` · ${row.customer_name}` : ''}
                  {row.delivery_date ? ` · due ${row.delivery_date}` : ''}
                  {` · ${row.line_count} line${row.line_count === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
          <Link
            to={result.orders_url || '/orders'}
            className="inline-flex items-center gap-1.5 mt-2 rounded-lg no-underline text-[12.5px] font-bold"
            style={{
              height: 32,
              padding: '0 12px',
              border: `1px solid ${T.bd}`,
              background: T.sf,
              color: T.t1,
            }}
          >
            Open Orders
            <ArrowUpRight size={13} />
          </Link>
        </div>
      ) : null}

      {hasMasterGaps ? (
        <div className="mb-3" data-testid="order-intake-master-gaps">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5" style={{ color: '#B45309' }}>
            <AlertTriangle size={13} />
            Missing masters (flagged once — never invented)
          </div>
          {summaryBits.length > 0 ? (
            <p className="mt-0 mb-2 text-[12.5px]" style={{ color: T.t1 }}>
              {summaryBits.join(' · ')}
              {gaps.counts.creatable > 0 ? ' — create them from the order data?' : ''}
            </p>
          ) : null}
          <GapList title="Products" items={gaps.products} T={T} renderMeta={(i) => (i.sku ? null : null)} />
          <GapList
            title="Addresses"
            items={gaps.locations}
            T={T}
            renderMeta={(i) => (i.role ? i.role : null)}
          />
          <GapList title="Customers" items={gaps.customers} T={T} />

          {canReviewCreate && onReviewAndCreate ? (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {gaps.counts.creatable > 0 || gaps.counts.customers > 0 ? (
                <button
                  type="button"
                  data-testid="order-intake-review-create"
                  onClick={() =>
                    onReviewAndCreate({
                      products: gaps.products,
                      locations: gaps.locations,
                      customers: gaps.customers,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-bold border-none cursor-pointer"
                  style={{
                    height: 34,
                    padding: '0 14px',
                    background: T.ac,
                    color: '#fff',
                  }}
                >
                  <PlusCircle size={14} />
                  Review & create
                </button>
              ) : null}
              {gaps.counts.customers > 0 ? (
                <Link
                  to="/partners"
                  data-testid="order-intake-open-partners"
                  className="inline-flex items-center gap-1.5 rounded-lg no-underline text-[12.5px] font-bold"
                  style={{
                    height: 34,
                    padding: '0 12px',
                    border: `1px solid ${T.bd}`,
                    background: T.sf,
                    color: T.t1,
                  }}
                >
                  <Users size={13} />
                  Open Partners
                  <ArrowUpRight size={13} />
                </Link>
              ) : null}
            </div>
          ) : null}
          {gaps.counts.customers > 0 ? (
            <p className="mt-2 mb-0 text-[11.5px]" style={{ color: T.t2 }}>
              Customers cannot be invented in chat. Use Partners (or invite a partner) with the
              names listed above, then re-import.
            </p>
          ) : null}
        </div>
      ) : null}

      {!hasMasterGaps && result.exceptions.length > 0 ? (
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5" style={{ color: '#B45309' }}>
            <AlertTriangle size={13} />
            Exceptions (flagged once — fix masters, then re-import)
          </div>
          <ul className="space-y-1 m-0 pl-0 list-none max-h-48 overflow-auto">
            {result.exceptions.map((ex, i) => (
              <li
                key={`${ex.kind}-${ex.rowNumber}-${i}`}
                className="rounded-lg px-2.5 py-1.5 text-[12px]"
                style={{ background: 'rgba(245,158,11,0.12)', color: T.t1 }}
              >
                {ex.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasMasterGaps && result.exceptions.some((e) => !String(e.kind).startsWith('unknown_')) ? (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 text-[12px] font-bold mb-1.5" style={{ color: '#B45309' }}>
            <AlertTriangle size={13} />
            Other exceptions
          </div>
          <ul className="space-y-1 m-0 pl-0 list-none max-h-32 overflow-auto">
            {result.exceptions
              .filter((e) => !String(e.kind).startsWith('unknown_'))
              .map((ex, i) => (
                <li
                  key={`other-${ex.kind}-${ex.rowNumber}-${i}`}
                  className="rounded-lg px-2.5 py-1.5 text-[12px]"
                  style={{ background: 'rgba(245,158,11,0.12)', color: T.t1 }}
                >
                  {ex.message}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {result.deferred.length > 0 ? (
        <p className="mt-2 mb-0 text-[12px]" style={{ color: T.t2 }}>
          {result.deferred.join(' ')}
        </p>
      ) : null}

      <p className="mt-3 mb-0 text-[11.5px]" style={{ color: T.t2 }}>
        Orders are saved unplanned. Building a shipment from them is a separate step — intake never skips to a shipment draft.
        Unknown masters are never invented; create them via the widgets (or Partners), then re-import.
      </p>
    </div>
  );
}


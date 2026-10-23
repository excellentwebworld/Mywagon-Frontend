/**
 * The Orders section's list (MS3-368): one compact row per order under a
 * sticky header - Order no. | Customer | Deliv. date | Order value | Status -
 * with a row's own warnings in small text beneath it, and a search by order
 * number once the list is long.
 *
 * Status is New, Will be updated (an unplanned order the file overwrites) or
 * Already planned (on a load, left alone), plus the order's flags. There is no
 * per-row delete, by decision: with 100+ orders it is too heavy, and a shipper
 * who does not want an order fixes the file and uploads it again.
 *
 * Shared by the chat's import card and the Orders page import (MS3-360).
 */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import type { ImportPreviewOrder } from './api/orderImportService';
import {
  describeIncomplete,
  formatOrderValue,
  ORDER_SEARCH_MIN,
  orderRowStatus,
  ordersByAttention,
  rowFlags,
  searchOrders,
  type OrderRowStatus,
} from './erpImport';
import { Chip } from './importCardKit';
import { FLAG_TONE, TONE, type Tone } from './importTones';

const STATUS_TONE: Record<OrderRowStatus, Tone | 'accent'> = { create: 'ok', update: 'accent', planned: 'neutral', failed: 'error' };

/** Order no. | Customer | Deliv. date | Order value | Status. Narrower than ~520px, the table scrolls sideways. */
const COLUMNS = 'minmax(80px, 1fr) minmax(96px, 1.4fr) 66px 104px minmax(140px, 1.5fr)';

/** "12 Oct" in the shipper's language - with the year only when it is not this one; the ISO text when it is not a date. */
function formatDay(iso: string | null, lang: string): string {
  if (!iso) return '';
  const day = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(day.getTime())) return iso;
  const year = day.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
  return day.toLocaleDateString(lang, { day: '2-digit', month: 'short', year });
}

export function ImportOrdersTable({ T, orders, truncated }: { T: ThemeTokens; orders: ImportPreviewOrder[]; truncated: boolean }) {
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState('');
  const sorted = useMemo(() => ordersByAttention(orders), [orders]);
  const shown = searchOrders(sorted, query);
  // The column is "Order value (€)" unless the file names another currency.
  const euro = orders.every((o) => !o.currency || o.currency === 'EUR');
  const cell = 'min-w-0 px-2 py-1.5';
  const columns = [
    t('vagonai.erpImport.orders.col.number'),
    t('vagonai.erpImport.orders.col.customer'),
    t('vagonai.erpImport.orders.col.date'),
    euro ? `${t('vagonai.erpImport.orders.col.value')} (€)` : t('vagonai.erpImport.orders.col.value'),
    t('vagonai.erpImport.orders.col.status'),
  ];

  return (
    <>
      {orders.length > ORDER_SEARCH_MIN ? (
        <label className="relative block mb-2">
          <span className="sr-only">{t('vagonai.erpImport.orders.search')}</span>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.t3 }} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('vagonai.erpImport.orders.search')}
            className="w-full rounded-lg border pl-8 pr-2.5 py-1.5 text-[12.5px] outline-none"
            style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
            data-testid="erp-import-order-search"
          />
        </label>
      ) : null}

      <div className="max-h-72 overflow-auto rounded-lg border" style={{ borderColor: T.bd }} data-testid="erp-import-orders-table">
        <div role="table" aria-label={t('vagonai.erpImport.review.orders')} className="min-w-[520px] text-[12px]">
          <div
            role="row"
            className="grid sticky top-0 z-[1] text-[11px] font-semibold"
            style={{ gridTemplateColumns: COLUMNS, background: T.sa, color: T.t3, boxShadow: `inset 0 -1px 0 ${T.bd}` }}
          >
            {columns.map((label, i) => (
              <span key={label} role="columnheader" className={`${cell} leading-tight self-end${i === 3 ? ' text-right' : ''}`}>
                {label}
              </span>
            ))}
          </div>

          {shown.map((o, i) => {
            const status = orderRowStatus(o);
            const value = formatOrderValue(o.orderValue, o.currency, lang);
            const live = status === 'create' || status === 'update';
            const incomplete = live && o.incomplete?.length
              ? t('vagonai.erpImport.incomplete.label', { reasons: describeIncomplete(o.incomplete, t) })
              : null;
            return (
              <div
                key={o.orderNumber}
                role="row"
                data-testid="erp-import-order"
                data-status={o.status}
                style={{
                  borderTop: i ? `1px solid ${T.bd}` : undefined,
                  background: status === 'failed' ? TONE.error.bg : undefined,
                  opacity: status === 'planned' ? 0.65 : 1,
                }}
              >
                <div className="grid items-center" style={{ gridTemplateColumns: COLUMNS }}>
                  <strong role="cell" className={`${cell} truncate`} title={o.orderNumber}>{o.orderNumber}</strong>
                  <span role="cell" className={`${cell} truncate`} style={{ color: T.t2 }} title={o.company}>{o.company}</span>
                  <span role="cell" className={`${cell} whitespace-nowrap`} style={{ color: T.t2 }}>{formatDay(o.deliveryDate, lang)}</span>
                  <span
                    role="cell"
                    className={`${cell} text-right whitespace-nowrap`}
                    style={{ color: value ? T.t1 : T.t3, fontVariantNumeric: 'tabular-nums' }}
                    data-testid="erp-import-order-value"
                  >
                    {value ?? '–'}
                  </span>
                  <span role="cell" className={`${cell} flex flex-wrap items-center gap-1`}>
                    <Chip
                      T={T}
                      tone={STATUS_TONE[status]}
                      title={status === 'planned' ? t('vagonai.erpImport.orders.plannedHint') : undefined}
                    >
                      {t(`vagonai.erpImport.orders.status.${status}`)}
                    </Chip>
                    {live
                      ? rowFlags(o.flags).map((f) => (
                        <Chip
                          key={f}
                          T={T}
                          tone={FLAG_TONE[f]}
                          title={f === 'customer_pickup' ? t('vagonai.erpImport.orders.pickupHint') : t(`vagonai.erpImport.flagHint.${f}`)}
                        >
                          {t(`vagonai.erpImport.flag.${f}`, { count: 1 })}
                        </Chip>
                      ))
                      : null}
                  </span>
                </div>
                {/* Only rows that have one: what stops it, what it lacks, what was decided for it. */}
                {status === 'failed' && o.errors.length ? (
                  <div className="px-2 pb-1.5 text-[11.5px] leading-snug" style={{ color: TONE.error.fg }}>{o.errors.join(' ')}</div>
                ) : null}
                {incomplete ? (
                  <div className="px-2 pb-1.5 text-[11.5px] leading-snug" style={{ color: TONE.warn.fg }} data-testid="erp-import-incomplete">
                    {incomplete}
                  </div>
                ) : null}
                {live && o.warnings.length ? (
                  <div className="px-2 pb-1.5 text-[11.5px] leading-snug" style={{ color: T.t3 }}>{o.warnings.join(' ')}</div>
                ) : null}
              </div>
            );
          })}

          {shown.length === 0 ? (
            <p className="m-0 px-2 py-2.5" style={{ color: T.t3 }}>{t('vagonai.erpImport.orders.noMatch', { query })}</p>
          ) : null}
        </div>
      </div>
      {truncated ? <p className="m-0 mt-1.5 text-[11.5px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.orders.truncated')}</p> : null}
    </>
  );
}

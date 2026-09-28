/**
 * MS3-334 — collapsible sticky panel of recent unplanned ERP orders on Vagon AI.
 * Create draft / Create drafts for selected drives the chat one-shot draft flow
 * (Wave-1 one-shot + intake-created orders).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Package,
  RefreshCw,
} from 'lucide-react';
import { erpOrdersService } from '../../api';
import type { ErpOrder } from '../ErpOrders/types';
import { isOrderEligibleForCreateLoad } from '../CreateShipmentWizard/hooks/erpOrdersPrefill';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';

const PANEL_LIMIT = 15;
// The ERP orders API validates per_page against an allowlist (10/20/25/50/100),
// so we ask for 25 to fetch enough orders and trim to PANEL_LIMIT client-side.
// Over-fetching also leaves headroom for the isOrderEligibleForCreateLoad filter.
const FETCH_PAGE_SIZE = 25;

export type StickyOrderRow = Pick<
  ErpOrder,
  | 'id'
  | 'orderReference'
  | 'customerName'
  | 'shipFrom'
  | 'shipTo'
  | 'deliveryDate'
  | 'status'
  | 'linkedLoadId'
  | 'linkedLoadSid'
  | 'updatedAt'
  // Read by VagonAIPage when it seeds a draft from a tapped row. Both are
  // `number | null` on ErpOrder and the LIST endpoint does not return them
  // (erpOrdersMapper hard-codes null for list items; only the detail mapper
  // fills them), so a panel row carries null today and the seed falls back to
  // matching on ship_from / ship_to text. Picking them anyway keeps the seam
  // typed for when the list endpoint starts returning them.
  | 'originLocationId'
  | 'destLocationId'
>;

export type DueTone = 'overdue' | 'urgent' | 'soon' | 'normal' | 'none';

export interface DueDescriptor {
  label: string;
  tone: DueTone;
  /** Negative once the deadline has passed; null when there is no date. */
  remainingMs: number | null;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const SOON_MS = 3 * DAY_MS;

/**
 * deliveryDate is a calendar date with no clock, so the order is not late
 * until that day is *over* — the deadline is the last instant of it, in the
 * viewer's own timezone. Anchoring to midnight instead would show every
 * order due today as already overdue.
 */
function deadlineOf(deliveryDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(deliveryDate.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
}

/** The words a due label is built from, so the panel can say it in Greek too. */
export interface DueWords {
  none: string;
  overdue: (span: string) => string;
  dueIn: (span: string) => string;
  units: { d: string; h: string; m: string };
}

const ENGLISH_DUE_WORDS: DueWords = {
  none: 'No due date',
  overdue: (span) => `Overdue ${span}`,
  dueIn: (span) => `Due in ${span}`,
  units: { d: 'd', h: 'h', m: 'm' },
};

/** Coarsest useful unit: days past three, then days+hours, hours, minutes. */
function formatSpan(ms: number, units: DueWords['units']): string {
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms - days * DAY_MS) / HOUR_MS);
  if (days >= 3) return `${days}${units.d}`;
  if (days > 0) return `${days}${units.d} ${hours}${units.h}`;
  if (hours > 0) return `${hours}${units.h}`;
  return `${Math.floor(ms / 60_000)}${units.m}`;
}

export function describeDue(
  deliveryDate: string,
  now: Date = new Date(),
  words: DueWords = ENGLISH_DUE_WORDS,
): DueDescriptor {
  const deadline = deadlineOf(deliveryDate);
  if (!deadline) return { label: words.none, tone: 'none', remainingMs: null };
  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs < 0) {
    return { label: words.overdue(formatSpan(-remainingMs, words.units)), tone: 'overdue', remainingMs };
  }
  const tone: DueTone =
    remainingMs < DAY_MS ? 'urgent' : remainingMs < SOON_MS ? 'soon' : 'normal';
  return { label: words.dueIn(formatSpan(remainingMs, words.units)), tone, remainingMs };
}

/** Soonest deadline first, undated last, most recently touched breaking ties. */
export function sortByUrgency(orders: StickyOrderRow[]): StickyOrderRow[] {
  return [...orders].sort((a, b) => {
    const da = deadlineOf(a.deliveryDate)?.getTime() ?? Infinity;
    const db = deadlineOf(b.deliveryDate)?.getTime() ?? Infinity;
    if (da !== db) return da - db;
    return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
  });
}


/** MS3-349 — chat forceTool payload for sticky Create draft(s). */
export function buildStickyCreateForceTool(orders: StickyOrderRow[]): {
  run_kind?: 'batch';
  forceTool: { name: string; arguments: Record<string, unknown> };
} {
  if (orders.length > 1) {
    return {
      run_kind: 'batch',
      forceTool: {
        name: 'create_homogeneous_batch_drafts',
        arguments: {
          order_ids: orders.map((o) => String(o.id)),
          async: true,
        },
      },
    };
  }
  return {
    forceTool: {
      name: 'create_oneshot_draft_from_order',
      arguments: { order_id: String(orders[0]!.id) },
    },
  };
}

export function buildDraftPrompt(orders: StickyOrderRow[]): string {
  if (orders.length === 1) {
    const o = orders[0]!;
    // The marker is not decoration. `parseStickyOneshotIntent` in the gateway
    // matches `[[VAGON_STICKY_ONESHOT:<id>]]` and calls
    // create_oneshot_draft_from_order directly - no model turn, no tool pick, and
    // no "Save as draft" confirmation card, because that tool does not require
    // confirmation. Without it the same sentence goes through the model, which
    // picks create_shipment instead and puts a confirm card in the way
    // (MS3-341 REGATE7: 22.7s and oneshot=false).
    //
    // The prose after it is still addressed to the model, for the older gateway
    // builds that match on the sentence rather than the marker.
    return (
      `[[VAGON_STICKY_ONESHOT:${o.id}]] ` +
      `Create a complete shipment draft from unplanned ERP order ${o.orderReference} ` +
      `(order id ${o.id}) using one-shot draft creation. ` +
      `Call create_oneshot_draft_from_order with order_id "${o.id}" now. ` +
      `Do not call prepare_shipment or create_shipment. Do not ask for confirmation. ` +
      `Do not invent master data.`
    );
  }
  // No marker on this branch, and that is not an omission: the batch path
  // short-circuits on an explicit `forceTool`, never on scraped text
  // (`parseStickyBatchIntent` returns null for anything else). So this half is
  // addressed to the model, and it has to be unambiguous about the one thing the
  // model gets wrong - merging N orders into one load.
  const list = orders.map((o) => `${o.orderReference} (id ${o.id})`).join(', ');
  return (
    `Create complete shipment drafts from these unplanned ERP orders: ${list}. ` +
    `Call create_homogeneous_batch_drafts with every one of those order ids - ` +
    `exactly one draft per order. Never merge them into a single load. ` +
    `Do not invent master data.`
  );
}

interface Props {
  T: ThemeTokens;
  disabled?: boolean;
  /** Bump after order intake (or other writes) so the list refreshes. */
  refreshToken?: string | number | null;
  onCreateDrafts: (orders: StickyOrderRow[]) => void;
}

export default function StickyOrdersPanel({
  T,
  disabled = false,
  refreshToken = null,
  onCreateDrafts,
}: Props) {
  const { t } = useTranslation();
  const dueWords = useMemo<DueWords>(
    () => ({
      none: t('vagonai.stickyOrders.noDue'),
      overdue: (span) => t('vagonai.stickyOrders.overdue', { span }),
      dueIn: (span) => t('vagonai.stickyOrders.dueIn', { span }),
      units: {
        d: t('vagonai.stickyOrders.unitDay'),
        h: t('vagonai.stickyOrders.unitHour'),
        m: t('vagonai.stickyOrders.unitMinute'),
      },
    }),
    [t],
  );

  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<StickyOrderRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());

  // The countdown resolves to minutes in its last hour, so it has to re-render
  // on its own — otherwise a panel left open shows a stale "Due in 45m".
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { orders: rows } = await erpOrdersService.listOrdersMapped(
        'unplanned',
        false,
        '',
        'updatedAt',
        'desc',
        1,
        FETCH_PAGE_SIZE,
      );
      // Sort before trimming, so the cut keeps the most urgent orders rather
      // than whichever were touched last.
      const eligible = sortByUrgency(rows.filter(isOrderEligibleForCreateLoad)).slice(
        0,
        PANEL_LIMIT,
      );
      setOrders(eligible);
      setSelected((prev) => {
        const ids = new Set(eligible.map((o) => o.id));
        const next = new Set<string>();
        for (const id of prev) if (ids.has(id)) next.add(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('vagonai.stickyOrders.loadFailed', 'Could not load orders.'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.has(o.id)),
    [orders, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runCreate = (rows: StickyOrderRow[]) => {
    if (!rows.length || disabled) return;
    onCreateDrafts(rows);
    setSelected(new Set());
    setOpen(false);
  };

  return (
    <section
      className={`vai-sticky-orders${open ? ' vai-sticky-orders--open' : ''}`}
      style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
      aria-label={t("vagonai.stickyOrders.aria")}
    >
      <div className="vai-sticky-orders-bar">
        <button
          type="button"
          className="vai-sticky-orders-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{ color: T.t1 }}
        >
          <Package size={14} aria-hidden="true" />
          <span className="vai-sticky-orders-title">{t("vagonai.stickyOrders.title")}</span>
          <span className="vai-sticky-orders-count" style={{ color: T.t2 }}>
            {loading ? "…" : t("vagonai.stickyOrders.unplannedCount", { n: orders.length })}
          </span>
          {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
        <div className="vai-sticky-orders-actions">
          {orders.length > 0 ? (
            <label className="vai-sticky-orders-all" style={{ color: T.t2 }}>
              <input
                type="checkbox"
                checked={orders.length > 0 && selectedOrders.length === orders.length}
                disabled={disabled || loading}
                onChange={() => {
                  if (selectedOrders.length === orders.length) setSelected(new Set());
                  else setSelected(new Set(orders.map((o) => o.id)));
                }}
                aria-label={t("vagonai.stickyOrders.selectAll")}
              />
              <span>{t("vagonai.stickyOrders.all")}</span>
            </label>
          ) : null}
          <button
            type="button"
            className="vai-sticky-orders-iconbtn"
            title={t("vagonai.stickyOrders.refresh")}
            aria-label={t("vagonai.stickyOrders.refresh")}
            disabled={loading || disabled}
            onClick={() => void load()}
            style={{ color: T.t2, borderColor: T.bd }}
          >
            {loading ? (
              <Loader2 size={13} className="vai-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={13} aria-hidden="true" />
            )}
          </button>
          {selectedOrders.length > 0 ? (
            <button
              type="button"
              className="vai-sticky-orders-cta" data-testid="sticky-multi-cta"
              disabled={disabled}
              onClick={() => runCreate(selectedOrders)}
              style={{ background: T.t1, color: T.sf }}
            >
              {selectedOrders.length === 1
                ? t("vagonai.stickyOrders.createDraft")
                : t("vagonai.stickyOrders.createDraftsSelected", { n: selectedOrders.length })}
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="vai-sticky-orders-body">
          {error ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }}>
              {error}
            </p>
          ) : null}
          {!error && !loading && orders.length === 0 ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }}>{t("vagonai.stickyOrders.empty")}</p>
          ) : null}
          <ul className="vai-sticky-orders-list">
            {orders.map((order) => {
              const checked = selected.has(order.id);
              const due = describeDue(order.deliveryDate, now, dueWords);
              return (
                <li
                  key={order.id}
                  className={`vai-sticky-orders-row${checked ? ' is-selected' : ''}`}
                >
                  <label className="vai-sticky-orders-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(order.id)}
                      aria-label={t("vagonai.stickyOrders.selectOrder", { ref: order.orderReference })}
                    />
                  </label>
                  <div className="vai-sticky-orders-meta min-w-0">
                    <div className="vai-sticky-orders-ref">
                      <strong title={order.orderReference}>{order.orderReference}</strong>
                      <span style={{ color: T.t2 }} title={order.customerName || undefined}>
                        {order.customerName || '—'}
                      </span>
                    </div>
                    <div className="vai-sticky-orders-lane" style={{ color: T.t2 }}>
                      {(order.shipFrom || '—') + ' → ' + (order.shipTo || '—')}
                    </div>
                  </div>
                  <span
                    className={`vai-sticky-orders-due vai-sticky-orders-due--${due.tone}`}
                    title={order.deliveryDate ? t("vagonai.stickyOrders.deliveryDate", { date: order.deliveryDate }) : undefined}
                  >
                    {due.tone === 'overdue' ? (
                      <AlertTriangle size={11} aria-hidden="true" />
                    ) : (
                      <Clock size={11} aria-hidden="true" />
                    )}
                    {due.label}
                  </span>
                  <button
                    type="button"
                    className="vai-sticky-orders-row-cta"
                    disabled={disabled}
                    onClick={() => runCreate([order])}
                  >
                    {t("vagonai.stickyOrders.createDraft")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

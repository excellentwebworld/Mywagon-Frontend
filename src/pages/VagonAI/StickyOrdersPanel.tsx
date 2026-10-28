/**
 * MS3-334 — collapsible sticky panel of recent unplanned ERP orders on Vagon AI.
 * Create draft / Create drafts for selected drives the chat one-shot draft flow
 * (Wave-1 one-shot + intake-created orders).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { erpOrdersService } from '../../api';
import {
  erpOrderCompletionsService,
  type CompletedErpOrder,
} from '../../api/services/erpOrderCompletionsService';
import type { ErpOrder } from '../ErpOrders/types';
import { isOrderEligibleForCreateLoad } from '../CreateShipmentWizard/hooks/erpOrdersPrefill';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import type { StickyRouteSummary } from './stickyRouteMeasure';
import { focusFirst, type StickyFocusRequest } from './stickyPanelState';

const PANEL_LIMIT = 15;
// The ERP orders API validates per_page against an allowlist (10/20/25/50/100),
// so we ask for 25 to fetch enough orders and trim to PANEL_LIMIT client-side.
// Over-fetching also leaves headroom for the isOrderEligibleForCreateLoad filter.
const FETCH_PAGE_SIZE = 25;
/** The allowlist's largest page, for a panel opened on an import's orders. */
const FOCUS_PAGE_SIZE = 100;

export type StickyOrderRow = Pick<
  ErpOrder,
  | 'id'
  | 'orderReference'
  | 'erpReference'
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


/**
 * MS3-349 — chat forceTool payload for sticky Create draft(s).
 *
 * Any mix of lanes is sent as one batch: the gateway groups the orders by
 * pickup + delivery and saves one draft per lane, so there is no lane
 * preflight here any more.
 *
 * `routeSummaries` are the lanes the page measured (`measureStickyLanes`); the
 * gateway writes each onto the draft whose stops match, so it saves with a route
 * and distance instead of "Missing: Route". Omitted when nothing was measured.
 */

export function buildStickyCreateForceTool(
  orders: StickyOrderRow[],
  routeSummaries: StickyRouteSummary[] = [],
): {
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
          ...(routeSummaries.length > 0 ? { route_summaries: routeSummaries } : {}),
        },
      },
    };
  }
  return {
    forceTool: {
      name: 'create_oneshot_draft_from_order',
      arguments: {
        order_id: String(orders[0]!.id),
        ...(routeSummaries.length > 0 ? { route_summaries: routeSummaries } : {}),
      },
    },
  };
}

/**
 * Mark complete / Reopen from the toolbar. Both are confirmed writes: the
 * gateway validates the forced tool and answers with the confirmation card,
 * with no model turn and nothing written until the shipper confirms.
 */
export function buildStickyOrderStatusForceTool(
  orderId: string,
  action: 'complete' | 'reopen',
): { forceTool: { name: string; arguments: Record<string, unknown> } } {
  return {
    forceTool: {
      name: action === 'complete' ? 'mark_order_complete' : 'reopen_order',
      arguments: { order_id: String(orderId) },
    },
  };
}

/**
 * Laravel still reports an order closed in Vagon AI as unplanned - the gateway
 * holds that decision - so the toolbar drops those rows itself.
 */
export function withoutCompleted<T extends { id: string }>(
  rows: T[],
  completed: readonly Pick<CompletedErpOrder, 'order_id'>[],
): T[] {
  if (completed.length === 0) return rows;
  const closed = new Set(completed.map((row) => String(row.order_id)));
  return rows.filter((row) => !closed.has(String(row.id)));
}

/** MS3-353 — Orders panel search (order # / customer / destination). */
export type OrderSearchFields = Pick<
  StickyOrderRow,
  'id' | 'orderReference' | 'customerName' | 'shipFrom' | 'shipTo'
>;

export function matchesOrderSearch(order: OrderSearchFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [order.orderReference, order.customerName, order.shipFrom, order.shipTo, order.id]
    .filter((part): part is string => Boolean(part && String(part).trim()))
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export function filterOrdersBySearch<T extends OrderSearchFields>(orders: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return orders;
  return orders.filter((order) => matchesOrderSearch(order, q));
}

/** Completed-tab search (reference / customer). */
export function matchesCompletedOrderSearch(
  row: Pick<CompletedErpOrder, 'order_id' | 'order_reference' | 'customer_name'>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.order_reference, row.customer_name, row.order_id]
    .filter((part): part is string => Boolean(part && String(part).trim()))
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
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
    `Call create_homogeneous_batch_drafts once with every one of those order ids, ` +
    `whatever lanes they are on - it builds one draft per lane, putting orders with ` +
    `the same pickup and delivery on one draft. Do not split or drop any id. ` +
    `Do not invent master data.`
  );
}

/** Overdue rows, for the closed bar - the one number worth seeing without opening the panel. */
function countOverdue(orders: Pick<StickyOrderRow, 'deliveryDate'>[], now: Date): number {
  return orders.filter((o) => describeDue(o.deliveryDate, now).tone === 'overdue').length;
}

interface Props {
  T: ThemeTokens;
  disabled?: boolean;
  /** Bump after order intake (or other writes) so the list refreshes. */
  refreshToken?: string | number | null;
  /**
   * MS3-364: the panel is the page's right-hand drawer, opened from a header
   * button - so whether it is open is the page's. It stays mounted while closed,
   * which keeps the header's "N to plan" count current.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the header button's badge says. */
  onCountChange?: (count: { plannable: number; hasMore: boolean; overdue: number }) => void;
  /** A row action went to the chat (a draft, a confirmation card): the page may close the drawer to show it. */
  onActed?: () => void;
  /** Select these orders ("Plan these orders" after an import); the page opens the drawer. */
  focusRequest?: StickyFocusRequest | null;
  onCreateDrafts: (orders: StickyOrderRow[]) => void;
  /** An order delivered outside MYVAGON - opens the confirmation card in chat. */
  onMarkComplete: (order: StickyOrderRow) => void;
  onReopen: (order: CompletedErpOrder) => void;
}

type PanelView = 'unplanned' | 'completed';

/** "20 Oct" - the delivery date itself, beside how long is left. Empty when it is not a date. */
function formatDeliveryDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value?.trim() ?? '');
  if (!m) return '';
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

function formatCompletedDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StickyOrdersPanel({
  T,
  disabled = false,
  refreshToken = null,
  open,
  onOpenChange,
  onCountChange,
  onActed,
  focusRequest = null,
  onCreateDrafts,
  onMarkComplete,
  onReopen,
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<StickyOrderRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Rows sent to Create draft. Shown as "Drafting…" and left out of the count
  // until the next refresh, so the bar never says "6" while showing 5 (VA-1).
  const [drafting, setDrafting] = useState<Set<string>>(new Set());
  const [view, setView] = useState<PanelView>('unplanned');
  const [completed, setCompleted] = useState<CompletedErpOrder[]>([]);
  const [completedError, setCompletedError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  // MS3-353 — filter Orders panel by order # / customer / destination.
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // "Plan these orders" from an import: open on them, selected, with nothing
  // filtering them out. Adjusted while rendering (React's pattern for reacting
  // to a prop change), so the reset and the reload happen in one pass.
  const [focus, setFocus] = useState<StickyFocusRequest | null>(null);
  const appliedFocus = useRef<number | null>(null);
  if (focusRequest && focusRequest.ids.length > 0 && focusRequest.token !== focus?.token) {
    setFocus(focusRequest);
    setView('unplanned');
    setSearchInput('');
    setDebouncedSearch('');
  }

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // The countdown resolves to minutes in its last hour, so it has to re-render
  // on its own — otherwise a panel left open shows a stale "Due in 45m".
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCompletedError(null);
    try {
      const search = debouncedSearch;
      const focusIds = focus?.ids ?? [];
      // Select the focused orders once per request, not on every later refresh.
      const selectFocus = focus !== null && appliedFocus.current !== focus.token;
      // When searching, keep the full fetch page so multi-select can reach
      // matches beyond the default urgency trim (MS3-353).
      const trimTo = search ? FETCH_PAGE_SIZE : Math.max(PANEL_LIMIT, focusIds.length);
      // "Plan these 100 orders" has to be able to select all 100; the import just
      // wrote them, so they lead the updatedAt-desc page.
      const pageSize = focusIds.length > FETCH_PAGE_SIZE ? FOCUS_PAGE_SIZE : FETCH_PAGE_SIZE;
      const [{ orders: rows, meta }, closed] = await Promise.all([
        erpOrdersService.listOrdersMapped(
          'unplanned',
          false,
          search,
          'updatedAt',
          'desc',
          1,
          pageSize,
        ),
        // A gateway blip must not blank the unplanned list; it only loses the
        // Completed view (and the filtering) until the next refresh.
        erpOrderCompletionsService.list().catch(() => null),
      ]);
      if (closed === null) setCompletedError(t('vagonai.stickyOrders.completedLoadFailed'));
      setCompleted(closed ?? []);
      // Sort before trimming. Client-side filter still applies for destination
      // text Laravel search may miss (MS3-353).
      const all = focusFirst(
        sortByUrgency(
          filterOrdersBySearch(
            withoutCompleted(rows.filter(isOrderEligibleForCreateLoad), closed ?? []),
            search,
          ),
        ),
        focusIds,
      );
      const eligible = all.slice(0, trimTo);
      setOrders(eligible);
      setHasMore(all.length > eligible.length || (meta?.total ?? 0) > rows.length);
      setDrafting(new Set());
      setSelected((prev) => {
        const ids = new Set(eligible.map((o) => o.id));
        const next = new Set<string>();
        for (const id of prev) if (ids.has(id)) next.add(id);
        if (selectFocus) for (const id of focusIds) if (ids.has(String(id))) next.add(String(id));
        return next;
      });
      if (selectFocus) appliedFocus.current = focus.token;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('vagonai.stickyOrders.loadFailed', 'Could not load orders.'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [t, debouncedSearch, focus]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  // load() already applies the debounced search filter for unplanned rows.
  const visibleOrders = orders;
  const plannable = useMemo(() => visibleOrders.filter((o) => !drafting.has(o.id)), [visibleOrders, drafting]);
  const overdue = useMemo(() => countOverdue(plannable, now), [plannable, now]);
  useEffect(() => {
    onCountChange?.({ plannable: plannable.length, hasMore, overdue });
  }, [plannable.length, hasMore, overdue, onCountChange]);
  const visibleCompleted = useMemo(
    () =>
      debouncedSearch
        ? completed.filter((row) => matchesCompletedOrderSearch(row, debouncedSearch))
        : completed,
    [completed, debouncedSearch],
  );

  const selectedOrders = useMemo(
    () => plannable.filter((o) => selected.has(o.id)),
    [plannable, selected],
  );
  const searchActive = Boolean(debouncedSearch);
  const allSelected = plannable.length > 0 && selectedOrders.length === plannable.length;

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
    setDrafting((prev) => new Set([...prev, ...rows.map((r) => r.id)]));
    setSelected(new Set());
    onActed?.();
  };

  // Like Create, so the confirmation card it raises can be brought into view.
  const runMarkComplete = (order: StickyOrderRow) => {
    if (disabled) return;
    onMarkComplete(order);
    onActed?.();
  };

  const runReopen = (order: CompletedErpOrder) => {
    if (disabled) return;
    onReopen(order);
    onActed?.();
  };

  const countLabel = `${plannable.length}${hasMore ? '+' : ''}`;

  return (
    <section
      className={`vai-sticky-orders${open ? ' vai-sticky-orders--open' : ''}`}
      // The left edge and the bottom rule separate the panel from the chat
      // below it (QA 2026-10-08). No drop shadow: the panel sits in the page's
      // flow, above the chat rather than over it, and a shadow made whatever was
      // scrolled to its edge look trapped underneath (QA 2026-10-06).
      style={{
        borderColor: T.bd,
        borderLeft: `1px solid ${T.bd}`,
        background: T.sf,
        color: T.t1,
      }}
      aria-label={t('vagonai.stickyOrders.aria')}
    >
      <div className="vai-sticky-orders-bar">
        <button
          type="button"
          className="vai-sticky-orders-toggle"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          style={{ color: T.t1, whiteSpace: 'nowrap' }}
        >
          <Package size={14} aria-hidden="true" />
          <span className="vai-sticky-orders-title">{t('vagonai.stickyOrders.title')}</span>
          <span className="vai-sticky-orders-count" style={{ color: T.t2, whiteSpace: 'nowrap' }}>
            {loading && orders.length === 0 ? '…' : t('vagonai.stickyOrders.toPlan', { n: countLabel })}
          </span>
          {overdue > 0 ? (
            <span className="vai-sticky-orders-due vai-sticky-orders-due--overdue" data-testid="sticky-overdue-count">
              <AlertTriangle size={11} aria-hidden="true" />
              {t('vagonai.stickyOrders.overdueCount', { n: overdue })}
            </span>
          ) : null}
        </button>
        <div className="vai-sticky-orders-actions">
          {!open && selectedOrders.length > 0 ? (
            <span style={{ fontSize: 12, color: T.t2, whiteSpace: 'nowrap' }}>
              {t('vagonai.stickyOrders.selectedCount', { n: selectedOrders.length })}
            </span>
          ) : null}
          {/* MS3-379: a row shows only the essentials and no order opens on its own, so one way to all the details. */}
          <Link
            to="/erp-orders"
            className="vai-sticky-orders-linkbtn"
            title={t('vagonai.stickyOrders.seeAllTitle')}
            aria-label={t('vagonai.stickyOrders.seeAllTitle')}
            style={{ color: T.t2, borderColor: T.bd }}
            data-testid="sticky-see-all-orders"
          >
            {t('vagonai.stickyOrders.seeAll')}
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="vai-sticky-orders-iconbtn"
            title={t('vagonai.stickyOrders.refresh')}
            aria-label={t('vagonai.stickyOrders.refresh')}
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
          <button
            type="button"
            className="vai-sticky-orders-iconbtn"
            title={t('vagonai.stickyOrders.close')}
            aria-label={t('vagonai.stickyOrders.close')}
            onClick={() => onOpenChange(false)}
            style={{ color: T.t2, borderColor: T.bd }}
            data-testid="orders-drawer-close"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="vai-sticky-orders-toolbar">
          {view === 'unplanned' && plannable.length > 0 ? (
            <label className="vai-sticky-orders-all" style={{ color: T.t2 }}>
              <input
                type="checkbox"
                checked={allSelected}
                disabled={disabled || loading}
                onChange={() => {
                  if (allSelected) setSelected(new Set());
                  else setSelected(new Set(plannable.map((o) => o.id)));
                }}
                aria-label={t('vagonai.stickyOrders.selectAll')}
              />
            </label>
          ) : null}
          <div className="vai-sticky-orders-search" style={{ borderColor: T.bd }}>
            <Search size={13} aria-hidden="true" style={{ color: T.t3, flexShrink: 0 }} />
            {/* Typing stays possible while a (slow) load runs; the debounce picks up the latest text. */}
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('vagonai.stickyOrders.searchPlaceholder')}
              aria-label={t('vagonai.stickyOrders.searchAria')}
              data-testid="sticky-orders-search"
              disabled={disabled}
              style={{ color: T.t1 }}
            />
            {searchInput ? (
              <button
                type="button"
                className="vai-sticky-orders-search-clear"
                title={t('vagonai.stickyOrders.searchClear')}
                aria-label={t('vagonai.stickyOrders.searchClear')}
                onClick={() => setSearchInput('')}
                style={{ color: T.t2 }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="vai-sticky-orders-views" role="group" aria-label={t('vagonai.stickyOrders.viewsAria')}>
            <button
              type="button"
              className="vai-sticky-orders-view"
              aria-pressed={view === 'unplanned'}
              onClick={() => setView('unplanned')}
            >
              {t('vagonai.stickyOrders.tabUnplanned')}
            </button>
            <button
              type="button"
              className="vai-sticky-orders-view"
              aria-pressed={view === 'completed'}
              data-testid="sticky-completed-view"
              onClick={() => {
                setView('completed');
                setSelected(new Set());
              }}
            >
              {t('vagonai.stickyOrders.tabCompleted', { n: visibleCompleted.length })}
            </button>
          </div>
        </div>
      ) : null}

      {/* The bulk action has its own bar under the header. In the header it
          squeezed the count onto two lines and was itself cut off at ~1150px
          (QA 2026-10-08). */}
      {open && view === 'unplanned' && selectedOrders.length > 0 ? (
        <div className="vai-sticky-orders-bulk" data-testid="sticky-bulk-bar" style={{ borderColor: T.bd }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.t2, whiteSpace: 'nowrap' }}>
            {t('vagonai.stickyOrders.selectedCount', { n: selectedOrders.length })}
          </span>
          <div className="vai-sticky-orders-actions">
            <button
              type="button"
              className="vai-sticky-orders-row-cta vai-sticky-orders-row-cta--quiet"
              onClick={() => setSelected(new Set())}
            >
              {t('vagonai.stickyOrders.clearSelection')}
            </button>
            <button
              type="button"
              className="vai-sticky-orders-cta"
              data-testid="sticky-multi-cta"
              disabled={disabled}
              onClick={() => runCreate(selectedOrders)}
              style={{ background: T.ac, color: '#fff', whiteSpace: 'nowrap' }}
            >
              {selectedOrders.length === 1
                ? t('vagonai.stickyOrders.createDraft')
                : t('vagonai.stickyOrders.createDraftsSelected', { n: selectedOrders.length })}
            </button>
          </div>
        </div>
      ) : null}

      {open && view === 'completed' ? (
        <div className="vai-sticky-orders-body">
          {completedError ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }} role="alert">
              {completedError}
            </p>
          ) : null}
          {!completedError && !loading && completed.length === 0 ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }}>{t('vagonai.stickyOrders.emptyCompleted')}</p>
          ) : null}
          {!completedError && !loading && completed.length > 0 && visibleCompleted.length === 0 && searchActive ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }} data-testid="sticky-orders-search-empty">
              {t('vagonai.stickyOrders.searchNoMatch', { term: debouncedSearch })}
            </p>
          ) : null}
          <ul className="vai-sticky-orders-list">
            {visibleCompleted.map((row) => {
              const when = formatCompletedDate(row.completed_at);
              return (
                <li key={row.order_id} className="vai-sticky-orders-row">
                  <div className="vai-sticky-orders-meta min-w-0">
                    <div className="vai-sticky-orders-ref">
                      <strong title={row.order_reference}>{row.order_reference}</strong>
                      <span style={{ color: T.t2 }} title={row.customer_name || undefined}>
                        {row.customer_name || '—'}
                      </span>
                    </div>
                    <div className="vai-sticky-orders-lane" style={{ color: T.t2 }} title={row.reason || undefined}>
                      {[when ? t('vagonai.stickyOrders.completedOn', { date: when }) : null, row.reason]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="vai-sticky-orders-row-cta vai-sticky-orders-row-cta--quiet"
                    disabled={disabled}
                    aria-label={t('vagonai.stickyOrders.reopenAria', { ref: row.order_reference })}
                    onClick={() => runReopen(row)}
                  >
                    {t('vagonai.stickyOrders.reopen')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {open && view === 'unplanned' ? (
        <div className="vai-sticky-orders-body">
          {error ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }} role="alert">
              {error}
            </p>
          ) : null}
          {!error && !loading && orders.length === 0 && !searchActive ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }}>{t('vagonai.stickyOrders.empty')}</p>
          ) : null}
          {!error && !loading && orders.length === 0 && searchActive ? (
            <p className="vai-sticky-orders-empty" style={{ color: T.t2 }} data-testid="sticky-orders-search-empty">
              {t('vagonai.stickyOrders.searchNoMatch', { term: debouncedSearch })}
            </p>
          ) : null}
          <ul className="vai-sticky-orders-list">
            {visibleOrders.map((order) => {
              const isDrafting = drafting.has(order.id);
              const checked = !isDrafting && selected.has(order.id);
              const due = describeDue(order.deliveryDate, now, dueWords);
              // The ERP's own number - where the import writes it - else its sales order.
              const ref = order.orderReference || order.erpReference;
              return (
                <li
                  key={order.id}
                  className={`vai-sticky-orders-row${checked ? ' is-selected' : ''}${isDrafting ? ' is-drafting' : ''}`}
                >
                  <label className="vai-sticky-orders-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || isDrafting}
                      onChange={() => toggle(order.id)}
                      aria-label={t('vagonai.stickyOrders.selectOrder', { ref: order.orderReference })}
                    />
                  </label>
                  {/* MS3-364: each value says what it is. The list API names the drop-off, not its code. */}
                  <dl className="vai-sticky-orders-fields min-w-0" data-testid="sticky-order-fields">
                    <dt>{t('vagonai.stickyOrders.field.order')}</dt>
                    <dd><strong title={ref}>{ref || '—'}</strong></dd>
                    <dt>{t('vagonai.stickyOrders.field.customer')}</dt>
                    <dd title={order.customerName || undefined}>{order.customerName || '—'}</dd>
                    <dt>{t('vagonai.stickyOrders.field.location')}</dt>
                    <dd title={order.shipTo || undefined} className={order.shipTo ? undefined : 'vai-sticky-orders-missing'}>
                      {order.shipTo || t('vagonai.stickyOrders.dropoffNotSet')}
                    </dd>
                    <dt>{t('vagonai.stickyOrders.field.date')}</dt>
                    <dd className="vai-sticky-orders-date">
                      <span>{formatDeliveryDate(order.deliveryDate) || '—'}</span>
                      <span
                        className={`vai-sticky-orders-due vai-sticky-orders-due--${due.tone}`}
                        title={order.deliveryDate ? t('vagonai.stickyOrders.deliveryDate', { date: order.deliveryDate }) : undefined}
                      >
                        {due.tone === 'overdue' ? (
                          <AlertTriangle size={11} aria-hidden="true" />
                        ) : (
                          <Clock size={11} aria-hidden="true" />
                        )}
                        {due.label}
                      </span>
                    </dd>
                  </dl>
                  {isDrafting ? (
                    <span className="vai-sticky-orders-drafting" style={{ color: T.t2 }} role="status">
                      <Loader2 size={12} className="vai-spin" aria-hidden="true" />
                      {t('vagonai.stickyOrders.drafting')}
                    </span>
                  ) : (
                    <>
                      {/* Rare and secondary: shown on hover or keyboard focus, always on touch screens. */}
                      <button
                        type="button"
                        className="vai-sticky-orders-row-cta vai-sticky-orders-row-cta--quiet vai-sticky-orders-row-cta--reveal"
                        disabled={disabled}
                        title={t('vagonai.stickyOrders.markCompleteAria', { ref: order.orderReference })}
                        aria-label={t('vagonai.stickyOrders.markCompleteAria', { ref: order.orderReference })}
                        onClick={() => runMarkComplete(order)}
                      >
                        {t('vagonai.stickyOrders.markComplete')}
                      </button>
                      <button
                        type="button"
                        className="vai-sticky-orders-row-cta"
                        disabled={disabled}
                        onClick={() => runCreate([order])}
                      >
                        {t('vagonai.stickyOrders.createDraft')}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

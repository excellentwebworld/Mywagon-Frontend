/**
 * "Which orders?" (§5.1 `pick_orders`, §8.3): the shipper's orders grouped by customer, collapsed, with the true count on every
 * group, search, and a tick on each order. Continue posts ONE answer with the ticked ids.
 *
 * QA-1: the step may arrive WITHOUT its first page (`spec.orders`: the import is still running, or the gateway does not send it yet).
 * That used to be the bare prompt with nothing to read or press — a dead end. Now it is always one of four things the shipper can
 * read: LOADING (it asks R4 `orders` itself, §6.6, and says so), EMPTY ("No orders found"), ERROR ("couldn't load", Try again), or the
 * list. Every phase offers a way out — "Start manually instead" posts the gate answer `{origin:'manual'}` (answers are checked by
 * rev, not by step, so the gateway takes it from here). Collapsed (MS3-396) and scrollable (MS3-399).
 *
 * The gateway sends each customer EMPTY with its true count (§6.6 `collapsed`); opening one fetches its orders (`group=<id>`, every
 * page). A search goes to the server (`q=`, debounced): it matches order numbers, ERP references, cities and products, which a local
 * filter over unopened customers never could.
 * Hook order: [0] ticked ids, [1] open groups, [2] search, [3] orders so far (null ⇒ none yet), [4] "more" in flight,
 * [5] wait ('loading' | 'error'), [6] attempt counter, [7] fetched groups, [8] groups being fetched, [9] server search result.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, Loader2 } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { inputStyle, LINK_CLASS } from '../intakeStyles';
import { TapButton as Button } from '../intakeUi';
import { FILTER_AFTER } from '../../selectionGroups';
import type { IntakeAnswerWire, IntakeStepEvent, OptionsKind, OptionsOk, OptionsQuery, OptionsResponse, PickOrdersWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import type { OptionItem } from '../contract';
import { collectAll, itemsForGroup, loadFirstOrders, mergePages, ordersPhaseOf } from '../optionsModel';
import { fillGroup, loadedCount, nodesOfResponse, toggled, visibleRows, type PickNode } from '../pickerTree';
import { GroupedPicker } from './GroupedPicker';

/** How long the search box waits after the last key before it asks the server. */
const SEARCH_DEBOUNCE_MS = 250;

export function PickOrdersWidget({
  ui, event, spec, disabled, onAnswer, load, onManual, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: PickOrdersWidgetSpec; disabled: boolean;
  onAnswer: (wire: IntakeAnswerWire) => void;
  /** "Start manually instead": the host posts the gate answer `{step:'gate', origin:'manual'}`. */
  onManual?: () => void;
  load?: (kind: OptionsKind, query: OptionsQuery) => Promise<OptionsResponse>;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const [ticked, setTicked] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<OptionsOk | null>(spec.orders ?? null);
  const [more, setMore] = useState(false);
  const [wait, setWait] = useState<'loading' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [filled, setFilled] = useState<Record<string, OptionItem[]>>({});
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [found, setFound] = useState<{ q: string; res: OptionsOk | null } | null>(null);
  const phase = ordersPhaseOf(orders, wait);
  const term = query.trim();
  // No first page on the event: ask R4 `orders` for it (and again on "Try again"). `load` is read when the effect runs.
  useEffect(() => {
    if (orders || !load || wait !== 'loading') return undefined;
    let live = true;
    void loadFirstOrders(load).then((res) => {
      if (!live) return;
      if (res.ok) setOrders(res.orders); else setWait('error');
    });
    return () => { live = false; };
  }, [orders === null, wait, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  // A search asks the server (debounced): order numbers and cities live inside customers that are not opened yet.
  useEffect(() => {
    if (!load || term === '') return undefined;
    let live = true;
    const timer = setTimeout(() => {
      void collectAll((cursor) => load('orders', { q: term, ...(cursor ? { cursor } : {}) })).then(
        (res) => { if (live) setFound({ q: term, res: res.ok ? res : null }); },
        () => { if (live) setFound({ q: term, res: null }); },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => { live = false; clearTimeout(timer); };
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps
  const tryAgain = () => { setOrders(null); setWait('loading'); setAttempt(attempt + 1); setFilled({}); };
  /** Opening a customer the gateway sent empty fetches its orders (every page); a failed fetch leaves it closable and re-openable. */
  const toggleGroup = (node: PickNode) => {
    setExpanded(toggled(expanded, node.key));
    if (load && node.lazy && !expanded.includes(node.key) && !filled[node.id] && !loadingKeys.includes(node.key)) {
      setLoadingKeys([...loadingKeys, node.key]);
      void collectAll((cursor) => load('orders', { group: node.id, ...(cursor ? { cursor } : {}) })).then(
        (res) => { if (res.ok) setFilled((f) => ({ ...f, [node.id]: itemsForGroup(res, node.id) })); },
        () => undefined,
      ).finally(() => setLoadingKeys((k) => k.filter((x) => x !== node.key)));
    }
  };
  let nodes = nodesOfResponse(orders ?? { groups: [] });
  for (const [groupId, items] of Object.entries(filled)) nodes = fillGroup(nodes, groupId, items);
  const searched = term !== '' && found?.q === term && found.res !== null ? found.res : null;
  const searchNodes = searched ? nodesOfResponse(searched) : null;
  const rows = searchNodes
    ? visibleRows(searchNodes, new Set(searchNodes.map((n) => n.key)), '')
    : visibleRows(nodes, new Set(expanded), query);
  const searching = term !== '' && load !== undefined && found?.q !== term;
  const shown = loadedCount(nodes);
  const multiple = spec.multiple !== false;
  const loadMore = () => {
    if (!load || !orders || !orders.nextCursor || more) return;
    setMore(true);
    void load('orders', { cursor: orders.nextCursor }).then(
      (res) => { if (res.ok) setOrders((o) => (o ? mergePages(o, res) : res)); },
      () => undefined,
    ).finally(() => setMore(false));
  };
  const pick = (id: string) => setTicked(multiple ? (ticked.includes(id) ? ticked.filter((x) => x !== id) : [...ticked, id]) : [id]);
  const manual = chrome(ui, 'pickOrders.manual', 'Start manually instead');
  if (phase !== 'ready') {
    return (
      <Shell T={T}>
        <Heading T={T} icon={<ClipboardList size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
        <div data-testid={`intake-orders-${phase}`} data-phase={phase} role={phase === 'error' ? 'alert' : 'status'} aria-live="polite">
          <p className="flex items-start" style={{ gap: 8, fontSize: 14, fontWeight: 600, color: phase === 'error' ? '#B45309' : T.t1, lineHeight: 1.45 }}>
            {phase === 'loading' && <Loader2 size={15} className="flex-shrink-0 mt-0.5 animate-spin" aria-hidden="true" />}
            {phase === 'error' && <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" aria-hidden="true" />}
            <span data-testid="intake-orders-state-title">
              {phase === 'loading' && chrome(ui, 'pickOrders.loading', 'Loading your orders…')}
              {phase === 'empty' && chrome(ui, 'pickOrders.empty', 'No orders found.')}
              {phase === 'error' && chrome(ui, 'pickOrders.error', 'I couldn\'t load your orders.')}
            </span>
          </p>
          <p data-testid="intake-orders-state-hint" style={{ fontSize: 13, color: T.t2, lineHeight: 1.5, marginTop: 4 }}>
            {phase === 'loading' && chrome(ui, 'pickOrders.loadingHint', 'This can take a moment. You can also start the load manually.')}
            {phase === 'empty' && chrome(ui, 'pickOrders.emptyHint', 'There is nothing to choose from yet. Add your orders first, or start the load manually.')}
            {phase === 'error' && chrome(ui, 'pickOrders.errorHint', 'Try again, or start the load manually.')}
          </p>
        </div>
        <div className="vai-ik-actions">
          {phase !== 'loading' && load && (
            <Button T={T} variant="ghost" disabled={disabled} onClick={tryAgain} data-testid="intake-orders-retry">
              {phase === 'empty' ? chrome(ui, 'pickOrders.checkAgain', 'Check again') : chrome(ui, 'pickOrders.retry', 'Try again')}
            </Button>
          )}
          {onManual && (
            <Button T={T} variant={phase === 'loading' ? 'ghost' : 'primary'} disabled={disabled} onClick={onManual} data-testid="intake-orders-manual">{manual}</Button>
          )}
        </div>
        <NoticeLines ui={ui} notices={event.notices} />
        <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
      </Shell>
    );
  }
  const shownOrders = orders as OptionsOk;
  return (
    <Shell T={T}>
      <Heading T={T} icon={<ClipboardList size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <p data-testid="intake-orders-total" className="vai-ik-eyebrow">{chrome(ui, 'pickOrders.total', '{{count}} orders', { count: shownOrders.total })}</p>
      {(spec.search !== false && (shownOrders.total > FILTER_AFTER || query !== '')) && (
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="intake-orders-search"
          placeholder={chrome(ui, 'pickOrders.search', 'Search by order, customer or city')} aria-label={chrome(ui, 'pickOrders.search', 'Search by order, customer or city')}
          style={{ ...inputStyle(T), marginBottom: 10 }}
        />
      )}
      {searching && <p data-testid="intake-orders-searching" className="vai-ik-why" style={{ marginTop: 0, marginBottom: 8 }}>{chrome(ui, 'pick.searching', 'Searching…')}</p>}
      <GroupedPicker
        ui={ui} testId="intake-orders-list" rows={rows} selected={ticked} multiple={multiple} disabled={disabled} loadingKeys={loadingKeys}
        emptyText={chrome(ui, 'pick.noMatch', 'Nothing matches.')}
        onToggleGroup={searchNodes ? () => undefined : toggleGroup} onPick={(n) => pick(n.id)}
      />
      {!searchNodes && shownOrders.nextCursor && load && (
        <button type="button" disabled={disabled || more} onClick={loadMore} data-testid="intake-orders-more" style={{ marginTop: 8 }} className={LINK_CLASS}>
          {chrome(ui, 'pick.loadMore', 'Show more ({{shown}} of {{total}})', { shown, total: shownOrders.total })}
        </button>
      )}
      <div className="vai-ik-actions">
        <Button T={T} disabled={disabled || ticked.length === 0} onClick={() => onAnswer({ step: 'pick_orders', orderIds: ticked })} data-testid="intake-orders-continue">
          {chrome(ui, 'pickOrders.continue', 'Use {{count}} selected', { count: ticked.length })}
        </Button>
        {onManual && (
          <Button T={T} variant="subtle" disabled={disabled} onClick={onManual} data-testid="intake-orders-manual">{manual}</Button>
        )}
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}

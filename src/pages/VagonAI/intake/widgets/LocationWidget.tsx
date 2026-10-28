/**
 * "Where is it picked up / dropped off?" (MS3-398 grouped selectors; MS3-396/399 collapsed + scrollable lists; MS3-397 create on the spot).
 * The gateway's best matches (a flat top-8 PREVIEW, §20.9 — no grouping inside it) come first as one-tap answers (the top one
 * highlighted, never auto-answered); everything else is behind ONE quiet row — "Browse all sites" — that opens the shipper's
 * full list, grouped by COMPANY and collapsed (MS3-396), with the true count on each group, a search box, and the two
 * directories as tabs: a pick-up opens on "My sites", a drop-off on "Customers". "+ Add a new site" opens the existing
 * address form beneath this widget (MS3-397, §8.10) — this card stays on screen — and on save the new site is used right
 * away unless the shipper un-ticks "Use it right away". One answer per step: `{stopKey, locationId}`.
 *
 * Hook order (a test injects state by index): [0] browse status, [1] tab, [2] data per directory, [3] open groups,
 * [4] search text, [5] rows of lazily loaded groups, [6] keys being loaded, [7] nested create, [8] "use it now", [9] just added.
 * The list itself (`GroupedPicker`) is controlled and hook-free; the grouping/search rules are in `pickerTree`.
 */
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { inputStyle, LINK_CLASS } from '../intakeStyles';
import { TapButton as Button } from '../intakeUi';
import { FILTER_AFTER } from '../../selectionGroups';
import type { Directory, IntakeAnswerWire, IntakeStepEvent, LocationWidgetSpec, OptionItem, OptionsKind, OptionsOk, OptionsQuery, OptionsResponse } from '../contract';
import { renderTxt } from '../intakeCopy';
import { defaultTabOf, locationAnswer, optionDetail } from '../intakeModel';
import type { CreateState, CreatedRecord, IntakeCreateKit } from '../intakeCreate';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { collectAll, itemsForGroup, mergePages } from '../optionsModel';
import { fillGroup, loadedCount, nodesOfResponse, toggled, visibleRows, type PickNode } from '../pickerTree';
import { ChoiceButton } from './choiceKit';
import { GroupedPicker, LIST_MAX_HEIGHT } from './GroupedPicker';
import { TAP_CLASS } from '../tap';

const DIRECTORIES: Directory[] = ['my_locations', 'customers'];
type Data = Partial<Record<Directory, OptionsOk>>;
type Browse = 'closed' | 'loading' | 'ready' | 'error';

/** The nodes of one directory, with the groups the shipper has already opened filled in. */
export function locationNodes(res: OptionsOk | undefined, filled: Record<string, OptionItem[]>): PickNode[] {
  if (!res) return [];
  let nodes = nodesOfResponse(res);
  for (const [groupId, items] of Object.entries(filled)) nodes = fillGroup(nodes, groupId, items);
  return nodes;
}

export function LocationWidget({
  ui, event, spec, disabled, onAnswer, load, create, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: LocationWidgetSpec; disabled: boolean;
  /** `shown` is the site's name, for the line the spent card keeps. */
  onAnswer: (wire: IntakeAnswerWire, shown?: string) => void;
  /** R4 for this step (§6.6). Absent ⇒ only the candidates are offered. */
  load?: (kind: OptionsKind, query: OptionsQuery) => Promise<OptionsResponse>;
  /** The existing create forms (§8.10). Absent ⇒ no "Add a new site". */
  create?: IntakeCreateKit;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const [browse, setBrowse] = useState<Browse>('closed');
  const [tab, setTab] = useState<Directory>(defaultTabOf(spec));
  const [data, setData] = useState<Data>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filled, setFilled] = useState<Record<string, OptionItem[]>>({});
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [creating, setCreating] = useState<CreateState | null>(null);
  const [useNow, setUseNow] = useState(true);
  const [added, setAdded] = useState<OptionItem | null>(null);

  const stopKey = event.stopKey;
  const base = { role: spec.role, ...(stopKey ? { stopKey } : {}) } as const;
  const post = (id: string, name: string) => { const wire = locationAnswer(stopKey, id); if (wire) onAnswer(wire, name); };
  const busy = disabled || creating !== null;
  const canBrowse = load !== undefined;
  const canCreate = spec.canCreate === true && create !== undefined;

  /** Both directories at once, so the tabs can say how many each holds. */
  const openBrowse = () => {
    if (!load) return;
    setBrowse('loading');
    void Promise.all(DIRECTORIES.map((directory) => collectAll((cursor) => load('locations', { ...base, directory, ...(cursor ? { cursor } : {}) })).catch(() => null)))
      .then((results) => {
        const next: Data = {};
        DIRECTORIES.forEach((d, i) => { const r = results[i]; if (r && r.ok) next[d] = r; });
        if (!next.my_locations && !next.customers) { setBrowse('error'); return; }
        setData(next); setFilled({}); setExpanded([]);
        const want = defaultTabOf(spec);
        setTab(next[want] ? want : (next.my_locations ? 'my_locations' : 'customers'));
        setBrowse('ready');
      });
  };

  const toggleGroup = (node: PickNode) => {
    setExpanded(toggled(expanded, node.key));
    // A group the server counted but did not send (§6.6 `collapsed`) is fetched when it is first opened.
    if (load && node.lazy && !expanded.includes(node.key) && !filled[node.id] && !loadingKeys.includes(node.key)) {
      setLoadingKeys([...loadingKeys, node.key]);
      void load('locations', { ...base, directory: tab, group: node.id }).then(
        (res) => { if (res.ok) setFilled((f) => ({ ...f, [node.id]: itemsForGroup(res, node.id) })); },
        () => undefined,
      ).finally(() => setLoadingKeys((k) => k.filter((x) => x !== node.key)));
    }
  };

  const loadMore = () => {
    const cur = data[tab];
    if (!load || !cur?.nextCursor) return;
    void load('locations', { ...base, directory: tab, cursor: cur.nextCursor }).then((res) => {
      if (res.ok) setData((d) => ({ ...d, [tab]: d[tab] ? mergePages(d[tab]!, res) : res }));
    }, () => undefined);
  };

  /* --- create-in-place --- */
  const startCreate = () => {
    if (!create) return;
    setCreating({ kind: 'location', status: 'loading' });
    create.open('location').then(
      (bundle) => setCreating({ kind: 'location', status: 'ready', bundle }),
      () => setCreating({ kind: 'location', status: 'error' }),
    );
  };
  const onCreated = (rec: CreatedRecord) => {
    // §20.3: the id comes from the CREATE response — never from an R4 lookup by name (another gateway instance, or another user of
    // the account, can serve a stale list for up to 60 s). The open list is simply closed, so the next "Browse" asks R4 afresh.
    const item: OptionItem = { id: rec.id, title: rec.name, ...(rec.city ? { subtitle: rec.city } : {}) };
    setCreating(null); setData({}); setFilled({}); setBrowse('closed');
    // §20.12: a site's id alone is a complete answer, so "Use it right away" (ticked by default) answers; unticked, it is pre-selected.
    if (useNow) post(item.id, item.title); else setAdded(item);
  };

  const cur = data[tab];
  const nodes = locationNodes(cur, filled);
  const rows = visibleRows(nodes, new Set(expanded), query);
  const shownCandidates = spec.candidates.filter((c) => c.id !== added?.id);
  // §20.9: the candidates are a top-8 preview; "8 of N" only when the gateway says N (and N is more than what is shown).
  const more = typeof spec.totalCandidates === 'number' && spec.totalCandidates > spec.candidates.length ? spec.totalCandidates : 0;
  const approximate = spec.noExactMatch === true;
  const hasNoticeNotFound = event.notices.some((n) => n.code === 'place_not_found');
  const total = (d: Directory) => data[d]?.total ?? 0;
  const loaded = cur ? loadedCount(nodes) : 0;
  const addLabel = chrome(ui, 'location.add', '+ Add a new site');

  return (
    <Shell T={T}>
      <Heading T={T} icon={<MapPin size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      {approximate && spec.query && !hasNoticeNotFound && (
        <p data-testid="intake-location-noexact" className="vai-ik-note vai-ik-note--warn" style={{ marginBottom: 12 }}>
          {chrome(ui, 'location.noExact', 'I couldn\'t find an exact match for "{{query}}". Pick the closest site, or add a new one.', { query: spec.query })}
        </p>
      )}
      {shownCandidates.length > 0 && (
        <p data-testid="intake-location-best" className="vai-ik-eyebrow">
          {more > 0
            ? chrome(ui, 'location.bestOf', 'Best matches ({{shown}} of {{total}})', { shown: spec.candidates.length, total: more })
            : chrome(ui, 'location.best', 'Best matches')}
        </p>
      )}
      <div className="vai-ik-choices" style={{ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' }} role="group" aria-label={renderTxt(event.prompt)} data-testid="intake-location">
        {added && (
          <ChoiceButton
            ui={ui} testId="intake-location-added" label={added.title} detail={optionDetail(added)}
            selected suggested disabled={busy} onClick={() => post(added.id, added.title)}
          />
        )}
        {shownCandidates.map((c, i) => (
          <ChoiceButton
            key={c.id} ui={ui} testId={`intake-location-cand-${c.id}`} label={c.title} detail={optionDetail(c)}
            selected={i === 0 && !added} suggested={i === 0 && !added && !approximate}
            disabled={busy || c.disabled === true} onClick={() => post(c.id, c.title)}
          />
        ))}
      </div>

      {canBrowse && browse === 'closed' && (
        <button
          type="button" disabled={busy} onClick={openBrowse} data-testid="intake-location-browse" aria-expanded={false}
          style={{ marginTop: 10 }} className={LINK_CLASS}>
          {chrome(ui, 'location.browse', 'Browse all my sites')}
        </button>
      )}
      {browse === 'loading' && <p data-testid="intake-location-loading" className="vai-ik-why" style={{ marginTop: 12 }}>{chrome(ui, 'pick.loading', 'Loading…')}</p>}
      {browse === 'error' && (
        <p role="alert" data-testid="intake-location-error" className="vai-ik-inline-error" style={{ marginTop: 12 }}>
          {chrome(ui, 'pick.error', 'The list could not be loaded. Try again.')}{' '}
          <button type="button" onClick={openBrowse} disabled={busy} className={LINK_CLASS}>
            {chrome(ui, 'retry', 'Try again')}
          </button>
        </p>
      )}
      {browse === 'ready' && (
        <div data-testid="intake-location-browsebox" className="vai-ik-panel" style={{ marginTop: 12 }}>
          <div className="vai-ik-seg vai-ik-seg--full" role="tablist" style={{ marginBottom: 10 }}>
            {DIRECTORIES.filter((d) => data[d]).map((d) => (
              <button
                key={d} type="button" role="tab" aria-selected={tab === d} disabled={busy} data-testid={`intake-location-tab-${d}`}
                onClick={() => { setTab(d); setQuery(''); setExpanded([]); }}
                className={TAP_CLASS}
              >
                {chrome(ui, d === 'customers' ? 'location.tab.customers' : 'location.tab.mine', d === 'customers' ? 'Customers' : 'My sites')} ({total(d)})
              </button>
            ))}
          </div>
          {((cur?.total ?? 0) > FILTER_AFTER || query !== '') && (
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="intake-location-search"
              placeholder={chrome(ui, 'location.search', 'Search by name, company or address')} aria-label={chrome(ui, 'location.search', 'Search by name, company or address')}
              style={{ ...inputStyle(T), marginBottom: 10 }}
            />
          )}
          <GroupedPicker
            ui={ui} testId="intake-location-list" rows={rows} disabled={busy} loadingKeys={loadingKeys}
            emptyText={chrome(ui, 'pick.noMatch', 'Nothing matches.')}
            onToggleGroup={toggleGroup} onPick={(n) => post(n.id, n.label)}
          />
          {cur?.nextCursor && (
            <button
              type="button" disabled={busy} onClick={loadMore} data-testid="intake-location-more"
              style={{ marginTop: 8 }} className={LINK_CLASS}>
              {chrome(ui, 'pick.loadMore', 'Show more ({{shown}} of {{total}})', { shown: loaded, total: cur.total })}
            </button>
          )}
        </div>
      )}

      {canCreate && !creating && (
        <div className="vai-ik-actions" style={{ marginTop: 12 }}>
          <Button T={T} variant="ghost" size="sm" disabled={disabled} onClick={startCreate} data-testid="intake-location-add">{addLabel}</Button>
        </div>
      )}
      {creating?.status === 'loading' && <p data-testid="intake-location-create-loading" className="vai-ik-why" style={{ marginTop: 12 }}>{chrome(ui, 'pick.loading', 'Loading…')}</p>}
      {creating?.status === 'error' && (
        <p role="alert" data-testid="intake-location-create-error" className="vai-ik-inline-error" style={{ marginTop: 12 }}>
          {chrome(ui, 'create.failed', 'That form could not be opened.')}{' '}
          <button type="button" onClick={() => setCreating(null)} className={LINK_CLASS}>{chrome(ui, 'channel.back', 'Back')}</button>
        </p>
      )}
      {creating?.status === 'ready' && create && (
        <div data-testid="intake-location-create" style={{ marginTop: 12 }}>
          <label className="flex items-center" style={{ gap: 8, fontSize: 13, color: T.t1, marginBottom: 8 }}>
            <input type="checkbox" checked={useNow} onChange={(e) => setUseNow(e.target.checked)} data-testid="intake-location-usenow" />
            {chrome(ui, 'create.useNow', 'Use it right away')}
          </label>
          {create.form('location', creating.bundle, { onSaved: onCreated, onCancel: () => setCreating(null), directory: defaultTabOf(spec) })}
        </div>
      )}

      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={busy} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}

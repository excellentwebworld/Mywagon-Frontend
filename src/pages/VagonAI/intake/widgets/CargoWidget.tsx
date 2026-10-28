/**
 * "What are you sending?" (MS3-394 product tree, MS3-398 grouped selectors in the stop widget, MS3-397 create on the spot). One card per cargo line: the product, the
 * quantity, the unit and — only when it is needed — the weight. The product is chosen from the shipper's catalogue shown as a
 * COLLAPSED tree, Category › Type › SKU, with the true count on every group and a search box; a TYPE can be chosen as well as
 * a SKU (when the shipper does not care which SKU). "+ Add a new product" opens the existing product form beneath this card;
 * on save the product is put on the line (the card stays, nothing is lost). One action per step: Continue posts ONE `cargo`
 * answer with every line; it stays off until every line is complete (`cargoModel.rowIssues`). Nothing else posts cargo: the answer replaces
 * the stop's lines atomically (§20.12), so a saved NEW product only goes onto its line — the shipper still gives quantity and weight.
 * A TYPE is answered with the id of the shipper's own type row (§20.5), never the group id; a type without such a row cannot be picked.
 * Lists are collapsed by default (MS3-396) and scroll inside their own box (MS3-399).
 *
 * Hook order (a test injects state by index): [0] rows, [1] row being picked for, [2] tree status, [3] tree data,
 * [4] open groups, [5] search, [6] lazily loaded groups, [7] keys being loaded, [8] nested create.
 */
import { useState } from 'react';
import { AlertTriangle, Package, Scale } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { inputStyle, LINK_CLASS, QUIET_LINK_CLASS } from '../intakeStyles';
import { TapButton as Button } from '../intakeUi';
import { FILTER_AFTER } from '../../selectionGroups';
import type { CargoWidgetSpec, IntakeAnswerWire, IntakeStepEvent, OptionGroup, OptionItem, OptionsKind, OptionsOk, OptionsQuery, OptionsResponse } from '../contract';
import { renderTxt } from '../intakeCopy';
import {
  cargoAnswer, cargoRowsOf, cargoSummary, parseQty, parseWeight, patchRow, plausibilityNote, QTY_UNITS, rowWeightMode, unitOptionsOf, UNIT_KEY, WEIGHT_UNITS, withProduct,
  type CargoRow,
} from '../cargoModel';
import type { CreateState, CreatedRecord, IntakeCreateKit } from '../intakeCreate';
import { chrome, NoticeLines, numberLocaleOf, StepShortcuts, type IntakeUi } from '../intakeUi';
import { formatInput } from '../numberFormat';
import { collectAll, groupFromResponse } from '../optionsModel';
import { answerIdOf, loadedCount, nodesOfResponse, replaceGroup, toggled, visibleRows, type PickNode } from '../pickerTree';
import { ChoiceButton } from './choiceKit';
import { GroupedPicker, LIST_MAX_HEIGHT } from './GroupedPicker';
import { TAP_CLASS } from '../tap';

type Tree = 'closed' | 'loading' | 'ready' | 'error';
/** The product tree: Category (depth 0) › Type (depth 1, itself a choice) › SKU. */
const TREE = { selectableDepth: 1 } as const;

/** The product nodes of a response, with the groups the shipper has opened and had fetched swapped in. */
export function productNodes(res: OptionsOk | null, filled: Record<string, OptionGroup>): PickNode[] {
  if (!res) return [];
  let nodes = nodesOfResponse(res, TREE);
  for (const [id, g] of Object.entries(filled)) nodes = replaceGroup(nodes, id, g, TREE);
  return nodes;
}

export function CargoWidget({
  ui, event, spec, disabled, onAnswer, load, create, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: CargoWidgetSpec; disabled: boolean;
  /** `shown` is the cargo in words, for the line the spent card keeps. */
  onAnswer: (wire: IntakeAnswerWire, shown?: string) => void;
  load?: (kind: OptionsKind, query: OptionsQuery) => Promise<OptionsResponse>;
  create?: IntakeCreateKit;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const loc = numberLocaleOf(ui);
  const [rows, setRows] = useState<CargoRow[]>(() => cargoRowsOf(spec, loc));
  const [picking, setPicking] = useState<number | null>(null);
  const [tree, setTree] = useState<Tree>('closed');
  const [data, setData] = useState<OptionsOk | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filled, setFilled] = useState<Record<string, OptionGroup>>({});
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [creating, setCreating] = useState<CreateState | null>(null);

  const stopKey = event.stopKey;
  const base = { ...(stopKey ? { stopKey } : {}) } as const;
  const busy = disabled || creating !== null;
  const units = unitOptionsOf(spec);
  const answer = cargoAnswer(stopKey, rows, loc);

  /** Opens the catalogue for line `i`: loaded once, then kept (the tree is the same for every line). */
  const openTree = (i: number) => {
    setPicking(i); setQuery('');
    if (data || !load) return;
    setTree('loading');
    void collectAll((cursor) => load('products', { ...base, ...(cursor ? { cursor } : {}) })).then(
      (res) => { if (res.ok) { setData(res); setTree('ready'); } else setTree('error'); },
      () => setTree('error'),
    );
  };
  const closeTree = () => { setPicking(null); setCreating(null); };

  const toggleGroup = (node: PickNode) => {
    setExpanded(toggled(expanded, node.key));
    if (load && node.lazy && !expanded.includes(node.key) && !filled[node.id] && !loadingKeys.includes(node.key)) {
      setLoadingKeys([...loadingKeys, node.key]);
      void load('products', { ...base, group: node.id }).then(
        (res) => { if (res.ok) setFilled((f) => ({ ...f, [node.id]: groupFromResponse(res, node.id, node.label) })); },
        () => undefined,
      ).finally(() => setLoadingKeys((k) => k.filter((x) => x !== node.key)));
    }
  };

  /** A TYPE row has no weight of its own (§20.5): the line asks for one instead of waiting on a derived weight that will never come. */
  const chooseProduct = (i: number, id: string, label: string, isType = false) => {
    const next = withProduct(rows, i, id, label);
    setRows(isType ? patchRow(next, i, { ownWeight: true, weight: '', wUnit: 'Kgs' }) : next);
    setPicking(null); setQuery('');
  };

  /* --- create-in-place --- */
  const startCreate = () => {
    if (!create) return;
    setCreating({ kind: 'product', status: 'loading' });
    create.open('product').then(
      (bundle) => setCreating({ kind: 'product', status: 'ready', bundle }),
      () => setCreating({ kind: 'product', status: 'error' }),
    );
  };
  const onCreated = (rec: CreatedRecord) => {
    const i = picking ?? 0;
    const next = withProduct(rows, i, rec.id, rec.name);
    setCreating(null); setPicking(null); setData(null); setTree('closed'); setFilled({});
    setRows(next);
    // §20.12: create-in-place NEVER posts cargo — the product goes onto the line and the shipper still gives quantity (and weight).
  };

  const nodes = productNodes(data, filled);
  const visible = visibleRows(nodes, new Set(expanded), query);
  const loaded = loadedCount(nodes);

  const field = (invalid: boolean) => ({ ...inputStyle(T, { invalid }), minHeight: 40 });
  const label = (k: string, fb: string) => chrome(ui, k, fb);

  const renderRow = (row: CargoRow, i: number) => {
    const mode = rowWeightMode(row);
    const m = row.match;
    const cands: OptionItem[] = m && m.kind !== 'unique' ? [...(m.skus ?? []), ...(m.types ?? [])] : [];
    const qtyBad = row.qty.trim() !== '' && parseQty(row.qty, loc) === null;
    const wBad = row.weight.trim() !== '' && parseWeight(row.weight, loc) === null;
    const unitNeedsChoice = row.unit === null;
    const plaus = plausibilityNote(row, loc);
    // numbers in the sentence are written the way the shipper writes them (`1,5` in Greek)
    const plausParams = plaus ? Object.fromEntries(Object.entries(plaus.params).map(([k, v]) => [k, typeof v === 'number' ? formatInput(v, loc, 3) : v])) : {};
    return (
      <div key={row.key ?? i} data-testid={`intake-cargo-row-${i}`} className="vai-ik-panel">
        {row.productId ? (
          <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
            <span className="vai-ik-head-icon" aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8 }}><Package size={15} /></span>
            <span data-testid={`intake-cargo-product-${i}`} className="min-w-0 flex-1" style={{ fontSize: 14.5, fontWeight: 650, color: T.t1, wordBreak: 'break-word' }}>{row.productLabel || row.productId}</span>
            <button type="button" disabled={busy} onClick={() => openTree(i)} data-testid={`intake-cargo-change-${i}`} className={LINK_CLASS}>
              {label('cargo.change', 'Change')}
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            {m?.kind === 'ambiguous' && row.query && (
              <p data-testid={`intake-cargo-ambiguous-${i}`} className="vai-ik-lead">
                {chrome(ui, 'cargo.ambiguous', '"{{query}}" matches several products. Pick one, or keep it general.', { query: row.query })}
              </p>
            )}
            {m?.kind === 'none' && row.query && (
              <p data-testid={`intake-cargo-none-${i}`} className="vai-ik-lead">
                {chrome(ui, 'cargo.none', 'I couldn\'t find "{{query}}" in your products. Browse the list or add it.', { query: row.query })}
              </p>
            )}
            <div className="vai-ik-choices" data-testid={`intake-cargo-cands-${i}`} style={{ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' }}>
              {cands.map((c) => (
                <ChoiceButton
                  key={c.id} ui={ui} testId={`intake-cargo-cand-${i}-${c.id}`} label={c.title}
                  detail={c.kind === 'type' ? chrome(ui, 'cargo.anyOfType', 'Any product of this type') : c.subtitle}
                  selected={false} disabled={busy || c.disabled === true} onClick={() => chooseProduct(i, c.id, c.title, c.kind === 'type')}
                />
              ))}
            </div>
            {picking !== i && load && (
              <button type="button" disabled={busy} onClick={() => openTree(i)} data-testid={`intake-cargo-browse-${i}`} style={{ marginTop: 10 }} className={LINK_CLASS}>
                {label('cargo.browse', 'Browse my products')}
              </button>
            )}
          </div>
        )}

        {picking === i && (
          <div data-testid={`intake-cargo-tree-${i}`} className="vai-ik-panel" style={{ background: T.sf, marginBottom: 12 }}>
            {tree === 'loading' && <p data-testid="intake-cargo-loading" className="vai-ik-why" style={{ marginTop: 0 }}>{label('pick.loading', 'Loading…')}</p>}
            {tree === 'error' && (
              <p role="alert" data-testid="intake-cargo-error" className="vai-ik-inline-error" style={{ marginTop: 0 }}>
                {label('pick.error', 'The list could not be loaded. Try again.')}{' '}
                <button type="button" onClick={() => openTree(i)} className={LINK_CLASS}>{label('retry', 'Try again')}</button>
              </p>
            )}
            {tree === 'ready' && data && (
              <>
                <p data-testid="intake-cargo-total" className="vai-ik-eyebrow">
                  {chrome(ui, 'cargo.productCount', '{{count}} products', { count: data.total })}
                </p>
                {(data.total > FILTER_AFTER || query !== '') && (
                  <input
                    type="text" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="intake-cargo-search"
                    placeholder={label('cargo.search', 'Search by name or SKU')} aria-label={label('cargo.search', 'Search by name or SKU')}
                    style={{ ...field(false), marginBottom: 10 }}
                  />
                )}
                <GroupedPicker
                  ui={ui} testId="intake-cargo-list" rows={visible} disabled={busy} loadingKeys={loadingKeys}
                  emptyText={label('pick.noMatch', 'Nothing matches.')}
                  onToggleGroup={toggleGroup} onPick={(n) => chooseProduct(i, answerIdOf(n), n.label, n.kind === 'group' || n.itemKind === 'type')}
                />
                {data.nextCursor && <p data-testid="intake-cargo-partial" style={{ fontSize: 12, color: T.t3, marginTop: 6 }}>{chrome(ui, 'pick.partial', 'Showing the first {{count}}. Type to narrow the list.', { count: loaded })}</p>}
              </>
            )}
            <div className="flex flex-wrap items-center" style={{ gap: 12, marginTop: 12 }}>
              {spec.canCreate === true && create && !creating && (
                <Button T={T} variant="ghost" size="sm" disabled={disabled} onClick={startCreate} data-testid="intake-cargo-add">{label('cargo.add', '+ Add a new product')}</Button>
              )}
              <button type="button" disabled={disabled} onClick={closeTree} data-testid="intake-cargo-close" className={QUIET_LINK_CLASS}>{label('channel.back', 'Back')}</button>
            </div>
          </div>
        )}

        {/* Quantity | unit. The columns are in intake.css: a phone gives the unit select more of the row. */}
        <div className="vai-ik-qty-unit">
          <label className="vai-ik-field">
          <span className="vai-ik-label">{label('cargo.qty', 'Quantity')}</span>
          <input
            type="text" inputMode="decimal" value={row.qty} disabled={busy} data-testid={`intake-cargo-qty-${i}`}
            onChange={(e) => setRows(patchRow(rows, i, { qty: e.target.value }))}
            placeholder={label('cargo.qty', 'Quantity')} aria-label={label('cargo.qty', 'Quantity')} aria-invalid={qtyBad}
            style={field(qtyBad)}
          />
          </label>
          <label className="vai-ik-field">
          <span className="vai-ik-label">{label('cargo.unitField', 'Unit')}</span>
          <select
            value={row.unit ?? ''} disabled={busy} data-testid={`intake-cargo-unit-${i}`} aria-label={label('cargo.unitField', 'Unit')}
            onChange={(e) => { const v = QTY_UNITS.find((u) => u === e.target.value); setRows(patchRow(rows, i, { unit: v ?? null })); }}
            style={field(false)}
          >
            {unitNeedsChoice && <option value="">{chrome(ui, 'cargo.unit.ask', 'What unit is "{{qty}}" in?', { qty: row.qty || '?' })}</option>}
            {units.map((u) => <option key={u} value={u}>{chrome(ui, `cargo.units.${UNIT_KEY[u]}`, u)}</option>)}
          </select>
          </label>
        </div>
        {qtyBad && <p role="alert" data-testid={`intake-cargo-qty-invalid-${i}`} className="vai-ik-inline-error">{label('cargo.qtyInvalidFormat', 'Enter a number above 0, for example 12 or 2.5.')}</p>}

        {mode === 'derived' && row.productId && (
          <p data-testid={`intake-cargo-weight-derived-${i}`} className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 13, color: T.t2, marginTop: 12 }}>
            <Scale size={14} aria-hidden="true" style={{ color: T.t3 }} />
            {row.weightKg !== null
              ? chrome(ui, 'cargo.weight.derived', 'Weight: {{kg}} kg (from the product)', { kg: formatInput(row.weightKg, loc, 3) })
              : label('cargo.weightFromProduct', 'The weight comes from the product.')}{' '}
            <button type="button" disabled={busy} onClick={() => setRows(patchRow(rows, i, { ownWeight: true, wUnit: row.wUnit ?? 'Kgs' }))} data-testid={`intake-cargo-weight-change-${i}`} className={LINK_CLASS}>
              {label('cargo.change', 'Change')}
            </button>
          </p>
        )}
        {mode !== 'derived' && (
          <div style={{ marginTop: 12 }}>
            <p className="vai-ik-label" style={{ marginBottom: 6 }}>
              {mode === 'pending_unit' ? chrome(ui, 'cargo.weight.pendingUnit', 'Is {{value}} in kilograms or tonnes?', { value: row.weight || '?' }) : label('cargo.weight.ask', 'How much does the load weigh in total?')}
            </p>
            <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
              <input
                type="text" inputMode="decimal" value={row.weight} disabled={busy} data-testid={`intake-cargo-weight-${i}`}
                onChange={(e) => setRows(patchRow(rows, i, { weight: e.target.value }))}
                placeholder={label('cargo.weightField', 'Weight')} aria-label={label('cargo.weightField', 'Weight')} aria-invalid={wBad}
                style={{ ...field(wBad), width: 130 }}
              />
              <div className="vai-ik-seg" role="group" aria-label={label('cargo.weightUnit', 'Weight unit')}>
                {WEIGHT_UNITS.map((u) => (
                  <button
                    key={u} type="button" disabled={busy} aria-pressed={row.wUnit === u} data-testid={`intake-cargo-wunit-${i}-${u === 'Kgs' ? 'kg' : 'tonnes'}`}
                    onClick={() => setRows(patchRow(rows, i, { wUnit: u }))} className={TAP_CLASS}
                  >
                    {u === 'Kgs' ? label('cargo.kg', 'kg') : label('cargo.tonnes', 'tonnes')}
                  </button>
                ))}
              </div>
            </div>
            {wBad && <p role="alert" data-testid={`intake-cargo-weight-invalid-${i}`} className="vai-ik-inline-error">{label('cargo.weightInvalidFormat', 'Enter a weight above 0, for example 1,500 or 2.5.')}</p>}
          </div>
        )}
        {plaus && (
          <div data-testid={`intake-cargo-plaus-${i}`} role="status" className="vai-ik-note vai-ik-note--warn" style={{ marginTop: 12, flexDirection: 'column', gap: 4 }}>
            <p className="flex items-start" style={{ gap: 8 }}><AlertTriangle size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /><span>{chrome(ui, plaus.key, '', plausParams)}</span></p>
            {plaus.chipKg !== null && (
              <button
                type="button" disabled={busy} data-testid={`intake-cargo-suggest-${i}`}
                onClick={() => setRows(patchRow(rows, i, { ownWeight: true, weight: formatInput(plaus.chipKg!, loc, 3), wUnit: 'Kgs' }))}
                style={{ marginLeft: 23 }} className={LINK_CLASS}>
                {chrome(ui, 'cargo.useSuggested', 'Use {{kg}} kg instead', { kg: formatInput(plaus.chipKg!, loc, 3) })}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Shell T={T}>
      <Heading T={T} icon={<Package size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div data-testid="intake-cargo">{rows.map(renderRow)}</div>

      {creating?.status === 'loading' && <p data-testid="intake-cargo-create-loading" className="vai-ik-why">{label('pick.loading', 'Loading…')}</p>}
      {creating?.status === 'error' && (
        <p role="alert" data-testid="intake-cargo-create-error" className="vai-ik-inline-error">
          {label('create.failed', 'That form could not be opened.')}{' '}
          <button type="button" onClick={() => setCreating(null)} className={LINK_CLASS}>{label('channel.back', 'Back')}</button>
        </p>
      )}
      {creating?.status === 'ready' && create && (
        <div data-testid="intake-cargo-create" style={{ marginTop: 8 }}>
          {create.form('product', creating.bundle, { onSaved: onCreated, onCancel: () => setCreating(null) })}
          <button type="button" onClick={() => setCreating(null)} data-testid="intake-cargo-create-cancel" style={{ marginTop: 8 }} className={QUIET_LINK_CLASS}>{label('channel.back', 'Back')}</button>
        </div>
      )}

      <div className="vai-ik-actions">
        <Button T={T} disabled={busy || answer === null} onClick={() => { if (answer) onAnswer(answer, cargoSummary(rows)); }} data-testid="intake-cargo-continue">{label('cargo.continue', 'Continue')}</Button>
      </div>
      <NoticeLines ui={ui} notices={rows.some((x) => x.plausibility !== null) ? event.notices.filter((n) => n.code !== 'weight_check') : event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={busy} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}

/**
 * Import any ERP order export, in the chat thread. The gateway's direct engine
 * (`/chat/order-import/*`) reads the file, picks the sheet, matches the columns
 * (its dictionary, the layout remembered from the last import of this file,
 * then the model for whatever is left) and plans what each order will create.
 *
 * While the gateway analyses the upload the card shows its stages (reading,
 * then matching customers, products, locations). Then it is organised around
 * the four kinds of data an import touches (MS3-367):
 *
 *   verdict + flag chips
 *   Orders / Customers / Products / Locations - counts in each header, a tick
 *     or an amber mark; collapsed unless it needs the shipper (a pickup code
 *     to answer, incomplete or failed orders, a customer matched by name
 *     alone to confirm or split - MS3-371). Orders says what is new, what
 *     an existing unplanned order will have overwritten, and what is already
 *     planned and left alone (MS3-368), over a searchable table
 *   Columns - the mapping, with the questions about it (a missing required
 *     column opens it; a model guess is marked to check)
 *   skipped lines, then Import
 *
 * The card asks only what the engine could not decide (`importTasks`), each on
 * the row it belongs to. Nothing is written to their orders or master data
 * until Import is pressed; that button is the confirmation.
 *
 * Every step is a message (MS3-365): with `onImport`, pressing Import hands the
 * view to the thread, which freezes this card (`frozen` - the snapshot, nothing
 * clickable, "Imported · 18:05") and puts the run and its summary in a new
 * message below the shipper's own "Import 10 orders".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Loader2,
  Scale,
  X,
} from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { userFacingError } from '../../utils/userFacingError';
import {
  answerImportWarehouse,
  chooseImportCompany,
  chooseImportProductType,
  answerImportLocation,
  getOrderImport,
  resetOrderImportMapping,
  runDirectOrderImport,
  updateOrderImportMapping,
  type DirectImportResponse,
  type ImportFlag,
  type ImportSummary,
  type ImportReviewItem,
  type ImportReviewLocation,
  type LocationAnswerBody,
  type ImportView,
} from './api/orderImportService';
import type { FrozenImport } from './threadCards';
import {
  analysisFailed,
  analysisSteps,
  columnChoices,
  confidenceLevel,
  createdOrderIds,
  describeIncomplete,
  importBlocker,
  importTasks,
  importVerdict,
  isBlockingTask,
  isFinished,
  mappedColumnCount,
  ordersPlanned,
  ordersToWrite,
  perUnitWeightHeader,
  productsToCheck,
  rowFlags,
  sectionsNeedingInput,
  sharedFailure,
  sortedFlags,
  visibleMappingRows,
  type ImportTask,
} from './erpImport';
import { Button } from './flowPrimitives';
import { Chip, Disclosure, ImportCard, LinkAction, ReviewList, ReviewSection, Section, SmallSelect, StatTile, type ReviewListItem } from './importCardKit';
import { ImportOrdersTable } from './ImportOrdersTable';
import { ProductTypeRow } from './ProductTypePicker';
import { LocationAnswerRow } from './LocationAnswerRow';
import { useAutoOpen } from './useAutoOpen';
import { FLAG_TONE, TONE, type Tone } from './importTones';

interface Props {
  view: ImportView;
  conversationId?: string;
  T: ThemeTokens;
  /** Absent in the Import History (MS3-373): a past run is not closed, only read. */
  onDismiss?: () => void;
  /** Absent in the Import History (MS3-373). */
  onChooseAnother?: () => void;
  onImported?: (summary: ImportSummary) => void;
  /** Opens the Orders panel with these orders selected, ready for "Create drafts". */
  onPlanOrders?: (orderIds: string[]) => void;
  /**
   * True while a chat turn is streaming. The assistant can change this import
   * (a note like "the delivery date is in Req. Delivery"), so the card reloads
   * itself when a turn ends.
   */
  chatBusy?: boolean;
  /** Every new state of the import, so the thread keeps it across re-renders and chat switches. */
  onViewChange?: (view: ImportView) => void;
  /** MS3-365: Import as thread messages - the page freezes this card and runs the import in a new one. */
  onImport?: (view: ImportView) => void;
  /** MS3-365: history - shown as it was, nothing clickable, no polling. */
  frozen?: FrozenImport;
  /** MS3-373: the Import History's view of a past run - its summary in full, but no Retry and no answers. */
  readOnly?: boolean;
}

const POLL_MS = 1000;

export default function ErpImportCard({
  view: initial, conversationId, T, onDismiss, onChooseAnother, onImported, onPlanOrders, chatBusy = false, onViewChange, onImport, frozen, readOnly = false,
}: Props) {
  const { t, lang } = useTranslation();
  const [view, setView] = useState<ImportView>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const reported = useRef(false);

  // Keep the thread's copy current, without making the parent's callback identity a dependency.
  const onViewChangeRef = useRef(onViewChange);
  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  });
  useEffect(() => {
    if (!frozen) onViewChangeRef.current?.(view);
  }, [view, frozen]);

  // While it is analysed or runs, poll. Stops itself once it is reviewable, done or failed. History never polls.
  useEffect(() => {
    if (frozen || (view.status !== 'running' && view.status !== 'analyzing')) return undefined;
    const timer = window.setInterval(() => {
      void getOrderImport(view.importId, lang)
        .then((res) => {
          if (res.view) setView(res.view);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [view.status, view.importId, lang, frozen]);

  // A chat turn just ended: the assistant may have remapped a column or answered a warehouse.
  const wasBusy = useRef(chatBusy);
  useEffect(() => {
    if (chatBusy) {
      wasBusy.current = true;
      return;
    }
    if (!wasBusy.current) return;
    wasBusy.current = false;
    if (frozen || view.status === 'done' || view.status === 'failed') return;
    void getOrderImport(view.importId, lang)
      .then((res) => {
        if (res.view) setView(res.view);
      })
      .catch(() => undefined);
  }, [chatBusy, view.status, view.importId, lang, frozen]);

  useEffect(() => {
    if (!frozen && view.status === 'done' && view.summary && !reported.current) {
      reported.current = true;
      onImported?.(view.summary);
    }
  }, [view.status, view.summary, onImported, frozen]);

  /** Every call answers with a status; anything but ok/running is shown, never thrown. */
  const act = async (key: string, call: () => Promise<DirectImportResponse>) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      const res = await call();
      if (res.view) setView(res.view);
      if (res.status === 'running' && !res.view) setView((v) => ({ ...v, status: 'running', progress: { done: 0, total: res.total ?? v.progress.total } }));
      else if (res.status !== 'ok' && res.status !== 'running') setError(res.message ?? t('vagonai.erpImport.error'));
    } catch (err) {
      setError(userFacingError(err, t, t('vagonai.erpImport.error')));
    } finally {
      setBusy(null);
    }
  };

  const mapColumn = (field: string, header: string) =>
    act(`map:${field}`, () => updateOrderImportMapping(view.importId, { columns: { [field]: header || null } }, lang));
  const answerLocation = (body: LocationAnswerBody) =>
    act(`loc:${body.key}`, () => answerImportLocation(view.importId, body, lang));
  const chooseProductType = (ref: string, typeId: number) =>
    act(`pt:${ref}`, () => chooseImportProductType(view.importId, ref, typeId, lang));
  const chooseCompany = (companyId: number, choice: 'same' | 'new') =>
    act(`co:${companyId}`, () => chooseImportCompany(view.importId, companyId, choice, lang));
  const answerWarehouse = (raw: string, id: number) =>
    act(`wh:${raw}`, () => answerImportWarehouse(view.importId, raw, id, lang));

  const tasks = useMemo(() => importTasks(view), [view]);
  const choices = useMemo(() => columnChoices(view), [view]);
  // Each review section opens by itself when it starts needing the shipper
  // (MS3-367) and stays as the shipper leaves it; the rest start collapsed.
  // Columns: a missing required column (MS3-372), or every order failing alike.
  // History asks nothing: a frozen card opens no section by itself (MS3-365).
  const needs = frozen
    ? { orders: false, customers: false, products: false, locations: false, columns: false }
    : sectionsNeedingInput(view);
  const [ordersOpen, setOrdersOpen] = useAutoOpen(needs.orders);
  const [customersOpen, setCustomersOpen] = useAutoOpen(needs.customers);
  const [productsOpen, setProductsOpen] = useAutoOpen(needs.products);
  const [locationsOpen, setLocationsOpen] = useAutoOpen(needs.locations);
  const [columnsOpen, setColumnsOpen] = useAutoOpen(
    needs.columns || (importBlocker(view) === 'all_failed' && Boolean(sharedFailure(view))),
  );
  // The result's sections all start collapsed and open independently (MS3-377):
  // the shipper opens what they want to check, as many at once as they like.
  const [resultOpen, setResultOpen] = useState<Record<string, boolean>>({});
  const resultToggle = (key: string) => ({
    open: Boolean(resultOpen[key]),
    onToggle: (open: boolean) => setResultOpen((was) => ({ ...was, [key]: open })),
  });
  const fieldLabel = (field: string) => t(`vagonai.erpImport.field.${field}`, field);
  const headers = view.headers.filter(Boolean);
  const usableSheets = view.sheets.filter((s) => s.rows > 0);
  const usesRememberedLayout = view.mapping.some((m) => m.source === 'saved' && m.header);
  const incompleteNote = (reasons: Parameters<typeof describeIncomplete>[0]) =>
    reasons?.length ? t('vagonai.erpImport.incomplete.label', { reasons: describeIncomplete(reasons, t) }) : null;

  const header = (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0" style={{ color: T.ac }} aria-hidden="true">
        {view.status === 'running' || view.status === 'analyzing' ? <Loader2 size={18} className="animate-spin" />
          : view.status === 'done' ? <CheckCircle2 size={18} style={{ color: TONE.ok.fg }} />
            : view.status === 'failed' ? <AlertTriangle size={18} style={{ color: TONE.error.fg }} />
              : <FileSpreadsheet size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        {/* Not CSS-uppercased: Greek capitals drop their accents, and text-transform keeps them. */}
        <div className="text-[12px] font-semibold" style={{ color: T.t3 }}>
          {t('vagonai.orderImport.title')}
        </div>
        <div className="text-[13.5px] font-semibold truncate" title={view.filename}>{view.filename}</div>
        {view.status !== 'done' && view.status !== 'running' && view.status !== 'analyzing' && usableSheets.length > 1 ? (
          <label className="inline-flex items-center gap-1.5 text-[12px] mt-1" style={{ color: T.t2 }}>
            {t('vagonai.erpImport.sheet')}
            <SmallSelect
              T={T}
              label={t('vagonai.erpImport.sheet')}
              value={view.sheet ?? ''}
              disabled={Boolean(busy) || Boolean(frozen)}
              onChange={(sheet) => void act('sheet', () => updateOrderImportMapping(view.importId, { sheet }, lang))}
              testId="erp-import-sheet"
            >
              {usableSheets.map((s) => (
                <option key={s.name} value={s.name}>{`${s.name} (${s.rows})`}</option>
              ))}
            </SmallSelect>
          </label>
        ) : null}
      </div>
      {frozen ? (
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: T.t2, background: T.sa }}
          data-testid="erp-import-frozen"
          data-reason={frozen.reason}
        >
          {[t(`vagonai.erpImport.frozen.${frozen.reason}`), frozen.at].filter(Boolean).join(' · ')}
        </span>
      ) : !onDismiss ? null : (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('vagonai.orderImport.dismiss')}
          title={t('vagonai.orderImport.dismiss')}
          className="rounded-md p-1"
          style={{ color: T.t2 }}
          data-testid="erp-import-dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );

  // ------------------------------------------------------------------ history (MS3-365)
  // A card frozen after its import already ran (a reopened chat) has no preview
  // left to show - the summary is the next message - so it is just its header.
  if (frozen && view.status !== 'ready' && view.status !== 'mapping') {
    return (
      <ImportCard T={T} testId="erp-import-history">
        {header}
        <p className="m-0 mt-2 text-[12.5px]" style={{ color: T.t3 }}>{t(`vagonai.erpImport.frozen.${frozen.reason}Note`)}</p>
      </ImportCard>
    );
  }

  const errorLine = error ? (
    <div className="mt-3 text-[12.5px]" style={{ color: TONE.error.fg }} role="alert" data-testid="erp-import-error">
      {error}
    </div>
  ) : null;

  const lineIssueList = (issues: ImportView['lineIssues']) => (
    <ul className="m-0 mt-1 pl-4 max-h-28 overflow-auto" data-testid="erp-import-line-issues">
      {issues.slice(0, 100).map((i) => (
        <li key={`${i.row}:${i.message}`}>{t('vagonai.erpImport.lineIssue', { row: i.row, message: i.message })}</li>
      ))}
    </ul>
  );

  /** One flag per order kind, each with the sentence that says what it means for planning. */
  const flagList = (flags: Partial<Record<ImportFlag, number>>) => {
    const list = sortedFlags(flags).filter(([f]) => f !== 'no_pickup');
    return list.length ? (
      <ul className="m-0 pl-0 list-none space-y-1.5" data-testid="erp-import-flags">
        {list.map(([flag, n]) => (
          <li key={flag} className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
            <Chip T={T} tone={FLAG_TONE[flag]}>{t(`vagonai.erpImport.flag.${flag}`, { count: n })}</Chip>
            <span style={{ color: T.t2 }}>{t(`vagonai.erpImport.flagHint.${flag}`)}</span>
          </li>
        ))}
      </ul>
    ) : null;
  };

  const siteOptions = view.sites.map((s) => (
    <option key={s.id} value={s.id}>{[s.name, s.city].filter(Boolean).join(' - ')}</option>
  ));

  /** The answer control for a pickup warehouse - used before the import and, for what is left, after it. */
  const warehouseRow = (raw: string, count: number) =>
    view.sites.length === 0 ? (
      <p className="m-0 text-[12px]" style={{ color: T.t2 }}>
        {t('vagonai.erpImport.questions.noSites')}{' '}
        <Link to={view.links.addressBook}>{t('vagonai.erpImport.links.addressBook')}</Link>
      </p>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <SmallSelect
          T={T}
          label={t('vagonai.erpImport.needs.warehouse', { value: raw, count })}
          value=""
          disabled={Boolean(busy) || readOnly}
          onChange={(id) => {
            if (Number(id)) void answerWarehouse(raw, Number(id));
          }}
          testId="erp-import-question-select"
        >
          <option value="">{t('vagonai.erpImport.questions.pick')}</option>
          {siteOptions}
        </SmallSelect>
        {busy === `wh:${raw}` ? <Loader2 size={14} className="animate-spin" style={{ color: T.t3 }} aria-hidden="true" /> : null}
      </div>
    );

  /**
   * A customer matched to an existing company by its name alone (MS3-371): say
   * what it was matched to and why that is not certain, and let the shipper
   * confirm it or make it a new company. Nothing is written until Import.
   */
  const possibleMatchRow = (item: ImportReviewItem) => {
    const m = item.possibleMatch;
    if (!m) return null;
    const option = (choice: 'same' | 'new', label: string) => {
      const on = m.choice === choice;
      return (
        <button
          type="button"
          aria-pressed={on}
          disabled={Boolean(busy)}
          onClick={() => { if (m.choice !== choice) void chooseCompany(m.id, choice); }}
          className="rounded-md px-2.5 py-1 text-[12px] font-semibold"
          style={{
            border: `1px solid ${on ? T.ac : T.bd}`,
            background: on ? `color-mix(in srgb, ${T.ac} 12%, transparent)` : 'transparent',
            color: on ? T.ac : T.t2,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
          data-testid={`erp-import-company-${choice}`}
        >
          {label}
        </button>
      );
    };
    return (
      <div className="mt-1.5" data-testid="erp-import-possible-match">
        <p className="m-0 text-[12px]" style={{ color: T.t2 }}>
          {m.choice === 'new'
            ? t('vagonai.erpImport.possible.splitNote', { name: m.name })
            : t('vagonai.erpImport.possible.note', { name: m.name })}
          {m.vat ? ` ${t('vagonai.erpImport.possible.savedVat', { vat: m.vat })}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5" role="group" aria-label={t('vagonai.erpImport.possible.question', { name: m.name })}>
          {option('same', t('vagonai.erpImport.possible.same'))}
          {option('new', t('vagonai.erpImport.possible.new'))}
          {busy === `co:${m.id}` ? <Loader2 size={14} className="animate-spin" style={{ color: T.t3 }} aria-hidden="true" /> : null}
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------ analysing (MS3-367)
  if (view.status === 'analyzing') {
    return (
      <ImportCard T={T} testId="erp-import-analyzing">
        {header}
        <Section T={T} title={t('vagonai.erpImport.analyzing.title')} note={t('vagonai.erpImport.analyzing.note')}>
          <ol className="m-0 pl-0 list-none space-y-1.5" aria-live="polite" data-testid="erp-import-stages">
            {analysisSteps(view).map(({ stage, state }) => (
              <li
                key={stage}
                className="flex items-center gap-2 text-[12.5px]"
                style={{ color: state === 'todo' ? T.t3 : T.t1, fontWeight: state === 'current' ? 600 : 400 }}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className="flex-shrink-0 inline-flex" style={{ width: 16 }} aria-hidden="true">
                  {state === 'done' ? <CheckCircle2 size={15} style={{ color: TONE.ok.fg }} />
                    : state === 'current' ? <Loader2 size={15} className="animate-spin" style={{ color: T.ac }} />
                      : <span className="rounded-full" style={{ width: 8, height: 8, margin: 4, background: T.bd }} />}
                </span>
                {t(`vagonai.erpImport.analyzing.step.${stage}`)}
              </li>
            ))}
          </ol>
        </Section>
      </ImportCard>
    );
  }

  // ------------------------------------------------------------------ running
  if (view.status === 'running') {
    const { done, total } = view.progress;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <ImportCard T={T} testId="erp-import-running">
        {header}
        <Section T={T} title={t('vagonai.erpImport.section.running.title')} note={t('vagonai.erpImport.section.running.note')}>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: T.sa }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total || undefined}
            aria-valuenow={total ? done : undefined}
            aria-label={t('vagonai.erpImport.running.title', { file: view.filename })}
          >
            {/* Until the first order is written there is nothing to measure - say it is moving rather than stuck at 0 (QA B9). */}
            <div
              className={`h-full${done === 0 ? ' vai-progress-indeterminate' : ''}`}
              style={{ width: done === 0 ? '30%' : `${pct}%`, background: T.ac, transition: 'width 0.4s' }}
            />
          </div>
          <p className="mt-2 mb-0 text-[12.5px]" style={{ color: T.t2 }} data-testid="erp-import-progress" aria-live="polite">
            {done === 0 ? t('vagonai.erpImport.running.starting') : t('vagonai.erpImport.running.progress', { done, total })}
          </p>
        </Section>
      </ImportCard>
    );
  }

  // ------------------------------------------------------------------ result
  if (isFinished(view)) {
    const s = view.summary;
    if (view.status === 'failed' || !s) {
      return (
        <ImportCard T={T} testId="erp-import-failed">
          {header}
          <Section
            T={T}
            title={t(analysisFailed(view) ? 'vagonai.erpImport.analysisFailed' : 'vagonai.erpImport.failedTitle')}
            badge={{ label: t('vagonai.erpImport.badge.nothingSaved'), tone: 'warn' }}
            note={view.message ?? t('vagonai.erpImport.error')}
          >
            {errorLine}
            <div className="flex flex-wrap gap-2">
              {/* A file that was never read has nothing to retry - only another upload. */}
              {analysisFailed(view) || readOnly ? null : (
                <Button T={T} onClick={() => void act('run', () => runDirectOrderImport(view.importId, conversationId, lang))} data-testid="erp-import-retry" disabled={Boolean(busy)}>
                  {t('vagonai.erpImport.retry')}
                </Button>
              )}
              {onChooseAnother ? (
                <Button T={T} variant={analysisFailed(view) ? 'primary' : 'ghost'} onClick={onChooseAnother}>{t('vagonai.orderImport.chooseAnother')}</Button>
              ) : null}
            </div>
          </Section>
        </ImportCard>
      );
    }
    const createdTotal = s.created.companies.length + s.created.addresses.length + s.created.products.length;
    const failedItems = s.items.filter((i) => i.status === 'failed');
    const written = s.items.filter((i) => i.status !== 'failed');
    const flagged = s.items.filter((i) => (i.status === 'created' || i.status === 'updated') && rowFlags(i.flags).length > 0);
    const skipped = s.orders.plannedSkipped ?? s.orders.duplicates;
    const planIds = createdOrderIds(s);
    const r = (key: string, count: number) => t(`vagonai.erpImport.result.count.${key}`, { count });
    const rn = (key: string, count: number) => t(`vagonai.erpImport.review.count.${key}`, { count });
    const joinedR = (...parts: (string | false | null | undefined | 0)[]) => parts.filter(Boolean).join(' · ');
    const resultLabels = {
      status: {
        new: t('vagonai.erpImport.review.status.new'),
        existing: t('vagonai.erpImport.review.status.existing'),
        input: t('vagonai.erpImport.review.status.input'),
        skipped: t('vagonai.erpImport.review.status.skipped'),
      },
      orders: (count: number) => t('vagonai.erpImport.review.usedBy', { count }),
      truncated: '',
    };
    /** A run keeps the names of what it created; of what it reused it keeps the count. */
    const asNew = (prefix: string, list: typeof s.created.companies, orders: (label: string) => number): ReviewListItem[] =>
      list.map((rec) => ({ key: `${prefix}:${rec.id}`, status: 'new', name: rec.label, detail: rec.review.join(', ') || null, orders: orders(rec.label) }));
    // Customers: the run's orders name every customer they used - new ones are in `created`, the rest were matched.
    const ordersByCompany = new Map<string, { name: string; count: number }>();
    for (const i of written) {
      if (!i.company) continue;
      const k = i.company.trim().toLocaleLowerCase();
      const had = ordersByCompany.get(k);
      ordersByCompany.set(k, { name: had?.name ?? i.company, count: (had?.count ?? 0) + 1 });
    }
    const companyOrders = (label: string) => ordersByCompany.get(label.trim().toLocaleLowerCase())?.count ?? 0;
    const newCompanyKeys = new Set(s.created.companies.map((c) => c.label.trim().toLocaleLowerCase()));
    const customerItems: ReviewListItem[] = [
      ...asNew('co', s.created.companies, companyOrders),
      ...[...ordersByCompany].filter(([k]) => !newCompanyKeys.has(k)).map(([k, v]) => ({
        key: `co:x:${k}`, status: 'existing' as const, name: v.name, detail: null, orders: v.count,
      })),
    ];
    const customersNew = s.created.companies.length;
    const customersExisting = customerItems.length - customersNew;
    // Optional-chained: a summary is stored JSON, kept from whichever gateway wrote it.
    const productsMatched = s.masters?.products?.matched ?? 0;
    const locationsMatched = s.masters?.addresses?.matched ?? 0;
    const reusedLine = (count: number) => (count > 0 ? (
      <p className="m-0 mt-2 text-[12px]" style={{ color: T.t2 }}>{t('vagonai.erpImport.result.reused', { count })}</p>
    ) : null);
    const createdNote = (count: number) => (count > 0 ? (
      <p className="m-0 mb-2 text-[12px]" style={{ color: T.t2 }}>{t('vagonai.erpImport.done.review')}</p>
    ) : null);
    const orderChip = (status: (typeof s.items)[number]['status']) =>
      status === 'created' ? <Chip T={T} tone="ok">{t('vagonai.erpImport.result.status.created')}</Chip>
        : status === 'updated' ? <Chip T={T} tone="accent">{t('vagonai.erpImport.result.status.updated')}</Chip>
          : <Chip T={T} tone="neutral">{t('vagonai.erpImport.result.status.planned')}</Chip>;

    return (
      <ImportCard T={T} testId="erp-import-done">
        {header}

        <Section T={T} title={t('vagonai.erpImport.section.result.title')} testId="erp-import-summary-counts">
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {/* Each count leads to where those records are (MS3-373). */}
            <StatTile
              T={T}
              label={t('vagonai.erpImport.stat.imported')}
              value={s.orders.created}
              tone={s.orders.created ? 'ok' : 'warn'}
              to={s.orders.created ? view.links.orders : undefined}
            />
            {s.orders.updated ? <StatTile T={T} label={t('vagonai.erpImport.stat.updated')} value={s.orders.updated} tone="ok" to={view.links.orders} /> : null}
            {skipped ? <StatTile T={T} label={t('vagonai.erpImport.stat.skipped')} value={skipped} to={view.links.orders} /> : null}
            {s.orders.failed ? <StatTile T={T} label={t('vagonai.erpImport.stat.notImported')} value={s.orders.failed} tone="error" /> : null}
          </div>
          {createdTotal > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2" data-testid="erp-import-summary-masters">
              {s.created.companies.length ? <StatTile T={T} label={t('vagonai.erpImport.stat.customers')} value={s.created.companies.length} to={view.links.addressBook} /> : null}
              {s.created.addresses.length ? <StatTile T={T} label={t('vagonai.erpImport.stat.locations')} value={s.created.addresses.length} to={view.links.addressBook} /> : null}
              {s.created.products.length ? <StatTile T={T} label={t('vagonai.erpImport.stat.products')} value={s.created.products.length} to={view.links.products} /> : null}
            </div>
          ) : null}
        </Section>

        {/* What the run did, by the kind of record it touched (MS3-374/377/378): all collapsed, each opens on its own. */}
        <div className="mt-3.5" data-testid="erp-import-result-sections">
          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.orders')}
            summary={joinedR(
              rn('orders', written.length),
              s.orders.created > 0 && r('created', s.orders.created),
              (s.orders.updated ?? 0) > 0 && r('updated', s.orders.updated ?? 0),
              skipped > 0 && rn('planned', skipped),
              flagged.length > 0 && r('flagged', flagged.length),
            )}
            attention={flagged.length > 0}
            band={0}
            {...resultToggle('orders')}
            testId="erp-import-result-orders"
          >
            {flagged.length ? (
              <div className="mb-2.5" data-testid="erp-import-flagged">
                <p className="m-0 mb-1.5 text-[12px]" style={{ color: T.t2 }}>{t('vagonai.erpImport.section.flagged.note')}</p>
                {flagList(s.flags)}
              </div>
            ) : null}
            {written.length ? (
              <ul className="m-0 pl-0 list-none space-y-1 max-h-64 overflow-auto pr-1 text-[12px]" data-testid="erp-import-result-order-list">
                {written.map((i) => (
                  <li key={i.orderNumber} className="rounded-lg border px-2.5 py-1.5" style={{ borderColor: rowFlags(i.flags).length ? TONE.warn.fg : T.bd }}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong>{i.orderNumber}</strong>
                      {i.company ? <span className="min-w-0 truncate" style={{ color: T.t3 }} title={i.company}>{i.company}</span> : null}
                      <span className="ml-auto flex flex-wrap items-center gap-1.5 flex-shrink-0">
                        {rowFlags(i.flags).map((f) => <Chip key={f} T={T} tone={FLAG_TONE[f]}>{t(`vagonai.erpImport.flag.${f}`, { count: 1 })}</Chip>)}
                        {orderChip(i.status)}
                      </span>
                    </div>
                    {incompleteNote(i.incomplete) ? <div className="mt-0.5" style={{ color: TONE.warn.fg }}>{incompleteNote(i.incomplete)}</div> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="m-0 text-[12px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.result.noOrders')}</p>}
          </ReviewSection>

          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.customers')}
            summary={joinedR(rn('customers', customerItems.length), rn('existing', customersExisting), rn('new', customersNew))}
            attention={false}
            band={1}
            {...resultToggle('customers')}
            testId="erp-import-result-customers"
          >
            {createdNote(customersNew)}
            {customerItems.length ? (
              <ReviewList T={T} items={customerItems} truncated={false} labels={resultLabels} testId="erp-import-result-customer" />
            ) : <p className="m-0 text-[12px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.result.none')}</p>}
          </ReviewSection>

          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.products')}
            summary={joinedR(
              rn('products', s.created.products.length + productsMatched),
              rn('existing', productsMatched),
              rn('new', s.created.products.length),
            )}
            attention={false}
            band={0}
            {...resultToggle('products')}
            testId="erp-import-result-products"
          >
            {createdNote(s.created.products.length)}
            {s.created.products.length ? (
              <ReviewList T={T} items={asNew('pr', s.created.products, () => 0)} truncated={false} labels={resultLabels} testId="erp-import-result-product" />
            ) : productsMatched ? null : <p className="m-0 text-[12px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.result.none')}</p>}
            {reusedLine(productsMatched)}
          </ReviewSection>

          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.locations')}
            summary={joinedR(
              rn('locations', s.created.addresses.length + locationsMatched),
              rn('existing', locationsMatched),
              rn('new', s.created.addresses.length),
              s.questions.length > 0 && t('vagonai.erpImport.result.count.pickup', { count: s.questions.length }),
            )}
            attention={s.questions.length > 0}
            band={1}
            locked={readOnly}
            {...resultToggle('locations')}
            testId="erp-import-result-locations"
          >
            {createdNote(s.created.addresses.length)}
            {s.created.addresses.length ? (
              <ReviewList T={T} items={asNew('ad', s.created.addresses, () => 0)} truncated={false} labels={resultLabels} testId="erp-import-result-location" />
            ) : locationsMatched || s.questions.length ? null : <p className="m-0 text-[12px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.result.none')}</p>}
            {reusedLine(locationsMatched)}
            {/* Warehouse codes still unanswered: those orders were created without a pickup. */}
            {s.questions.length ? (
              <div className="mt-3" data-testid="erp-import-questions">
                <p className="m-0 text-[12.5px] font-semibold">{t('vagonai.erpImport.section.pickupAfter.title')}</p>
                <p className="m-0 mt-0.5 text-[12px]" style={{ color: T.t2 }}>{t('vagonai.erpImport.section.pickupAfter.note')}</p>
                <ul className="m-0 mt-2 pl-0 list-none space-y-2.5">
                  {s.questions.map((q) => (
                    <li key={q.key} className="text-[12.5px]" data-testid="erp-import-question">
                      <div className="mb-1">{t('vagonai.erpImport.needs.warehouse', { value: q.raw, count: q.orderNumbers.length })}</div>
                      {warehouseRow(q.raw, q.orderNumbers.length)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </ReviewSection>

          {failedItems.length || s.lineIssues.length ? (
            <ReviewSection
              T={T}
              title={t('vagonai.erpImport.done.failures')}
              summary={joinedR(
                failedItems.length > 0 && rn('orders', failedItems.length),
                s.lineIssues.length > 0 && t('vagonai.erpImport.review.skipped', { count: s.lineIssues.length }),
              )}
              attention
              tone="error"
              band={0}
              {...resultToggle('failures')}
              testId="erp-import-result-failures"
            >
              <p className="m-0 mb-2 text-[12px]" style={{ color: T.t2 }}>{t('vagonai.erpImport.section.failures.note')}</p>
              {failedItems.length ? (
                <ul className="m-0 pl-0 list-none space-y-1 max-h-40 overflow-auto text-[12.5px]" data-testid="erp-import-failures">
                  {failedItems.map((i) => (
                    <li key={i.orderNumber} className="rounded-lg px-2.5 py-1.5" style={{ background: TONE.error.bg }}>
                      <strong>{i.orderNumber}</strong>{i.reason ? ` - ${i.reason}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.lineIssues.length ? (
                <div className="mt-1.5 text-[12px]" style={{ color: T.t2 }}>
                  {t('vagonai.erpImport.lineIssues', { count: s.lineIssues.length })}
                  {lineIssueList(s.lineIssues)}
                </div>
              ) : null}
            </ReviewSection>
          ) : null}
        </div>

        {errorLine}

        <Section
          T={T}
          title={t('vagonai.erpImport.section.next.title')}
          note={planIds.length && onPlanOrders ? t('vagonai.erpImport.done.planHint') : t('vagonai.erpImport.section.next.noteNoPlan')}
        >
          <div className="flex flex-wrap items-center gap-2">
            {planIds.length && onPlanOrders ? (
              <Button T={T} onClick={() => onPlanOrders(planIds)} data-testid="erp-import-plan" data-opens-orders-panel="">
                {t('vagonai.erpImport.done.plan', { count: planIds.length })}
              </Button>
            ) : null}
            <LinkAction T={T} to={view.links.orders} label={t('vagonai.orderImport.openOrders')} testId="erp-import-open-orders" />
            {onDismiss ? <Button T={T} variant="ghost" onClick={onDismiss}>{t('vagonai.orderImport.dismiss')}</Button> : null}
          </div>
        </Section>
      </ImportCard>
    );
  }

  // ------------------------------------------------------------------ preview
  const counts = view.counts;
  const blocker = importBlocker(view);
  const verdict = importVerdict(view, tasks);
  const required = tasks.filter(isBlockingTask);
  const shared = blocker === 'all_failed' ? sharedFailure(view) : null;
  const perUnitHeader = perUnitWeightHeader(view);
  const verdictTone: Tone = verdict === 'ready' ? 'ok' : verdict === 'review' ? 'neutral' : 'warn';
  const toWrite = counts ? ordersToWrite(counts) : 0;
  const verdictText =
    blocker === 'mapping'
      ? t('vagonai.erpImport.verdict.needsColumns', { count: required.length || 1 })
      : blocker === 'all_duplicates'
        ? t('vagonai.erpImport.blocker.duplicates')
        : blocker === 'all_failed'
          ? (shared ? t('vagonai.erpImport.blocker.allFailedReason', { reason: shared }) : t('vagonai.erpImport.blocker.allFailed'))
          : verdict === 'review'
            ? t('vagonai.erpImport.verdict.review', { count: toWrite })
            : t('vagonai.erpImport.verdict.ready', { count: toWrite });

  const renderTask = (task: ImportTask) => {
    switch (task.kind) {
      case 'column':
        return (
          <>
            <TaskText T={T} icon={<AlertTriangle size={14} />} tone="warn">
              {t(`vagonai.erpImport.needs.column.${task.gap}`, t('vagonai.erpImport.needs.column.other', { field: fieldLabel(task.gap) }))}
            </TaskText>
            <div className="flex flex-col gap-2 mt-2 pl-6">
              {task.fields.map((field, i) => (
                <label key={field} className="flex flex-wrap items-center gap-2 text-[12.5px]" style={{ color: T.t2 }}>
                  <span style={{ minWidth: 120 }}>
                    {i > 0 ? `${t('vagonai.erpImport.needs.or')} ` : ''}{fieldLabel(field)}
                  </span>
                  <SmallSelect
                    T={T}
                    label={fieldLabel(field)}
                    value=""
                    invalid
                    disabled={Boolean(busy)}
                    onChange={(h) => void mapColumn(field, h)}
                    testId="erp-import-gap-select"
                  >
                    <option value="">{t('vagonai.erpImport.needs.pickColumn')}</option>
                    {choices.unused.length ? (
                      <optgroup label={t('vagonai.erpImport.needs.unusedColumns')}>
                        {choices.unused.map((h) => <option key={h} value={h}>{h}</option>)}
                      </optgroup>
                    ) : null}
                    {choices.used.length ? (
                      <optgroup label={t('vagonai.erpImport.needs.usedColumns')}>
                        {choices.used.map((c) => (
                          <option key={c.header} value={c.header}>{`${c.header} (${fieldLabel(c.field)})`}</option>
                        ))}
                      </optgroup>
                    ) : null}
                  </SmallSelect>
                </label>
              ))}
            </div>
          </>
        );
      case 'guess':
        return (
          <>
            <TaskText T={T} icon={<HelpCircle size={14} />} tone="neutral">
              {t('vagonai.erpImport.needs.guess', { field: fieldLabel(task.field), header: task.header })}
            </TaskText>
            <div className="flex flex-wrap items-center gap-2 mt-2 pl-6">
              <Button
                T={T}
                variant="ghost"
                disabled={Boolean(busy)}
                onClick={() => void mapColumn(task.field, task.header)}
                data-testid="erp-import-guess-ok"
              >
                {t('vagonai.erpImport.needs.looksRight')}
              </Button>
              <span className="text-[12px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.needs.orUse')}</span>
              <SmallSelect
                T={T}
                label={t('vagonai.erpImport.needs.useInstead', { field: fieldLabel(task.field) })}
                value={task.header}
                disabled={Boolean(busy)}
                onChange={(h) => void mapColumn(task.field, h)}
              >
                <option value="">{t('vagonai.erpImport.mapping.none')}</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </SmallSelect>
            </div>
          </>
        );
      default:
        // Warehouse questions are answered on their own row in Locations.
        return null;
    }
  };

  const mappingRows = visibleMappingRows(view);
  const headsUp = counts ? sortedFlags(counts.flags).filter(([f]) => f !== 'no_pickup') : [];
  const columnTasks = tasks.filter((task) => task.kind === 'column' || task.kind === 'guess');
  const guessCount = tasks.filter((task) => task.kind === 'guess').length;

  // The four sections (MS3-367). An older gateway sends no `review`: the counts
  // still fill the headers, and Locations falls back to the open pickup questions.
  const review = view.review ?? null;
  const pickupQuestions: ImportReviewLocation[] = view.questions
    .filter((q) => q.answeredWith === null)
    .map((q) => ({ key: `pick:q:${q.key}`, role: 'pickup', status: 'input', name: q.raw, detail: null, code: q.raw, orders: q.orderNumbers.length }));
  const locations = review?.locations ?? {
    total: pickupQuestions.length, existing: 0, new: 0, input: pickupQuestions.length, items: pickupQuestions, truncated: false,
  };
  const joined = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ');
  const n = (key: string, count: number) => t(`vagonai.erpImport.review.count.${key}`, { count });
  const listLabels = (shown: number) => ({
    status: {
      new: t('vagonai.erpImport.review.status.new'),
      existing: t('vagonai.erpImport.review.status.existing'),
      input: t('vagonai.erpImport.review.status.input'),
      skipped: t('vagonai.erpImport.review.status.skipped'),
    },
    orders: (count: number) => t('vagonai.erpImport.review.usedBy', { count }),
    truncated: t('vagonai.erpImport.review.truncated', { count: shown }),
  });
  const masters = (kind: 'customers' | 'products', fallback: { matched: number; created: number }) => {
    const g = review?.[kind];
    const total = g ? g.total : fallback.matched + fallback.created;
    return joined(n(kind, total), n('existing', g ? g.existing : fallback.matched), n('new', g ? g.new : fallback.created));
  };
  const noOrders = <p className="m-0 text-[12px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.review.noOrders')}</p>;
  /** The stop coding of the shipment wizard (MS3-363): pickup white, drop-off black. */
  const roleTag = (role: ImportReviewLocation['role']) => (
    <span
      className="text-[10.5px] font-bold px-1.5 rounded flex-shrink-0"
      style={
        role === 'pickup'
          ? { background: '#FFFFFF', color: '#000001', border: '1px solid var(--app-border-strong, #C9C8CD)' }
          : { background: '#000001', color: '#FFFFFF', border: '1px solid var(--app-black-contour, #000001)' }
      }
    >
      {t(`vagonai.erpImport.review.role.${role}`)}
    </span>
  );

  return (
    <ImportCard T={T} testId={frozen ? 'erp-import-frozen-preview' : 'erp-import-preview'}>
      {header}
      {/* History is read, not worked (MS3-365): each section disables what is inside it, but still opens and closes (MS3-374). */}
      <div className="min-w-0" data-frozen={frozen ? '' : undefined}>

      {/* MS3-367: the card's height is capped - a 100+ order review scrolls here, the header and Import stay in view. */}
      <div className="max-h-[70vh] overflow-y-auto mt-2 pr-1 -mr-1" data-testid="erp-import-body">

      {/* The verdict: the one line a first-time shipper has to read. */}
      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2.5 mt-3 text-[13px] font-semibold"
        style={{
          background: verdictTone === 'neutral' ? T.sa : TONE[verdictTone].bg,
          color: verdictTone === 'neutral' ? T.t1 : TONE[verdictTone].fg,
        }}
        data-testid="erp-import-verdict"
        data-verdict={verdict}
        aria-live="polite"
      >
        {verdict === 'ready' ? <CheckCircle2 size={16} className="mt-px flex-shrink-0" aria-hidden="true" />
          : verdict === 'blocked' ? <AlertTriangle size={16} className="mt-px flex-shrink-0" aria-hidden="true" />
            : <HelpCircle size={16} className="mt-px flex-shrink-0" aria-hidden="true" />}
        <span>{verdictText}</span>
      </div>

      {/* Flag chips; each says on hover what it means for planning. */}
      {headsUp.length ? (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5" data-testid="erp-import-flags">
          {headsUp.map(([flag, count]) => (
            <Chip key={flag} T={T} tone={FLAG_TONE[flag]} title={t(`vagonai.erpImport.flagHint.${flag}`)}>
              {t(`vagonai.erpImport.flag.${flag}`, { count })}
            </Chip>
          ))}
        </div>
      ) : null}
      {perUnitHeader ? (
        <p className="m-0 mt-2 flex items-center gap-1.5 text-[12.5px]" style={{ color: T.t3 }} data-testid="erp-import-per-unit-note">
          <Scale size={13} aria-hidden="true" className="shrink-0" />
          {t('vagonai.erpImport.plan.perUnitWeight', { header: perUnitHeader })}
        </p>
      ) : null}

      {counts && blocker !== 'mapping' ? (
        <>
          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.orders')}
            summary={joined(
              n('orders', counts.orders),
              n('new', counts.toCreate),
              (counts.toUpdate ?? 0) > 0 && n('updated', counts.toUpdate ?? 0),
              ordersPlanned(counts) > 0 && n('planned', ordersPlanned(counts)),
              counts.failed > 0 && n('failed', counts.failed),
              counts.incomplete > 0 && n('incomplete', counts.incomplete),
            )}
            attention={needs.orders}
            open={ordersOpen}
            onToggle={setOrdersOpen}
            band={0}
            locked={Boolean(frozen)}
            testId="erp-import-orders"
          >
            {/* What happens to the orders the account already has - said before the list, not discovered in it. */}
            <div className="mb-2 space-y-1 text-[12.5px]" data-testid="erp-import-orders-intro">
              {counts.toCreate > 0 ? <p className="m-0" style={{ color: T.t2 }}>{t('vagonai.erpImport.orders.newLine', { count: counts.toCreate })}</p> : null}
              {(counts.toUpdate ?? 0) > 0 ? (
                <p className="m-0" style={{ color: T.t1 }} data-testid="erp-import-orders-update-line">
                  {t('vagonai.erpImport.orders.updateLine', { count: counts.toUpdate })}
                </p>
              ) : null}
              {ordersPlanned(counts) > 0 ? (
                <p className="m-0" style={{ color: T.t2 }}>{t('vagonai.erpImport.orders.plannedLine', { count: ordersPlanned(counts) })}</p>
              ) : null}
            </div>
            <ImportOrdersTable T={T} orders={view.orders} truncated={view.truncated} />
          </ReviewSection>

          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.customers')}
            summary={joined(
              masters('customers', { matched: counts.matchedCompanies, created: counts.newCompanies }),
              (review?.customers.possible ?? 0) > 0 && n('possible', review?.customers.possible ?? 0),
            )}
            attention={needs.customers}
            open={customersOpen}
            onToggle={setCustomersOpen}
            band={1}
            locked={Boolean(frozen)}
            testId="erp-import-customers"
          >
            {review?.customers.items.length ? (
              <ReviewList
                T={T}
                items={review.customers.items}
                truncated={review.customers.truncated}
                labels={listLabels(review.customers.items.length)}
                chip={(item) =>
                  item.possibleMatch && item.possibleMatch.choice === null ? (
                    <Chip T={T} tone="warn" title={t('vagonai.erpImport.possible.hint')}>{t('vagonai.erpImport.possible.chip')}</Chip>
                  ) : undefined}
                attention={(item) => Boolean(item.possibleMatch && item.possibleMatch.choice === null)}
                extra={possibleMatchRow}
                testId="erp-import-customer"
              />
            ) : noOrders}
          </ReviewSection>

          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.products')}
            summary={joined(
              masters('products', { matched: counts.matchedProducts, created: counts.newProducts }),
              productsToCheck(view) > 0 && n('check', productsToCheck(view)),
            )}
            attention={productsToCheck(view) > 0}
            open={productsOpen}
            onToggle={setProductsOpen}
            band={0}
            locked={Boolean(frozen)}
            testId="erp-import-products"
          >
            {review?.products.items.length ? (
              <>
                {review.products.new > 0 ? (
                  <p className="m-0 mb-2 text-[12px]" style={{ color: T.t2 }}>{t('vagonai.erpImport.productType.intro')}</p>
                ) : null}
                <ReviewList
                  T={T}
                  items={review.products.items}
                  truncated={review.products.truncated}
                  labels={{
                    ...listLabels(review.products.items.length),
                    search: t('vagonai.erpImport.productType.search'),
                    noMatch: (query: string) => t('vagonai.erpImport.productType.noMatch', { query }),
                  }}
                  attention={(item) => item.status === 'new' && item.productType?.source === 'fallback'}
                  extra={(item) => (
                    <ProductTypeRow
                      T={T}
                      item={item}
                      busy={busy === `pt:${item.productRef}`}
                      onPick={(ref, typeId) => void chooseProductType(ref, typeId)}
                    />
                  )}
                  testId="erp-import-product"
                />
              </>
            ) : noOrders}
          </ReviewSection>

          <ReviewSection
            T={T}
            title={t('vagonai.erpImport.review.locations')}
            summary={joined(
              n('locations', locations.total),
              n('existing', locations.existing),
              n('new', locations.new),
              locations.input > 0 && n('input', locations.input),
              (locations.skipped ?? 0) > 0 && n('skipped', locations.skipped ?? 0),
            )}
            attention={needs.locations}
            open={locationsOpen}
            onToggle={setLocationsOpen}
            band={1}
            locked={Boolean(frozen)}
            testId="erp-import-locations"
          >
            {locations.items.length ? (
              <ReviewList
                T={T}
                items={locations.items}
                truncated={locations.truncated}
                labels={listLabels(locations.items.length)}
                prefix={(item) => roleTag(item.role)}
                attention={(item) => item.status === 'input'}
                tall={locations.items.some((item) => item.question)}
                extra={(item) =>
                  // MS3-369: map / create / skip on the code's own row. An older gateway sends
                  // no question - its open pickup codes keep the plain "which site?" select.
                  item.question ? (
                    <LocationAnswerRow
                      T={T}
                      item={item}
                      sites={view.sites}
                      busy={busy === `loc:${item.question.key}`}
                      onAnswer={(body) => void answerLocation(body)}
                    />
                  ) : item.status === 'input' && item.role === 'pickup' ? (
                    <div className="mt-1.5" data-testid="erp-import-question">
                      {warehouseRow(item.name, item.orders)}
                      <div className="text-[11.5px] mt-1" style={{ color: T.t3 }}>{t('vagonai.erpImport.needs.warehouseHint')}</div>
                    </div>
                  ) : null
                }
                testId="erp-import-location"
              />
            ) : noOrders}
          </ReviewSection>
        </>
      ) : null}

      {/* The whole mapping: the questions about it first, then every column, to audit or change. */}
      <ReviewSection
        T={T}
        title={t('vagonai.erpImport.columns.title')}
        summary={joined(
          t('vagonai.erpImport.columns.summary', { count: mappedColumnCount(view) }),
          view.gaps.length > 0 && n('missing', view.gaps.length),
          guessCount > 0 && n('check', guessCount),
        )}
        attention={columnTasks.length > 0}
        open={columnsOpen}
        onToggle={setColumnsOpen}
        band={0}
        locked={Boolean(frozen)}
        testId="erp-import-mapping"
      >
        {columnTasks.length ? (
          <ol className="m-0 mb-3 pl-0 list-none space-y-3.5" data-testid="erp-import-required">
            {columnTasks.map((task) => (
              <li key={task.key} data-testid="erp-import-task" data-kind={task.kind}>{renderTask(task)}</li>
            ))}
          </ol>
        ) : null}
        {usesRememberedLayout && !required.length ? (
          <div className="flex flex-wrap items-center gap-2 mb-2 text-[12px]" style={{ color: T.t2 }} data-testid="erp-import-remembered">
            <span className="flex-1 min-w-[12rem]">{t('vagonai.erpImport.mapping.remembered')}</span>
            <Button
              T={T}
              variant="ghost"
              disabled={Boolean(busy)}
              onClick={() => void act('reset', async () => {
                const res = await resetOrderImportMapping(view.importId, lang);
                if (res.status === 'ok') setResetDone(true);
                return res;
              })}
              data-testid="erp-import-reset-mapping"
            >
              {t('vagonai.erpImport.mapping.reset')}
            </Button>
          </div>
        ) : null}
        {resetDone && !usesRememberedLayout ? (
          <p className="mt-0 mb-2 text-[12px]" style={{ color: T.t2 }} data-testid="erp-import-reset-done">
            {t('vagonai.erpImport.mapping.resetDone')}
          </p>
        ) : null}
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {mappingRows.map((row) => {
              const level = confidenceLevel(row);
              return (
                <tr key={row.field} data-testid="erp-import-mapping-row" data-field={row.field}>
                  <td className="py-1 pr-2" style={{ color: T.t2, whiteSpace: 'nowrap' }}>{fieldLabel(row.field)}</td>
                  <td className="py-1 pr-2">
                    <SmallSelect
                      T={T}
                      label={fieldLabel(row.field)}
                      value={row.header ?? ''}
                      disabled={Boolean(busy)}
                      onChange={(h) => void mapColumn(row.field, h)}
                    >
                      <option value="">{t('vagonai.erpImport.mapping.none')}</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </SmallSelect>
                  </td>
                  <td className="py-1">
                    {level === 'check' ? <Chip T={T} tone="warn">{t('vagonai.erpImport.mapping.check')}</Chip> : null}
                    {level === 'high' ? <Chip T={T} tone="ok">{t('vagonai.erpImport.mapping.high')}</Chip> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReviewSection>

      {view.lineIssues.length ? (
        <Disclosure
          T={T}
          title={t('vagonai.erpImport.review.skipped', { count: view.lineIssues.length })}
          testId="erp-import-skipped"
        >
          <div className="text-[12px]" style={{ color: TONE.warn.fg }}>{lineIssueList(view.lineIssues)}</div>
        </Disclosure>
      ) : null}

      {errorLine}
      </div>

      {frozen ? (
        <p className="m-0 mt-4 pt-3 border-t text-[12px]" style={{ borderColor: T.bd, color: T.t3 }}>
          {t(`vagonai.erpImport.frozen.${frozen.reason}Note`)}
        </p>
      ) : (
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-2" style={{ borderColor: T.bd }}>
          <div className="flex-1 min-w-[12rem] text-[12px]" style={{ color: blocker ? TONE.warn.fg : T.t3 }}>
            {blocker === 'mapping' ? t('vagonai.erpImport.blocker.mapping') : blocker ? null : t('vagonai.erpImport.confirmHint')}
          </div>
          {onChooseAnother ? (
            <Button T={T} variant="ghost" onClick={onChooseAnother} disabled={Boolean(busy)}>
              {t('vagonai.orderImport.chooseAnother')}
            </Button>
          ) : null}
          <Button
            T={T}
            data-testid="erp-import-submit"
            disabled={Boolean(blocker) || Boolean(busy)}
            icon={busy === 'run' ? <Loader2 size={14} className="animate-spin" /> : null}
            onClick={() => (onImport ? onImport(view) : void act('run', () => runDirectOrderImport(view.importId, conversationId, lang)))}
          >
            {/* Until the columns are known there is no count to promise - "Import 0 orders" read as a result. */}
            {blocker === 'mapping' ? t('vagonai.orderImport.title') : t('vagonai.erpImport.import', { count: toWrite })}
          </Button>
        </div>
      )}
      </div>
    </ImportCard>
  );
}

function TaskText({ T, icon, tone, children }: { T: ThemeTokens; icon: React.ReactNode; tone: Tone; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[13px]" style={{ color: T.t1 }}>
      <span className="mt-0.5 flex-shrink-0" style={{ color: tone === 'neutral' ? T.ac : TONE[tone].fg }} aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

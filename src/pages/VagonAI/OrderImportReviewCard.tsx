/**
 * Bulk order import, in the chat: analysing → review → done.
 *
 * The chat's version of the ERP Orders page's import wizard. The gateway sends
 * the file to the same Laravel mapper and commits through the same
 * confirm-import endpoint, and the row model, the "ready to import" rule and the
 * payload all come from the wizard's own utils - so a file imports here exactly
 * as it does there.
 *
 * Nothing is written until "Import N orders" is pressed. That button is the
 * confirmation: every row on it was reviewed, and the customer on each was picked
 * from the shipper's own list, never read from the file.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { addressBookService, erpOrdersService } from '../../api';
import { masterDataKeys } from '../../api/utils/masterDataCache';
import { SearchableSelect, type SearchableSelectOption } from '../../components/ui/SearchableSelect';
import { DatePicker } from '../../components/ui/DatePicker';
import { AiWizardCustomerSelect } from '../../components/ErpOrders/AiWizardCustomerSelect';
import {
  effectiveOrderFieldValue,
  isOrderHeaderFieldInferred,
  orderRowProblems,
  type OrderPreviewRow,
} from '../../components/ErpOrders/ordersAiWizardUtils';
import {
  confirmOrderImport,
  type OrderImportPreview,
  type OrderImportResult,
} from './api/orderImportService';
import {
  applyCustomerToAccepted,
  existingBadge,
  importBlocker,
  importPayload,
  IMPORT_ROW_RULES,
  initImportRows,
  patchRow,
  requiredColumnStates,
  setAllRows,
  summarizeReview,
  toggleRow,
  type ExistingBadge,
} from './orderImportReview';
import { TONE } from './importTones';
import '../../styles/ai-wizard.css';

export type OrderImportCardState =
  | { phase: 'analyzing'; filename: string; rowCount: number | null }
  | { phase: 'preview'; preview: OrderImportPreview };

interface Props {
  state: OrderImportCardState;
  T: ThemeTokens;
  onDismiss: () => void;
  onChooseAnother: () => void;
  onRetry: () => void;
  onImported: (result: OrderImportResult) => void;
}

// Theme-aware status tones (see importCardKit): the old hex values were light-mode only.
const AMBER = TONE.warn.fg;
const GREEN = TONE.ok.fg;
const RED = TONE.error.fg;

function Shell({ T, children, testId }: { T: ThemeTokens; children: React.ReactNode; testId: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function Header({
  T,
  title,
  subtitle,
  onDismiss,
  dismissLabel,
  icon,
}: {
  T: ThemeTokens;
  title: string;
  subtitle?: string | null;
  onDismiss?: () => void;
  dismissLabel: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <span className="mt-0.5 flex-shrink-0" style={{ color: T.t2 }}>
        {icon ?? <FileSpreadsheet size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold">{title}</div>
        {subtitle ? (
          <div className="text-[12px]" style={{ color: T.t2 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          title={dismissLabel}
          className="rounded-md p-1"
          style={{ color: T.t2 }}
          data-testid="order-import-dismiss"
        >
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

function SecondaryButton({
  T,
  onClick,
  children,
  testId,
  disabled,
}: {
  T: ThemeTokens;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-semibold disabled:opacity-50"
      style={{ height: 32, padding: '0 12px', border: `1px solid ${T.bd}`, background: T.sf, color: T.t1 }}
    >
      {children}
    </button>
  );
}

function OrdersLink({ T, label }: { T: ThemeTokens; label: string }) {
  return (
    <Link
      to="/erp-orders"
      data-testid="order-import-open-orders"
      className="inline-flex items-center gap-1.5 rounded-lg no-underline text-[12.5px] font-bold"
      style={{ height: 32, padding: '0 12px', border: `1px solid ${T.bd}`, background: T.sf, color: T.t1 }}
    >
      {label}
      <ArrowUpRight size={13} />
    </Link>
  );
}

const BADGE_COLORS: Record<ExistingBadge, { fg: string; bg: string }> = {
  new: { fg: GREEN, bg: TONE.ok.bg },
  updates: { fg: AMBER, bg: TONE.warn.bg },
  will_fail: { fg: RED, bg: TONE.error.bg },
  unknown: { fg: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

export default function OrderImportReviewCard({ state, T, onDismiss, onChooseAnother, onRetry, onImported }: Props) {
  const { t } = useTranslation();

  if (state.phase === 'analyzing') {
    return (
      <Shell T={T} testId="order-import-analyzing">
        <Header
          T={T}
          title={t('vagonai.orderImport.analyzing.title', { file: state.filename })}
          subtitle={
            state.rowCount != null ? t('vagonai.orderImport.analyzing.rows', { count: state.rowCount }) : null
          }
          dismissLabel={t('vagonai.orderImport.dismiss')}
          icon={<Loader2 size={16} className="animate-spin" />}
        />
        <p className="m-0 text-[12px]" style={{ color: T.t2 }}>
          {t('vagonai.orderImport.analyzing.hint')}
        </p>
      </Shell>
    );
  }

  const { preview } = state;

  if (preview.status === 'missing_columns') {
    const states = requiredColumnStates(preview.missing_columns);
    const headers = preview.file_headers.filter((h) => h.trim());
    return (
      <Shell T={T} testId="order-import-missing-columns">
        <Header
          T={T}
          title={t('vagonai.orderImport.missing.title')}
          subtitle={preview.filename}
          onDismiss={onDismiss}
          dismissLabel={t('vagonai.orderImport.dismiss')}
          icon={<AlertTriangle size={16} style={{ color: AMBER }} />}
        />
        <p className="mt-0 mb-2 text-[12.5px]">{t('vagonai.orderImport.missing.body')}</p>
        <ul className="m-0 mb-2 pl-0 list-none space-y-1">
          {/* MS3-403: the Order ID column is optional now; delivery date is the one column Laravel still requires. */}
          {(['delivery_date'] as const).map((col) => (
            <li
              key={col}
              className="flex items-center gap-2 text-[12.5px]"
              data-testid={`order-import-col-${col}`}
              data-state={states[col]}
            >
              {states[col] === 'found' ? (
                <CheckCircle2 size={14} style={{ color: GREEN }} />
              ) : (
                <XCircle size={14} style={{ color: RED }} />
              )}
              <strong>{t(`vagonai.orderImport.col.${col}`)}</strong>
              <span style={{ color: states[col] === 'found' ? GREEN : RED }}>
                {t(`vagonai.orderImport.missing.${states[col]}`)}
              </span>
            </li>
          ))}
        </ul>
        {headers.length > 0 ? (
          <p className="mt-0 mb-3 text-[11.5px]" style={{ color: T.t2 }}>
            {t('vagonai.orderImport.missing.foundHeaders', { headers: headers.join(', ') })}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <SecondaryButton T={T} testId="order-import-template" onClick={() => void erpOrdersService.downloadImportTemplate()}>
            <Download size={13} />
            {t('vagonai.orderImport.missing.downloadTemplate')}
          </SecondaryButton>
          <SecondaryButton T={T} testId="order-import-choose-another" onClick={onChooseAnother}>
            <FileSpreadsheet size={13} />
            {t('vagonai.orderImport.chooseAnother')}
          </SecondaryButton>
        </div>
      </Shell>
    );
  }

  if (preview.status === 'rejected' || preview.status === 'unavailable') {
    const unavailable = preview.status === 'unavailable';
    return (
      <Shell T={T} testId={`order-import-${preview.status}`}>
        <Header
          T={T}
          title={t(unavailable ? 'vagonai.orderImport.unavailable.title' : 'vagonai.orderImport.rejected.title')}
          subtitle={preview.filename}
          onDismiss={onDismiss}
          dismissLabel={t('vagonai.orderImport.dismiss')}
          icon={<AlertTriangle size={16} style={{ color: AMBER }} />}
        />
        {preview.message ? (
          <p className="mt-0 mb-2 text-[12.5px]" data-testid="order-import-message">
            {preview.message}
          </p>
        ) : null}
        {unavailable ? (
          <p className="mt-0 mb-3 text-[12px]" style={{ color: T.t2 }}>
            {t('vagonai.orderImport.unavailable.body')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {unavailable ? (
            <SecondaryButton T={T} testId="order-import-retry" onClick={onRetry}>
              <RefreshCw size={13} />
              {t('vagonai.orderImport.unavailable.retry')}
            </SecondaryButton>
          ) : null}
          <SecondaryButton T={T} testId="order-import-choose-another" onClick={onChooseAnother}>
            <FileSpreadsheet size={13} />
            {t('vagonai.orderImport.chooseAnother')}
          </SecondaryButton>
          <OrdersLink T={T} label={t('vagonai.orderImport.openOrders')} />
        </div>
      </Shell>
    );
  }

  return (
    <ReviewStep
      key={`${preview.conversationId}:${preview.filename}:${preview.orders.length}`}
      preview={preview}
      T={T}
      onDismiss={onDismiss}
      onChooseAnother={onChooseAnother}
      onImported={onImported}
    />
  );
}

function ReviewStep({
  preview,
  T,
  onDismiss,
  onChooseAnother,
  onImported,
}: {
  preview: OrderImportPreview;
  T: ThemeTokens;
  onDismiss: () => void;
  onChooseAnother: () => void;
  onImported: (result: OrderImportResult) => void;
}) {
  const { t, lang } = useTranslation();
  const [rows, setRows] = useState<OrderPreviewRow[]>(() => initImportRows(preview));
  const [bulkCustomer, setBulkCustomer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderImportResult | null>(null);

  // Same query keys as the ERP Orders page, so the two share one cache.
  const customersQuery = useQuery({
    queryKey: masterDataKeys.erpCustomers,
    queryFn: () => erpOrdersService.listCustomers(),
    staleTime: 60_000,
  });
  const locationsQuery = useQuery({
    queryKey: masterDataKeys.locationsForOrders,
    queryFn: () => addressBookService.listAllLocations({}),
    staleTime: 60_000,
  });

  const customerOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (customersQuery.data ?? []).map((c) => ({
        value: String(c.id),
        label: c.name,
        sublabel:
          c.is_partner && c.partner_company_name
            ? [c.vat_number, c.partner_company_name].filter(Boolean).join(' · ')
            : c.vat_number ?? undefined,
      })),
    [customersQuery.data],
  );
  const locationOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (locationsQuery.data ?? []).map((l) => ({
        value: String(l.id),
        label: l.name,
        sublabel: l.city || l.address,
      })),
    [locationsQuery.data],
  );

  const summary = useMemo(() => summarizeReview(rows, preview.existingChecked), [rows, preview.existingChecked]);
  const blocker = importBlocker(summary);

  if (result) {
    const disabled = result.status === 'disabled';
    return (
      <Shell T={T} testId="order-import-done">
        <Header
          T={T}
          title={t(disabled ? 'vagonai.orderImport.done.disabledTitle' : 'vagonai.orderImport.done.title')}
          subtitle={preview.filename}
          onDismiss={onDismiss}
          dismissLabel={t('vagonai.orderImport.dismiss')}
          icon={
            disabled || result.failed > 0 ? (
              <AlertTriangle size={16} style={{ color: AMBER }} />
            ) : (
              <CheckCircle2 size={16} style={{ color: GREEN }} />
            )
          }
        />
        {disabled ? (
          <p className="mt-0 mb-3 text-[12.5px]" data-testid="order-import-message">
            {result.message}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3 text-[12.5px] font-semibold" data-testid="order-import-counts">
              <span data-testid="order-import-created" style={{ color: GREEN }}>
                {t('vagonai.orderImport.done.created', { count: result.created })}
              </span>
              <span style={{ color: T.t3 }}>·</span>
              <span data-testid="order-import-updated" style={{ color: result.updated > 0 ? AMBER : T.t2 }}>
                {t('vagonai.orderImport.done.updated', { count: result.updated })}
              </span>
              <span style={{ color: T.t3 }}>·</span>
              <span data-testid="order-import-failed" style={{ color: result.failed > 0 ? RED : T.t2 }}>
                {t('vagonai.orderImport.done.failed', { count: result.failed })}
              </span>
            </div>
            {result.failures.length > 0 ? (
              <div className="mb-3">
                <div className="text-[12px] font-bold mb-1" style={{ color: RED }}>
                  {t('vagonai.orderImport.done.failures')}
                </div>
                <ul className="m-0 pl-0 list-none space-y-1 max-h-40 overflow-auto" data-testid="order-import-failures">
                  {result.failures.map((f, i) => (
                    <li
                      key={`${i}-${f}`}
                      className="rounded-lg px-2.5 py-1.5 text-[12px]"
                      style={{ background: TONE.error.bg }}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.created + result.updated > 0 ? (
              <p className="mt-0 mb-3 text-[12px]" style={{ color: T.t2 }}>
                {t('vagonai.orderImport.done.next')}
              </p>
            ) : null}
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <OrdersLink T={T} label={t('vagonai.orderImport.openOrders')} />
          <SecondaryButton T={T} testId="order-import-close" onClick={onDismiss}>
            {t('vagonai.orderImport.dismiss')}
          </SecondaryButton>
        </div>
      </Shell>
    );
  }

  const submit = async () => {
    if (blocker || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const outcome = await confirmOrderImport({
        conversationId: preview.conversationId,
        orders: importPayload(rows),
        locale: lang,
      });
      setResult(outcome);
      onImported(outcome);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('vagonai.orderImport.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const fileText = (row: OrderPreviewRow, field: 'ship_from' | 'ship_to') => effectiveOrderFieldValue(row, field);

  return (
    <Shell T={T} testId="order-import-review">
      <Header
        T={T}
        title={t('vagonai.orderImport.review.title', { count: rows.length, file: preview.filename ?? '' })}
        subtitle={t('vagonai.orderImport.review.subtitle')}
        onDismiss={onDismiss}
        dismissLabel={t('vagonai.orderImport.dismiss')}
      />

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[12px] font-semibold" style={{ color: T.t2 }}>
          {t('vagonai.orderImport.review.customerForAll')}
        </span>
        <div style={{ minWidth: 220, flex: '1 1 220px', maxWidth: 340 }} data-testid="order-import-bulk-customer">
          <AiWizardCustomerSelect
            options={customerOptions}
            value={bulkCustomer}
            required={false}
            onChange={(val, opt) => {
              setBulkCustomer(val);
              setRows((current) =>
                applyCustomerToAccepted(current, val ? { id: Number(val), name: opt?.label ?? '' } : null),
              );
            }}
            placeholder={t('vagonai.orderImport.review.selectCustomer')}
            searchPlaceholder={t('vagonai.orderImport.review.searchCustomer')}
          />
        </div>
        <div className="flex gap-1.5 ml-auto">
          <SecondaryButton T={T} testId="order-import-select-all" onClick={() => setRows((r) => setAllRows(r, 'accepted'))}>
            {t('vagonai.orderImport.review.selectAll')}
          </SecondaryButton>
          <SecondaryButton T={T} testId="order-import-clear-all" onClick={() => setRows((r) => setAllRows(r, 'rejected'))}>
            {t('vagonai.orderImport.review.clearAll')}
          </SecondaryButton>
        </div>
      </div>

      <ul
        className="m-0 pl-0 list-none space-y-1.5 overflow-auto pr-1"
        style={{ maxHeight: '46vh' }}
        data-testid="order-import-rows"
      >
        {rows.map((row) => {
          const accepted = row.status === 'accepted';
          const badge = existingBadge(row, preview.existingChecked);
          const problems = accepted ? orderRowProblems(row, IMPORT_ROW_RULES) : [];
          const colors = BADGE_COLORS[badge];
          return (
            <li
              key={row.id}
              className="rounded-lg border px-2.5 py-2"
              style={{ borderColor: problems.length ? RED : T.bd, background: accepted ? T.sf : T.sa, opacity: accepted ? 1 : 0.6 }}
              data-testid="order-import-row"
              data-ref={row.order.order_reference ?? undefined}
              data-status={row.status}
              data-badge={badge}
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={() => setRows((r) => toggleRow(r, row.id))}
                  aria-label={row.order.order_reference ?? row.order.customer_name ?? undefined}
                  data-testid="order-import-row-toggle"
                />
                <strong className="text-[12.5px]">{row.order.order_reference || '—'}</strong>
                {row.order.erp_reference ? (
                  <span className="text-[11.5px]" style={{ color: T.t2 }}>
                    {row.order.erp_reference}
                  </span>
                ) : null}
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                  style={{ color: colors.fg, background: colors.bg }}
                  data-testid="order-import-row-badge"
                >
                  {t(`vagonai.orderImport.badge.${badge}`)}
                </span>
                {accepted ? (
                  <label className="ml-auto inline-flex items-center gap-1 text-[11.5px]" style={{ color: T.t2 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(row.order.high_priority)}
                      onChange={(e) => setRows((r) => patchRow(r, row.id, { high_priority: e.target.checked }))}
                    />
                    {t('vagonai.orderImport.review.highPriority')}
                  </label>
                ) : null}
              </div>

              {accepted ? (
                <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                  <div data-testid="order-import-row-customer">
                    <AiWizardCustomerSelect
                      options={customerOptions}
                      value={row.order.company_entity_id != null ? String(row.order.company_entity_id) : ''}
                      onChange={(val, opt) =>
                        setRows((r) =>
                          patchRow(r, row.id, {
                            company_entity_id: val ? Number(val) : null,
                            customer_name: val ? opt?.label ?? '' : null,
                            inferred: { ...row.order.inferred, customer: !val },
                          }),
                        )
                      }
                      placeholder={t('vagonai.orderImport.review.selectCustomer')}
                      searchPlaceholder={t('vagonai.orderImport.review.searchCustomer')}
                    />
                  </div>
                  {(['ship_from', 'ship_to'] as const).map((field) => {
                    const idField = field === 'ship_from' ? 'origin_location_id' : 'dest_location_id';
                    const value = row.order[idField];
                    const text = fileText(row, field);
                    return (
                      <div key={field} className="min-w-0">
                        <div className="text-[10.5px] font-semibold mb-0.5" style={{ color: T.t2 }}>
                          {t(field === 'ship_from' ? 'vagonai.orderImport.review.from' : 'vagonai.orderImport.review.to')}
                        </div>
                        <SearchableSelect
                          menuFixed
                          options={locationOptions}
                          value={value ? String(value) : ''}
                          onChange={(val, opt) =>
                            setRows((r) =>
                              patchRow(r, row.id, {
                                [idField]: val ? Number(val) : null,
                                [field]: opt?.label ?? row.order[field] ?? '',
                              }),
                            )
                          }
                          placeholder={text || t('vagonai.orderImport.review.selectLocation')}
                        />
                        {value && isOrderHeaderFieldInferred(row, field) ? (
                          <div className="text-[10.5px] mt-0.5" style={{ color: AMBER }}>
                            {t('vagonai.orderImport.review.matchedByName')}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {(['ship_date', 'delivery_date'] as const).map((field) => (
                    <div key={field} className="min-w-0">
                      <div className="text-[10.5px] font-semibold mb-0.5" style={{ color: T.t2 }}>
                        {t(field === 'ship_date' ? 'vagonai.orderImport.review.shipDate' : 'vagonai.orderImport.review.deliveryDate')}
                      </div>
                      <DatePicker
                        value={row.order[field] ?? ''}
                        onChange={(val) => setRows((r) => patchRow(r, row.id, { [field]: val }))}
                        hasError={field === 'delivery_date' && problems.includes('delivery_date')}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-2 mb-0 text-[11.5px]" style={{ color: T.t2 }}>
        {t('vagonai.orderImport.review.noLines')}
      </p>

      <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2" style={{ borderColor: T.bd }}>
        <div className="flex-1 min-w-[12rem] text-[12px] space-y-0.5" data-testid="order-import-summary">
          <div style={{ color: T.t2 }}>
            {t('vagonai.orderImport.review.selected', { accepted: summary.accepted, total: summary.total })}
          </div>
          {summary.updates > 0 ? (
            <div style={{ color: AMBER }}>{t('vagonai.orderImport.review.updates', { count: summary.updates })}</div>
          ) : null}
          {summary.willFail > 0 ? (
            <div style={{ color: RED }}>{t('vagonai.orderImport.review.willFail', { count: summary.willFail })}</div>
          ) : null}
          {!preview.existingChecked ? (
            <div style={{ color: AMBER }}>{t('vagonai.orderImport.review.uncheckedExisting')}</div>
          ) : null}
          {blocker ? (
            <div style={{ color: RED }} data-testid="order-import-blocker" data-blocker={blocker}>
              {blocker === 'none_accepted'
                ? t('vagonai.orderImport.blocker.none_accepted')
                : t(`vagonai.orderImport.blocker.${blocker}`, { count: summary.problems[blocker] })}
            </div>
          ) : null}
          {submitError ? (
            <div style={{ color: RED }} data-testid="order-import-error">
              {submitError}
            </div>
          ) : null}
        </div>
        <SecondaryButton T={T} testId="order-import-choose-another" onClick={onChooseAnother} disabled={submitting}>
          {t('vagonai.orderImport.chooseAnother')}
        </SecondaryButton>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={Boolean(blocker) || submitting}
          data-testid="order-import-submit"
          className="inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-bold border-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ height: 34, padding: '0 14px', background: T.ac, color: '#fff' }}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting
            ? t('vagonai.orderImport.review.importing')
            : t('vagonai.orderImport.review.import', { count: summary.accepted })}
        </button>
      </div>
    </Shell>
  );
}

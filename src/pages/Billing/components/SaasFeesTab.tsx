import React from 'react';
import {
  Search,
  FileText,
  Download,
  AlertTriangle,
  Clock,
  Calendar,
  Check,
  CreditCard,
  X,
  Wallet,
  Building2,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice, SubFilterKey, KpiFilterKey, BillingSummary } from '../types';
import { formatCurrency, formatDate } from '../mockData';
import { DatePicker } from '../../../components/ui/DatePicker';
import { BillingKpiSkeleton, BillingTableSkeleton } from './BillingSkeleton';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const sk = { baseColor: '#f0f0f3', highlightColor: '#fafafe' };

interface SaasFeesTabProps {
  invoices: Invoice[];
  summary: BillingSummary | null;
  loading: boolean;
  subFilter: SubFilterKey;
  kpiFilter: KpiFilterKey;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  canDateFilter: boolean;
  page: number;
  lastPage: number;
  total: number;
  payingId: number | null;
  onSetSubFilter: (filter: SubFilterKey) => void;
  onToggleKpiFilter: (filter: KpiFilterKey) => void;
  onSearchChange: (q: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onApplyDateFilter: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onPreviewPdf: (invoice: Invoice) => void;
  onOfficialPrint: (invoice: Invoice) => void;
  onExportInvoiceCsv: (invoice: Invoice) => void;
  onPayNow: (invoice: Invoice) => void;
  onPayWallet: (invoice: Invoice) => void;
  onBankTransfer: (invoice: Invoice) => void;
}

export const SaasFeesTab: React.FC<SaasFeesTabProps> = ({
  invoices,
  summary,
  loading,
  subFilter,
  kpiFilter,
  searchQuery,
  dateFrom,
  dateTo,
  canDateFilter,
  page,
  lastPage,
  total,
  payingId,
  onSetSubFilter,
  onToggleKpiFilter,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onApplyDateFilter,
  onClearFilters,
  onPageChange,
  onSelectInvoice,
  onPreviewPdf,
  onOfficialPrint,
  onExportInvoiceCsv,
  onPayNow,
  onPayWallet,
  onBankTransfer,
}) => {
  const { t, i18n } = useTranslation();

  const kpis = [
    {
      label: t('billingPage.kpiOutstanding', 'Total Outstanding'),
      val: formatCurrency(summary?.total_outstanding ?? 0, summary?.currency),
      sub: `${summary?.total_invoices_count ?? 0} ${t('billingPage.invoices', 'invoices')}`,
      key: 'outstanding' as const,
      icon: <AlertTriangle size={16} className="text-red-500" />,
    },
    {
      label: t('billingPage.kpiOverdue', 'Overdue'),
      val: formatCurrency(summary?.overdue_amount ?? 0, summary?.currency),
      sub: `${summary?.overdue_count ?? 0} ${t('billingPage.invoices', 'invoices')}`,
      key: 'overdue' as const,
      icon: <Clock size={16} className="text-red-600" />,
    },
    {
      label: t('billingPage.kpiDueSoon', 'Due ≤ 7 days'),
      val: formatCurrency(summary?.due_soon_amount ?? 0, summary?.currency),
      sub: `${summary?.due_soon_count ?? 0} ${t('billingPage.invoices', 'invoices')}`,
      key: 'dueSoon' as const,
      icon: <Calendar size={16} className="text-amber-500" />,
    },
    {
      label: t('billingPage.kpiPaid', 'Paid this period'),
      val: formatCurrency(summary?.paid_this_period_amount ?? 0, summary?.currency),
      sub: summary?.paid_this_period_label ?? '',
      key: 'paid' as const,
      icon: <Check size={16} className="text-emerald-500" />,
    },
    {
      label: t('billingPage.kpiCredits', 'Credits Available'),
      val: formatCurrency(summary?.available_credits_amount ?? 0, summary?.currency),
      sub: `${summary?.available_credits_count ?? 0} ${t('billingPage.creditMovements', 'credit movements')}`,
      key: null,
      icon: <CreditCard size={16} className="text-purple-600" />,
    },
  ];

  const subTabs: { key: SubFilterKey; labelKey: string; defaultLabel: string }[] = [
    { key: 'All', labelKey: 'billingPage.subAll', defaultLabel: 'All' },
    { key: 'Unpaid', labelKey: 'billingPage.subUnpaid', defaultLabel: 'Unpaid' },
    { key: 'Overdue', labelKey: 'billingPage.subOverdue', defaultLabel: 'Overdue' },
    { key: 'Paid', labelKey: 'billingPage.subPaid', defaultLabel: 'Paid' },
    { key: 'Subscription', labelKey: 'billingPage.subSubscription', defaultLabel: 'Subscription' },
    { key: 'Commission', labelKey: 'billingPage.subCommission', defaultLabel: 'Commission' },
    { key: 'Add-on', labelKey: 'billingPage.subAddon', defaultLabel: 'Add-on' },
  ];

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Subscription':
        return 'b-subscription';
      case 'Commission':
        return 'b-commission';
      case 'Penalty':
        return 'b-penalty';
      case 'Add-on':
        return 'b-addon';
      default:
        return 'b-credit';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'b-paid';
      case 'Overdue':
        return 'b-overdue';
      case 'Unpaid':
        return 'b-unpaid';
      default:
        return 'b-draft';
    }
  };

  return (
    <div>
      {loading && !summary ? (
        <BillingKpiSkeleton />
      ) : (
        <div className="kpi-strip">
          {kpis.map((kp, idx) => (
            <div
              key={idx}
              className={`kpi-card ${kpiFilter === kp.key && kp.key ? 'active' : ''}`}
              onClick={() => kp.key && onToggleKpiFilter(kp.key)}
              style={{ cursor: !kp.key ? 'default' : 'pointer' }}
            >
              <div className="kpi-top">
                <span className="kpi-label">{kp.label}</span>
                {kp.icon}
              </div>
              <div className="kpi-val billing-mono">{kp.val}</div>
              <div className="kpi-sub">{kp.sub}</div>
            </div>
          ))}
        </div>
      )}

      {(summary?.overdue_count || summary?.due_soon_count) ? (
        <div className="action-bar">
          <div className="action-bar-icon-wrap">
            <AlertTriangle size={18} className="action-bar-icon" aria-hidden="true" />
          </div>
          <div className="ab-text">
            <strong className="ab-title">{t('billingPage.actionRequired', 'Action Required')}</strong>
            <span className="ab-sep">—</span>
            {(summary?.overdue_count ?? 0) > 0 && (
              <span className="ab-detail">
                <strong>{summary?.overdue_count}</strong>{' '}
                {(summary?.overdue_count ?? 0) === 1
                  ? t('billingPage.overdueInvoiceSingle', 'overdue invoice')
                  : t('billingPage.overdueInvoices', 'overdue invoices')}{' '}
                <span className="billing-mono">({formatCurrency(summary?.overdue_amount ?? 0, summary?.currency)})</span>
              </span>
            )}
            {(summary?.overdue_count ?? 0) > 0 && (summary?.due_soon_count ?? 0) > 0 && (
              <span className="ab-dot">·</span>
            )}
            {(summary?.due_soon_count ?? 0) > 0 && (
              <span className="ab-detail">
                <strong>{summary?.due_soon_count}</strong>{' '}
                {t('billingPage.dueSoon', 'due within 7 days')}
              </span>
            )}
          </div>
          <button
            type="button"
            className="b-btn b-btn-warning-action action-bar-btn"
            onClick={() => onToggleKpiFilter('overdue')}
          >
            <span>{t('billingPage.reviewNow', 'Review Now')}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      ) : null}

      <div className={`sub-bar ${loading && !summary ? 'is-loading' : ''}`}>
        <div className="sub-bar-left">
          <div className="sub-bar-pills">
            {subTabs.map((st) => (
              <button
                key={st.key}
                type="button"
                className={`sub-pill ${subFilter === st.key ? 'active' : ''}`}
                onClick={() => onSetSubFilter(st.key)}
              >
                {t(st.labelKey, st.defaultLabel)}
              </button>
            ))}
          </div>

          <div className="billing-date-range">
            <DatePicker
              value={dateFrom}
              onChange={onDateFromChange}
              max={dateTo || undefined}
              disabled={!canDateFilter}
              direction="auto"
              placeholder={t('billingPage.fromDate', 'From')}
            />
            <span className="billing-date-sep" aria-hidden="true">
              →
            </span>
            <DatePicker
              value={dateTo}
              onChange={onDateToChange}
              min={dateFrom || undefined}
              disabled={!canDateFilter}
              direction="auto"
              placeholder={t('billingPage.toDate', 'To')}
            />
            <button type="button" className="b-btn b-btn-primary billing-filter-apply" onClick={onApplyDateFilter}>
              {t('billingPage.filter', 'Filter')}
            </button>
            {(kpiFilter || searchQuery || dateFrom || dateTo) && (
              <button
                type="button"
                className="b-btn b-btn-danger billing-filter-clear flex items-center gap-1"
                onClick={onClearFilters}
              >
                <X size={12} />
                <span>{t('common.clear', 'Clear')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="sub-bar-search">
          <div className="f-search">
            <Search size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('billingPage.searchPlaceholder', 'Search invoices, loads, descriptions…')}
            />
          </div>
        </div>
      </div>

      <div className={`billing-tbl-card ${loading ? 'is-loading' : ''}`}>
        <div className="overflow-x-auto">
          <table className="billing-t">
            <thead>
              <tr>
                <th>{t('billingPage.thInvoice', 'Invoice #')}</th>
                <th>{t('billingPage.thType', 'Type')}</th>
                <th>{t('billingPage.thStatus', 'Status')}</th>
                <th>{t('billingPage.thIssueDate', 'Issue Date')}</th>
                <th>{t('billingPage.thDueDate', 'Due Date')}</th>
                <th>{t('billingPage.thPaidDate', 'Paid Date')}</th>
                <th>{t('billingPage.thTotal', 'Total')}</th>
                <th>{t('billingPage.thRemaining', 'Remaining')}</th>
                <th>{t('billingPage.thLoads', 'Loads')}</th>
                <th>{t('billingPage.thActions', 'Actions')}</th>
              </tr>
            </thead>
            {loading ? (
              <BillingTableSkeleton rows={8} columns={10} />
            ) : (
              <tbody>
                {invoices.map((inv) => (
                <tr key={inv.raw_id ?? inv.id} onClick={() => onSelectInvoice(inv)}>
                  <td className="billing-mono text-purple-700 font-semibold text-xs">
                    {inv.id}
                    {inv.under_process && (
                      <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                        {t('billingPage.receiptUnderReview', 'Receipt under review')}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`b-badge ${getTypeBadgeClass(inv.type)}`}>{inv.type}</span>
                  </td>
                  <td>
                    <span className={`b-badge ${getStatusBadgeClass(inv.status)}`}>{inv.status}</span>
                  </td>
                  <td className="text-gray-600 text-xs">{formatDate(inv.iDate, i18n.language)}</td>
                  <td className={`text-xs ${inv.status === 'Overdue' ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                    {formatDate(inv.dDate, i18n.language)}
                  </td>
                  <td className="text-gray-400 text-xs">{formatDate(inv.pDate, i18n.language)}</td>
                  <td className="billing-mono font-semibold text-xs text-gray-900">
                    {formatCurrency(inv.tot, inv.cur)}
                  </td>
                  <td className={`billing-mono font-semibold text-xs ${inv.rem > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(inv.rem, inv.cur)}
                  </td>
                  <td>
                    {inv.loads > 0 ? (
                      <span className="text-purple-700 font-medium text-xs">
                        {inv.loads} {t('billingPage.loads', 'loads')}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 flex-wrap">
                      {inv.can_pay_now && (
                        <button
                          type="button"
                          className="b-btn b-btn-sm b-btn-primary"
                          disabled={payingId === inv.raw_id}
                          onClick={() => onPayNow(inv)}
                        >
                          {t('billingPage.btnPayNow', 'Pay Now')}
                        </button>
                      )}
                      {Boolean(inv.can_pay_wallet) && (summary?.wallet_balance ?? 0) >= (inv.rem > 0 ? inv.rem : inv.tot) && (
                        <button
                          type="button"
                          className="b-btn-ghost p-1"
                          title={t('billingPage.btnPayWallet', 'Pay using wallet')}
                          onClick={() => onPayWallet(inv)}
                        >
                          <Wallet size={15} />
                        </button>
                      )}
                      {inv.can_bank_transfer && (
                        <button
                          type="button"
                          className="b-btn-ghost p-1"
                          title={t('billingPage.btnBankTransfer', 'Bank Transfer')}
                          onClick={() => onBankTransfer(inv)}
                        >
                          <Building2 size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="b-btn-ghost p-1"
                        title={t('billingPage.btnOfficialInvoice', 'Official invoice')}
                        onClick={() => onOfficialPrint(inv)}
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        type="button"
                        className="b-btn-ghost p-1"
                        title={t('billingPage.btnPreviewPDF', 'Preview PDF')}
                        onClick={() => onPreviewPdf(inv)}
                      >
                        <FileText size={15} />
                      </button>
                      <button
                        type="button"
                        className="b-btn-ghost p-1"
                        title={t('billingPage.btnCSV', 'Export CSV')}
                        onClick={() => onExportInvoiceCsv(inv)}
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">
                      {t('billingPage.noMatchingInvoices', 'No invoices match your filters')}
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>

        <div className="billing-tbl-ft">
          <span>
            {loading ? (
              <Skeleton width={160} height={12} borderRadius={4} {...sk} />
            ) : (
              <>
                {t('billingPage.showing', 'Showing')} {invoices.length} {t('billingPage.of', 'of')} {total}{' '}
                {t('billingPage.invoices', 'invoices')}
              </>
            )}
          </span>
          <div className="flex gap-2 items-center">
            {loading ? (
              <>
                <Skeleton width={52} height={28} borderRadius={8} {...sk} />
                <Skeleton width={40} height={12} borderRadius={4} {...sk} />
                <Skeleton width={52} height={28} borderRadius={8} {...sk} />
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="b-btn b-btn-sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  {t('common.prev', 'Prev')}
                </button>
                <span className="text-xs text-gray-500 self-center">
                  {page} / {lastPage}
                </span>
                <button
                  type="button"
                  className="b-btn b-btn-sm"
                  disabled={page >= lastPage}
                  onClick={() => onPageChange(page + 1)}
                >
                  {t('common.next', 'Next')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

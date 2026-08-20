import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Download,
  FileText,
  Layers,
  CreditCard,
  BarChart3,
  Receipt,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { billingService } from '../../api/services/billingService';
import { ApiError, getApiErrorMessage } from '../../api';
import type {
  Invoice,
  CreditNote,
  LineItem,
  TabKey,
  SubFilterKey,
  KpiFilterKey,
  BillingSummary,
} from './types';
import { downloadFileBlob, canSubmitBankReceipt, formatCurrency } from './mockData';
import { fillPrintWindow, preparePrintWindow } from '../../utils/printHtml';
import { InvoiceDocument } from './documents/InvoiceDocument';
import { renderBillingDocumentHtml } from './documents/renderBillingDocument';

import './billing.css';
import { UniverseBanner } from './components/UniverseBanner';
import { SaasFeesTab } from './components/SaasFeesTab';
import { CreditsTab } from './components/CreditsTab';
import { StatementsTab } from './components/StatementsTab';
import { InvoiceDetailDrawer } from './components/InvoiceDetailDrawer';

import { ApplyCreditModal } from './components/modals/ApplyCreditModal';
import { RequestAdjustmentModal } from './components/modals/RequestAdjustmentModal';
import { BankTransferModal } from './components/modals/BankTransferModal';
import { StatementDownloadModal } from './components/modals/StatementDownloadModal';
import { PdfPreviewModal } from './components/modals/PdfPreviewModal';

function mapSubFilter(sub: SubFilterKey, kpi: KpiFilterKey): { status?: string; type?: string } {
  if (kpi === 'outstanding') return { status: 'unpaid' };
  if (kpi === 'overdue') return { status: 'overdue' };
  if (kpi === 'dueSoon') return { status: 'due_soon' };
  if (kpi === 'paid') return { status: 'paid' };
  if (sub === 'Unpaid') return { status: 'unpaid' };
  if (sub === 'Overdue') return { status: 'overdue' };
  if (sub === 'Paid') return { status: 'paid' };
  if (sub === 'Subscription') return { type: 'subscription' };
  if (sub === 'Commission') return { type: 'commission' };
  if (sub === 'Commission with penalty' || sub === 'Penalty') return { type: 'commission_with_penalty' };
  if (sub === 'Add-on') return { type: 'add-on' };
  return { status: 'all' };
}

function toBillingError(err: unknown, fallback: string, t: TFunction): string {
  if (err instanceof ApiError) {
    return getApiErrorMessage(err, fallback, (key, options) => String(t(key, options)));
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>('saas');
  const [subFilter, setSubFilter] = useState<SubFilterKey>('All');
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey>(null);
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') || searchParams.get('search') || ''
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => (searchParams.get('q') || searchParams.get('search') || '').trim()
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [walletPage, setWalletPage] = useState(1);
  const [walletLastPage, setWalletLastPage] = useState(1);
  const [walletTotal, setWalletTotal] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);

  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);
  const [drawerLines, setDrawerLines] = useState<LineItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [walletInvoices, setWalletInvoices] = useState<Invoice[]>([]);
  const [walletInvoicesLoading, setWalletInvoicesLoading] = useState(false);
  const [applyCreditOpen, setApplyCreditOpen] = useState(false);
  const [requestAdjOpen, setRequestAdjOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [statementDownloadOpen, setStatementDownloadOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfInvoiceId, setPdfInvoiceId] = useState<number | null>(null);
  const [pdfIsStatement, setPdfIsStatement] = useState(false);
  const [pdfStatementPeriod, setPdfStatementPeriod] = useState(
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  );
  const [exportingAction, setExportingAction] = useState<
    'invoice-register' | 'line-items' | 'statement' | null
  >(null);

  const canExport = Boolean(summary?.has_account_statement);

  const guardExport = useCallback((): boolean => {
    if (!canExport) {
      toast.error(
        t(
          'billingPage.upgradeRequired',
          'Your current subscription plan does not support this feature. To unlock it, please upgrade to a higher tier plan.',
        ),
      );
      return false;
    }
    return true;
  }, [canExport, t, toast]);

  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search') || '';
    setSearchQuery((prev) => (prev === q ? prev : q));
  }, [searchParams]);

  const updateSearchQuery = (val: string) => {
    setSearchQuery(val);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (val.trim()) {
          next.set('q', val);
        } else {
          next.delete('q');
          next.delete('search');
        }
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const next = searchQuery.trim();
    const timer = window.setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== next) {
          setPage(1);
        }
        return next;
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = mapSubFilter(subFilter, kpiFilter);
      const [sumRes, invRes] = await Promise.all([
        billingService.getSummary(),
        billingService.getInvoices({
          ...filters,
          q: debouncedSearch.trim() || undefined,
          from: appliedFrom || undefined,
          to: appliedTo || undefined,
          page,
          per_page: 15,
        }),
      ]);
      setSummary(sumRes);
      setUpgradeRequired(sumRes.has_account_statement === false);
      setInvoices(invRes.items);
      setTotal(invRes.total);
      setLastPage(invRes.last_page);
      if (sumRes.has_past_due !== Boolean(user?.has_past_due)) {
        void refreshUser();
      }
    } catch (err) {
      setError(toBillingError(err, t('billingPage.loadError', 'Unable to load billing data.'), t));
    } finally {
      setLoading(false);
    }
  }, [subFilter, kpiFilter, debouncedSearch, appliedFrom, appliedTo, page, t, user?.has_past_due, refreshUser]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const fetchWalletActivity = useCallback(async () => {
    setWalletLoading(true);
    try {
      const cnRes = await billingService.getCreditNotes({ page: walletPage, per_page: 15 });
      setCreditNotes(cnRes.items);
      setWalletTotal(cnRes.total);
      setWalletLastPage(cnRes.last_page);
    } catch (err) {
      setError(toBillingError(err, t('billingPage.loadError', 'Unable to load billing data.'), t));
    } finally {
      setWalletLoading(false);
    }
  }, [walletPage, t]);

  useEffect(() => {
    if (activeTab !== 'credits') return;
    fetchWalletActivity();
  }, [activeTab, fetchWalletActivity]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const transactionId = params.get('t') || params.get('transaction_id');
    const orderCode = params.get('s') || params.get('order_code');

    const clearQuery = () => {
      const url = new URL(window.location.href);
      ['payment', 't', 's', 'transaction_id', 'order_code'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, '', url.pathname + url.search);
    };

    if (payment === 'failed' || payment === 'cancel' || payment === 'cancelled') {
      toast.error(t('billingPage.vivaVerifyFailed', 'Payment was not completed.'));
      clearQuery();
      return;
    }
    if (payment === 'success') {
      toast.success(t('billingPage.successViva', 'Payment completed successfully'));
      clearQuery();
      fetchBillingData();
      return;
    }

    if (transactionId || orderCode) {
      billingService
        .verifyVivaPayment(transactionId || undefined, orderCode || undefined)
        .then(() => {
          toast.success(t('billingPage.successViva', 'Payment completed successfully'));
          fetchBillingData();
        })
        .catch((err) => {
          toast.error(toBillingError(err, t('billingPage.vivaVerifyFailed', 'Payment was not completed.'), t));
        })
        .finally(clearQuery);
    }
  }, [fetchBillingData, t, toast]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setKpiFilter(null);
    setSubFilter('All');
    updateSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setAppliedFrom('');
    setAppliedTo('');
    setPage(1);
  };

  const handleToggleKpiFilter = (key: KpiFilterKey) => {
    setKpiFilter((prev) => (prev === key ? null : key));
    setSubFilter('All');
    setPage(1);
  };

  const handleClearFilters = () => {
    setKpiFilter(null);
    setSubFilter('All');
    updateSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setAppliedFrom('');
    setAppliedTo('');
    setPage(1);
  };

  const currentExportFilters = () => {
    const mapped = mapSubFilter(subFilter, kpiFilter);
    return {
      ...mapped,
      q: debouncedSearch.trim() || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
    };
  };

  const handleApplyDateFilter = () => {
    if (summary?.has_filter_search === false) {
      toast.error(
        t(
          'billingPage.upgradeRequired',
          'Your current subscription plan does not support this feature. To unlock it, please upgrade to a higher tier plan.',
        ),
      );
      return;
    }
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setPage(1);
  };

  const handleOfficialPrint = async (inv: Invoice) => {
    if (!inv.raw_id) return;

    const printWindow = preparePrintWindow(inv.id);
    if (!printWindow) {
      toast.error(
        t('billingPage.popupBlocked', 'Please allow popups in your browser to print invoices.'),
      );
      return;
    }

    try {
      const payload = await billingService.getInvoicePrint(inv.raw_id);
      const html = renderBillingDocumentHtml(
        payload.invoice.id,
        <InvoiceDocument
          invoice={payload.invoice}
          issuer={payload.issuer}
          billTo={payload.bill_to}
          currency={payload.currency}
        />,
      );
      fillPrintWindow(printWindow, payload.invoice.id, html);
    } catch (err) {
      printWindow.close();
      toast.error(toBillingError(err, t('billingPage.printFailed', 'Unable to open the official invoice.'), t));
    }
  };

  const invoiceKey = (inv: Invoice) => inv.raw_id ?? inv.id;

  const handlePayNow = async (inv: Invoice) => {
    if (!inv.raw_id || payingId) return;
    setPayingId(inv.raw_id);
    try {
      const order = await billingService.createVivaOrder(inv.raw_id);
      if (order.checkoutUrl) {
        if (order.wallet_applied && (order.wallet_amount ?? 0) > 0) {
          toast.info(
            t(
              'billingPage.walletRemainderNote',
              'Wallet credit of {{amount}} will be applied. The remainder is charged via Viva Wallet.',
              { amount: formatCurrency(order.wallet_amount ?? 0) },
            ),
          );
        }
        window.location.assign(order.checkoutUrl);
        return;
      }
      toast.error(t('billingPage.vivaCreateFailed', 'Unable to start payment.'));
    } catch (err) {
      toast.error(toBillingError(err, t('billingPage.vivaCreateFailed', 'Unable to start payment.'), t));
    } finally {
      setPayingId(null);
    }
  };

  const handlePayWallet = async (rawId: number) => {
    await billingService.payWithWallet(rawId);
    toast.success(t('billingPage.successWallet', 'Invoice paid using wallet credit'));
    fetchBillingData();
    if (activeTab === 'credits') fetchWalletActivity();
  };

  const handleBankReceipt = async (invoiceId: number, file: File) => {
    await billingService.uploadBankReceipt(invoiceId, file);
    toast.success(t('billingPage.successReceipt', 'Receipt uploaded successfully'));
    fetchBillingData();
    if (activeTab === 'credits') fetchWalletActivity();
  };

  const handleExportInvoicesCsv = async () => {
    if (!guardExport()) return;
    setExportingAction('invoice-register');
    try {
      await billingService.exportInvoiceRegister(currentExportFilters());
      toast.success(t('billingPage.successExport', 'Invoices exported to CSV'));
    } catch (err) {
      toast.error(toBillingError(err, t('billingPage.exportFailed', 'Export failed.'), t));
    } finally {
      setExportingAction(null);
    }
  };

  const handleExportSingleInvoiceCsv = async (inv: Invoice) => {
    try {
      let lines = inv.line_items;
      if ((!lines || lines.length === 0) && inv.raw_id) {
        if (drawerInvoice?.raw_id === inv.raw_id && drawerLines.length > 0) {
          lines = drawerLines;
        } else {
          const detail = await billingService.getInvoiceDetail(inv.raw_id);
          lines = detail.line_items || [];
        }
      }
      if (!lines?.length) {
        toast.error(t('billingPage.noLineItems', 'No line items to export for this invoice.'));
        return;
      }
      const escapeCsv = (val: unknown): string => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };
      const header = '"Type","Description","Qty","Rate","Amount","Load SID"\n';
      const rows = lines
        .map((l) =>
          [
            escapeCsv(l.type),
            escapeCsv(l.desc),
            escapeCsv(l.qty),
            escapeCsv(l.rate || (l.unit !== undefined ? formatCurrency(l.unit, inv.cur) : '')),
            escapeCsv(formatCurrency(l.amt, inv.cur)),
            escapeCsv(l.sid || '—'),
          ].join(',')
        )
        .join('\n');
      downloadFileBlob(`${inv.id}_line_items.csv`, header + rows);
      toast.success(t('billingPage.successExport', 'Invoice lines exported'));
    } catch (err) {
      toast.error(toBillingError(err, t('billingPage.exportFailed', 'Export failed.'), t));
    }
  };

  const handleExportAllLineItemsCsv = async () => {
    if (!guardExport()) return;
    setExportingAction('line-items');
    try {
      await billingService.exportLineItems(currentExportFilters());
      toast.success(t('billingPage.successExport', 'Line items exported'));
    } catch (err) {
      toast.error(toBillingError(err, t('billingPage.exportFailed', 'Export failed.'), t));
    } finally {
      setExportingAction(null);
    }
  };

  const handleRequestAdjustment = async (invoiceId: number, amount: number, reason: string) => {
    await billingService.requestAdjustment(invoiceId, amount, reason);
    toast.success(t('billingPage.successAdjustment', 'Adjustment request submitted'));
  };

  const statementExportParams = (month: string) => ({ month });

  const handleGenerateStatement = async (month: string, format: 'PDF' | 'CSV' | 'XLSX') => {
    if (!guardExport()) return;
    if (format === 'PDF') {
      setPdfStatementPeriod(month);
      setPdfIsStatement(true);
      setPdfInvoiceId(null);
      setPdfPreviewOpen(true);
      return;
    }
    setExportingAction('statement');
    try {
      await billingService.exportStatement(month, format, statementExportParams(month));
      toast.success(t('billingPage.successStatement', 'Statement generated'));
    } catch (err) {
      toast.error(toBillingError(err, t('billingPage.exportFailed', 'Export failed.'), t));
    } finally {
      setExportingAction(null);
    }
  };

  const handleOpenPdfPreview = (inv: Invoice) => {
    if (!inv.raw_id) return;
    setPdfInvoiceId(inv.raw_id);
    setPdfIsStatement(false);
    setPdfPreviewOpen(true);
  };

  const handleSelectInvoice = async (inv: Invoice) => {
    setDrawerInvoice(inv);
    setDrawerLines(inv.line_items || []);
    if (!inv.raw_id) return;

    setDetailLoading(true);
    try {
      const detail = await billingService.getInvoiceDetail(inv.raw_id);
      setDrawerInvoice(detail);
      setDrawerLines(detail.line_items || []);
    } catch {
      /* keep list payload */
    } finally {
      setDetailLoading(false);
    }
  };

  const walletBalance = summary?.wallet_balance ?? 0;

  return (
    <div className="billing-container">
      <header className="billing-head">
        <div className="billing-head-l">
          <div className="billing-head-title-row">
            <span className="billing-head-icon" aria-hidden="true">
              <Receipt size={18} />
            </span>
            <div>
              <h1 className="billing-title">{t('billingPage.pgTitle', 'Billing')}</h1>
              <p className="billing-subtitle">
                {t('billingPage.pgSub', 'Manage invoices, wallet credit, and payment activity')}
              </p>
            </div>
          </div>
        </div>

        <div className="billing-head-r">
          <Link to="/subscription" className="b-btn">
            <Crown size={14} />
            <span>{t('billingPage.manageSubscription', 'Manage Subscription')}</span>
          </Link>
          <button
            type="button"
            className="b-btn"
            onClick={handleExportInvoicesCsv}
            disabled={!canExport || exportingAction !== null}
          >
            <Download size={14} />
            <span>
              {exportingAction === 'invoice-register'
                ? t('billingPage.exporting', 'Exporting…')
                : t('billingPage.btnExport', 'Export')}
            </span>
          </button>
          <button
            type="button"
            className="b-btn b-btn-primary"
            onClick={() => setStatementDownloadOpen(true)}
            disabled={!canExport || exportingAction !== null}
          >
            <FileText size={14} />
            <span>{t('billingPage.btnStatement', 'Download Statement')}</span>
          </button>
        </div>
      </header>

      {upgradeRequired && (
        <div className="billing-alert billing-alert--warning" role="status">
          <AlertTriangle size={18} />
          <p>
            {t(
              'billingPage.upgradeRequired',
              'Your current subscription plan does not support this feature. To unlock it, please upgrade to a higher tier plan.'
            )}
          </p>
        </div>
      )}

      {summary?.has_past_due && (
        <div className="billing-alert billing-alert--danger" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('billingPage.paymentOverdue', 'Payment Overdue')}</strong>
            <p>
              {t(
                'billingPage.paymentOverdueBody',
                'You have a pending invoice that is past due. Immediate payment is required to avoid service interruption.'
              )}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="billing-alert billing-alert--danger" role="alert">
          <AlertTriangle size={18} />
          <p>{error}</p>
        </div>
      )}

      <UniverseBanner />

      <div className="billing-tab-bar">
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'saas' ? 'active' : ''}`}
          onClick={() => handleTabChange('saas')}
        >
          <Layers size={15} />
          <span>{t('billingPage.tabSaas', 'SaaS & Fees')}</span>
        </button>
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => handleTabChange('credits')}
        >
          <CreditCard size={15} />
          <span>{t('billingPage.tabCredits', 'Credits & Adjustments')}</span>
        </button>
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'statements' ? 'active' : ''}`}
          onClick={() => handleTabChange('statements')}
          disabled={summary?.has_account_statement === false}
        >
          <BarChart3 size={15} />
          <span>{t('billingPage.tabStatements', 'Statements & Exports')}</span>
        </button>
      </div>

      <div className="billing-tab-content">
        {activeTab === 'saas' && (
          <SaasFeesTab
            invoices={invoices}
            summary={summary}
            loading={loading}
            subFilter={subFilter}
            kpiFilter={kpiFilter}
            searchQuery={searchQuery}
            dateFrom={dateFrom}
            dateTo={dateTo}
            canDateFilter={summary?.has_filter_search !== false}
            page={page}
            lastPage={lastPage}
            total={total}
            payingId={payingId}
            onSetSubFilter={(f) => {
              setSubFilter(f);
              setKpiFilter(null);
              setPage(1);
            }}
            onToggleKpiFilter={handleToggleKpiFilter}
            onSearchChange={updateSearchQuery}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApplyDateFilter={handleApplyDateFilter}
            onClearFilters={handleClearFilters}
            onPageChange={setPage}
            onSelectInvoice={handleSelectInvoice}
            onPreviewPdf={handleOpenPdfPreview}
            onOfficialPrint={handleOfficialPrint}
            onExportInvoiceCsv={handleExportSingleInvoiceCsv}
            onPayNow={handlePayNow}
            onPayWallet={(inv) => inv.raw_id && handlePayWallet(inv.raw_id)}
            onBankTransfer={(inv) => {
              setPaymentInvoice(inv);
              setBankOpen(true);
            }}
          />
        )}

        {activeTab === 'credits' && (
          <CreditsTab
            creditNotes={creditNotes}
            walletBalance={walletBalance}
            loading={loading}
            tableLoading={walletLoading}
            page={walletPage}
            lastPage={walletLastPage}
            total={walletTotal}
            onPageChange={setWalletPage}
            onOpenApplyCredit={() => {
              const localUnpaid = invoices.filter((i) => i.rem > 0 && i.status !== 'Paid' && i.status !== 'Voided');
              setWalletInvoices(localUnpaid);
              setWalletInvoicesLoading(true);
              setApplyCreditOpen(true);
              billingService
                .getInvoices({ status: 'unpaid', per_page: 50 })
                .then((unpaid) => setWalletInvoices(unpaid.items))
                .catch(() => {
                  /* keep current unpaid list */
                })
                .finally(() => {
                  setWalletInvoicesLoading(false);
                });
            }}
            onOpenRequestAdj={() => {
              setWalletInvoices(invoices.filter((i) => i.rem > 0 && i.status !== 'Paid'));
              setRequestAdjOpen(true);
              billingService
                .getInvoices({ status: 'unpaid', per_page: 50 })
                .then((unpaid) => setWalletInvoices(unpaid.items))
                .catch(() => {
                  /* keep current unpaid list */
                });
            }}
          />
        )}

        {activeTab === 'statements' && (
          <StatementsTab
            summary={summary}
            loading={loading}
            onExportInvoiceRegister={handleExportInvoicesCsv}
            onExportLineItems={handleExportAllLineItemsCsv}
            onOpenStatementModal={() => setStatementDownloadOpen(true)}
            exportingAction={exportingAction}
            canExport={canExport}
          />
        )}
      </div>

      <InvoiceDetailDrawer
        isOpen={Boolean(drawerInvoice)}
        onClose={() => {
          setDrawerInvoice(null);
          setDetailLoading(false);
        }}
        invoice={drawerInvoice}
        lineItems={drawerLines}
        detailLoading={detailLoading}
        payingId={payingId}
        walletBalance={walletBalance}
        onPreviewPdf={handleOpenPdfPreview}
        onDownloadPdf={handleOpenPdfPreview}
        onOfficialPrint={handleOfficialPrint}
        onExportCsv={handleExportSingleInvoiceCsv}
        onPayNow={handlePayNow}
        onPayWallet={(inv) => inv.raw_id && handlePayWallet(inv.raw_id)}
        onOpenBankTransfer={(inv) => {
          setPaymentInvoice(inv);
          setBankOpen(true);
        }}
        onToast={toast.info}
      />

      <ApplyCreditModal
        isOpen={applyCreditOpen}
        onClose={() => setApplyCreditOpen(false)}
        invoices={walletInvoices}
        walletBalance={walletBalance}
        loading={walletInvoicesLoading}
        onApply={handlePayWallet}
      />

      <RequestAdjustmentModal
        isOpen={requestAdjOpen}
        onClose={() => setRequestAdjOpen(false)}
        invoices={
          walletInvoices.length
            ? walletInvoices
            : invoices.filter((i) => i.rem > 0 && i.status !== 'Paid')
        }
        currency={summary?.currency}
        onSubmit={handleRequestAdjustment}
      />

      <BankTransferModal
        isOpen={bankOpen}
        onClose={() => setBankOpen(false)}
        invoice={paymentInvoice}
        bank={summary?.bank}
        onSubmitReceipt={handleBankReceipt}
      />

      <StatementDownloadModal
        isOpen={statementDownloadOpen}
        onClose={() => setStatementDownloadOpen(false)}
        onGenerate={handleGenerateStatement}
        registeredAt={summary?.registered_at}
      />

      <PdfPreviewModal
        isOpen={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false);
          setPdfInvoiceId(null);
          setPdfIsStatement(false);
        }}
        invoiceId={pdfInvoiceId}
        isStatement={pdfIsStatement}
        statementPeriod={pdfStatementPeriod}
        statementFilters={{ month: pdfStatementPeriod }}
      />
    </div>
  );
};

export default BillingPage;

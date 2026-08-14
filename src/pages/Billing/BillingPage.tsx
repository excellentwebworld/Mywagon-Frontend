import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  FileText,
  Layers,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { downloadFileBlob, canSubmitBankReceipt } from './mockData';

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
  if (sub === 'Penalty') return { type: 'penalty' };
  return { status: 'all' };
}

function toBillingError(err: unknown, fallback: string, t: (key: string, defaultValue?: string) => string): string {
  if (err instanceof ApiError) {
    return getApiErrorMessage(err, fallback, t as (key: string, options?: Record<string, string | number>) => string);
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

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>('saas');
  const [subFilter, setSubFilter] = useState<SubFilterKey>('All');
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [payingId, setPayingId] = useState<number | null>(null);

  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);
  const [drawerLines, setDrawerLines] = useState<LineItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [walletInvoices, setWalletInvoices] = useState<Invoice[]>([]);
  const [applyCreditOpen, setApplyCreditOpen] = useState(false);
  const [requestAdjOpen, setRequestAdjOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [statementDownloadOpen, setStatementDownloadOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfInvoice, setPdfInvoice] = useState<Invoice | null>(null);
  const [pdfIsStatement, setPdfIsStatement] = useState(false);
  const [pdfStatementPeriod, setPdfStatementPeriod] = useState(new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = mapSubFilter(subFilter, kpiFilter);
      const [sumRes, invRes, cnRes] = await Promise.all([
        billingService.getSummary(),
        billingService.getInvoices({
          ...filters,
          q: debouncedSearch.trim() || undefined,
          page,
          per_page: 15,
        }),
        billingService.getCreditNotes(),
      ]);
      setSummary(sumRes);
      setUpgradeRequired(sumRes.has_account_statement === false);
      setInvoices(invRes.items);
      setTotal(invRes.total);
      setLastPage(invRes.last_page);
      setCreditNotes(cnRes);
      if (sumRes.has_past_due !== Boolean(user?.has_past_due)) {
        void refreshUser();
      }
    } catch (err) {
      setError(toBillingError(err, t('billingPage.loadError', 'Unable to load billing data.'), t));
    } finally {
      setLoading(false);
    }
  }, [subFilter, kpiFilter, debouncedSearch, page, t, user?.has_past_due, refreshUser]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

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
    setSearchQuery('');
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
    setSearchQuery('');
    setPage(1);
  };

  const invoiceKey = (inv: Invoice) => inv.raw_id ?? inv.id;

  const handlePayNow = async (inv: Invoice) => {
    if (!inv.raw_id || payingId) return;
    setPayingId(inv.raw_id);
    try {
      const order = await billingService.createVivaOrder(inv.raw_id);
      if (order.checkoutUrl) {
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
  };

  const handleBankReceipt = async (invoiceId: number, file: File) => {
    await billingService.uploadBankReceipt(invoiceId, file);
    toast.success(t('billingPage.successReceipt', 'Receipt uploaded successfully'));
    fetchBillingData();
  };

  const handleExportInvoicesCsv = () => {
    const header = 'Invoice #,Type,Status,Issue Date,Due Date,Total,Remaining,Loads\n';
    const rows = invoices
      .map((i) => `${i.id},${i.type},${i.status},${i.iDate},${i.dDate},${i.tot},${i.rem},${i.loads}`)
      .join('\n');
    downloadFileBlob(`billing_invoices_${new Date().toISOString().slice(0, 10)}.csv`, header + rows);
    toast.success(t('billingPage.successExport', 'Invoices exported to CSV'));
  };

  const handleExportSingleInvoiceCsv = (inv: Invoice) => {
    const lines = inv.line_items || drawerLines;
    const header = 'Type,Description,Qty,Rate,Amount,Load SID\n';
    const rows = lines
      .map((l) => `${l.type},"${l.desc}",${l.qty},${l.rate},${l.amt},${l.sid || ''}`)
      .join('\n');
    downloadFileBlob(`${inv.id}_line_items.csv`, header + rows);
    toast.success(t('billingPage.successExport', 'Invoice lines exported'));
  };

  const handleExportAllLineItemsCsv = async () => {
    try {
      await billingService.exportStatement(pdfStatementPeriod, 'CSV');
      toast.success(t('billingPage.successExport', 'Line items exported'));
    } catch (err) {
      toast.error(toBillingError(err, t('billingPage.exportFailed', 'Export failed.'), t));
    }
  };

  const handleGenerateStatement = async (month: string, format: 'PDF' | 'CSV' | 'XLSX') => {
    if (format === 'PDF') {
      setPdfStatementPeriod(month);
      setPdfIsStatement(true);
      setPdfInvoice(null);
      setPdfPreviewOpen(true);
      return;
    }
    try {
      await billingService.exportStatement(month, format);
      toast.success(t('billingPage.successStatement', 'Statement generated'));
    } catch (err) {
      toast.error(toBillingError(err, t('billingPage.exportFailed', 'Export failed.'), t));
    }
  };

  const handleOpenPdfPreview = (inv: Invoice) => {
    setPdfInvoice(inv);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 pt-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t('billingPage.pgTitle', 'Billing')}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {t('billingPage.pgSub', 'Manage invoices, wallet credit, and payment activity')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className="b-btn" onClick={handleExportInvoicesCsv}>
            <Download size={14} />
            <span>{t('billingPage.btnExport', 'Export')}</span>
          </button>
          <button type="button" className="b-btn" onClick={() => setStatementDownloadOpen(true)}>
            <FileText size={14} />
            <span>{t('billingPage.btnStatement', 'Download Statement')}</span>
          </button>
        </div>
      </div>

      {upgradeRequired && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          {t(
            'billingPage.upgradeRequired',
            'Your current subscription plan does not support this feature. To unlock it, please upgrade to a higher tier plan.'
          )}
        </div>
      )}

      {summary?.has_past_due && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-sm text-red-800">
          <strong>{t('billingPage.paymentOverdue', 'Payment Overdue')}</strong>
          <p>
            {t(
              'billingPage.paymentOverdueBody',
              'You have a pending invoice that is past due. Immediate payment is required to avoid service interruption.'
            )}
          </p>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
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
        >
          <BarChart3 size={15} />
          <span>{t('billingPage.tabStatements', 'Statements & Exports')}</span>
        </button>
      </div>

      <div className="mt-2">
        {activeTab === 'saas' && (
          <SaasFeesTab
            invoices={invoices}
            summary={summary}
            loading={loading}
            subFilter={subFilter}
            kpiFilter={kpiFilter}
            searchQuery={searchQuery}
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
            onSearchChange={setSearchQuery}
            onClearFilters={handleClearFilters}
            onPageChange={setPage}
            onSelectInvoice={handleSelectInvoice}
            onPreviewPdf={handleOpenPdfPreview}
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
            onOpenApplyCredit={() => {
              setWalletInvoices(invoices.filter((i) => i.rem > 0));
              setApplyCreditOpen(true);
              billingService
                .getInvoices({ status: 'unpaid', per_page: 50 })
                .then((unpaid) => setWalletInvoices(unpaid.items))
                .catch(() => {
                  /* keep current unpaid list */
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
        onPreviewPdf={handleOpenPdfPreview}
        onDownloadPdf={handleOpenPdfPreview}
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
        onApply={handlePayWallet}
      />

      <RequestAdjustmentModal
        isOpen={requestAdjOpen}
        onClose={() => setRequestAdjOpen(false)}
        invoices={
          walletInvoices.length
            ? walletInvoices
            : invoices.filter(canSubmitBankReceipt)
        }
        bank={summary?.bank}
        onSubmitReceipt={handleBankReceipt}
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
      />

      <PdfPreviewModal
        isOpen={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false);
          setPdfInvoice(null);
          setPdfIsStatement(false);
        }}
        invoice={pdfInvoice}
        lineItems={pdfInvoice ? pdfInvoice.line_items || drawerLines : []}
        isStatement={pdfIsStatement}
        statementPeriod={pdfStatementPeriod}
        invoicesList={invoices}
      />
    </div>
  );
};

export default BillingPage;

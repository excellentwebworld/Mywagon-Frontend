import { apiGet, apiPost, apiDownload, AUTH_TOKEN_KEY, ApiError } from '../client';
import type {
  Invoice,
  InvoicePrintPayload,
  CreditNote,
  BillingSummary,
  LineItem,
  StatementPayload,
} from '../types/billing';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export type ListInvoicesParams = {
  status?: string;
  type?: string;
  q?: string;
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
};

export type VivaOrderResponse = {
  orderCode: string;
  checkoutUrl: string;
  amount?: number;
  invoice_id?: number;
  use_wallet?: boolean;
  wallet_applied?: boolean;
  wallet_amount?: number;
};

export type StatementExportExtra = {
  status?: string;
  type?: string;
  q?: string;
  from?: string;
  to?: string;
  month?: string;
  format?: string;
};

export function monthToDateRange(month: string): { from: string; to: string } | null {
  const trimmed = month.trim();
  if (!trimmed) return null;

  const parsed = new Date(`${trimmed} 1`);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const monthIndex = parsed.getMonth();
  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 0);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { from: fmt(from), to: fmt(to) };
}

export const billingService = {
  async getSummary(): Promise<BillingSummary> {
    const res = await apiGet<BillingSummary>('/billing/summary');
    return res.data;
  },

  async getInvoices(params?: ListInvoicesParams): Promise<{
    items: Invoice[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  }> {
    const res = await apiGet<Invoice[]>('/billing/invoices', params);
    return {
      items: res.data ?? [],
      total: res.meta?.total ?? res.data?.length ?? 0,
      current_page: res.meta?.current_page ?? 1,
      last_page: res.meta?.last_page ?? 1,
      per_page: res.meta?.per_page ?? 15,
    };
  },

  async getInvoiceDetail(id: string | number): Promise<Invoice & { line_items?: LineItem[] }> {
    const res = await apiGet<Invoice & { line_items?: LineItem[] }>(`/billing/invoices/${id}`);
    return res.data;
  },

  async payWithWallet(invoiceId: string | number): Promise<void> {
    await apiPost(`/billing/invoices/${invoiceId}/pay-wallet`);
  },

  async uploadBankReceipt(invoiceId: string | number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('receipt', file);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/billing/invoices/${invoiceId}/bank-receipt`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.success === false) {
      throw new ApiError(json.message ?? 'Upload failed', response.status);
    }
  },

  async getCreditNotes(params?: { page?: number; per_page?: number }): Promise<{
    items: CreditNote[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  }> {
    const res = await apiGet<CreditNote[]>('/billing/credit-notes', params);
    const items = (res.data ?? []).filter((row) => row.id !== 'WALLET');
    return {
      items,
      total: res.meta?.total ?? items.length,
      current_page: res.meta?.current_page ?? 1,
      last_page: res.meta?.last_page ?? 1,
      per_page: res.meta?.per_page ?? 15,
    };
  },

  async requestAdjustment(invoiceId: string | number, amount: number, reason: string): Promise<void> {
    await apiPost('/billing/request-adjustment', {
      invoice_id: invoiceId,
      amount,
      reason,
    });
  },

  async createVivaOrder(invoiceId: string | number): Promise<VivaOrderResponse> {
    const res = await apiPost<VivaOrderResponse>('/billing/viva/create-order', {
      invoice_id: invoiceId,
    });
    return res.data;
  },

  async getInvoicePrint(id: string | number): Promise<InvoicePrintPayload> {
    const res = await apiGet<InvoicePrintPayload>(`/billing/invoices/${id}/print`);
    return res.data;
  },

  async getStatement(month: string, extra?: StatementExportExtra): Promise<StatementPayload> {
    const res = await apiGet<StatementPayload>('/billing/statements', { month, ...extra });
    return res.data;
  },

  async verifyVivaPayment(transactionId?: string, orderCode?: string): Promise<void> {
    await apiPost('/billing/viva/verify-payment', {
      transaction_id: transactionId,
      order_code: orderCode,
      t: transactionId,
      s: orderCode,
    });
  },

  async exportStatement(
    month: string,
    format: 'PDF' | 'CSV' | 'XLSX',
    extra?: StatementExportExtra,
  ): Promise<void> {
    const ext = format === 'XLSX' ? 'xlsx' : 'csv';
    await apiDownload(
      '/billing/statements/export',
      `billing_statement_${month.replace(/\s+/g, '_')}.${ext}`,
      {
        month,
        format: ext,
        ...extra,
      },
    );
  },

  async exportInvoiceRegister(extra?: StatementExportExtra): Promise<void> {
    const stamp = new Date().toISOString().slice(0, 10);
    await apiDownload('/billing/statements/export', `billing_invoices_${stamp}.csv`, {
      format: 'csv',
      ...extra,
    });
  },

  async exportLineItems(monthOrExtra?: string | StatementExportExtra, extra?: StatementExportExtra): Promise<void> {
    const stamp = new Date().toISOString().slice(0, 10);
    const params: StatementExportExtra =
      typeof monthOrExtra === 'string'
        ? { month: monthOrExtra, format: 'csv', ...extra }
        : { format: 'csv', ...monthOrExtra };

    await apiDownload('/billing/statements/export/lines', `billing_line_items_${stamp}.csv`, params);
  },
};

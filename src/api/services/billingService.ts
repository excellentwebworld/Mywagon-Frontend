import { apiGet, apiPost, apiDownload, AUTH_TOKEN_KEY, ApiError } from '../client';
import type { Invoice, CreditNote, BillingSummary, LineItem } from '../../pages/Billing/types';

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
};

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

  async applyCredit(invoiceId: string | number): Promise<void> {
    await apiPost('/billing/apply-credit', { invoice_id: invoiceId });
  },

  async requestAdjustment(invoiceId: string, amount: number, reason: string): Promise<void> {
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

  async verifyVivaPayment(transactionId?: string, orderCode?: string): Promise<void> {
    await apiPost('/billing/viva/verify-payment', {
      transaction_id: transactionId,
      order_code: orderCode,
      t: transactionId,
      s: orderCode,
    });
  },

  async exportStatement(month: string, format: 'PDF' | 'CSV' | 'XLSX'): Promise<void> {
    if (format === 'PDF') {
      return;
    }
    await apiDownload(
      '/billing/statements/export',
      `billing_statement_${month.replace(/\s+/g, '_')}.csv`,
      { month, format: 'csv' }
    );
  },
};

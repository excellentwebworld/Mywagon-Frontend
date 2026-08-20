import { ApiError } from '../client';
import type { ApiResponse } from '../types/addressBook';
import type {
  Invoice,
  InvoicePrintPayload,
  CreditNote,
  BillingSummary,
  LineItem,
  StatementPayload,
} from '../types/billing';
import type {
  BillingApi,
  ListInvoicesParams,
  StatementExportExtra,
  VivaOrderResponse,
} from './billingService';
import { createWebViewApi, type WebViewRole } from '../webviewClient';

const BASE = '/webview/billing';

function buildQuery(params: Record<string, string | number | boolean | undefined | string[]>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(`${key}[]`, v));
    } else if (typeof value === 'boolean') {
      search.set(key, value ? '1' : '0');
    } else {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function parseFilenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/"/g, ''));
  } catch {
    return match[1];
  }
}

export function createWebViewBillingService(role: WebViewRole, userId: string): BillingApi {
  const axiosInstance = createWebViewApi(role, userId);

  async function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    const res = await axiosInstance.get<ApiResponse<T>>(path, { params });
    if (res.data?.success === false) {
      throw new ApiError(res.data.message || 'Request failed', res.status, undefined, res.data.data);
    }
    return res.data;
  }

  async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
    const res = await axiosInstance.post<ApiResponse<T>>(path, { ...body, user_id: userId });
    if (res.data?.success === false) {
      throw new ApiError(res.data.message || 'Request failed', res.status, undefined, res.data.data);
    }
    return res.data;
  }

  async function download(
    path: string,
    fallbackFilename: string,
    query?: Record<string, string | number | boolean | undefined | string[]>,
  ): Promise<{ filename: string; truncated: boolean }> {
    const qs = query ? buildQuery(query) : '';
    try {
      const response = await axiosInstance.get(`${path}${qs}`, {
        responseType: 'blob',
        headers: {
          Accept:
            'application/octet-stream, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
        },
      });
      const blob = response.data as Blob;
      if (blob.type.includes('application/json') || blob.type.includes('text/json')) {
        const text = await blob.text();
        const parsed = JSON.parse(text) as { message?: string; success?: boolean };
        if (parsed.success === false || response.status >= 400) {
          throw new ApiError(parsed.message || 'Download failed', response.status);
        }
      }
      const filename = parseFilenameFromDisposition(
        response.headers['content-disposition'],
        fallbackFilename,
      );
      const truncated = response.headers['x-audit-export-truncated'] === 'true';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return { filename, truncated };
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Download failed', 500);
    }
  }

  return {
    async getSummary(): Promise<BillingSummary> {
      const res = await get<BillingSummary>(`${BASE}/summary`);
      return res.data;
    },

    async getInvoices(params?: ListInvoicesParams) {
      const res = await get<Invoice[]>(`${BASE}/invoices`, params);
      return {
        items: res.data ?? [],
        total: res.meta?.total ?? res.data?.length ?? 0,
        current_page: res.meta?.current_page ?? 1,
        last_page: res.meta?.last_page ?? 1,
        per_page: res.meta?.per_page ?? 15,
      };
    },

    async getInvoiceDetail(id: string | number) {
      const res = await get<Invoice & { line_items?: LineItem[] }>(`${BASE}/invoices/${id}`);
      return res.data;
    },

    async payWithWallet(invoiceId: string | number) {
      await post(`${BASE}/invoices/${invoiceId}/pay-wallet`);
    },

    async uploadBankReceipt(invoiceId: string | number, file: File) {
      const formData = new FormData();
      formData.append('receipt', file);
      const origin = axiosInstance.defaults.baseURL ?? '';
      const response = await fetch(
        `${origin}${BASE}/invoices/${invoiceId}/bank-receipt?user_id=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          body: formData,
        },
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) {
        throw new ApiError(json.message ?? 'Upload failed', response.status);
      }
    },

    async getCreditNotes(params?: { page?: number; per_page?: number }) {
      const res = await get<CreditNote[]>(`${BASE}/credit-notes`, params);
      const items = (res.data ?? []).filter((row) => row.id !== 'WALLET');
      return {
        items,
        total: res.meta?.total ?? items.length,
        current_page: res.meta?.current_page ?? 1,
        last_page: res.meta?.last_page ?? 1,
        per_page: res.meta?.per_page ?? 15,
      };
    },

    async requestAdjustment(invoiceId: string | number, amount: number, reason: string) {
      await post(`${BASE}/request-adjustment`, {
        invoice_id: invoiceId,
        amount,
        reason,
      });
    },

    async createVivaOrder(invoiceId: string | number): Promise<VivaOrderResponse> {
      const res = await post<VivaOrderResponse>(`${BASE}/viva/create-order`, {
        invoice_id: invoiceId,
      });
      return res.data;
    },

    async getInvoicePrint(id: string | number): Promise<InvoicePrintPayload> {
      const res = await get<InvoicePrintPayload>(`${BASE}/invoices/${id}/print`);
      return res.data;
    },

    async getStatement(month: string, extra?: StatementExportExtra): Promise<StatementPayload> {
      const res = await get<StatementPayload>(`${BASE}/statements`, { month, ...extra });
      return res.data;
    },

    async verifyVivaPayment(transactionId?: string, orderCode?: string) {
      await post(`${BASE}/viva/verify-payment`, {
        transaction_id: transactionId,
        order_code: orderCode,
        t: transactionId,
        s: orderCode,
      });
    },

    async exportStatement(month: string, format: 'PDF' | 'CSV' | 'XLSX', extra?: StatementExportExtra) {
      const ext = format === 'XLSX' ? 'xlsx' : 'csv';
      await download(
        `${BASE}/statements/export`,
        `billing_statement_${month.replace(/\s+/g, '_')}.${ext}`,
        { month, format: ext, ...extra },
      );
    },

    async exportInvoiceRegister(extra?: StatementExportExtra) {
      const stamp = new Date().toISOString().slice(0, 10);
      await download(`${BASE}/statements/export`, `billing_invoices_${stamp}.csv`, {
        format: 'csv',
        ...extra,
      });
    },

    async exportLineItems(monthOrExtra?: string | StatementExportExtra, extra?: StatementExportExtra) {
      const stamp = new Date().toISOString().slice(0, 10);
      const params: StatementExportExtra =
        typeof monthOrExtra === 'string'
          ? { month: monthOrExtra, format: 'csv', ...extra }
          : { format: 'csv', ...monthOrExtra };
      await download(`${BASE}/statements/export/lines`, `billing_line_items_${stamp}.csv`, params);
    },
  };
}

export type WebViewBillingService = ReturnType<typeof createWebViewBillingService>;

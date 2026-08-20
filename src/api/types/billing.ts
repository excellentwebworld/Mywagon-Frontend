export type InvoiceType = 'Commission' | 'Subscription' | 'Commission with penalty' | 'Penalty' | 'Add-on' | 'Adjustment' | 'Credit note' | string;

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Draft' | 'Voided';

export type Currency = 'EUR' | 'USD' | 'GBP' | string;

export interface Invoice {
  id: string;
  raw_id?: number;
  type: InvoiceType;
  sub: string;
  status: InvoiceStatus;
  iDate: string;
  dDate: string | null;
  pDate: string | null;
  subt: number;
  tax: number;
  tot: number;
  cred: number;
  rem: number;
  loads: number;
  tags: string[];
  cur: Currency;
  paid_using?: string | null;
  bank_transfer_admin_status?: string | null;
  can_pay_now?: boolean;
  can_pay_wallet?: boolean;
  can_bank_transfer?: boolean;
  under_process?: boolean;
  line_items?: LineItem[];
}

export interface LineItem {
  id?: string;
  type: InvoiceType;
  desc: string;
  qty: number;
  rate: string;
  unit?: number;
  vat?: number;
  amt: number;
  sid?: string;
  dates?: string;
  notes?: string;
}

export interface CreditNote {
  id: string;
  date: string;
  amt: number;
  reason: string;
  applied: string | null;
  rem: number;
  type?: string;
}

export interface AgingBucket {
  amount: number;
  count: number;
}

export interface BillingParty {
  company_name?: string | null;
  email?: string | null;
  vat_id?: string | null;
  address?: string | null;
  address_lines?: string[];
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface BillingIssuer {
  name: string;
  email: string;
  address: string;
  vat_id: string;
  iban: string;
  bic: string;
  account_holder: string;
}

export interface BillingSummary {
  total_outstanding: number;
  outstanding_count: number;
  overdue_count: number;
  overdue_amount: number;
  due_soon_count: number;
  due_soon_amount: number;
  total_invoices_count: number;
  paid_this_period_amount: number;
  paid_this_period_label: string;
  available_credits_amount: number;
  available_credits_count: number;
  wallet_balance: number;
  has_past_due: boolean;
  has_account_statement: boolean;
  has_filter_search: boolean;
  registered_at?: string | null;
  currency: string;
  bank: {
    iban: string;
    account_holder: string;
    bic: string;
  };
  issuer?: BillingIssuer;
  bill_to?: BillingParty;
  invoice_types?: string[];
  aging: {
    current: AgingBucket;
    d8_30: AgingBucket;
    d31_60: AgingBucket;
    d60: AgingBucket;
  };
}

export interface InvoicePrintPayload {
  invoice: Invoice;
  issuer: BillingIssuer;
  bill_to: BillingParty;
  currency: string;
}

export type TabKey = 'saas' | 'credits' | 'statements';
export type SubFilterKey = 'All' | 'Unpaid' | 'Overdue' | 'Paid' | 'Subscription' | 'Commission' | 'Commission with penalty' | 'Penalty' | 'Add-on';
export type KpiFilterKey = 'outstanding' | 'overdue' | 'dueSoon' | 'paid' | null;

export interface StatementPayload {
  period: string;
  from?: string | null;
  to?: string | null;
  opening_balance: number;
  closing_balance: number;
  wallet_balance: number;
  invoices: Invoice[];
  wallet_movements: CreditNote[];
  issuer?: BillingIssuer;
  bill_to?: BillingParty;
  currency: string;
}

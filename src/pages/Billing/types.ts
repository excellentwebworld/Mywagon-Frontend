export type InvoiceType = 'Commission' | 'Subscription' | 'Penalty' | 'Add-on' | 'Adjustment' | 'Credit note' | string;

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Draft' | 'Voided';

export type Currency = 'EUR' | 'USD' | 'GBP';

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

export interface ActivityItem {
  id: string;
  ts: string;
  act: string;
  user: string;
  refId?: string;
}

export interface AgingBucket {
  amount: number;
  count: number;
}

export interface BillingSummary {
  total_outstanding: number;
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
  currency: string;
  bank: {
    iban: string;
    account_holder: string;
    bic: string;
  };
  aging: {
    current: AgingBucket;
    d8_30: AgingBucket;
    d31_60: AgingBucket;
    d60: AgingBucket;
  };
}

export type TabKey = 'saas' | 'credits' | 'statements';
export type SubFilterKey = 'All' | 'Unpaid' | 'Overdue' | 'Paid' | 'Subscription' | 'Commission' | 'Penalty';
export type KpiFilterKey = 'outstanding' | 'overdue' | 'dueSoon' | 'paid' | null;

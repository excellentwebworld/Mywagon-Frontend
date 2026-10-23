import { apiGet } from '../client';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export type ReferralStatus = 'signedup' | 'qualified' | 'rewarded' | 'rejected';

export interface ReferralSummaryResponse {
  referral_code: string;
  stats: {
    signed_up_count: number;
    qualified_count: number;
    points_earned: number;
    points_pending: number;
    available_credit_balance: number;
    wallet_balance?: number;
  };
  program_rules: {
    points_per_referral: number;
    max_points_cap: number;
    required_shipments: number;
    how_it_works_url?: string;
  };
}


export interface ReferralActivityItem {
  id: number;
  display_name_masked: string;
  signup_at: string;
  qualified_at: string | null;
  status: ReferralStatus;
  reward_points: number;
  trips_completed: number;
  trips_required: number;
}

export interface ReferralActivityResponse {
  items: ReferralActivityItem[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}

export interface ListReferralActivityParams {
  status?: 'all' | 'signedup' | 'qualified' | 'rewarded';
  page?: number;
  per_page?: number;
}

export async function fetchReferralSummary(): Promise<ReferralSummaryResponse> {
  const res = await apiGet<ReferralSummaryResponse>('/referrals/summary');
  return res.data;
}


export async function fetchReferralActivity(
  params: ListReferralActivityParams = {}
): Promise<ReferralActivityResponse> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    q.set('status', params.status);
  }
  if (params.page) {
    q.set('page', String(params.page));
  }
  if (params.per_page) {
    q.set('per_page', String(params.per_page));
  }

  const qs = q.toString();
  const url = `/referrals/activity${qs ? `?${qs}` : ''}`;
  const res = await apiGet<ReferralActivityResponse>(url);
  return res.data;
}


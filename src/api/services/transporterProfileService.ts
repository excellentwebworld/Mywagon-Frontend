import { apiGet } from '../client';

export type TransporterType = 'carrier' | 'driver';

export interface TransporterProfileReview {
  id: number;
  rating: number;
  review: string | null;
  delivery_on_time: boolean | null;
  created_at: string | null;
  shipment_id: number | null;
  rater_name: string | null;
  rater_avatar_url: string | null;
}

export interface TransporterProfileData {
  profile: {
    id: number;
    type: TransporterType;
    name: string;
    avatar_url: string | null;
    vat_number: string | null;
    rating_average: number | null;
    rating_count: number;
    /** False for company drivers — KPIs shown only for freelancers and carriers. */
    show_performance_kpis?: boolean;
  };
  performance: {
    on_time_delivery_pct: number | null;
    cancellation_rate_pct: number | null;
    avg_pickup_delay_minutes: number | null;
  };
  rating_distribution: {
    one_pct: number;
    two_pct: number;
    three_pct: number;
    four_pct: number;
    five_pct: number;
  };
  reviews: TransporterProfileReview[];
}

export interface TransporterProfileMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export async function fetchTransporterProfile(
  type: TransporterType,
  id: number,
  page = 1
): Promise<{ data: TransporterProfileData; meta: TransporterProfileMeta }> {
  const res = await apiGet<TransporterProfileData>(`/transporters/${type}/${id}/profile`, {
    page,
  });
  return {
    data: res.data as TransporterProfileData,
    meta: (res.meta ?? {
      current_page: page,
      per_page: 20,
      total: res.data?.reviews?.length ?? 0,
      last_page: 1,
    }) as TransporterProfileMeta,
  };
}

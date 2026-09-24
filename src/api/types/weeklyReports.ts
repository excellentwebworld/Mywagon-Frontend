export interface WeeklyMetricItem {
  value: number;
  previous: number;
  delta: number;
  delta_percent: number;
}

export interface WeeklyReportMetrics {
  fulfilled: WeeklyMetricItem;
  partially_fulfilled: WeeklyMetricItem;
  created: WeeklyMetricItem;
  not_fulfilled: WeeklyMetricItem;
  pending: WeeklyMetricItem;
  canceled: WeeklyMetricItem;
  new_partners: WeeklyMetricItem;
  on_trip: WeeklyMetricItem;
  scheduled: WeeklyMetricItem;
  ready: WeeklyMetricItem;
}

export interface WeeklyReportSummary {
  total_fulfilled: number;
  total_created: number;
  total_in_progress: number;
}

export interface WeeklyReportItem {
  id: string | number;
  week_start: string; // YYYY-MM-DD
  week_end: string; // YYYY-MM-DD
  delivery_date: string; // YYYY-MM-DD
  period_label: string;
  email_subject: string;
  recipient_name: string;
  recipient_email: string;
  sent_at: string;
  is_sent: boolean;
  metrics: WeeklyReportMetrics;
  summary: WeeklyReportSummary;
}

export interface WeeklyReportsMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  overall_fulfilled?: number;
  overall_created?: number;
  overall_in_progress?: number;
  date_range_start?: string;
  date_range_end?: string;
}

export interface ListWeeklyReportsParams {
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  per_page?: number;
}

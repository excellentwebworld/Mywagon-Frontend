import { apiGet, apiDownload } from '../client';
import type {
  WeeklyReportItem,
  WeeklyReportsMeta,
  ListWeeklyReportsParams,
} from '../types/weeklyReports';

export interface WeeklyReportsListResponse {
  data: WeeklyReportItem[];
  meta?: WeeklyReportsMeta;
}

export const weeklyReportsService = {
  async list(params?: ListWeeklyReportsParams): Promise<WeeklyReportsListResponse> {
    const res = await apiGet<WeeklyReportItem[]>('/analytics/weekly-reports', {
      from: params?.from,
      to: params?.to,
      q: params?.q,
      page: params?.page,
      per_page: params?.per_page,
    });
    return {
      data: res.data ?? [],
      meta: res.meta as WeeklyReportsMeta | undefined,
    };
  },

  async get(weekStart: string): Promise<WeeklyReportItem | null> {
    const res = await apiGet<WeeklyReportItem>(`/analytics/weekly-reports/${weekStart}`);
    return res.data ?? null;
  },

  async exportReport(weekStart: string): Promise<{ filename: string }> {
    return apiDownload(
      `/analytics/weekly-reports/${weekStart}/export`,
      `myvagon-weekly-report-${weekStart}.csv`
    );
  },

  async exportAll(params?: { from?: string; to?: string }): Promise<{ filename: string }> {
    return apiDownload(
      '/analytics/weekly-reports/export/all',
      'myvagon-weekly-reports-register.csv',
      {
        from: params?.from,
        to: params?.to,
      }
    );
  },
};

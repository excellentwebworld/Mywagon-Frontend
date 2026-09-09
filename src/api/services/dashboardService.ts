import { apiGet } from '../client';
import type { ApiPerformanceSummary } from '../types/dashboard';

export const dashboardService = {
  async getPerformanceSummary(): Promise<ApiPerformanceSummary> {
    const res = await apiGet<ApiPerformanceSummary>('/dashboard/performance-summary');
    return (
      res.data ?? {
        total_cost: 0,
        total_loads: 0,
        on_time_pickup_pct: null,
        on_time_delivery_pct: null,
        avg_cost_per_km: null,
        avg_cost_per_load: null,
        pipeline_revenue: 0,
        revenue_delivered_on_mv: 0,
      }
    );
  },
};

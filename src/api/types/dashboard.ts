export type ApiPerformanceSummary = {
  total_cost: number;
  total_loads: number;
  on_time_pickup_pct: number | null;
  on_time_delivery_pct: number | null;
  avg_cost_per_km: number | null;
  avg_cost_per_load: number | null;
  pipeline_revenue: number;
  revenue_delivered_on_mv: number;
};

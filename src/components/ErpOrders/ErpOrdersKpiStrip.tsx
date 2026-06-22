import React from 'react';
import type { ErpOrderKpiFilter } from '../../pages/ErpOrders/types';

const KPI_CONFIG = [
  { key: 'unplanned' as const, labelKey: 'erpOrdersKpiUnplanned', color: '#6366F1' },
  { key: 'planned' as const, labelKey: 'erpOrdersKpiPlanned', color: '#3B82F6' },
  { key: 'on_trip' as const, labelKey: 'erpOrdersKpiOnTrip', color: '#F59E0B' },
  { key: 'completed' as const, labelKey: 'erpOrdersKpiCompleted', color: '#10B981' },
  { key: 'canceled' as const, labelKey: 'erpOrdersKpiCanceled', color: '#94A3B8' },
];

type Props = {
  t: (key: string) => string;
  kpiCounts: Record<string, number>;
  kpiFilter: ErpOrderKpiFilter;
  selectKpi: (kpi: ErpOrderKpiFilter) => void;
};

export const ErpOrdersKpiStrip: React.FC<Props> = ({ t, kpiCounts, kpiFilter, selectKpi }) => (
  <div className="kpi-strip">
    {KPI_CONFIG.map((x) => (
      <div
        key={x.key}
        className={`kpi-card${kpiFilter === x.key ? ' act' : ''}`}
        onClick={() => selectKpi(x.key)}
        onKeyDown={(e) => e.key === 'Enter' && selectKpi(x.key)}
        role="button"
        tabIndex={0}
      >
        <div className="kpi-val" style={{ color: x.color }}>
          {kpiCounts[x.key] ?? 0}
        </div>
        <div className="kpi-lbl">
          <span className="kpi-dot" style={{ background: x.color }} />
          {t(x.labelKey)}
        </div>
      </div>
    ))}
  </div>
);

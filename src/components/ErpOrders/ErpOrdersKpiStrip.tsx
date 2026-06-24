import React from 'react';
import type { ErpOrderKpiFilter } from '../../pages/ErpOrders/types';

type KpiKey = ErpOrderKpiFilter | 'total';

type KpiConfig = {
  key: KpiKey;
  filter: ErpOrderKpiFilter;
  labelKey: string;
  color?: string;
};

const KPI_CONFIG: KpiConfig[] = [
  { key: 'total', filter: '', labelKey: 'erpOrdersKpiTotal' },
  { key: 'unplanned', filter: 'unplanned', labelKey: 'erpOrdersKpiUnplanned', color: '#4338CA' },
  { key: 'planned', filter: 'planned', labelKey: 'erpOrdersKpiPlanned', color: '#1D4ED8' },
  { key: 'on_trip', filter: 'on_trip', labelKey: 'erpOrdersKpiOnTrip', color: '#B45309' },
  { key: 'completed', filter: 'completed', labelKey: 'erpOrdersKpiCompleted', color: '#047857' },
  { key: 'canceled', filter: 'canceled', labelKey: 'erpOrdersKpiCanceled', color: '#B91C1C' },
];

type Props = {
  t: (key: string) => string;
  kpiCounts: Record<string, number>;
  kpiFilter: ErpOrderKpiFilter;
  selectKpi: (kpi: ErpOrderKpiFilter) => void;
};

export const ErpOrdersKpiStrip: React.FC<Props> = ({ t, kpiCounts, kpiFilter, selectKpi }) => (
  <div className="erp-kpi-strip anim">
    {KPI_CONFIG.map(({ key, filter, labelKey, color }) => {
      const val = kpiCounts[key] ?? 0;
      const isActive = kpiFilter === filter;
      const showColor = !!color && val > 0;

      return (
        <div
          key={key}
          className={`erp-kpi${isActive ? ' active' : ''}`}
          onClick={() => selectKpi(filter)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && selectKpi(filter)}
        >
          {showColor && <span className="erp-kpi-dot" style={{ background: color }} />}
          <div className="erp-kpi-val" style={{ color: showColor ? color : undefined }}>
            {val}
          </div>
          <div className="erp-kpi-lbl">{t(labelKey)}</div>
        </div>
      );
    })}
  </div>
);

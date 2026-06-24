import React from 'react';
import type { ErpOrderKpiFilter } from '../../pages/ErpOrders/types';

const KPI_CONFIG = [
  { key: 'unplanned' as const, labelKey: 'erpOrdersKpiUnplanned', color: '#4338CA' },
  { key: 'planned' as const, labelKey: 'erpOrdersKpiPlanned', color: '#1D4ED8' },
  { key: 'on_trip' as const, labelKey: 'erpOrdersKpiOnTrip', color: '#B45309' },
  { key: 'completed' as const, labelKey: 'erpOrdersKpiCompleted', color: '#047857' },
  { key: 'canceled' as const, labelKey: 'erpOrdersKpiCanceled', color: '#B91C1C' },
];

type Props = {
  t: (key: string) => string;
  kpiCounts: Record<string, number>;
  kpiFilter: ErpOrderKpiFilter;
  selectKpi: (kpi: ErpOrderKpiFilter) => void;
};

export const ErpOrdersKpiStrip: React.FC<Props> = ({ t, kpiCounts, kpiFilter, selectKpi }) => (
  <div className="kpi-strip kpi-strip-grid anim">
    {KPI_CONFIG.map((tile, index) => {
      const isActive = kpiFilter === tile.key;
      const count = kpiCounts[tile.key] ?? 0;
      return (
        <button
          key={tile.key}
          type="button"
          className={`kpi-card kpi-card-btn${isActive ? ' act' : ''}`}
          onClick={() => selectKpi(tile.key)}
          style={{
            borderRadius:
              index === 0
                ? '8px 0 0 8px'
                : index === KPI_CONFIG.length - 1
                  ? '0 8px 8px 0'
                  : 0,
          }}
        >
          <div className="kpi-lbl">
            <span className="kpi-dot" style={{ background: tile.color }} />
            <span className="kpi-lbl-text">{t(tile.labelKey)}</span>
          </div>
          <div className="kpi-val" style={{ color: isActive ? 'var(--accent, #6C3AED)' : 'var(--text-primary, #121217)' }}>
            {count}
          </div>
        </button>
      );
    })}
  </div>
);

import React from 'react';
import type { KpiFilter } from '../../pages/SearchTrucks/types';

interface KpiStripProps {
  counts: Record<'all' | 'private' | 'today' | 'soon' | 'price', number>;
  activeKpi: KpiFilter;
  onKpiClick: (key: KpiFilter) => void;
  t: (key: string) => string;
}

const KPI_CONFIG: { key: Exclude<KpiFilter, null>; labelKey: string; color: string }[] = [
  { key: 'all', labelKey: 'satKpiMatches', color: 'c-ac' },
  { key: 'private', labelKey: 'satKpiPrivate', color: 'c-ac' },
  { key: 'today', labelKey: 'satKpiToday', color: 'c-in' },
  { key: 'soon', labelKey: 'satKpiSoon', color: 'c-wr' },
  { key: 'price', labelKey: 'satKpiPrice', color: 'c-ok' },
];

export const KpiStrip: React.FC<KpiStripProps> = ({ counts, activeKpi, onKpiClick, t }) => (
  <div className="sat-kpi-s">
    {KPI_CONFIG.map((kpi) => (
      <div
        key={kpi.key}
        className={`sat-kpi ${kpi.color} ${activeKpi === kpi.key ? 'act' : ''}`}
        onClick={() => onKpiClick(kpi.key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onKpiClick(kpi.key)}
      >
        <div className="sat-kpi-v">{counts[kpi.key] ?? 0}</div>
        <div className="sat-kpi-l">{t(kpi.labelKey)}</div>
      </div>
    ))}
  </div>
);

import React from 'react';
import type { ShipmentKpiKey } from '../../api/types/shipments';

interface KpiStripProps {
  counts: Record<ShipmentKpiKey, number>;
  activeKpi: ShipmentKpiKey | null;
  onKpiClick: (key: ShipmentKpiKey | null) => void;
  t: (key: string) => string;
}

const KPI_DOT: Record<string, string> = {
  needs_action: '#F2C744',
  awaiting_response: '#56D19E',
  upcoming: '#A7DBF8',
  at_risk: '#D63AAF',
  pickup_today: '#A7DBF8',
  awaiting_pod: '#8B8A8F',
};

const KPI_CONFIG: { key: ShipmentKpiKey; labelKey: string }[] = [
  { key: 'needs_action', labelKey: 'needsActionLabel' },
  { key: 'awaiting_response', labelKey: 'awaitingResponse' },
  { key: 'upcoming', labelKey: 'upcoming' },
  { key: 'at_risk', labelKey: 'atRiskLate' },
  { key: 'pickup_today', labelKey: 'pickupToday' },
  { key: 'awaiting_pod', labelKey: 'awaitingPod' },
];

export const KpiStrip: React.FC<KpiStripProps> = ({ counts, activeKpi, onKpiClick, t }) => (
  <div className="mgmt-kpi-s a d1">
    {KPI_CONFIG.map((kpi) => (
      <div
        key={kpi.key}
        className={`mgmt-kpi ${activeKpi === kpi.key ? 'act' : ''}`}
        onClick={() => onKpiClick(activeKpi === kpi.key ? null : kpi.key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onKpiClick(activeKpi === kpi.key ? null : kpi.key)}
      >
        <div className="mgmt-kpi-v">{counts[kpi.key] ?? 0}</div>
        <div className="mgmt-kpi-l" title={t(kpi.labelKey)}>
          <span
            className="mgmt-kpi-dot"
            style={{ background: KPI_DOT[kpi.key] || 'var(--app-border-strong)' }}
            aria-hidden
          />
          {t(kpi.labelKey)}
        </div>
      </div>
    ))}
  </div>
);

import React from 'react';
import type { ShipmentKpiKey } from '../../api/types/shipments';

interface KpiStripProps {
  counts: Record<ShipmentKpiKey, number>;
  activeKpi: ShipmentKpiKey | null;
  onKpiClick: (key: ShipmentKpiKey | null) => void;
  t: (key: string) => string;
}

const KPI_CONFIG: { key: ShipmentKpiKey; labelKey: string; color: string }[] = [
  { key: 'needs_action', labelKey: 'needsActionLabel', color: 'c-warn' },
  { key: 'awaiting_response', labelKey: 'awaitingResponse', color: 'c-acc' },
  { key: 'at_risk', labelKey: 'atRiskLate', color: 'c-err' },
  { key: 'pickup_today', labelKey: 'pickupToday', color: 'c-info' },
  { key: 'awaiting_pod', labelKey: 'awaitingPod', color: '' },
];

export const KpiStrip: React.FC<KpiStripProps> = ({ counts, activeKpi, onKpiClick, t }) => (
  <div className="mgmt-kpi-s a d1">
    {KPI_CONFIG.map((kpi) => (
      <div
        key={kpi.key}
        className={`mgmt-kpi ${kpi.color} ${activeKpi === kpi.key ? 'act' : ''}`}
        onClick={() => onKpiClick(activeKpi === kpi.key ? null : kpi.key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onKpiClick(activeKpi === kpi.key ? null : kpi.key)}
      >
        <div className="mgmt-kpi-v">{counts[kpi.key] ?? 0}</div>
        <div className="mgmt-kpi-l">{t(kpi.labelKey)}</div>
      </div>
    ))}
  </div>
);

import React from 'react';
import type { KpiKey } from '../../pages/ManageShipments/utils/listingUtils';

interface KpiStripProps {
  counts: Record<KpiKey, number>;
  activeKpi: KpiKey | null;
  onKpiClick: (key: KpiKey | null) => void;
  t: (key: string) => string;
}

const KPI_CONFIG: { key: KpiKey; labelKey: string; color: string }[] = [
  { key: 'action', labelKey: 'needsActionLabel', color: 'c-warn' },
  { key: 'bids', labelKey: 'pendingHasBids', color: 'c-acc' },
  { key: 'uncov', labelKey: 'uncoveredLabel', color: 'c-err' },
  { key: 'expiring', labelKey: 'expiringBids', color: 'c-warn' },
  { key: 'risk', labelKey: 'atRiskLate', color: 'c-err' },
  { key: 'pickup24', labelKey: 'pickup24h', color: 'c-info' },
  { key: 'pod', labelKey: 'awaitingPod', color: '' },
  { key: 'invoice', labelKey: 'invoiceIssues', color: '' },
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
        <div className="mgmt-kpi-v">{counts[kpi.key]}</div>
        <div className="mgmt-kpi-l">{t(kpi.labelKey)}</div>
      </div>
    ))}
  </div>
);

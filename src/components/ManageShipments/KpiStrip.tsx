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
  { key: 'awaiting_response', labelKey: 'awaitingResponse', color: 'c-mint' },
  { key: 'at_risk', labelKey: 'atRiskLate', color: 'c-err' },
  { key: 'pickup_today', labelKey: 'pickupToday', color: 'c-info' },
  { key: 'awaiting_pod', labelKey: 'awaitingPod', color: '' },
];

export const KpiStrip: React.FC<KpiStripProps> = ({ counts, activeKpi, onKpiClick, t }) => (
  <div className="mgmt-kpi-s mgmt-kpi-s--inline a d1">
    {KPI_CONFIG.map((kpi) => (
      <div
        key={kpi.key}
        className={`mgmt-kpi mgmt-kpi--compact ${kpi.color} ${activeKpi === kpi.key ? 'act' : ''}`}
        onClick={() => onKpiClick(activeKpi === kpi.key ? null : kpi.key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onKpiClick(activeKpi === kpi.key ? null : kpi.key)}
      >
        <div className="mgmt-kpi-v">{counts[kpi.key] ?? 0}</div>
        <div className="mgmt-kpi-l">
          {kpi.key === 'at_risk' ? (
            <span className="mgmt-kpi-at-risk-label">
              <span className="mgmt-kpi-at-risk-warn" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3L22 21H2L12 3z" />
                </svg>
              </span>
              {t(kpi.labelKey)}
            </span>
          ) : (
            t(kpi.labelKey)
          )}
        </div>
      </div>
    ))}
  </div>
);

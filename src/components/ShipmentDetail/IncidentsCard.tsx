import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import type { IncidentItem } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface IncidentsCardProps {
  incidents: IncidentItem[];
  expanded: boolean;
  onToggle: () => void;
  onReportIncident?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const IncidentsCard: React.FC<IncidentsCardProps> = ({
  incidents,
  expanded,
  onToggle,
  onReportIncident,
  t,
}) => {
  const getSeverityColor = (sev: IncidentItem['severity']) => {
    switch (sev) {
      case 'high':
        return '#EF4444';
      case 'med':
        return '#F97316';
      default:
        return '#3B82F6';
    }
  };

  return (
    <CollapsibleCard
      id="incidents"
      icon={<AlertTriangle size={15} />}
      title={t('incidentsExceptions', 'Incidents & exceptions')}
      count={incidents.length > 0 ? incidents.length : undefined}
      expanded={expanded}
      onToggle={onToggle}
      headerExtra={
        onReportIncident && (
          <button
            type="button"
            onClick={onReportIncident}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#9B51E0] hover:underline cursor-pointer"
            style={{ background: 'none', border: 'none' }}
          >
            <Plus size={12} />
            <span>{t('reportIncident', 'Report')}</span>
          </button>
        )
      }
    >
      <div>
        {incidents.length === 0 ? (
          <p className="text-[12px]" style={{ color: '#8E8E9A' }}>
            {t('noIncidentsReported', 'No incidents or active exceptions on this trip.')}
          </p>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc, idx) => (
              <div
                key={inc.id}
                className="flex items-start gap-2.5 py-2"
                style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
              >
                <span
                  className="rounded-full flex-shrink-0 mt-1.5"
                  style={{
                    width: 8,
                    height: 8,
                    background: getSeverityColor(inc.severity),
                  }}
                  aria-hidden="true"
                />
                <div className="text-[12px] flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: '#18181B' }}>
                    {inc.title}
                  </div>
                  <div className="mt-0.5" style={{ color: '#8E8E9A' }}>
                    {inc.meta} · {t('severity', 'Severity')}: {inc.severity} ·{' '}
                    <span
                      className="font-semibold"
                      style={{ color: inc.resolved ? '#059669' : '#EF4444' }}
                    >
                      {inc.resolved ? t('resolved', 'Resolved') : t('open', 'Open')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};

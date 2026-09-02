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
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {t('noIncidentsReported', 'No incidents or active exceptions on this trip.')}
          </p>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc, idx) => (
              <div
                key={inc.id}
                className={`flex items-start gap-2.5 py-2 ${idx > 0 ? 'border-t border-slate-200 dark:border-slate-800' : ''}`}
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
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {inc.title}
                  </div>
                  <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                    {inc.meta} · {t('severity', 'Severity')}: {inc.severity} ·{' '}
                    <span
                      className={`font-semibold ${inc.resolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
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

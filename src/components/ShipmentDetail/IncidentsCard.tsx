import React from 'react';
import type { IncidentItem } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface IncidentsCardProps {
  incidents: IncidentItem[];
  expanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

export const IncidentsCard: React.FC<IncidentsCardProps> = ({ incidents, expanded, onToggle, t }) => (
  <CollapsibleCard id="incidents" title={<>⚠️ {t('incidentsExceptions')}</>} expanded={expanded} onToggle={onToggle}>
    {incidents.map((inc) => (
      <div key={inc.id} className="ld-inc-item" style={{ marginBottom: 10 }}>
        <div className={`ld-inc-dot ${inc.severity}`} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{inc.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {inc.meta}
            {inc.resolved && (
              <span style={{ color: 'var(--success)', fontWeight: 600, marginLeft: 6 }}>
                {t('resolved')}
              </span>
            )}
          </div>
        </div>
      </div>
    ))}
  </CollapsibleCard>
);

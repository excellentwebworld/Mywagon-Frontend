import React from 'react';

const TABS = [
  { id: 'stops', labelKey: 'stopsAppointments' },
  { id: 'load', labelKey: 'loadSummary' },
  { id: 'tracking', labelKey: 'liveTracking' },
  { id: 'carrier', labelKey: 'carrierDriver' },
  { id: 'docs', labelKey: 'documentsAttachments' },
  { id: 'billing', labelKey: 'billing' },
  { id: 'audit', labelKey: 'auditLog' },
] as const;

interface JumpNavProps {
  active: string;
  onJump: (id: string) => void;
  t: (key: string) => string;
}

export const JumpNav: React.FC<JumpNavProps> = ({ active, onJump, t }) => (
  <div className="ld-jnav">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        className={`ld-jn ${active === tab.id ? 'act' : ''}`}
        onClick={() => onJump(tab.id)}
      >
        {t(tab.labelKey)}
      </button>
    ))}
  </div>
);

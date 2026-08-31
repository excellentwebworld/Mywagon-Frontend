import React from 'react';

export interface JumpNavTab {
  id: string;
  labelKey: string;
  fallback: string;
}

const DEFAULT_TABS: JumpNavTab[] = [
  { id: 'stops', labelKey: 'stopsAppointments', fallback: 'Stops' },
  { id: 'load', labelKey: 'loadSummary', fallback: 'Load details' },
  { id: 'bids', labelKey: 'bids', fallback: 'Bids' },
  { id: 'tracking', labelKey: 'liveTracking', fallback: 'Tracking' },
  { id: 'carrier', labelKey: 'carrierDriver', fallback: 'Carrier' },
  { id: 'docs', labelKey: 'documentsAttachments', fallback: 'Documents' },
  { id: 'billing', labelKey: 'billing', fallback: 'Billing' },
  { id: 'audit', labelKey: 'auditLog', fallback: 'Audit log' },
];

interface JumpNavProps {
  active: string;
  availableSectionIds?: string[];
  onJump: (id: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const JumpNav: React.FC<JumpNavProps> = ({
  active,
  availableSectionIds,
  onJump,
  t,
}) => {
  const visibleTabs = availableSectionIds?.length
    ? DEFAULT_TABS.filter((tab) => availableSectionIds.includes(tab.id))
    : DEFAULT_TABS;

  return (
    <div
      className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5"
      role="navigation"
      aria-label="Page sections"
    >
      {visibleTabs.map((tab) => {
        const isAct = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150 cursor-pointer"
            style={{
              background: isAct ? '#18181B' : '#FFFFFF',
              border: '1px solid #E4E4E8',
              color: isAct ? '#FFFFFF' : '#5E5E6E',
            }}
            onClick={() => onJump(tab.id)}
          >
            {t(tab.labelKey, tab.fallback)}
          </button>
        );
      })}
    </div>
  );
};

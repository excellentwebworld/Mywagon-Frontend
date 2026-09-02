import React from 'react';

export interface JumpNavTab {
  id: string;
  labelKey: string;
  fallback: string;
}

const DEFAULT_TABS: JumpNavTab[] = [
  { id: 'bids', labelKey: 'bids', fallback: 'Bids' },
  { id: 'invited', labelKey: 'invitedPartners', fallback: 'Invited' },
  { id: 'stops', labelKey: 'stopsAppointments', fallback: 'Stops & Appointments' },
  { id: 'load', labelKey: 'loadSummary', fallback: 'Load Summary' },
  { id: 'tracking', labelKey: 'liveTracking', fallback: 'Tracking' },
  { id: 'carrier', labelKey: 'carrierDriver', fallback: 'Transporter' },
  { id: 'docs', labelKey: 'documentsAttachments', fallback: 'Documents & Attachments' },
  { id: 'audit', labelKey: 'auditLog', fallback: 'Audit Log' },
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
      className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 select-none scrollbar-thin scrollbar-thumb-gray-200"
      role="navigation"
      aria-label="Page sections"
    >
      {visibleTabs.map((tab) => {
        const isAct = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 active:scale-95 ${
              isAct
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm border border-slate-900 dark:border-white font-bold'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => onJump(tab.id)}
          >
            {t(tab.labelKey, tab.fallback)}
          </button>
        );
      })}
    </div>
  );
};

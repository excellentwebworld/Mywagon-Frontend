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
  { id: 'billing', labelKey: 'billing', fallback: 'Billing' },
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
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50 active:scale-95 ${
              isAct
                ? 'bg-[#18181B] text-white shadow-sm border border-[#18181B]'
                : 'bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8]'
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

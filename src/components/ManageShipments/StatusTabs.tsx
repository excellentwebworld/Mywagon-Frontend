import React from 'react';
import { countForStatusTab, type StatusTabKey } from '../../pages/ManageShipments/utils/listingUtils';

interface StatusTabsProps {
  statusCounts: Record<string, number>;
  activeTab: StatusTabKey;
  onTabChange: (tab: StatusTabKey) => void;
  t: (key: string) => string;
}

const TABS: { key: StatusTabKey; labelKey: string; warnCount?: boolean }[] = [
  { key: 'active', labelKey: 'tabActive', warnCount: true },
  { key: 'pending', labelKey: 'tabPending' },
  { key: 'scheduled', labelKey: 'tabScheduled' },
  { key: 'upcoming', labelKey: 'tabUpcoming' },
  { key: 'past_due', labelKey: 'tabPastDue' },
  { key: 'in_progress', labelKey: 'tabInProgress' },
  { key: 'drafts', labelKey: 'tabDrafts' },
  { key: 'completed', labelKey: 'tabCompleted' },
  { key: 'partially_paid', labelKey: 'tabPartiallyPaid' },
  { key: 'cancelled', labelKey: 'tabCancelled' },
];

export const StatusTabs: React.FC<StatusTabsProps> = ({ statusCounts, activeTab, onTabChange, t }) => (
  <div className="stabs">
    {TABS.map((tab) => {
      const count = countForStatusTab(statusCounts, tab.key);
      return (
        <div
          key={tab.key}
          className={`stab ${activeTab === tab.key ? 'act' : ''}`}
          onClick={() => onTabChange(tab.key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onTabChange(tab.key)}
        >
          {t(tab.labelKey)}
          <span className={`cnt ${tab.warnCount && activeTab === tab.key ? 'cw' : ''}`}>{count}</span>
        </div>
      );
    })}
  </div>
);

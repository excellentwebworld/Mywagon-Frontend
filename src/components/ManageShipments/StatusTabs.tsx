import React from 'react';
import { countForStatusTab, type StatusTabKey } from '../../pages/ManageShipments/utils/listingUtils';

interface StatusTabsProps {
  statusCounts: Record<string, number>;
  activeTab: StatusTabKey;
  kpiActive?: boolean;
  onTabChange: (tab: StatusTabKey) => void;
  t: (key: string) => string;
}

/** Matches classic Shipper Panel status bar order and labels. */
const TABS: { key: StatusTabKey; labelKey: string; warnCount?: boolean }[] = [
  { key: 'active', labelKey: 'tabActive', warnCount: true },
  { key: 'pending', labelKey: 'tabPending' },
  { key: 'scheduled', labelKey: 'tabScheduled' },
  { key: 'ready', labelKey: 'tabReady' },
  { key: 'past_due', labelKey: 'tabPastDue' },
  { key: 'on_trip', labelKey: 'tabOnTrip' },
  { key: 'drafts', labelKey: 'tabDraft' },
  { key: 'fullfilled', labelKey: 'tabFulfilled' },
  { key: 'partially_fullfilled', labelKey: 'tabPartiallyFulfilled' },
  { key: 'unfulfilled', labelKey: 'tabUnfulfilled' },
  { key: 'cancelled', labelKey: 'tabCanceled' },
];

export const StatusTabs: React.FC<StatusTabsProps> = ({
  statusCounts,
  activeTab,
  kpiActive = false,
  onTabChange,
  t,
}) => (
  <div className={`stabs${kpiActive ? ' stabs-kpi-active' : ''}`}>
    {TABS.map((tab) => {
      const count = countForStatusTab(statusCounts, tab.key);
      return (
        <div
          key={tab.key}
          className={`stab ${!kpiActive && activeTab === tab.key ? 'act' : ''}`}
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

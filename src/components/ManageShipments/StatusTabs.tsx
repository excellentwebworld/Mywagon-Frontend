import React from 'react';
import {
  countForStatusTab,
  STATUS_TAB_PRIORITY,
  type StatusTabKey,
} from '../../pages/ManageShipments/utils/listingUtils';

interface StatusTabsProps {
  statusCounts: Record<string, number>;
  activeTab: StatusTabKey;
  onTabChange: (tab: StatusTabKey) => void;
  t: (key: string) => string;
}

const TAB_LABEL_KEYS: Record<StatusTabKey, string> = {
  active: 'tabActive',
  pending: 'tabPending',
  scheduled: 'tabScheduled',
  ready: 'tabReady',
  past_due: 'tabPastDue',
  on_trip: 'tabOnTrip',
  drafts: 'tabDraft',
  fullfilled: 'tabFulfilled',
  partially_fullfilled: 'tabPartiallyFulfilled',
  unfulfilled: 'tabUnfulfilled',
  cancelled: 'tabCanceled',
};

/** Matches classic Shipper Panel status bar order and labels. */
const TABS: { key: StatusTabKey; labelKey: string; warnCount?: boolean }[] =
  STATUS_TAB_PRIORITY.map((key) => ({
    key,
    labelKey: TAB_LABEL_KEYS[key],
    ...(key === 'active' ? { warnCount: true } : {}),
  }));

export const StatusTabs: React.FC<StatusTabsProps> = ({
  statusCounts,
  activeTab,
  onTabChange,
  t,
}) => (
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

import React from 'react';
import type { Shipment } from '../../context/AppContext';
import { countByStatusTab, type StatusTabKey } from '../../pages/ManageShipments/utils/listingUtils';

interface StatusTabsProps {
  shipments: Shipment[];
  activeTab: StatusTabKey;
  onTabChange: (tab: StatusTabKey) => void;
  t: (key: string) => string;
}

const TABS: { key: StatusTabKey; labelKey: string; warnCount?: boolean }[] = [
  { key: 'active', labelKey: 'tabActive', warnCount: true },
  { key: 'pending', labelKey: 'tabPending' },
  { key: 'scheduled', labelKey: 'tabScheduled' },
  { key: 'upcoming', labelKey: 'tabUpcoming' },
  { key: 'in_progress', labelKey: 'tabInProgress' },
  { key: 'drafts', labelKey: 'tabDrafts' },
  { key: 'completed', labelKey: 'tabCompleted' },
  { key: 'partially_paid', labelKey: 'tabPartiallyPaid' },
  { key: 'cancelled', labelKey: 'tabCancelled' },
];

export const StatusTabs: React.FC<StatusTabsProps> = ({ shipments, activeTab, onTabChange, t }) => (
  <div className="stabs">
    {TABS.map((tab) => {
      const count = countByStatusTab(shipments, tab.key);
      return (
        <div
          key={tab.key}
          className={`stab ${activeTab === tab.key ? 'act' : ''}`}
          onClick={() => onTabChange(tab.key)}
          role="button"
          tabIndex={0}
        >
          {t(tab.labelKey)}
          <span className={`cnt ${tab.warnCount && activeTab === tab.key ? 'cw' : ''}`}>{count}</span>
        </div>
      );
    })}
  </div>
);

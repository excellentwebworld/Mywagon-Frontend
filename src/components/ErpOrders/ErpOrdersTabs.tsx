import React from 'react';
import type { ErpOrderTab } from '../../pages/ErpOrders/types';

type TabConfig = {
  key: ErpOrderTab;
  labelKey: string;
  count: number;
};

type Props = {
  t: (key: string) => string;
  tabs: TabConfig[];
  activeTab: ErpOrderTab;
  setActiveTab: (tab: ErpOrderTab) => void;
};

export const ErpOrdersTabs: React.FC<Props> = ({ t, tabs, activeTab, setActiveTab }) => (
  <div className="tabs-row anim tabs-row-ref">
    {tabs.map((tab) => {
      const isActive = activeTab === tab.key;
      return (
        <button
          key={tab.key}
          type="button"
          className={`tab-i tab-btn${isActive ? ' act' : ''}`}
          onClick={() => setActiveTab(tab.key)}
          aria-selected={isActive}
        >
          <span>{t(tab.labelKey)}</span>
          <span className="tab-cnt">{tab.count}</span>
        </button>
      );
    })}
  </div>
);

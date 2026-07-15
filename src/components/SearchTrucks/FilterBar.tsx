import React from 'react';
import type { FilterPillKey, VisibilityTab } from '../../pages/SearchTrucks/types';

interface FilterBarProps {
  activeTab: VisibilityTab;
  onTabChange: (tab: VisibilityTab) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activePills: Set<FilterPillKey>;
  onTogglePill: (key: FilterPillKey) => void;
  onClearAll: () => void;
  t: (key: string) => string;
}

const TABS: { key: VisibilityTab; labelKey: string }[] = [
  { key: 'all', labelKey: 'satTabAll' },
  { key: 'public', labelKey: 'satTabPublic' },
  { key: 'private', labelKey: 'satTabPrivate' },
];

const PILLS: { key: FilterPillKey; labelKey: string; icon: string }[] = [
  { key: 'start', labelKey: 'satFilterStart', icon: '🕐' },
  { key: 'pickup', labelKey: 'satFilterPickup', icon: '📍' },
  { key: 'dest', labelKey: 'satFilterDest', icon: '🏁' },
  { key: 'equipment', labelKey: 'satFilterEquip', icon: '🚛' },
  { key: 'trip', labelKey: 'satFilterTrip', icon: '🛤️' },
  { key: 'rating', labelKey: 'satFilterRating', icon: '⭐' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  activePills,
  onTogglePill,
  onClearAll,
  t,
}) => (
  <div className="sat-fbar">
    <div className="sat-f-tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`sat-f-tab ${activeTab === tab.key ? 'act' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>

    <div className="sat-f-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('satSearchPlaceholder')}
        aria-label={t('satSearchPlaceholder')}
      />
    </div>

    {PILLS.map((pill) => (
      <button
        key={pill.key}
        type="button"
        className={`sat-f-pill ${activePills.has(pill.key) ? 'has' : ''}`}
        onClick={() => onTogglePill(pill.key)}
      >
        {pill.icon} {t(pill.labelKey)}
      </button>
    ))}

    <button type="button" className="sat-f-clear" onClick={onClearAll}>
      {t('satClearAll')}
    </button>
  </div>
);

import React from 'react';
import type { QuickFilterKey, VisibilityFilter } from '../../pages/SearchTrucks/types';

interface QuickFilterBarProps {
  visibility: VisibilityFilter;
  onVisibilityChange: (v: VisibilityFilter) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  quickFilters: Set<QuickFilterKey>;
  onToggleFilter: (key: QuickFilterKey) => void;
  onClearAll: () => void;
  onOpenMobileMap?: () => void;
  showMobileMapBtn?: boolean;
  t: (key: string) => string;
}

const CHIPS: { key: QuickFilterKey; labelKey: string; premium?: boolean }[] = [
  { key: 'today', labelKey: 'satChipToday' },
  { key: 'soon8h', labelKey: 'satChipSoon8h' },
  { key: 'has_bids', labelKey: 'satChipHasBids', premium: true },
  { key: 'load_match', labelKey: 'satChipLoadMatch', premium: true },
];

export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({
  visibility,
  onVisibilityChange,
  searchQuery,
  onSearchChange,
  quickFilters,
  onToggleFilter,
  onClearAll,
  onOpenMobileMap,
  showMobileMapBtn,
  t,
}) => (
  <div className="sat-filter-bar">
    <select
      className="sat-vis-select"
      value={visibility}
      onChange={(e) => onVisibilityChange(e.target.value as VisibilityFilter)}
      aria-label={t('satColVisibility')}
    >
      <option value="all">{t('satTabAll')}</option>
      <option value="public">{t('satTabPublic')}</option>
      <option value="private">{t('satTabPrivate')}</option>
    </select>

    <div className="sat-f-search sat-f-search--narrow">
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

    {CHIPS.map((chip) => (
      <button
        key={chip.key}
        type="button"
        className={`sat-chip ${quickFilters.has(chip.key) ? 'has' : ''} ${chip.premium ? 'premium' : ''}`}
        onClick={() => onToggleFilter(chip.key)}
      >
        {chip.premium && <span className="sat-chip-prem">{t('satPremium')}</span>}
        {t(chip.labelKey)}
      </button>
    ))}

    <button type="button" className="sat-f-clear" onClick={onClearAll}>
      {t('satClearAll')}
    </button>

    {showMobileMapBtn && onOpenMobileMap && (
      <button type="button" className="sat-mobile-map-btn" onClick={onOpenMobileMap}>
        🗺️ {t('satMap')}
      </button>
    )}
  </div>
);

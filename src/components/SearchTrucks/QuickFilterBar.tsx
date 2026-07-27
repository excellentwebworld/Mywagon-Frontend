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
  onOpenFilter?: () => void;
  onOpenSort?: () => void;
  filterActiveCount?: number;
  sortActive?: boolean;
  /** Hide Has Bids chip when subscription lacks View If Posted Truck Received Bids */
  canViewBidsCount?: boolean;
  onOpenMobileMap?: () => void;
  showMobileMapBtn?: boolean;
  t: (key: string) => string;
}

const CHIPS: { key: QuickFilterKey; labelKey: string; premium?: boolean; requiresBidsCount?: boolean }[] = [
  { key: 'today', labelKey: 'satChipToday' },
  { key: 'soon8h', labelKey: 'satChipSoon8h' },
  { key: 'has_bids', labelKey: 'satChipHasBids', premium: true, requiresBidsCount: true },
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
  onOpenFilter,
  onOpenSort,
  filterActiveCount = 0,
  sortActive = false,
  canViewBidsCount = false,
  onOpenMobileMap,
  showMobileMapBtn,
  t,
}) => (
  <div className="sat-filter-bar">
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

    {CHIPS.filter((chip) => !chip.requiresBidsCount || canViewBidsCount).map((chip) => (
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

    <div className="sat-filter-sort-actions">
      {onOpenFilter ? (
        <button
          type="button"
          className={`sat-f-pill${filterActiveCount > 0 ? ' has' : ''}`}
          onClick={onOpenFilter}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {t('satFilter') || 'Filter'}
          {filterActiveCount > 0 ? (
            <span className="sat-f-pill-badge">{filterActiveCount}</span>
          ) : null}
        </button>
      ) : null}
      {onOpenSort ? (
        <button
          type="button"
          className={`sat-f-pill${sortActive ? ' has' : ''}`}
          onClick={onOpenSort}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
          </svg>
          {t('satSort') || 'Sort'}
        </button>
      ) : null}
    </div>

    {showMobileMapBtn && onOpenMobileMap && (
      <button type="button" className="sat-mobile-map-btn" onClick={onOpenMobileMap}>
        🗺️ {t('satMap')}
      </button>
    )}
  </div>
);

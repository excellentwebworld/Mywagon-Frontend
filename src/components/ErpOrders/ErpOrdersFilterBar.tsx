import React from 'react';

type Props = {
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  highPriorityFilter: boolean;
  toggleHighPriorityFilter: () => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
};

export const ErpOrdersFilterBar: React.FC<Props> = ({
  t,
  searchQuery,
  setSearchQuery,
  highPriorityFilter,
  toggleHighPriorityFilter,
  hasActiveFilters,
  clearFilters,
}) => (
  <div className="fbar anim fbar-ref">
    <div className="f-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder={t('erpOrdersSearchPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>

    <button
      type="button"
      className={`f-pill${highPriorityFilter ? ' has' : ''}`}
      onClick={toggleHighPriorityFilter}
    >
      ⚡ {t('erpOrdersHighPriority')}
    </button>

    {hasActiveFilters && (
      <button type="button" className="f-clear f-clear-btn" onClick={clearFilters}>
        ✕ {t('erpOrdersClearFilters')}
      </button>
    )}
  </div>
);

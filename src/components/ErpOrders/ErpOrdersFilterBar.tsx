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
  <div className="fbar">
    <div className="f-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
      <span className="f-clear" onClick={clearFilters} onKeyDown={(e) => e.key === 'Enter' && clearFilters()} role="button" tabIndex={0}>
        ✕ {t('erpOrdersClearFilters')}
      </span>
    )}
  </div>
);

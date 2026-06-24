import React, { useEffect, useRef, useState } from 'react';
import type { ErpOrdersFilterState } from '../../pages/ErpOrders/types';

type Props = {
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filters: ErpOrdersFilterState;
  setFilters: (updater: ErpOrdersFilterState | ((prev: ErpOrdersFilterState) => ErpOrdersFilterState)) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
};

export const ErpOrdersFilterBar: React.FC<Props> = ({
  t,
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  hasActiveFilters,
  clearFilters,
}) => {
  const [openPill, setOpenPill] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPill) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPill(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPill]);

  const togglePriority = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority.includes(value)
        ? prev.priority.filter((x) => x !== value)
        : [...prev.priority, value],
    }));
  };

  return (
    <div ref={containerRef} className="fbar anim fbar-ref">
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

      <div className="f-pill-wrap">
        <button
          type="button"
          className={`f-pill f-pill-dropdown${filters.priority.length ? ' has' : ''}`}
          onClick={() => setOpenPill(openPill === 'priority' ? null : 'priority')}
        >
          ⚡ {t('erpOrdersFilterPriority')}
          {filters.priority.length > 0 && <span className="f-pill-count">{filters.priority.length}</span>}
          <span className="f-pill-chev">▾</span>
        </button>
        {openPill === 'priority' && (
          <div className="f-pill-menu">
            <label className="f-pill-option">
              <input
                type="checkbox"
                checked={filters.priority.includes('urgent')}
                onChange={() => togglePriority('urgent')}
              />
              <span>⚡ {t('erpOrdersPriorityUrgent')}</span>
            </label>
            <label className="f-pill-option">
              <input
                type="checkbox"
                checked={filters.priority.includes('high')}
                onChange={() => togglePriority('high')}
              />
              <span>▲ {t('erpOrdersPriorityHigh')}</span>
            </label>
          </div>
        )}
      </div>

      <button
        type="button"
        className={`f-pill${filters.noLinkedLoad ? ' has' : ''}`}
        onClick={() => setFilters((prev) => ({ ...prev, noLinkedLoad: !prev.noLinkedLoad }))}
      >
        📦 {t('erpOrdersNoLinkedLoad')}
      </button>

      <button
        type="button"
        className={`f-pill${filters.syncErrors ? ' has' : ''}`}
        onClick={() => setFilters((prev) => ({ ...prev, syncErrors: !prev.syncErrors }))}
      >
        ⚠️ {t('erpOrdersFilterSyncErrors')}
      </button>

      {hasActiveFilters && (
        <button type="button" className="f-clear f-clear-btn" onClick={clearFilters}>
          ✕ {t('erpOrdersClearFilters')}
        </button>
      )}
    </div>
  );
};

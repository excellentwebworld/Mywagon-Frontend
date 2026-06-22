import React, { useEffect, useRef } from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { ActiveFilters } from '../../pages/Partners/types';

type Props = Pick<
  PartnersState,
  | 't'
  | 'searchQuery'
  | 'setSearchQuery'
  | 'activeFilters'
  | 'toggleBarFilter'
  | 'clearAllFilters'
  | 'openFilterDropdown'
  | 'toggleFilterDropdown'
  | 'truckCategories'
  | 'closeDetailPanel'
  | 'subscriptionBlocked'
>;

export const PartnersFilterBar: React.FC<Props> = ({
  t,
  searchQuery,
  setSearchQuery,
  activeFilters,
  toggleBarFilter,
  clearAllFilters,
  openFilterDropdown,
  toggleFilterDropdown,
  truckCategories,
  closeDetailPanel,
  subscriptionBlocked,
}) => {
  const hasFilters =
    searchQuery.length > 0 ||
    activeFilters.status.length > 0 ||
    activeFilters.capability.length > 0;

  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        if (openFilterDropdown) toggleFilterDropdown('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openFilterDropdown, toggleFilterDropdown]);

  const statusOptions: Array<{ value: ActiveFilters['status'][number]; label: string }> = [
    { value: 'active', label: t('activePartners') },
    { value: 'invited', label: t('invitationSent') },
    { value: 'pending', label: t('invitationReceived') },
    { value: 'suspended', label: t('suspendedPartners') },
  ];

  return (
    <div className="ptn-fbar anim" ref={barRef}>
      <div className="ptn-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          id="partner-search"
          placeholder={t('partnerSearchPlaceholder')}
          value={searchQuery}
          disabled={subscriptionBlocked}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            closeDetailPanel();
          }}
        />
      </div>

      <div className="ptn-fpill-wrap">
        <button
          type="button"
          className={`ptn-fpill${activeFilters.status.length ? ' has' : ''}`}
          onClick={() => toggleFilterDropdown('status')}
          id="filter-status"
        >
          📋 {t('statusFilter')}
        </button>
        <div className={`ptn-fdd${openFilterDropdown === 'status' ? ' show' : ''}`}>
          {statusOptions.map(({ value, label }) => (
            <div
              key={value}
              className={`ptn-fdd-item${activeFilters.status.includes(value) ? ' selected' : ''}`}
              onClick={() => toggleBarFilter('status', value)}
            >
              <span className="ptn-fdd-check">{activeFilters.status.includes(value) ? '✓' : ''}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="ptn-fpill-wrap">
        <button
          type="button"
          className={`ptn-fpill${activeFilters.capability.length ? ' has' : ''}`}
          onClick={() => toggleFilterDropdown('capability')}
          id="filter-capability"
        >
          🚛 {t('capabilityFilter')}
        </button>
        <div className={`ptn-fdd${openFilterDropdown === 'capability' ? ' show' : ''}`} style={{ width: 240 }}>
          {truckCategories.map((cat) => (
            <div
              key={cat.id}
              className={`ptn-fdd-item${activeFilters.capability.includes(cat.id) ? ' selected' : ''}`}
              onClick={() => toggleBarFilter('capability', cat.id)}
            >
              <span className="ptn-fdd-check">
                {activeFilters.capability.includes(cat.id) ? '✓' : ''}
              </span>
              {cat.name}
            </div>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button type="button" className="ptn-fclear" onClick={clearAllFilters}>
          {t('clearAll') || 'Clear all'}
        </button>
      )}
    </div>
  );
};

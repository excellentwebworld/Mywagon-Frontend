import React, { useEffect, useRef } from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import { TRUCK_TYPES, REGION_KEYS } from '../../pages/Partners/constants';
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
  | 'rName'
  | 'closeDetailPanel'
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
  rName,
  closeDetailPanel,
}) => {
  const hasFilters =
    searchQuery.length > 0 ||
    Object.values(activeFilters).some((arr) => (arr as unknown[]).length > 0);

  // Close dropdown on outside click
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
    { value: 'invited', label: t('invitedPartners') },
    { value: 'pending', label: t('pending') || 'Pending' },
    { value: 'suspended', label: t('suspendedPartners') },
  ];

  const performanceOptions: Array<{ value: ActiveFilters['performance'][number]; label: string }> = [
    { value: 'ontime90', label: 'On-time ≥ 90%' },
    { value: 'rating4',  label: 'Rating ≥ 4.0' },
    { value: 'cancel5',  label: 'Cancel ≤ 5%' },
  ];

  return (
    <div className="ptn-fbar anim" ref={barRef}>
      {/* Search */}
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
          onChange={(e) => {
            setSearchQuery(e.target.value);
            closeDetailPanel();
          }}
        />
      </div>

      {/* Status filter */}
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
              <span className="ptn-fdd-check">
                {activeFilters.status.includes(value) ? '✓' : ''}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Capability filter */}
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
          {TRUCK_TYPES.map((truck) => (
            <div
              key={truck}
              className={`ptn-fdd-item${activeFilters.capability.includes(truck) ? ' selected' : ''}`}
              onClick={() => toggleBarFilter('capability', truck)}
            >
              <span className="ptn-fdd-check">
                {activeFilters.capability.includes(truck) ? '✓' : ''}
              </span>
              {truck}
            </div>
          ))}
        </div>
      </div>

      {/* Performance filter */}
      <div className="ptn-fpill-wrap">
        <button
          type="button"
          className={`ptn-fpill${activeFilters.performance.length ? ' has' : ''}`}
          onClick={() => toggleFilterDropdown('performance')}
          id="filter-performance"
        >
          📊 {t('performanceFilter')}
        </button>
        <div className={`ptn-fdd${openFilterDropdown === 'performance' ? ' show' : ''}`}>
          {performanceOptions.map(({ value, label }) => (
            <div
              key={value}
              className={`ptn-fdd-item${activeFilters.performance.includes(value) ? ' selected' : ''}`}
              onClick={() => toggleBarFilter('performance', value)}
            >
              <span className="ptn-fdd-check">
                {activeFilters.performance.includes(value) ? '✓' : ''}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Region filter */}
      <div className="ptn-fpill-wrap">
        <button
          type="button"
          className={`ptn-fpill${activeFilters.region.length ? ' has' : ''}`}
          onClick={() => toggleFilterDropdown('region')}
          id="filter-region"
        >
          📍 {t('regionFilter')}
        </button>
        <div className={`ptn-fdd${openFilterDropdown === 'region' ? ' show' : ''}`} style={{ width: 240 }}>
          {REGION_KEYS.map((_, idx) => (
            <div
              key={idx}
              className={`ptn-fdd-item${activeFilters.region.includes(idx) ? ' selected' : ''}`}
              onClick={() => toggleBarFilter('region', idx)}
            >
              <span className="ptn-fdd-check">
                {activeFilters.region.includes(idx) ? '✓' : ''}
              </span>
              {rName(idx)}
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

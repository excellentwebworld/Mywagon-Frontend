import React, { useState } from 'react';
import type { FilterState } from '../../pages/ManageShipments/utils/listingUtils';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownConfig {
  id: string;
  labelKey: string;
  filterKey: keyof FilterState;
  options: FilterOption[];
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, values: string[]) => void;
  onClearAll: () => void;
  t: (key: string) => string;
}

const FILTER_CONFIG: FilterDropdownConfig[] = [
  {
    id: 'status',
    labelKey: 'filterStatus',
    filterKey: 'status',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'awarded', label: 'Awarded' },
      { value: 'delivered', label: 'Delivered' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    id: 'bid',
    labelKey: 'filterBidState',
    filterKey: 'bidState',
    options: [
      { value: 'has_bids', label: 'Has Bids' },
      { value: 'no_bids', label: 'No Bids' },
      { value: 'expiring', label: 'Expiring' },
      { value: 'has_counter', label: 'Has Counter' },
    ],
  },
  {
    id: 'vis',
    labelKey: 'filterVisibility',
    filterKey: 'visibility',
    options: [
      { value: 'private', label: 'Private' },
      { value: 'public', label: 'Public' },
    ],
  },
  {
    id: 'fac',
    labelKey: 'filterFacility',
    filterKey: 'facility',
    options: [
      { value: 'kalapaki', label: 'Kalapaki' },
      { value: 'perivleptos', label: 'Perivleptos' },
    ],
  },
  {
    id: 'cust',
    labelKey: 'filterCustomer',
    filterKey: 'customer',
    options: [
      { value: 'Alpha Foods Ltd', label: 'Alpha Foods Ltd' },
      { value: 'Beta Distributors', label: 'Beta Distributors' },
      { value: 'Gamma Logistics', label: 'Gamma Logistics' },
    ],
  },
  {
    id: 'date',
    labelKey: 'filterDateRange',
    filterKey: 'dateRange',
    options: [
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: '30days', label: 'Last 30 Days' },
    ],
  },
  {
    id: 'exc',
    labelKey: 'filterExceptions',
    filterKey: 'exceptions',
    options: [
      { value: 'at_risk', label: 'At Risk' },
      { value: 'delayed', label: 'Delayed' },
      { value: 'uncovered', label: 'Uncovered' },
    ],
  },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearAll,
  t,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const barRef = useOutsideClick<HTMLDivElement>(() => setOpenDropdown(null), openDropdown !== null);

  const toggleValue = (key: keyof FilterState, value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFilterChange(key, next);
  };

  return (
    <div className="fbar a d2" ref={barRef}>
      <div className="f-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder={t('searchShipmentsPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {FILTER_CONFIG.map((cfg) => {
        const hasActive = filters[cfg.filterKey].length > 0;
        return (
          <div key={cfg.id} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`f-pill ${hasActive ? 'has' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === cfg.id ? null : cfg.id)}
            >
              {cfg.id === 'status' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              )}
              {t(cfg.labelKey)}
            </button>
            {openDropdown === cfg.id && (
              <div className="f-dd show">
                {cfg.options.map((opt) => {
                  const checked = filters[cfg.filterKey].includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`f-dd-item ${checked ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleValue(cfg.filterKey, opt.value)}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <span className="f-clear" onClick={onClearAll} role="button" tabIndex={0}>
        {t('clearAll')}
      </span>
      <span className="sp" style={{ flex: 1 }} />
      <button
        type="button"
        className="f-pill has"
        style={{ borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {t('saveView')}
      </button>
    </div>
  );
};

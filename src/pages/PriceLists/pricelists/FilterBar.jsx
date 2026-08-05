/**
 * FilterBar — Search + cycling pill filters for Price Lists.
 *
 * Filters: Search (bilingual), Unit (cycling), Status (cycling),
 * Scope (multi-select), Vehicle (multi-select), Expiry (cycling), Clear all.
 */
import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';

const UNIT_STATES = ['all', 'load', 'pallet', 'km', 'weight'];
const STATUS_STATES = ['all', 'active', 'inactive', 'archived'];
const EXPIRY_STATES = ['all', 'expiring', 'open_ended', 'has_end'];

export default function FilterBar({
  search, onSearchChange,
  unitFilter, onUnitChange,
  statusFilter, onStatusChange,
  expiryFilter, onExpiryChange,
  onClear,
  hasActiveFilters,
}) {
  const { t } = useTranslation();
  const { T } = useTheme();

  const cycleFilter = (current, states, setter) => {
    const idx = states.indexOf(current);
    setter(states[(idx + 1) % states.length]);
  };

  const pillStyle = (isActive) => ({
    fontSize: 12,
    fontWeight: isActive ? 600 : 400,
    padding: '5px 12px',
    borderRadius: 99,
    border: `1px solid ${isActive ? T.ac : T.bd}`,
    background: isActive ? T.al : 'transparent',
    color: isActive ? T.ac : T.t2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  });

  const unitLabels = {
    all: t('priceLists.filter.allUnits', 'All units'),
    load: t('priceLists.filter.perLoad', 'Per load'),
    pallet: t('priceLists.filter.perPallet', 'Per pallet'),
    km: t('priceLists.filter.perKm', 'Per km'),
    weight: t('priceLists.filter.perWeight', 'Per weight'),
  };

  const statusLabels = {
    all: t('priceLists.filter.allStatus', 'All status'),
    active: t('priceLists.status.active', 'Active'),
    inactive: t('priceLists.status.inactive', 'Inactive'),
    archived: t('priceLists.status.archived', 'Archived'),
  };

  const expiryLabels = {
    all: t('priceLists.filter.allExpiry', 'All expiry'),
    expiring: t('priceLists.filter.expiringSoon', 'Expiring soon'),
    open_ended: t('priceLists.filter.openEnded', 'Open-ended'),
    has_end: t('priceLists.filter.hasEndDate', 'Has end date'),
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      {/* Search */}
      <div className="relative" style={{ minWidth: 200 }}>
        <Search
          size={14}
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.t3 }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('priceLists.filter.searchPlaceholder', 'Search lanes…')}
          className="w-full rounded-lg outline-none"
          style={{
            padding: '7px 10px 7px 30px',
            fontSize: 12,
            border: `1px solid ${T.bd}`,
            background: T.sf,
            color: T.t1,
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute border-none cursor-pointer bg-transparent"
            style={{ right: 8, top: '50%', transform: 'translateY(-50%)', color: T.t3 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Unit pill (cycling) */}
      <button
        onClick={() => cycleFilter(unitFilter, UNIT_STATES, onUnitChange)}
        style={pillStyle(unitFilter !== 'all')}
      >
        📐 {unitLabels[unitFilter]}
      </button>

      {/* Status pill (cycling) */}
      <button
        onClick={() => cycleFilter(statusFilter, STATUS_STATES, onStatusChange)}
        style={pillStyle(statusFilter !== 'all')}
      >
        ✅ {statusLabels[statusFilter]}
      </button>

      {/* Expiry pill (cycling) */}
      <button
        onClick={() => cycleFilter(expiryFilter, EXPIRY_STATES, onExpiryChange)}
        style={pillStyle(expiryFilter !== 'all')}
      >
        ⏰ {expiryLabels[expiryFilter]}
      </button>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="border-none cursor-pointer bg-transparent"
          style={{ fontSize: 12, color: T.ac, fontWeight: 600 }}
        >
          {t('priceLists.filter.clearAll', 'Clear all')}
        </button>
      )}
    </div>
  );
}

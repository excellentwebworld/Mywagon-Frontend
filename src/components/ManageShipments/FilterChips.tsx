import React from 'react';
import type { FilterChip, FilterChipKey } from '../../pages/ManageShipments/utils/listingUtils';

interface FilterChipsProps {
  chips: FilterChip[];
  kpiChip?: { label: string } | null;
  onClearKpi?: () => void;
  onClearChip: (key: FilterChipKey) => void;
  onClearAll: () => void;
  t: (key: string) => string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  chips,
  kpiChip,
  onClearKpi,
  onClearChip,
  onClearAll,
  t,
}) => {
  if (chips.length === 0 && !kpiChip) return null;

  return (
    <div className="mgmt-filter-chips a d2">
      {kpiChip && (
        <button
          type="button"
          className="f-pill has kpi-chip"
          onClick={onClearKpi}
          title={t('clear')}
          style={{ fontSize: 12 }}
        >
          {kpiChip.label}
          <span aria-hidden style={{ marginLeft: 6 }}>
            ×
          </span>
        </button>
      )}
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="f-pill has"
          onClick={() => onClearChip(chip.key)}
          title={t('clear')}
          style={{ fontSize: 12 }}
        >
          {chip.label}
          <span aria-hidden style={{ marginLeft: 6 }}>
            ×
          </span>
        </button>
      ))}
      <button type="button" className="f-pill" style={{ fontSize: 12 }} onClick={onClearAll}>
        {t('clearAllFilters')}
      </button>
    </div>
  );
};

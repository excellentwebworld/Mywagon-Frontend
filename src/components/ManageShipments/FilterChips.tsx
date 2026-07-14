import React from 'react';
import type { FilterChip, FilterChipKey } from '../../pages/ManageShipments/utils/listingUtils';

interface FilterChipsProps {
  chips: FilterChip[];
  onClearChip: (key: FilterChipKey) => void;
  onClearAll: () => void;
  t: (key: string) => string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ chips, onClearChip, onClearAll, t }) => {
  if (chips.length === 0) return null;

  return (
    <div
      className="a d2"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}
    >
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

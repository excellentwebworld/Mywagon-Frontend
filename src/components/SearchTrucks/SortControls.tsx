import React from 'react';
import type { SortKey } from '../../pages/SearchTrucks/types';

interface SortControlsProps {
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  groupRecurring: boolean;
  onToggleGroup: () => void;
  t: (key: string) => string;
}

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'best_match', labelKey: 'satSortBestMatch' },
  { key: 'soonest_start', labelKey: 'satSortSoonest' },
  { key: 'lowest_price', labelKey: 'satSortLowestPrice' },
  { key: 'highest_rating', labelKey: 'satSortHighestRating' },
  { key: 'freshest', labelKey: 'satSortFreshest' },
];

export const SortControls: React.FC<SortControlsProps> = ({
  sortKey,
  onSortChange,
  groupRecurring,
  onToggleGroup,
  t,
}) => (
  <div className="sat-sort-row">
    <span className="sat-muted">{t('satSort')}:</span>
    <select
      value={sortKey}
      onChange={(e) => onSortChange(e.target.value as SortKey)}
      aria-label={t('satSort')}
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {t(opt.labelKey)}
        </option>
      ))}
    </select>
    <span className="sat-sp" />
    <div className="sat-toggle-wrap">
      <span>{t('satGroupRecurring')}</span>
      <button
        type="button"
        className={`sat-toggle ${groupRecurring ? 'on' : ''}`}
        onClick={onToggleGroup}
        aria-pressed={groupRecurring}
        aria-label={t('satGroupRecurring')}
      />
    </div>
  </div>
);

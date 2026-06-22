import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  'searchQuery' | 'handleSearchChange' | 'clearSelection'
>;

export const FilterBar: React.FC<Props> = ({ searchQuery, handleSearchChange, clearSelection }) => {
  const { t } = useTranslation();

  return (
    <div className="fbar anim pm-sticky-toolbar">
      <div className="f-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder={t('search')}
          value={searchQuery}
          onChange={(e) => {
            handleSearchChange(e.target.value);
            clearSelection();
          }}
        />
      </div>
    </div>
  );
};

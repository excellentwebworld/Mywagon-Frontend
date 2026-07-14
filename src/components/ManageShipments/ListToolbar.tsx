import React from 'react';

interface ListToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  onExport: () => void;
  sortActive?: boolean;
  filterActive?: boolean;
  exporting?: boolean;
  t: (key: string) => string;
}

export const ListToolbar: React.FC<ListToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenFilter,
  onOpenSort,
  onExport,
  sortActive = false,
  filterActive = false,
  exporting = false,
  t,
}) => (
  <div className="fbar list-toolbar a d2">
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
        aria-label={t('searchShipmentsPlaceholder')}
      />
    </div>

    <button type="button" className={`f-pill ${filterActive ? 'has' : ''}`} onClick={onOpenFilter}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      {t('filter')}
    </button>

    <button type="button" className={`f-pill ${sortActive ? 'has' : ''}`} onClick={onOpenSort}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
      </svg>
      {t('sort')}
    </button>

    <button type="button" className="f-pill" onClick={onExport} disabled={exporting}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {exporting ? t('exporting') : t('export')}
    </button>
  </div>
);

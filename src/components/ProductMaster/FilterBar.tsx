import React from 'react';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 't'
  | 'lang'
  | 'categories'
  | 'catName'
  | 'searchQuery'
  | 'handleSearchChange'
  | 'filterSource'
  | 'setFilterSource'
  | 'filterSync'
  | 'setFilterSync'
  | 'filterActive'
  | 'setFilterActive'
  | 'filterCat'
  | 'setFilterCat'
  | 'filterUnmapped'
  | 'setFilterUnmapped'
  | 'clearFilters'
  | 'clearSelection'
>;

export const FilterBar: React.FC<Props> = ({
  t,
  lang,
  categories,
  catName,
  searchQuery,
  handleSearchChange,
  filterSource,
  setFilterSource,
  filterSync,
  setFilterSync,
  filterActive,
  setFilterActive,
  filterCat,
  setFilterCat,
  filterUnmapped,
  setFilterUnmapped,
  clearFilters,
  clearSelection,
}) => (
  <div className="fbar anim">
    <div className="f-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder={t('search')}
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
    </div>
    <select
      className={`f-sel${filterCat ? ' has' : ''}`}
      value={filterCat}
      onChange={(e) => {
        setFilterCat(e.target.value);
        clearSelection();
      }}
    >
      <option value="">{lang === 'el' ? '📁 Κατηγορία' : '📁 Category'}</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {catName(c)}
        </option>
      ))}
    </select>
    <select
      className={`f-sel${filterSource ? ' has' : ''}`}
      value={filterSource}
      onChange={(e) => {
        setFilterSource(e.target.value);
        clearSelection();
      }}
    >
      <option value="">🗂 Source</option>
      <option value="erp">ERP</option>
      <option value="manual">Manual</option>
    </select>
    <select
      className={`f-sel${filterSync ? ' has' : ''}`}
      value={filterSync}
      onChange={(e) => {
        setFilterSync(e.target.value);
        clearSelection();
      }}
    >
      <option value="">🔄 Sync Status</option>
      <option value="ok">OK</option>
      <option value="error">Error</option>
      <option value="conflict">Conflict</option>
      <option value="pending">Pending</option>
    </select>
    <select
      className={`f-sel${filterActive ? ' has' : ''}`}
      value={filterActive}
      onChange={(e) => {
        setFilterActive(e.target.value);
        clearSelection();
      }}
    >
      <option value="">✓ Status</option>
      <option value="active">{t('active')}</option>
      <option value="inactive">{t('inactive')}</option>
    </select>
    <button
      type="button"
      className={`f-tog${filterUnmapped ? ' on' : ''}`}
      onClick={() => {
        setFilterUnmapped(!filterUnmapped);
        clearSelection();
      }}
    >
      ⚠️ {t('unmapped')}
    </button>
    <span className="f-clear" onClick={clearFilters} role="button" tabIndex={0}>
      {t('clearAll')}
    </span>
  </div>
);

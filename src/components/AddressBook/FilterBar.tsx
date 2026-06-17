import React from 'react';
import { FILTER_PILLS } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';

type Props = Pick<
  AddressBookState,
  'lang' | 't' | 'searchQuery' | 'handleSearchChange' | 'activeFilters' | 'toggleFilter' | 'clearFilters'
>;

export const FilterBar: React.FC<Props> = ({
  lang,
  t,
  searchQuery,
  handleSearchChange,
  activeFilters,
  toggleFilter,
  clearFilters,
}) => (
  <div className="ab-fbar anim">
    <div className="ab-search">
      <svg className="si" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder={
          lang === 'el' ? 'Αναζήτηση ονόματος, διεύθυνσης, πόλης, επαφής…' : 'Search name, address, city, contact…'
        }
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
    </div>
    {FILTER_PILLS.map(({ key, label }) => (
      <button
        key={key}
        type="button"
        className={`ab-fpill ${activeFilters[key] ? 'active' : ''}`}
        onClick={() => toggleFilter(key)}
      >
        {label}
      </button>
    ))}
    <button type="button" className="ab-fclear" onClick={clearFilters}>
      {t('clearAll')}
    </button>
  </div>
);

import React from 'react';

type Props = {
  lang: 'en' | 'el';
  searchQuery: string;
  handleSearchChange: (value: string) => void;
};

export const FilterBar: React.FC<Props> = ({ lang, searchQuery, handleSearchChange }) => (
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
  </div>
);

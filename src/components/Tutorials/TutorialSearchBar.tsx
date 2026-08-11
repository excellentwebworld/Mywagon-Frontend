import React from 'react';
import { Search, X } from 'lucide-react';

interface TutorialSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export const TutorialSearchBar: React.FC<TutorialSearchBarProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div className="tut-search-wrap">
      <div className="tut-search-box">
        <Search className="tut-search-icon" size={18} aria-hidden />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {value.length > 0 && (
          <button
            type="button"
            className="tut-search-clear"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

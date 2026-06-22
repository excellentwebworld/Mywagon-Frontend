import React, { useEffect, useId, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

type Props = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string, option?: SearchableSelectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  onSearchChange?: (query: string) => void;
  footerAction?: { label: string; onClick: () => void };
  headerAction?: { label: string; onClick: () => void };
};

export const SearchableSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  hasError = false,
  className = '',
  onSearchChange,
  footerAction,
  headerAction,
}) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q);
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleQuery = (next: string) => {
    setQuery(next);
    onSearchChange?.(next);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUp(spaceBelow < 280 && spaceAbove > spaceBelow);
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div
      ref={rootRef}
      className={`searchable-select${open ? ' open' : ''}${hasError ? ' has-error' : ''}${disabled ? ' disabled' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        id={id}
        className="searchable-select-trigger"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'searchable-select-value' : 'searchable-select-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="searchable-select-chevron">▾</span>
      </button>
      {open && (
        <div className={`searchable-select-menu${openUp ? ' open-up' : ''}`} role="listbox">
          <div className="searchable-select-search">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
            />
          </div>
          {headerAction && (
            <button
              type="button"
              className="searchable-select-header-action"
              onClick={() => {
                headerAction.onClick();
                setOpen(false);
              }}
            >
              {headerAction.label}
            </button>
          )}
          <div className="searchable-select-options">
            {filtered.length === 0 ? (
              <div className="searchable-select-empty">No matches</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={`searchable-select-option${opt.value === value ? ' selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value, opt);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.sublabel && <small>{opt.sublabel}</small>}
                </button>
              ))
            )}
          </div>
          {footerAction && (
            <button type="button" className="searchable-select-footer" onClick={footerAction.onClick}>
              {footerAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

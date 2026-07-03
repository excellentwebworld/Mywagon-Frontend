import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  direction?: 'up' | 'down' | 'auto';
  menuFixed?: boolean;
  hideSublabelInTrigger?: boolean;
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
  direction = 'auto',
  menuFixed = false,
  hideSublabelInTrigger = false,
}) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');
  const [menuRect, setMenuRect] = useState<{
    anchorTop: number;
    anchorBottom: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  const openTimeRef = useRef(0);

  useEffect(() => {
    if (open) {
      openTimeRef.current = Date.now();
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q);
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (menuFixed) {
        const target = e.target as HTMLElement;
        if (target.closest('.searchable-select-menu.menu-fixed')) return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuFixed]);

  useEffect(() => {
    if (!open || !menuFixed) return;
    const onScroll = (e: Event) => {
      if (Date.now() - openTimeRef.current < 150) return;
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('.searchable-select-menu')) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open, menuFixed]);

  useLayoutEffect(() => {
    if (!open || !menuFixed || !rootRef.current) {
      setMenuRect(null);
      return;
    }
    const trigger = rootRef.current.querySelector('.searchable-select-trigger') as HTMLElement | null;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const up =
      direction === 'up' ? true : direction === 'down' ? false : openUp;
    setMenuRect({
      anchorTop: rect.top,
      anchorBottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      openUp: up,
    });
  }, [open, menuFixed, openUp, direction]);

  const handleQuery = (next: string) => {
    setQuery(next);
    onSearchChange?.(next);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      if (direction === 'down') {
        setOpenUp(false);
      } else if (direction === 'up') {
        setOpenUp(true);
      } else if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUp(spaceBelow < 280 && spaceAbove > spaceBelow);
      }
    }
    setOpen((v) => !v);
  };

  const menuInner = (
    <>
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
    </>
  );

  const menuNode =
    open &&
    (menuFixed && menuRect ? (
      createPortal(
        <div
          className={`searchable-select-menu menu-fixed${menuRect.openUp ? ' open-up' : ''}`}
          role="listbox"
          style={{
            position: 'fixed',
            left: menuRect.left,
            width: menuRect.width,
            top: menuRect.openUp ? undefined : menuRect.anchorBottom + 4,
            bottom: menuRect.openUp ? window.innerHeight - menuRect.anchorTop + 4 : undefined,
            zIndex: 10050,
          }}
        >
          {menuInner}
        </div>,
        document.body
      )
    ) : (
      <div className={`searchable-select-menu${openUp ? ' open-up' : ''}`} role="listbox">
        {menuInner}
      </div>
    ));

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
        <span className={selected ? 'searchable-select-value-wrap' : 'searchable-select-placeholder'}>
          {selected ? (
            <>
              <span className="searchable-select-value">{selected.label}</span>
              {selected.sublabel && !hideSublabelInTrigger ? (
                <small className="searchable-select-value-sub">{selected.sublabel}</small>
              ) : null}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span className="searchable-select-chevron">▾</span>
      </button>
      {menuNode}
    </div>
  );
};

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ProductTypeTreeItem = {
  id: string;
  name: string;
  skus: Array<{ id: string; name: string }>;
};

type Props = {
  tree: ProductTypeTreeItem[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  clearLabel: string;
  skuSingular: string;
  skuPlural: string;
  selectedCountLabel?: (count: number) => string;
  disabled?: boolean;
};

export const ProductTypeMultiSelect: React.FC<Props> = ({
  tree,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  skuSingular,
  skuPlural,
  selectedCountLabel,
  disabled = false,
}) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimeRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menuRect, setMenuRect] = useState<{
    anchorTop: number;
    anchorBottom: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  useEffect(() => {
    if (open) openTimeRef.current = Date.now();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (rootRef.current?.contains(target)) return;
      if (target.closest('.mgmt-product-menu.menu-fixed')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (Date.now() - openTimeRef.current < 150) return;
      const target = e.target as HTMLElement;
      if (target?.closest?.('.mgmt-product-menu')) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setMenuRect(null);
      return;
    }
    const trigger = rootRef.current.querySelector('.searchable-select-trigger') as HTMLElement | null;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuRect({
      anchorTop: rect.top,
      anchorBottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  }, [open, openUp, query, expanded, value, tree]);

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    tree.forEach((pt) => {
      map[pt.id] = pt.name;
      pt.skus.forEach((sku) => {
        map[sku.id] = sku.name;
      });
    });
    return map;
  }, [tree]);

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return null;
    if (value.length === 1) return nameById[value[0]] || value[0];
    return selectedCountLabel
      ? selectedCountLabel(value.length)
      : `${value.length} selected`;
  }, [value, nameById, selectedCountLabel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree;
    return tree
      .map((pt) => {
        const typeMatch = pt.name.toLowerCase().includes(q);
        const skus = pt.skus.filter((s) => s.name.toLowerCase().includes(q));
        if (typeMatch) return pt;
        if (skus.length === 0) return null;
        return { ...pt, skus };
      })
      .filter(Boolean) as ProductTypeTreeItem[];
  }, [tree, query]);

  const toggleToken = (token: string) => {
    onChange(value.includes(token) ? value.filter((x) => x !== token) : [...value, token]);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUp(spaceBelow < 300 && spaceAbove > spaceBelow);
    }
    setOpen((v) => !v);
  };

  const menuInner = (
    <>
      <div className="searchable-select-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          autoFocus
        />
      </div>
      <div className="searchable-select-options mgmt-product-options" role="listbox">
        {filtered.length === 0 ? (
          <div className="searchable-select-empty">{emptyLabel}</div>
        ) : (
          filtered.map((pt) => {
            const typeOn = value.includes(pt.id);
            const hasSkus = pt.skus.length > 0;
            const isOpen = Boolean(expanded[pt.id]) || Boolean(query.trim());
            const selectedSkuCount = pt.skus.filter((s) => value.includes(s.id)).length;
            return (
              <div key={pt.id} className="mgmt-product-group">
                <div
                  className={`searchable-select-option mgmt-product-option${typeOn ? ' selected' : ''}`}
                  role="option"
                  aria-selected={typeOn}
                >
                  <label className="mgmt-product-option-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={typeOn}
                      onChange={() => toggleToken(pt.id)}
                    />
                  </label>
                  <button
                    type="button"
                    className="mgmt-product-option-body"
                    onClick={() => {
                      if (hasSkus) {
                        setExpanded((prev) => ({ ...prev, [pt.id]: !prev[pt.id] }));
                      } else {
                        toggleToken(pt.id);
                      }
                    }}
                  >
                    <span className="mgmt-product-option-text">
                      <span>{pt.name}</span>
                      {hasSkus ? (
                        <small>
                          {pt.skus.length} {pt.skus.length === 1 ? skuSingular : skuPlural}
                          {selectedSkuCount > 0 ? ` · ${selectedSkuCount}` : ''}
                        </small>
                      ) : null}
                    </span>
                    {hasSkus ? (
                      <span className={`mgmt-product-option-chev${isOpen ? ' open' : ''}`} aria-hidden>
                        ▾
                      </span>
                    ) : null}
                  </button>
                </div>
                {hasSkus && isOpen
                  ? pt.skus.map((sku) => {
                      const skuOn = value.includes(sku.id);
                      return (
                        <label
                          key={sku.id}
                          className={`searchable-select-option mgmt-product-option mgmt-product-option--sku${skuOn ? ' selected' : ''}`}
                          role="option"
                          aria-selected={skuOn}
                        >
                          <span className="mgmt-product-option-check">
                            <input
                              type="checkbox"
                              checked={skuOn}
                              onChange={() => toggleToken(sku.id)}
                            />
                          </span>
                          <span className="mgmt-product-option-text">
                            <span>{sku.name}</span>
                          </span>
                        </label>
                      );
                    })
                  : null}
              </div>
            );
          })
        )}
      </div>
      {value.length > 0 ? (
        <button
          type="button"
          className="searchable-select-footer"
          onClick={() => {
            onChange([]);
            setQuery('');
          }}
        >
          {clearLabel}
        </button>
      ) : null}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={`searchable-select mgmt-product-select${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}
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
        <span className={triggerLabel ? 'searchable-select-value-wrap' : 'searchable-select-placeholder'}>
          {triggerLabel ? (
            <span className="searchable-select-value">{triggerLabel}</span>
          ) : (
            placeholder
          )}
        </span>
        <span className="searchable-select-chevron">▾</span>
      </button>
      {open &&
        menuRect &&
        createPortal(
          <div
            className={`searchable-select-menu menu-fixed mgmt-product-menu${menuRect.openUp ? ' open-up' : ''}`}
            style={{
              position: 'fixed',
              left: menuRect.left,
              width: menuRect.width,
              top: menuRect.openUp ? undefined : menuRect.anchorBottom + 4,
              bottom: menuRect.openUp
                ? window.innerHeight - menuRect.anchorTop + 4
                : undefined,
              zIndex: 10050,
            }}
          >
            {menuInner}
          </div>,
          document.body
        )}
    </div>
  );
};

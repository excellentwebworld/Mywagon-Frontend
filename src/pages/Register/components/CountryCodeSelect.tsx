import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SignupReferenceCountryCode } from '../../../api/auth';

type CountryCodeSelectProps = {
  value: string;
  options: SignupReferenceCountryCode[];
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: string;
  verified?: boolean;
  id?: string;
};

function countryNameFromLabel(label: string, code: string): string {
  const trimmed = (label || '').trim();
  if (!trimmed) return code;
  const paren = trimmed.lastIndexOf('(');
  if (paren > 0) return trimmed.slice(0, paren).trim() || code;
  if (trimmed.includes(code)) {
    return trimmed.replace(code, '').replace(/[()]/g, '').trim() || code;
  }
  return trimmed;
}

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value,
  options,
  onChange,
  disabled,
  error,
  verified,
  id = 'register-country-code',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.code === value) || options[0],
    [options, value]
  );

  // Closed state: code only (Laravel parity). Open list: full "Country (+code)".
  const closedLabel = selected?.code || value || '+30';

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, value]);

  return (
    <div
      className={`reg-cc${open ? ' is-open' : ''}${error ? ' is-error' : ''}${
        verified ? ' is-verified' : ''
      }`}
      ref={rootRef}
    >
      <button
        type="button"
        id={id}
        className="reg-cc-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-label={
          selected
            ? `${countryNameFromLabel(selected.label, selected.code)} ${selected.code}`
            : 'Country code'
        }
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
        <span className="reg-cc-trigger-text">{closedLabel}</span>
        <span className="reg-cc-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul className="reg-cc-menu" role="listbox" ref={listRef} tabIndex={-1}>
          {options.length === 0 ? (
            <li className="reg-cc-option" role="option" aria-selected>
              {value || '+30'}
            </li>
          ) : (
            options.map((opt) => {
              const label = opt.label || opt.code;
              const selectedOpt = opt.code === value;
              return (
                <li
                  key={`${opt.code}-${opt.label}`}
                  role="option"
                  aria-selected={selectedOpt}
                  className={`reg-cc-option${selectedOpt ? ' is-selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.code);
                    setOpen(false);
                  }}
                >
                  {label}
                </li>
              );
            })
          )}
        </ul>
      )}

      {error && (
        <p className="reg-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

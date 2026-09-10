import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  hasError?: boolean;
  disabled?: boolean;
};

const COMPLETE_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/** Normalize to HH:mm (24h). Accepts HH:mm, H:mm, HH:mm:ss. */
export function normalizeTime24(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return '';
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Current local time formatted as 24h `HH:mm`. */
export function getCurrentLocalTime24(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function splitTime(value: string): { hour: string; minute: string } {
  const normalized = normalizeTime24(value);
  if (!normalized) return { hour: '', minute: '' };
  const [hour, minute] = normalized.split(':');
  return { hour, minute };
}

export const TimePicker: React.FC<Props> = ({
  value,
  onChange,
  className = '',
  style,
  hasError = false,
  disabled = false,
}) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);
  const [draft, setDraft] = useState(() => normalizeTime24(value));

  const normalizedValue = useMemo(() => normalizeTime24(value), [value]);
  const { hour: selectedHour, minute: selectedMinute } = splitTime(normalizedValue || draft);

  useEffect(() => {
    setDraft(normalizeTime24(value));
  }, [value]);

  const updateMenuPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 168;
    const menuHeight = 220;
    const gap = 4;
    let top = rect.bottom + gap;
    let left = rect.left;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - gap);
    }
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    setMenuStyle({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const defaultHour = String(now.getHours()).padStart(2, '0');
    const defaultMinute = String(now.getMinutes()).padStart(2, '0');

    const scrollSelected = (list: HTMLDivElement | null, sel: string) => {
      if (!list || !sel) return;
      const item = list.querySelector<HTMLElement>(`[data-value="${sel}"]`);
      item?.scrollIntoView({ block: 'center' });
    };
    requestAnimationFrame(() => {
      scrollSelected(hourListRef.current, selectedHour || defaultHour);
      scrollSelected(minuteListRef.current, selectedMinute || defaultMinute);
    });
  }, [open, selectedHour, selectedMinute]);

  const commit = (next: string) => {
    const normalized = normalizeTime24(next);
    setDraft(normalized);
    if (normalized !== normalizedValue) onChange(normalized);
  };

  const pickHour = (hour: string) => {
    const now = new Date();
    const defaultMinute = String(now.getMinutes()).padStart(2, '0');
    const minute = selectedMinute || defaultMinute;
    commit(`${hour}:${minute}`);
  };

  const pickMinute = (minute: string) => {
    const now = new Date();
    const defaultHour = String(now.getHours()).padStart(2, '0');
    const hour = selectedHour || defaultHour;
    commit(`${hour}:${minute}`);
    setOpen(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d:]/g, '').slice(0, 5);
    setDraft(raw);
    if (COMPLETE_TIME.test(raw)) {
      onChange(raw);
    }
  };

  const handleTextBlur = () => {
    const normalized = normalizeTime24(draft);
    setDraft(normalized);
    if (normalized !== normalizedValue) onChange(normalized);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  return (
    <div
      ref={rootRef}
      className={`time-picker time-picker--24h${hasError ? ' has-error' : ''}${className ? ` ${className}` : ''}`.trim()}
      style={style?.width != null ? { width: style.width } : undefined}
    >
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="HH:mm"
        aria-label="Time (24-hour)"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        style={style}
        value={draft}
        disabled={disabled}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleTextBlur();
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        className="time-picker-icon-btn"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Open 24-hour time picker"
        onClick={toggleOpen}
      >
        <span className="time-picker-icon" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
      </button>

      {open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            id={`${id}-menu`}
            className="time-picker-menu"
            style={{ top: menuStyle.top, left: menuStyle.left }}
            role="dialog"
            aria-label="Select time (24-hour)"
          >
            <div className="time-picker-menu-cols">
              <div className="time-picker-menu-col">
                <div className="time-picker-menu-label">HH</div>
                <div ref={hourListRef} className="time-picker-menu-list" role="listbox" aria-label="Hour">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-value={h}
                      role="option"
                      aria-selected={h === selectedHour}
                      className={`time-picker-menu-item${h === selectedHour ? ' is-selected' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickHour(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="time-picker-menu-col">
                <div className="time-picker-menu-label">mm</div>
                <div
                  ref={minuteListRef}
                  className="time-picker-menu-list"
                  role="listbox"
                  aria-label="Minute"
                >
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-value={m}
                      role="option"
                      aria-selected={m === selectedMinute}
                      className={`time-picker-menu-item${m === selectedMinute ? ' is-selected' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickMinute(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="time-picker-menu-footer">
              <button
                type="button"
                className="time-picker-now-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  commit(getCurrentLocalTime24());
                  setOpen(false);
                }}
              >
                Now
              </button>
              <span>24h</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

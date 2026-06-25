import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  min?: string; // YYYY-MM-DD format
  max?: string; // YYYY-MM-DD format
  direction?: 'up' | 'down' | 'auto';
};

export const DatePicker: React.FC<Props> = ({
  value,
  onChange,
  placeholder = 'dd-mm-yyyy',
  disabled = false,
  hasError = false,
  className = '',
  min,
  max,
  direction = 'down', // Default to 'down' to prevent top clipping in overflow scroll containers
}) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const m = parseInt(value.split('-')[1], 10);
      if (!isNaN(m)) return m - 1;
    }
    return new Date().getMonth();
  });
  
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) {
      const y = parseInt(value.split('-')[0], 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  });

  // Sync calendar display when value changes externally
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          setCurrentYear(y);
          setCurrentMonth(m - 1);
        }
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

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
        setOpenUp(spaceBelow < 320 && spaceAbove > spaceBelow);
      }
    }
    setOpen((v) => !v);
  };

  const handlePrevMonth = () => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const formattedDate = formatDateString(year, month, day);
    onChange(formattedDate);
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const formattedDate = formatDateString(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    onChange(formattedDate);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  // Date helper formatting
  const formatDateString = (y: number, m: number, d: number) => {
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    return `${y}-${monthStr}-${dayStr}`;
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    if (isNaN(dateObj.getTime())) return dateStr;
    // Format based on active language (Greek uses DD/MM/YYYY, EN can be customized or localized)
    return dateObj.toLocaleDateString(lang, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Generate calendar days (Monday-first)
  const generateDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Convert 0-6 (Sun-Sat) to 0-6 (Mon-Sun)
    let startDayIndex = firstDayOfMonth.getDay(); 
    startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;

    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYearVal = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = new Date(prevYearVal, prevMonthIdx + 1, 0).getDate();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells = [];

    // Previous month padding
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({
        day: d,
        month: prevMonthIdx,
        year: prevYearVal,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        day: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      });
    }

    // Next month padding to make 6 full weeks (42 cells)
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYearVal = currentMonth === 11 ? currentYear + 1 : currentYear;
    let nextMonthDay = 1;
    while (cells.length < 42) {
      cells.push({
        day: nextMonthDay++,
        month: nextMonthIdx,
        year: nextYearVal,
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  // Localized weekdays (Monday-first)
  const weekdays = (() => {
    const list = [];
    const baseDate = new Date(2026, 5, 1); // June 1, 2026 (Monday)
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      list.push(d.toLocaleDateString(lang, { weekday: 'short' }));
    }
    return list;
  })();

  const monthsList = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, i, 1);
    return {
      value: i,
      label: d.toLocaleDateString(lang, { month: 'long' }),
    };
  });

  const yearRange = (() => {
    const startYear = new Date().getFullYear() - 10;
    return Array.from({ length: 25 }, (_, i) => startYear + i);
  })();

  const calendarCells = generateDays();
  const today = new Date();

  // Helper check for date min/max bounds
  const isDateDisabled = (y: number, m: number, d: number) => {
    const dateStr = formatDateString(y, m, d);
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  return (
    <div
      ref={rootRef}
      className={`date-picker${open ? ' open' : ''}${hasError ? ' has-error' : ''}${disabled ? ' disabled' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        id={id}
        className="date-picker-trigger"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? 'date-picker-value' : 'date-picker-placeholder'}>
          {value ? formatDateForDisplay(value) : placeholder}
        </span>
        <span className="date-picker-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
      </button>

      {open && (
        <div className={`date-picker-menu${openUp ? ' open-up' : ''}`} role="dialog">
          <div className="date-picker-header">
            <button
              type="button"
              className="date-picker-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
            >
              ‹
            </button>
            <div className="date-picker-selectors">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="date-picker-select"
                aria-label="Select Month"
              >
                {monthsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="date-picker-select"
                aria-label="Select Year"
              >
                {yearRange.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="date-picker-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next Month"
            >
              ›
            </button>
          </div>

          <div className="date-picker-weekdays">
            {weekdays.map((w, idx) => (
              <span key={idx} className="date-picker-weekday">
                {w}
              </span>
            ))}
          </div>

          <div className="date-picker-grid">
            {calendarCells.map((cell, idx) => {
              const isSelected = value === formatDateString(cell.year, cell.month, cell.day);
              const isToday =
                cell.day === today.getDate() &&
                cell.month === today.getMonth() &&
                cell.year === today.getFullYear();
              const isDisabled = isDateDisabled(cell.year, cell.month, cell.day);
              
              let cellClass = 'date-picker-cell';
              if (!cell.isCurrentMonth) cellClass += ' other-month';
              if (isSelected) cellClass += ' selected';
              if (isToday) cellClass += ' today';
              if (isDisabled) cellClass += ' disabled';

              return (
                <button
                  key={idx}
                  type="button"
                  className={cellClass}
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                  aria-label={`${cell.day} ${monthsList[cell.month].label} ${cell.year}`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="date-picker-footer">
            <button type="button" className="date-picker-footer-btn" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="date-picker-footer-btn" onClick={handleToday}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

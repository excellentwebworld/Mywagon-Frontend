import React, { useCallback, useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  hasError?: boolean;
  disabled?: boolean;
};

const COMPLETE_TIME = /^\d{2}:\d{2}$/;

function closePicker(input: HTMLInputElement) {
  requestAnimationFrame(() => {
    const pickerInput = input as HTMLInputElement & { hidePicker?: () => void };
    if (typeof pickerInput.hidePicker === 'function') {
      try {
        pickerInput.hidePicker();
        return;
      } catch {
        // fall through to blur
      }
    }
    input.blur();
  });
}

export const TimePicker: React.FC<Props> = ({
  value,
  onChange,
  className = '',
  style,
  hasError = false,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const scheduleClose = useCallback((input: HTMLInputElement) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      if (COMPLETE_TIME.test(input.value)) closePicker(input);
    }, 400);
  }, []);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    onChange(input.value);
    if (COMPLETE_TIME.test(input.value)) scheduleClose(input);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    onChange(input.value);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (COMPLETE_TIME.test(input.value)) closePicker(input);
  };

  const openPicker = (e: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;

    const input = inputRef.current ?? e.currentTarget;
    if (typeof input.showPicker !== 'function') return;

    e.preventDefault();

    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <div
      className={`time-picker${hasError ? ' has-error' : ''}${className ? ` ${className}` : ''}`.trim()}
      style={style?.width != null ? { width: style.width } : undefined}
    >
      <input
        ref={inputRef}
        type="time"
        style={style}
        value={value}
        disabled={disabled}
        onInput={handleInput}
        onChange={handleChange}
        onPointerDown={openPicker}
      />
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
    </div>
  );
};

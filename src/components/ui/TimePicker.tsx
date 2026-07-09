import React, { useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  hasError?: boolean;
  disabled?: boolean;
};

export const TimePicker: React.FC<Props> = ({
  value,
  onChange,
  className = '',
  style,
  hasError = false,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

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
        onChange={(e) => onChange(e.target.value)}
        onPointerDown={openPicker}
      />
    </div>
  );
};

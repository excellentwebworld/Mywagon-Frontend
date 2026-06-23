import React from 'react';

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({ label, value, onChange }) => (
  <div className={`ab-toggle-field${label ? '' : ' ab-toggle-field--bare'}`}>
    {label ? <span className="ab-toggle-field__label">{label}</span> : null}
    <button
      type="button"
      className="ab-toggle"
      role="switch"
      aria-checked={value}
      aria-label={label || undefined}
      onClick={() => onChange(!value)}
    >
      <span className={`ab-toggle__track${value ? ' is-on' : ''}`}>
        <span className="ab-toggle__thumb" />
      </span>
      <span className={`ab-toggle__text${value ? ' is-on' : ''}`}>{value ? 'Yes' : 'No'}</span>
    </button>
  </div>
);

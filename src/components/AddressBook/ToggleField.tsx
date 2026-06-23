import React from 'react';

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({ label, value, onChange }) => (
  <div className="ab-toggle-field">
    {label ? <span className="ab-toggle-field__label">{label}</span> : null}
    <div
      className="ab-toggle"
      role="switch"
      aria-checked={value}
      aria-label={label || undefined}
      onClick={() => onChange(!value)}
      onKeyDown={(e) => e.key === 'Enter' && onChange(!value)}
    >
      <span className={`ab-toggle__left${value ? '' : ' ab-toggle__left--on'}`} />
      <span className={`ab-toggle__right${value ? ' ab-toggle__right--on' : ''}`} />
    </div>
  </div>
);
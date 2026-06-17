import React from 'react';

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({ label, value, onChange }) => (
  <div className="mf">
    <label>{label}</label>
    <div className="tog" onClick={() => onChange(!value)} onKeyDown={(e) => e.key === 'Enter' && onChange(!value)} role="button" tabIndex={0}>
      <div className={`tog-sw ${value ? 'on' : ''}`} />
      <span>{value ? 'Yes' : 'No'}</span>
    </div>
  </div>
);

import React from 'react';
import type { SignupReferenceCountryCode } from '../../../api/auth';

type CountryCodeSelectProps = {
  value: string;
  options: SignupReferenceCountryCode[];
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
};

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value,
  options,
  onChange,
  disabled,
  error,
  id = 'register-country-code',
}) => (
  <div className="shipper-register-cc">
    <select
      id={id}
      className="shipper-login-control shipper-register-cc-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={Boolean(error)}
    >
      {options.length === 0 && <option value={value || '+30'}>{value || '+30'}</option>}
      {options.map((opt) => (
        <option key={`${opt.code}-${opt.label}`} value={opt.code}>
          {opt.label || opt.code}
        </option>
      ))}
    </select>
    {error && (
      <p className="shipper-login-field-error" role="alert">
        {error}
      </p>
    )}
  </div>
);

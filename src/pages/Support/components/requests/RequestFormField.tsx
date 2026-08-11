import React from 'react';

interface RequestFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function RequestFormField({ label, required, error, children }: RequestFormFieldProps) {
  return (
    <div className="form-group">
      <div className="form-label">
        {label}
        {required ? <span className="req"> *</span> : null}
      </div>
      {children}
      {error ? <div className="form-error">{error}</div> : null}
    </div>
  );
}

import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { Conflict } from '../../hooks/useConflicts';
import { translateConflict, translateFieldConflict } from './validation';

interface FieldValidationHintProps {
  conflicts: Conflict[];
  show: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  compact?: boolean;
}

export const FieldValidationHint: React.FC<FieldValidationHintProps> = ({
  conflicts,
  show,
  t,
  compact = false,
}) => {
  if (!show || conflicts.length === 0) return null;

  const firstConflict = conflicts[0];
  const isWarning = firstConflict.severity === 'warning';
  const message = compact
    ? translateFieldConflict(firstConflict, t)
    : translateConflict(firstConflict, t);

  return (
    <div
      role="alert"
      className="wizard-field-hint flex items-center gap-1 mt-1 text-[11px] font-medium leading-tight select-none"
      style={{
        color: isWarning ? '#D97706' : '#DC2626',
      }}
    >
      <AlertCircle size={12} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
};


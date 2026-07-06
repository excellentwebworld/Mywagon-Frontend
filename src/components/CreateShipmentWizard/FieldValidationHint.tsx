import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Conflict } from '../../hooks/useConflicts';
import { translateConflict } from './validation';

interface FieldValidationHintProps {
  conflicts: Conflict[];
  show: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const FieldValidationHint: React.FC<FieldValidationHintProps> = ({ conflicts, show, t }) => {
  if (!show || conflicts.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-1 mt-1 text-[10px] font-semibold leading-snug"
      style={{ color: '#DC2626' }}
    >
      <AlertTriangle size={10} className="shrink-0 mt-0.5" />
      <span>{translateConflict(conflicts[0], t)}</span>
    </div>
  );
};

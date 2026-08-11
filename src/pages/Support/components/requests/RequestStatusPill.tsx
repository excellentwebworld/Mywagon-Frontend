import React from 'react';
import type { SupportRequestStatus } from '../../types';

interface RequestStatusPillProps {
  status: SupportRequestStatus;
  label: string;
}

function statusClass(status: SupportRequestStatus): string {
  switch (status) {
    case 'not_started':
      return 'status-new';
    case 'in_progress':
      return 'status-progress';
    case 'pending_approval':
      return 'status-waiting';
    case 'done':
      return 'status-resolved';
    default:
      return 'status-waiting';
  }
}

export function RequestStatusPill({ status, label }: RequestStatusPillProps) {
  return (
    <span className={`status-pill ${statusClass(status)}`}>
      <span className="st-dot" aria-hidden />
      {label}
    </span>
  );
}

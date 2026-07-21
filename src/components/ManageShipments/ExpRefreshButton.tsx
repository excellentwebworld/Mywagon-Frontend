import React from 'react';
import { RefreshCw } from 'lucide-react';

/** Compact refresh control for row expansion panels. */
export function ExpRefreshButton({
  loading = false,
  onRefresh,
  t,
}: {
  loading?: boolean;
  onRefresh: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <button
      type="button"
      className={`exp-refresh-btn${loading ? ' is-loading' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) onRefresh();
      }}
      disabled={loading}
      title={t('refreshDetails')}
      aria-label={t('refreshDetails')}
    >
      <RefreshCw size={14} strokeWidth={2.25} aria-hidden />
      <span>{t('refresh')}</span>
    </button>
  );
}

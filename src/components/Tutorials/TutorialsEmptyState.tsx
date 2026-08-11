import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface TutorialsEmptyStateProps {
  title: string;
  subtitle: string;
  onClearFilters?: () => void;
  clearLabel?: string;
}

export const TutorialsEmptyState: React.FC<TutorialsEmptyStateProps> = ({
  title,
  subtitle,
  onClearFilters,
  clearLabel,
}) => {
  return (
    <div className="tut-empty-state">
      <div className="tut-empty-icon-wrap">
        <Search size={28} strokeWidth={1.75} aria-hidden />
      </div>
      <h4>{title}</h4>
      <p>{subtitle}</p>
      {onClearFilters && clearLabel && (
        <button type="button" className="btn btn-secondary btn-sm tut-empty-clear" onClick={onClearFilters}>
          <SlidersHorizontal size={14} aria-hidden />
          {clearLabel}
        </button>
      )}
    </div>
  );
};

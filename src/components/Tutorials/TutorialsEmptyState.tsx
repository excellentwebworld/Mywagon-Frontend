import React from 'react';
import { Search } from 'lucide-react';

interface TutorialsEmptyStateProps {
  title: string;
  subtitle: string;
}

export const TutorialsEmptyState: React.FC<TutorialsEmptyStateProps> = ({ title, subtitle }) => {
  return (
    <div className="tut-empty-state">
      <Search size={48} strokeWidth={1.5} aria-hidden />
      <h4>{title}</h4>
      <p>{subtitle}</p>
    </div>
  );
};

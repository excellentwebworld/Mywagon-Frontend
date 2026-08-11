import React from 'react';
import type { TutorialModuleConfig } from '../../config/tutorialModules';

interface ModuleFilterBarProps {
  modules: Array<{ slug: string; config: TutorialModuleConfig }>;
  activeFilter: string;
  onFilterChange: (slug: string) => void;
  allLabel: string;
  getPillLabel: (config: TutorialModuleConfig) => string;
}

export const ModuleFilterBar: React.FC<ModuleFilterBarProps> = ({
  modules,
  activeFilter,
  onFilterChange,
  allLabel,
  getPillLabel,
}) => {
  return (
    <div className="tut-filter-bar" role="tablist" aria-label="Module filters">
      <button
        type="button"
        role="tab"
        aria-selected={activeFilter === 'all'}
        className={`tut-f-pill${activeFilter === 'all' ? ' active' : ''}`}
        onClick={() => onFilterChange('all')}
      >
        {allLabel}
      </button>
      {modules.map(({ slug, config }) => (
        <button
          key={slug}
          type="button"
          role="tab"
          aria-selected={activeFilter === slug}
          className={`tut-f-pill${activeFilter === slug ? ' active' : ''}`}
          onClick={() => onFilterChange(slug)}
        >
          {getPillLabel(config)}
        </button>
      ))}
    </div>
  );
};

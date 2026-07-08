import React from 'react';

interface SavedViewsBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  t: (key: string) => string;
}

const VIEWS = ['workQueue', 'allShipments', 'delivered'] as const;

export const SavedViewsBar: React.FC<SavedViewsBarProps> = ({ activeView, onViewChange, t }) => (
  <div className="views-bar">
    {VIEWS.map((view) => (
      <button
        key={view}
        type="button"
        className={`sv-tab ${activeView === view ? 'act' : ''}`}
        onClick={() => onViewChange(view)}
      >
        {t(view)}
        {view === 'workQueue' && activeView === view && <span className="sv-x">✕</span>}
      </button>
    ))}
    <button type="button" className="sv-add">
      + {t('addView')} (3/50)
    </button>
    <button type="button" className="sv-all">
      {t('allViews')}
    </button>
  </div>
);

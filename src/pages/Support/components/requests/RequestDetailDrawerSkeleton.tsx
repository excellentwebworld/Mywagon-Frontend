import React from 'react';

export function RequestDetailDrawerSkeleton() {
  return (
    <div className="support-drawer-skeleton support-skeleton" aria-busy="true" aria-label="Loading ticket">
      <div className="support-skeleton-block support-drawer-skeleton-title" />
      <div className="support-drawer-badges">
        <div className="support-skeleton-block support-drawer-skeleton-badge" />
        <div className="support-skeleton-block support-drawer-skeleton-badge" />
      </div>
      <div className="support-drawer-meta">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="support-drawer-meta-item">
            <div className="support-skeleton-block support-skeleton-label" />
            <div className="support-skeleton-block support-skeleton-line support-skeleton-line--md" />
          </div>
        ))}
      </div>
      <div className="support-drawer-section">
        <div className="support-skeleton-block support-skeleton-label" />
        <div className="support-skeleton-block support-drawer-skeleton-description" />
      </div>
    </div>
  );
}

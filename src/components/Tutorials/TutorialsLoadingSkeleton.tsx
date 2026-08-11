import React from 'react';

const SkeletonCard: React.FC = () => (
  <div className="tut-skeleton-card" aria-hidden>
    <div className="tut-skeleton-head">
      <div className="tut-skeleton-icon" />
      <div className="tut-skeleton-text">
        <div className="tut-skeleton-line tut-skeleton-line--title" />
        <div className="tut-skeleton-line tut-skeleton-line--desc" />
      </div>
    </div>
    <div className="tut-skeleton-rows">
      {[0, 1, 2].map((i) => (
        <div key={i} className="tut-skeleton-row" />
      ))}
    </div>
  </div>
);

export const TutorialsLoadingSkeleton: React.FC = () => (
  <div className="tut-skeleton-grid" aria-busy="true" aria-label="Loading tutorials">
    {[0, 1, 2, 4, 5, 6].map((i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

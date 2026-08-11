import React from 'react';

const CATEGORY_COUNT = 8;
const POPULAR_COUNT = 6;

export function KbLoadingSkeleton() {
  return (
    <div className="support-skeleton" aria-busy="true" aria-label="Loading knowledge base">
      <div className="kb-cats support-skeleton-cats">
        {Array.from({ length: CATEGORY_COUNT }, (_, i) => (
          <div key={i} className="support-skeleton-cat" aria-hidden>
            <div className="support-skeleton-block support-skeleton-cat-icon" />
            <div className="support-skeleton-cat-text">
              <div className="support-skeleton-block support-skeleton-line support-skeleton-line--md" />
              <div className="support-skeleton-block support-skeleton-line support-skeleton-line--sm" />
            </div>
          </div>
        ))}
      </div>

      <div className="support-skeleton-block support-skeleton-popular-title" aria-hidden />

      <div className="article-list support-skeleton-articles">
        {Array.from({ length: POPULAR_COUNT }, (_, i) => (
          <div key={i} className="support-skeleton-article" aria-hidden>
            <div className="support-skeleton-block support-skeleton-article-icon" />
            <div className="support-skeleton-block support-skeleton-line support-skeleton-line--lg" />
            <div className="support-skeleton-block support-skeleton-tag" />
          </div>
        ))}
      </div>
    </div>
  );
}

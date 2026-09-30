import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';

interface KbArticlesLoadingSkeletonProps {
  count?: number;
}

export function KbArticlesLoadingSkeleton({ count = 5 }: KbArticlesLoadingSkeletonProps) {
  const { t } = useTranslation();
  return (
    <div className="article-list support-skeleton-articles" aria-busy="true" aria-label={t('loadingArticles', 'Loading articles')}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="support-skeleton-article" aria-hidden>
          <div className="support-skeleton-block support-skeleton-article-icon" />
          <div className="support-skeleton-block support-skeleton-line support-skeleton-line--lg" />
          <div className="support-skeleton-block support-skeleton-tag" />
        </div>
      ))}
    </div>
  );
}

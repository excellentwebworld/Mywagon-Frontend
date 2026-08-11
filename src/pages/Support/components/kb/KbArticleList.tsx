import React, { useMemo } from 'react';
import type { KbArticleSummary, KbCategory } from '../../types';

interface KbArticleListProps {
  articles: KbArticleSummary[];
  categories: KbCategory[];
  searchQuery?: string;
  onSelect: (articleId: string) => void;
  highlightSearch?: boolean;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="kb-search-mark">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function KbArticleList({
  articles,
  categories,
  searchQuery = '',
  onSelect,
  highlightSearch = false,
}: KbArticleListProps) {
  const categoryMap = useMemo(() => {
    const map = new Map<string, KbCategory>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="article-list">
      {articles.map((article) => {
        const cat = categoryMap.get(article.category_id);

        return (
          <button
            key={article.id}
            type="button"
            className="article-item"
            onClick={() => onSelect(article.id)}
          >
            <div className="ai-icon" style={{ background: cat?.icon_bg || 'var(--surface-alt)' }}>
              {cat?.icon || '📄'}
            </div>
            <div className="ai-title">
              {highlightSearch && searchQuery
                ? highlightMatch(article.title, searchQuery)
                : article.title}
            </div>
            {article.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="ai-tag">
                {tag}
              </span>
            ))}
            <span className="ai-arrow" aria-hidden>
              →
            </span>
          </button>
        );
      })}
    </div>
  );
}

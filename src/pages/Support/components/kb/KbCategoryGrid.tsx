import React from 'react';
import type { KbCategory } from '../../types';

interface KbCategoryGridProps {
  categories: KbCategory[];
  articlesLabel: string;
  onSelect: (categoryId: string) => void;
}

export function KbCategoryGrid({ categories, articlesLabel, onSelect }: KbCategoryGridProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="kb-cats">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className="kb-cat"
          onClick={() => onSelect(cat.id)}
        >
          <div className="kc-icon" style={{ background: cat.icon_bg }}>
            {cat.icon}
          </div>
          <div>
            <div className="kc-name">{cat.name}</div>
            <div className="kc-count">
              {cat.article_count} {articlesLabel}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

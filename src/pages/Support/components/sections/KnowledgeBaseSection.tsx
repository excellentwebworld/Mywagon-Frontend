import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import { KbSearchBar } from '../kb/KbSearchBar';
import { KbCategoryGrid } from '../kb/KbCategoryGrid';
import { KbArticleList } from '../kb/KbArticleList';
import { KbArticleModal } from '../kb/KbArticleModal';

interface KnowledgeBaseSectionProps {
  disabled?: boolean;
  onArticleCountChange?: (count: number) => void;
}

export function KnowledgeBaseSection({ disabled = false, onArticleCountChange }: KnowledgeBaseSectionProps) {
  const { t, lang } = useTranslation();

  const kb = useKnowledgeBase({ lang, disabled });

  React.useEffect(() => {
    onArticleCountChange?.(kb.totalArticleCount);
  }, [kb.totalArticleCount, onArticleCountChange]);

  if (disabled) {
    return <div className="support-placeholder">{t('support.kb.gatedMessage')}</div>;
  }

  const articlesLabel = t('support.kb.articles');
  const showPopular = !kb.isSearchMode && !kb.selectedCategoryId;

  return (
    <>
      <KbSearchBar
        value={kb.searchQuery}
        onChange={kb.setSearchQuery}
        placeholder={t('support.kb.searchPlaceholder')}
      />

      {kb.error ? (
        <div className="kb-message kb-message--error">{t('support.kb.errorLoad')}</div>
      ) : null}

      {kb.loadingCategories && categoriesEmpty(kb.categories) ? (
        <div className="kb-message">{t('support.kb.loading')}</div>
      ) : null}

      {kb.isSearchMode ? (
        <>
          <div className="kb-results-meta">
            {kb.loadingArticles
              ? t('support.kb.loading')
              : t(kb.articles.length === 1 ? 'support.kb.resultFor' : 'support.kb.resultsFor', {
                  count: kb.articles.length,
                  query: kb.debouncedQuery,
                })}
          </div>
          {!kb.loadingArticles && kb.articles.length === 0 ? (
            <div className="kb-message">{t('support.kb.noResults')}</div>
          ) : (
            <KbArticleList
              articles={kb.articles}
              categories={kb.categories}
              searchQuery={kb.debouncedQuery}
              onSelect={kb.openArticle}
              highlightSearch
            />
          )}
        </>
      ) : kb.selectedCategory && kb.selectedCategoryId ? (
        <>
          <button type="button" className="kb-back" onClick={kb.backToCategories}>
            ← {t('support.kb.backToCategories')}
          </button>
          <div className="kb-category-header">
            <div className="kb-category-header-icon" style={{ background: kb.selectedCategory.icon_bg }}>
              {kb.selectedCategory.icon}
            </div>
            <div>
              <div className="kb-category-header-title">{kb.selectedCategory.name}</div>
              <div className="kb-category-header-count">
                {kb.selectedCategory.article_count} {articlesLabel}
              </div>
            </div>
          </div>
          {kb.loadingArticles ? (
            <div className="kb-message">{t('support.kb.loading')}</div>
          ) : kb.articles.length === 0 ? (
            <div className="kb-message">{t('support.kb.emptyCategory')}</div>
          ) : (
            <KbArticleList
              articles={kb.articles}
              categories={kb.categories}
              onSelect={kb.openArticle}
            />
          )}
        </>
      ) : (
        <>
          <KbCategoryGrid
            categories={kb.categories}
            articlesLabel={articlesLabel}
            onSelect={kb.selectCategory}
          />

          {kb.categories.length === 0 && !kb.loadingCategories ? (
            <div className="kb-message">{t('support.kb.emptyCategories')}</div>
          ) : null}

          {showPopular && kb.popularArticles.length > 0 ? (
            <>
              <div className="kb-popular-title">{t('support.kb.popularArticles')}</div>
              <KbArticleList
                articles={kb.popularArticles}
                categories={kb.categories}
                onSelect={kb.openArticle}
              />
            </>
          ) : null}
        </>
      )}

      <KbArticleModal
        open={kb.modalOpen}
        loading={kb.loadingArticle}
        article={kb.selectedArticle}
        onClose={kb.closeModal}
        onVote={kb.submitFeedback}
        loadingLabel={t('support.kb.loadingArticle')}
        helpfulLabels={{
          label: t('support.kb.wasHelpful'),
          yes: t('support.kb.yes'),
          no: t('support.kb.no'),
          thanksYes: t('support.kb.thanksYes'),
          notedNo: t('support.kb.notedNo'),
        }}
      />
    </>
  );
}

function categoriesEmpty(categories: { length: number }): boolean {
  return categories.length === 0;
}

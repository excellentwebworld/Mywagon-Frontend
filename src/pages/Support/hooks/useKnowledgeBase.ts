import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supportService } from '../../../api/services/supportService';
import type { KbArticleDetail, KbArticleSummary, KbCategory } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

interface UseKnowledgeBaseOptions {
  lang: string;
  disabled?: boolean;
}

export function useKnowledgeBase({ lang, disabled = false }: UseKnowledgeBaseOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [popularArticles, setPopularArticles] = useState<KbArticleSummary[]>([]);
  const [articles, setArticles] = useState<KbArticleSummary[]>([]);

  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';

  const setSearchQuery = useCallback(
    (val: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (val.trim()) {
            next.set('q', val);
          } else {
            next.delete('q');
            next.delete('search');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KbArticleDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (disabled) {
      setCategories([]);
      setPopularArticles([]);
      setArticles([]);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingCategories(true);
      setError(null);
      try {
        const [cats, popular] = await Promise.all([
          supportService.getKbCategories(lang),
          supportService.getKbArticles({ lang, popular: true }),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setPopularArticles(popular);
      } catch {
        if (!cancelled) {
          setError('load_failed');
          setCategories([]);
          setPopularArticles([]);
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang, disabled]);

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;

    (async () => {
      setLoadingArticles(true);
      setError(null);
      try {
        if (debouncedQuery) {
          const results = await supportService.getKbArticles({ lang, q: debouncedQuery });
          if (!cancelled) {
            const q = debouncedQuery.toLowerCase();
            const sorted = [...results].sort((a, b) => {
              const titleA = a.title.toLowerCase();
              const titleB = b.title.toLowerCase();
              const matchA = titleA.startsWith(q) ? 1 : titleA.includes(q) ? 2 : 3;
              const matchB = titleB.startsWith(q) ? 1 : titleB.includes(q) ? 2 : 3;
              return matchA - matchB;
            });
            setArticles(sorted);
            setSelectedCategoryId(null);
          }
          return;
        }

        if (selectedCategoryId) {
          const results = await supportService.getKbArticles({
            lang,
            category: selectedCategoryId,
          });
          if (!cancelled) setArticles(results);
          return;
        }

        if (!cancelled) setArticles([]);
      } catch {
        if (!cancelled) {
          setError('load_failed');
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoadingArticles(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang, disabled, debouncedQuery, selectedCategoryId]);

  const openArticle = useCallback(
    async (articleId: string) => {
      if (disabled) return;

      setLoadingArticle(true);
      setArticleError(null);
      setModalOpen(true);
      setSelectedArticle(null);
      try {
        const detail = await supportService.getKbArticle(articleId, lang);
        if (!detail) {
          setArticleError('not_found');
        } else {
          setSelectedArticle(detail);
        }
      } catch {
        setArticleError('load_failed');
      } finally {
        setLoadingArticle(false);
      }
    },
    [disabled, lang]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedArticle(null);
    setArticleError(null);
  }, []);

  const selectCategory = useCallback((categoryId: string) => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategoryId(categoryId);
  }, []);

  const backToCategories = useCallback(() => {
    setSelectedCategoryId(null);
    setArticles([]);
  }, []);

  const totalArticleCount = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.article_count, 0),
    [categories]
  );

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const isSearchMode = debouncedQuery.length > 0;

  return {
    categories,
    popularArticles,
    articles,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    selectedCategoryId,
    selectedCategory,
    selectedArticle,
    modalOpen,
    loadingCategories,
    loadingArticles,
    loadingArticle,
    articleError,
    error,
    totalArticleCount,
    isSearchMode,
    openArticle,
    closeModal,
    selectCategory,
    backToCategories,
  };
}

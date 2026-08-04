/**
 * Performance & reviews — company KPIs and transporter reviews (shipper profile).
 * KPIs load first; reviews paginate on scroll so the page never stays stuck on skeleton.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { BarChart2, Star } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { personalSettingsService } from '../../../api/services/personalSettingsService';
import { parseUtcInstant } from '../../../utils/timezone';

const PAGE_SIZE = 15;

export default function PerformanceSection() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsLastPage, setReviewsLastPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const listRef = useRef(null);
  const loadingMoreRef = useRef(false);

  // KPIs only — do not block the page on reviews.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const payload = await personalSettingsService.get();
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) {
          toastRef.current.error(
            e instanceof Error ? e.message : 'Failed to load personal settings'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchReviewsPage = useCallback(async (page) => {
    const result = await personalSettingsService.getRatings(page, PAGE_SIZE);
    setReviews((prev) => {
      if (page <= 1) return result.items;
      const seen = new Set(prev.map((r) => r.id));
      return [...prev, ...result.items.filter((r) => !seen.has(r.id))];
    });
    setReviewsPage(result.meta.current_page);
    setReviewsLastPage(result.meta.last_page);
    setReviewsTotal(result.meta.total);
    return result;
  }, []);

  // First page of reviews (independent of KPIs).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReviewsLoading(true);
      try {
        await fetchReviewsPage(1);
      } catch (e) {
        if (!cancelled) {
          setReviews([]);
          setReviewsPage(0);
          setReviewsLastPage(1);
          setReviewsTotal(0);
          toastRef.current.error(
            e instanceof Error ? e.message : 'Failed to load reviews'
          );
        }
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchReviewsPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || reviewsPage >= reviewsLastPage) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await fetchReviewsPage(reviewsPage + 1);
    } catch (e) {
      toastRef.current.error(e instanceof Error ? e.message : 'Failed to load reviews');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [reviewsPage, reviewsLastPage, fetchReviewsPage]);

  useEffect(() => {
    if (loading || reviewsLoading || reviewsPage >= reviewsLastPage) return;
    const node = sentinelRef.current;
    const root = listRef.current;
    if (!node || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { root, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, reviewsLoading, reviewsPage, reviewsLastPage, loadMore, reviews.length]);

  if (loading) {
    return <PerformanceSkeleton T={T} />;
  }

  if (!data?.performance) {
    return (
      <div className="rounded-xl px-5 py-8 text-center" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <p style={{ fontSize: 13, color: T.t3 }}>{t('settings.profileSection.loadError')}</p>
      </div>
    );
  }

  const perf = data.performance;
  const reviewCount = reviewsTotal || perf.rating_count || 0;
  const locale = i18n.language?.startsWith('el') ? 'el' : 'en-GB';

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        <BarChart2 size={16} style={{ color: T.ac }} />
        <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>
          {t('settings.performanceReviews')}
        </h3>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <InfoRow
            label={t('settings.profileSection.averageRating')}
            value={
              perf.rating_average != null && perf.rating_average > 0
                ? `${perf.rating_average} / 5`
                : '—'
            }
          />
          <InfoRow
            label={t('settings.profileSection.cancellationRate')}
            value={perf.cancellation_rate_pct != null ? `${perf.cancellation_rate_pct}%` : '—'}
          />
          <InfoRow
            label={t('settings.profileSection.avgLoadingWait')}
            value={
              perf.avg_loading_wait_minutes != null
                ? `${perf.avg_loading_wait_minutes} min`
                : '—'
            }
          />
        </div>
        <p style={{ fontSize: 11, color: T.t3, marginBottom: 16 }}>
          {t('settings.profileSection.performanceHint')}
        </p>

        <div className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: 12, color: T.t2 }}>
          <Star size={14} style={{ color: T.ac }} />
          {t('settings.profileSection.reviews')} ({reviewCount})
        </div>

        {reviewsLoading ? (
          <ReviewsSkeleton T={T} count={4} />
        ) : reviewCount === 0 ? (
          <p style={{ fontSize: 12, color: T.t3 }}>{t('settings.profileSection.noReviews')}</p>
        ) : (
          <div ref={listRef} className="space-y-3 max-h-[32rem] overflow-y-auto">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="px-3 py-3 rounded-lg"
                style={{ background: T.sa, border: `1px solid ${T.bd}` }}
              >
                <div className="flex items-start gap-3">
                  {review.rater_avatar_url ? (
                    <img src={review.rater_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: T.ac, color: '#fff', fontSize: 12, fontWeight: 700 }}
                    >
                      {(review.rater_name || '?').charAt(0).toLocaleUpperCase(locale)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                        {review.rater_name || t('settings.profileSection.anonymousRater')}
                      </span>
                      <span style={{ fontSize: 10, color: T.t3 }}>
                        {formatRelativeTime(review.created_at, t, locale)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: T.ac, marginTop: 4 }}>
                      {'★'.repeat(review.rating || 0)}{'☆'.repeat(Math.max(0, 5 - (review.rating || 0)))}
                    </div>
                    {review.review && (
                      <p style={{ fontSize: 12, color: T.t2, marginTop: 6 }}>{review.review}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
            {loadingMore && (
              <p style={{ fontSize: 11, color: T.t3, textAlign: 'center', paddingBottom: 8 }}>
                {t('settings.profileSection.loadingMoreReviews')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PerformanceSkeleton({ T }) {
  const sk = { baseColor: T.sa, highlightColor: T.bd };
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: T.sf, border: `1px solid ${T.bd}` }}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        <Skeleton circle width={16} height={16} {...sk} />
        <Skeleton width={160} height={14} borderRadius={4} {...sk} />
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-3 py-2 rounded-lg" style={{ background: T.sa }}>
              <Skeleton width={90} height={10} borderRadius={4} {...sk} />
              <div style={{ marginTop: 8 }}>
                <Skeleton width={72} height={16} borderRadius={4} {...sk} />
              </div>
            </div>
          ))}
        </div>
        <Skeleton width="85%" height={10} borderRadius={4} {...sk} />
        <div className="flex items-center gap-2 mt-5 mb-3">
          <Skeleton circle width={14} height={14} {...sk} />
          <Skeleton width={100} height={12} borderRadius={4} {...sk} />
        </div>
        <ReviewsSkeleton T={T} count={4} />
      </div>
    </div>
  );
}

function ReviewsSkeleton({ T, count = 4 }) {
  const sk = { baseColor: T.sa, highlightColor: T.bd };
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="px-3 py-3 rounded-lg"
          style={{ background: T.sa, border: `1px solid ${T.bd}` }}
        >
          <div className="flex items-start gap-3">
            <Skeleton circle width={40} height={40} {...sk} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <Skeleton width={140} height={12} borderRadius={4} {...sk} />
                <Skeleton width={48} height={10} borderRadius={4} {...sk} />
              </div>
              <div style={{ marginTop: 8 }}>
                <Skeleton width={88} height={12} borderRadius={4} {...sk} />
              </div>
              <div style={{ marginTop: 8 }}>
                <Skeleton width="75%" height={10} borderRadius={4} {...sk} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }) {
  const { T } = useTheme();
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: T.sa }}>
      <div style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{value}</div>
    </div>
  );
}

function formatRelativeTime(iso, t, locale) {
  if (!iso) return '—';
  const d = parseUtcInstant(iso);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('justNow');
  if (mins < 60) return t('relativeMinutes', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('relativeHours', { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return t('relativeDays', { count: days });
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

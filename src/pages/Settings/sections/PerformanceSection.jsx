/**
 * Performance & Reviews — company KPIs and transporter reviews (shipper profile).
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { BarChart2, Star } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { personalSettingsService } from '../../../api/services/personalSettingsService';
import { parseUtcInstant } from '../../../utils/timezone';

export default function PerformanceSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await personalSettingsService.get();
      setData(payload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.profileSection.loadError'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-4 space-y-4">
          <Skeleton height={72} borderRadius={8} baseColor={T.sa} highlightColor={T.bd} />
          <Skeleton height={120} borderRadius={8} baseColor={T.sa} highlightColor={T.bd} />
        </div>
      </div>
    );
  }

  if (!data?.performance) {
    return (
      <div className="rounded-xl px-5 py-8 text-center" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <p style={{ fontSize: 13, color: T.t3 }}>{t('settings.profileSection.loadError')}</p>
      </div>
    );
  }

  const perf = data.performance;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        <BarChart2 size={16} style={{ color: T.ac }} />
        <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>
          {t('settings.performanceReviews') || 'Performance & Reviews'}
        </h3>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <InfoRow
            label={t('averageRating') || 'Average rating'}
            value={
              perf.rating_average != null && perf.rating_average > 0
                ? `${perf.rating_average} / 5`
                : '—'
            }
          />
          <InfoRow
            label={t('satCancellationRate') || 'Cancellation rate'}
            value={perf.cancellation_rate_pct != null ? `${perf.cancellation_rate_pct}%` : '—'}
          />
          <InfoRow
            label={t('avgLoadingWait') || 'Avg loading wait'}
            value={
              perf.avg_loading_wait_minutes != null
                ? `${perf.avg_loading_wait_minutes} min`
                : '—'
            }
          />
        </div>
        <p style={{ fontSize: 11, color: T.t3, marginBottom: 16 }}>
          {t('settings.profileSection.performanceHint')
            || 'Company-level metrics: cancels by your company, and average driver-reported loading wait at your pickups.'}
        </p>

        <div className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: 12, color: T.t2 }}>
          <Star size={14} style={{ color: T.ac }} />
          {t('reviews') || 'Reviews'} ({perf.rating_count ?? perf.ratings?.length ?? 0})
        </div>

        {(perf.ratings || []).length === 0 ? (
          <p style={{ fontSize: 12, color: T.t3 }}>{t('settings.profileSection.noReviews') || 'No reviews yet'}</p>
        ) : (
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {(perf.ratings || []).map((review) => (
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
                      {(review.rater_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                        {review.rater_name || t('transporter') || 'Transporter'}
                      </span>
                      <span style={{ fontSize: 10, color: T.t3 }}>{relativeTime(review.created_at)}</span>
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
          </div>
        )}
      </div>
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

function relativeTime(iso) {
  if (!iso) return '—';
  const d = parseUtcInstant(iso);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

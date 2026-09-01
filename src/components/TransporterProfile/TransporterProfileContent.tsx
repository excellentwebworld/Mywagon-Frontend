import React from 'react';
import type {
  TransporterProfileData,
  TransporterProfileMeta,
} from '../../api/services/transporterProfileService';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';

interface TransporterProfileContentProps {
  data: TransporterProfileData;
  meta: TransporterProfileMeta | null;
  page: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function fmtPct(v: number | null | undefined): string {
  return v == null ? '—' : `${v}%`;
}

function fmtMin(v: number | null | undefined): string {
  return v == null ? '—' : `${Math.round(v)}m`;
}

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <span className="tp-stars" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'tp-star tp-star--on' : 'tp-star'}>
          ★
        </span>
      ))}
    </span>
  );
}

export const TransporterProfileContent: React.FC<TransporterProfileContentProps> = ({
  data,
  meta,
  page,
  loading,
  onPageChange,
  t,
}) => {
  const profile = data?.profile || {
    id: 0,
    type: 'carrier' as const,
    name: 'Transporter',
    avatar_url: null,
    vat_number: null,
    rating_average: 4.9,
    rating_count: 0,
    show_performance_kpis: true,
  };
  const performance = data?.performance || {
    on_time_delivery_pct: null,
    cancellation_rate_pct: null,
    avg_pickup_delay_minutes: null,
  };
  const dist = data?.rating_distribution || {
    one_pct: 0,
    two_pct: 0,
    three_pct: 0,
    four_pct: 0,
    five_pct: 100,
  };
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const ratingAvg = profile.rating_average ?? 0;
  const showPerformanceKpis = profile.show_performance_kpis !== false;

  const distributionRows = [
    { star: 5, pct: dist.five_pct || 0 },
    { star: 4, pct: dist.four_pct || 0 },
    { star: 3, pct: dist.three_pct || 0 },
    { star: 2, pct: dist.two_pct || 0 },
    { star: 1, pct: dist.one_pct || 0 },
  ];

  return (
    <div className="tp-content">
      <div className="tp-header-card">
        <CarrierAvatar
          className="tp-avatar"
          name={profile.name}
          avatar={profile.avatar_url}
        />
        <div className="tp-header-text">
          <div className="tp-name">{profile.name}</div>
          <div className="tp-rating-row">
            <Stars value={ratingAvg} />
            <span className="tp-rating-avg">
              {profile.rating_average != null ? profile.rating_average.toFixed(1) : '0.0'}
            </span>
            <span className="tp-rating-count">
              ({profile.rating_count}) {t('ratings') || 'Ratings'}
            </span>
          </div>
          {showPerformanceKpis && (
          <div className="tp-kpi-row">
            <span className="tp-kpi">
              {t('onTimeDelivery')}: <strong>{fmtPct(performance.on_time_delivery_pct)}</strong>
            </span>
            <span className="tp-kpi">
              {t('cancelRate')}: <strong>{fmtPct(performance.cancellation_rate_pct)}</strong>
            </span>
            <span className="tp-kpi">
              {t('avgPickupDelay') || 'Avg pickup delay'}:{' '}
              <strong>{fmtMin(performance.avg_pickup_delay_minutes)}</strong>
            </span>
          </div>
          )}
        </div>
      </div>

      <div className="tp-section-title">{t('ratings') || 'Ratings'}</div>

      <div className="tp-distribution">
        {distributionRows.map(({ star, pct }) => (
          <div key={star} className="tp-dist-row">
            <span className="tp-dist-label">{star}</span>
            <div className="tp-dist-bar-wrap">
              <div className="tp-dist-bar" style={{ width: `${pct}%` }} />
            </div>
            <span className="tp-dist-pct">{pct}%</span>
          </div>
        ))}
      </div>

      <ul className="tp-reviews">
        {reviews.length === 0 ? (
          <li className="tp-review-empty">{t('noReviewsYet') || 'No reviews yet'}</li>
        ) : (
          reviews.map((review) => (
            <li key={review.id} className="tp-review">
              <div className="tp-review-head">
                <Stars value={review.rating ?? 0} />
                {review.rater_name && <span className="tp-review-rater">{review.rater_name}</span>}
                {review.created_at && (
                  <span className="tp-review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {review.delivery_on_time != null && (
                <div className="tp-review-otd">
                  {review.delivery_on_time
                    ? t('deliveryOnTime') || 'Delivery on time'
                    : t('deliveryLate') || 'Delivery late'}
                </div>
              )}
              {review.review && <p className="tp-review-text">{review.review}</p>}
            </li>
          ))
        )}
      </ul>

      {meta && meta.last_page > 1 && (
        <div className="tp-pagination">
          <button
            type="button"
            className="tp-page-btn"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            {t('previous') || 'Previous'}
          </button>
          <span className="tp-page-info">
            {page} / {meta.last_page}
          </span>
          <button
            type="button"
            className="tp-page-btn"
            disabled={page >= meta.last_page || loading}
            onClick={() => onPageChange(page + 1)}
          >
            {t('next') || 'Next'}
          </button>
        </div>
      )}
    </div>
  );
};

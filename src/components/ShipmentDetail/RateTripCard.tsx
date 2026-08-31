import React, { useState } from 'react';
import { Star, CheckCircle2, Clock } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';

interface RateTripCardProps {
  carrierName: string;
  expanded: boolean;
  onToggle: () => void;
  onSubmitRating?: (payload: {
    rating: number;
    review: string;
    delivery_on_time?: boolean;
  }) => void;
  submitting?: boolean;
  initialRating?: number;
  initialReview?: string;
  isAlreadyRated?: boolean;
  wasOnTime?: boolean;
  t: (key: string, fallback?: string) => string;
}

export const RateTripCard: React.FC<RateTripCardProps> = ({
  carrierName,
  expanded,
  onToggle,
  onSubmitRating,
  submitting = false,
  initialRating = 5,
  initialReview = '',
  isAlreadyRated = false,
  wasOnTime = true,
  t,
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState<string>(initialReview);
  const [onTime, setOnTime] = useState<boolean>(wasOnTime);
  const [submitted, setSubmitted] = useState<boolean>(isAlreadyRated);

  const handleSubmit = () => {
    if (onSubmitRating) {
      onSubmitRating({
        rating,
        review,
        delivery_on_time: onTime,
      });
    }
    setSubmitted(true);
  };

  return (
    <CollapsibleCard
      id="rate"
      icon={<Star size={15} />}
      title={t('rateThisTrip', 'Rate this trip')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div
        className="p-3.5 rounded-xl"
        style={{
          background: submitted ? '#F0FDF4' : '#FAF5FF',
          border: submitted ? '1px solid #BBF7D0' : '1px solid #E9D5FF',
        }}
      >
        {submitted ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[13px] text-[#065F46]">
                <CheckCircle2 size={16} />
                <span>{t('ratingSubmittedTitle', 'Rating submitted')}</span>
              </div>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={15}
                    fill={rating >= star ? '#F59E0B' : 'transparent'}
                    stroke={rating >= star ? '#F59E0B' : '#CBD5E1'}
                  />
                ))}
                <span className="ml-1 font-bold text-xs text-[#18181B] font-mono">
                  {rating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#334155] flex items-center gap-3 flex-wrap">
              <span>
                {t('carrier', 'Carrier')}: <strong>{carrierName || 'Transporter'}</strong>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                <span>
                  {t('deliveryOnTime', 'Delivered on time')}:{' '}
                  <strong className={onTime ? 'text-[#059669]' : 'text-[#DC2626]'}>
                    {onTime ? t('yes', 'Yes') : t('no', 'No (Delayed)')}
                  </strong>
                </span>
              </span>
            </div>

            {review && (
              <div className="mt-1.5 p-2 rounded-lg bg-white/80 border border-[#DCFCE7] text-xs text-[#1E293B] italic">
                "{review}"
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
                {t('rateCarrierPerformance', 'Rate carrier performance')}
              </div>

              {/* Star Selector */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-0.5 transition-transform hover:scale-110 cursor-pointer"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <Star
                        size={18}
                        fill={active ? '#F59E0B' : 'transparent'}
                        stroke={active ? '#F59E0B' : '#C4B5FD'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] mb-2.5" style={{ color: '#5E5E6E' }}>
              {t('howWasExperienceWith', 'How was your overall experience with')}{' '}
              <strong style={{ color: '#18181B' }}>{carrierName || 'the carrier'}</strong>{' '}
              {t('onThisRoute', 'on this route?')}
            </div>

            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[11px] font-medium" style={{ color: '#5E5E6E' }}>
                {t('deliveredOnTimeQuestion', 'Delivered on time?')}
              </span>
              <button
                type="button"
                onClick={() => setOnTime(true)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                style={{
                  background: onTime ? '#ECFDF5' : '#FFFFFF',
                  color: onTime ? '#059669' : '#5E5E6E',
                  border: onTime ? '1px solid #A7F3D0' : '1px solid #E4E4E8',
                }}
              >
                {t('yes', 'Yes')}
              </button>
              <button
                type="button"
                onClick={() => setOnTime(false)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                style={{
                  background: !onTime ? '#FEF2F2' : '#FFFFFF',
                  color: !onTime ? '#DC2626' : '#5E5E6E',
                  border: !onTime ? '1px solid #FECACA' : '1px solid #E4E4E8',
                }}
              >
                {t('no', 'No')}
              </button>
            </div>

            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t('optionalReviewPlaceholder', 'Optional comments or feedback on driver…')}
              rows={2}
              className="w-full text-xs p-2 rounded-lg bg-white border border-[#E9D5FF] outline-none focus:border-[#9B51E0] mb-2.5"
            />

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-1.5 rounded-lg text-[12px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#9B51E0', border: 'none' }}
            >
              {submitting ? t('submitting', 'Submitting…') : t('submitReview', 'Submit review')}
            </button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};

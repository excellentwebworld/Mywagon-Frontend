import React, { useState } from 'react';
import { Star } from 'lucide-react';
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
  t,
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState<string>(initialReview);
  const [onTime, setOnTime] = useState<boolean>(true);
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
        style={{ background: '#FAF5FF', border: '1px solid #E9D5FF' }}
      >
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            {submitted
              ? t('ratingSubmittedTitle', 'Rating submitted')
              : t('rateCarrierPerformance', 'Rate carrier performance')}
          </div>

          {/* Star Selector */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  disabled={submitted}
                  onMouseEnter={() => !submitted && setHoverRating(star)}
                  onMouseLeave={() => !submitted && setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-0.5 transition-transform hover:scale-110 cursor-pointer disabled:cursor-default"
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
          {submitted ? (
            <span>
              {t('thankYouForFeedback', 'Thank you for your rating of')}{' '}
              <strong style={{ color: '#18181B' }}>{carrierName || 'the carrier'}</strong>.
            </span>
          ) : (
            <span>
              {t('howWasExperienceWith', 'How was your overall experience with')}{' '}
              <strong style={{ color: '#18181B' }}>{carrierName || 'the carrier'}</strong>{' '}
              {t('onThisRoute', 'on this route?')}
            </span>
          )}
        </div>

        {!submitted && (
          <>
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
          </>
        )}
      </div>
    </CollapsibleCard>
  );
};

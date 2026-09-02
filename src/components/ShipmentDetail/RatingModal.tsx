import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, Loader2 } from 'lucide-react';

interface RatingModalProps {
  open: boolean;
  targetName: string;
  targetType?: 'carrier' | 'driver';
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    rating: number;
    review: string;
    delivery_on_time?: boolean;
  }) => void;
  t: (key: string, fallback?: string) => string;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  open,
  targetName,
  targetType = 'carrier',
  submitting = false,
  onClose,
  onSubmit,
  t,
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    if (rating < 1) return;
    onSubmit({
      rating,
      review: review.trim(),
    });
  };

  const activeRating = hoverRating || rating;
  const targetLabel =
    targetType === 'driver'
      ? t('driver', 'Driver')
      : t('carrierCompany', 'Carrier Company');

  return createPortal(
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative p-6 sm:p-8 border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
          onClick={onClose}
          aria-label={t('close', 'Close')}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h2 className="text-[18px] font-bold text-slate-900 dark:text-white m-0">
            {t('ratingsAndReviews', 'Ratings & Reviews')}
          </h2>
          <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-2 mb-0">
            {t('rateAndReviewThe', 'Rate & Review the')}{' '}
            <span className="text-purple-600 dark:text-purple-400 font-semibold">
              {targetName ? `${targetLabel} (${targetName})` : targetLabel}
            </span>{' '}
            {t('forCompletedLoad', 'for the completed load')}
          </p>
        </div>

        {/* Star Rating Area */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 mb-5">
          <div className="flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${star} stars`}
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    star <= activeRating
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300 dark:text-slate-600 fill-transparent'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div className="text-center text-[12px] font-bold text-amber-500 mt-2">
              {rating} / 5 {t('stars', 'Stars')}
            </div>
          )}
        </div>

        {/* Review Textarea */}
        <div className="mb-6">
          <textarea
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none min-h-[95px]"
            maxLength={300}
            placeholder={t('writeYourReview', 'Write your Review')}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-2">
          <button
            type="button"
            className="w-full max-w-[280px] mx-auto py-3 px-6 rounded-xl text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-2"
            style={{ background: '#9B51E0' }}
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            <span>{submitting ? t('submitting', 'Submitting…') : t('submit', 'Submit')}</span>
          </button>
          <button
            type="button"
            className="w-full max-w-[280px] mx-auto py-2 text-[13px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer bg-transparent border-none block"
            onClick={onClose}
            disabled={submitting}
          >
            {t('notNow', 'Not now')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

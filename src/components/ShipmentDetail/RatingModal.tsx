import React, { useState } from 'react';

interface RatingModalProps {
  open: boolean;
  carrierName: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    rating: number;
    review: string;
    delivery_on_time?: boolean;
  }) => void;
  t: (key: string) => string;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  open,
  carrierName,
  submitting = false,
  onClose,
  onSubmit,
  t,
}) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [onTime, setOnTime] = useState<'yes' | 'no' | ''>('');

  if (!open) return null;

  const handleSubmit = () => {
    if (rating < 1) return;
    onSubmit({
      rating,
      review: review.trim(),
      delivery_on_time: onTime === '' ? undefined : onTime === 'yes',
    });
  };

  return (
    <div className="ld-modal-bg" onClick={onClose}>
      <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ld-modal-h">
          <h3>★ {t('ratingsAndReviews') || 'Ratings & Reviews'}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ld-modal-body">
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
            {(t('rateCarrierForLoad') || 'Rate & review {{name}} for the completed load').replace(
              '{{name}}',
              carrierName
            )}
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: 28,
                  color: star <= rating ? 'var(--warning, #f59e0b)' : 'var(--text-tertiary)',
                }}
                onClick={() => setRating(star)}
                aria-label={`${star} stars`}
              >
                ★
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              {t('wasDeliveryOnTime') || 'Was the delivery on time?'}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="radio"
                  name="delivery_on_time"
                  checked={onTime === 'yes'}
                  onChange={() => setOnTime('yes')}
                />
                {t('yes') || 'Yes'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="radio"
                  name="delivery_on_time"
                  checked={onTime === 'no'}
                  onChange={() => setOnTime('no')}
                />
                {t('no') || 'No'}
              </label>
            </div>
          </div>
          <textarea
            className="ld-share-email"
            style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
            maxLength={300}
            placeholder={t('writeYourReview') || 'Write your review'}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>
        <div className="ld-modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            {t('notNow') || 'Not now'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
          >
            {t('submit') || 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

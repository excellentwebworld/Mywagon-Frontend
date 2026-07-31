import React, { useEffect, useState } from 'react';

const DELAY_BUCKETS = [
  { value: 'under_10', labelKey: 'delayUnder10', fallback: 'Under 10 minutes' },
  { value: '10_30', labelKey: 'delay10to30', fallback: '10–30 minutes' },
  { value: '30_60', labelKey: 'delay30to60', fallback: '30–60 minutes' },
  { value: '60_120', labelKey: 'delay1to2h', fallback: '1–2 hours' },
  { value: '120_180', labelKey: 'delay2to3h', fallback: '2–3 hours' },
  { value: '180_240', labelKey: 'delay3to4h', fallback: '3–4 hours' },
  { value: '240_plus', labelKey: 'delayOver4h', fallback: 'More than 4 hours' },
  { value: 'exact', labelKey: 'delayExact', fallback: 'Exact time' },
] as const;

interface PickupDelayModalProps {
  open: boolean;
  locationLabel?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    was_on_time: boolean;
    delay_bucket?: string;
    hours?: number;
    minutes?: number;
  }) => void;
  t: (key: string) => string;
}

export const PickupDelayModal: React.FC<PickupDelayModalProps> = ({
  open,
  locationLabel,
  submitting = false,
  onClose,
  onSubmit,
  t,
}) => {
  const [onTime, setOnTime] = useState(true);
  const [bucket, setBucket] = useState<string>('10_30');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (open) {
      setOnTime(true);
      setBucket('10_30');
      setHours(0);
      setMinutes(0);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (onTime) {
      onSubmit({ was_on_time: true });
      return;
    }
    if (bucket === 'exact') {
      onSubmit({ was_on_time: false, delay_bucket: 'exact', hours, minutes });
      return;
    }
    onSubmit({ was_on_time: false, delay_bucket: bucket });
  };

  return (
    <div className="ld-modal-bg" onClick={onClose}>
      <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ld-modal-h">
          <h3>{t('driverPickupDelay') || 'Driver Pickup Delay'}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ld-modal-body">
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
            {t('wasDriverOnTimePickup') || 'Was the driver on time for pickup?'}
            {locationLabel ? ` — ${locationLabel}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="radio" checked={onTime} onChange={() => setOnTime(true)} />
              {t('yes') || 'Yes'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="radio" checked={!onTime} onChange={() => setOnTime(false)} />
              {t('no') || 'No'}
            </label>
          </div>
          {!onTime && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {t('howLongWasDelay') || 'How long was the delay?'}
              </div>
              <select
                className="ld-share-email"
                style={{ width: '100%', marginBottom: 12 }}
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
              >
                {DELAY_BUCKETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey) || opt.fallback}
                  </option>
                ))}
              </select>
              {bucket === 'exact' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    className="ld-share-email"
                    style={{ flex: 1 }}
                    placeholder={t('hours') || 'Hours'}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value) || 0)}
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="ld-share-email"
                    style={{ flex: 1 }}
                    placeholder={t('minutes') || 'Minutes'}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="ld-modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            {t('notNow') || 'Not now'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {t('submit') || 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

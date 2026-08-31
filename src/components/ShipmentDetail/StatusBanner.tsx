import React from 'react';
import { AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface StatusBannerProps {
  status: string;
  reason?: string | null;
  date?: string | null;
  details?: string | null;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  reason,
  date,
  details,
}) => {
  const isCancelled = status === 'canceled' || status === 'cancelled';
  const isUnfulfilled = status === 'not_fullfilled';
  const isPastDue = status === 'past_due';

  if (!isCancelled && !isUnfulfilled && !isPastDue) {
    return null;
  }

  if (isCancelled) {
    return (
      <div
        className="rounded-2xl px-5 py-4 mb-4"
        style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: '#FEE2E2', color: '#DC2626' }}
          >
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-bold text-[14px]" style={{ color: '#991B1B' }}>
                Shipment cancelled
              </h4>
              {date && (
                <span className="text-[11px] font-medium" style={{ color: '#B91C1C' }}>
                  Cancelled on {date}
                </span>
              )}
            </div>
            <p className="text-[12px] mt-1" style={{ color: '#B91C1C' }}>
              Reason: <strong>{reason || 'Shipper requested cancellation'}</strong>
              {details ? ` · ${details}` : ' · Read-only audit state'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isUnfulfilled) {
    return (
      <div
        className="rounded-2xl px-5 py-4 mb-4"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: '#FEF3C7', color: '#D97706' }}
          >
            <AlertCircle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-bold text-[14px]" style={{ color: '#92400E' }}>
                Trip concluded — Unfulfilled
              </h4>
              {date && (
                <span className="text-[11px] font-medium" style={{ color: '#B45309' }}>
                  Finalized on {date}
                </span>
              )}
            </div>
            <p className="text-[12px] mt-1" style={{ color: '#B45309' }}>
              Reason: <strong>{reason || 'Carrier vehicle breakdown / delivery could not be completed'}</strong>
              {details ? ` · ${details}` : ' · Incident recorded · Billing review required'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl px-5 py-4 mb-4"
      style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, background: '#FEE2E2', color: '#DC2626' }}
        >
          <Clock size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-bold text-[14px]" style={{ color: '#991B1B' }}>
              Past Due Pickup
            </h4>
            {date && (
              <span className="text-[11px] font-medium" style={{ color: '#B91C1C' }}>
                Due {date}
              </span>
            )}
          </div>
          <p className="text-[12px] mt-1" style={{ color: '#B91C1C' }}>
            Scheduled pickup window has passed without carrier check-in. Contact carrier or update schedule.
          </p>
        </div>
      </div>
    </div>
  );
};

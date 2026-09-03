import React from 'react';
import { Ban, AlertCircle, Clock } from 'lucide-react';
import { formatReason } from '../../pages/ManageShipments/utils/listingUtils';

interface StatusBannerProps {
  status: string;
  reason?: string | null;
  date?: string | null;
  details?: string | null;
  cancelledBy?: string | null;
  notes?: string | null;
  t?: (key: string, fallback?: string) => string;
}

function formatDisplayDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  reason,
  date,
  details,
  cancelledBy,
  notes,
  t,
}) => {
  const isCancelled = status === 'canceled' || status === 'cancelled';
  const isUnfulfilled = status === 'not_fullfilled';
  const isPastDue = status === 'past_due';

  if (!isCancelled && !isUnfulfilled && !isPastDue) {
    return null;
  }

  if (isCancelled) {
    const formattedDate = formatDisplayDateTime(date);
    const cancelInfo = [
      cancelledBy ? `Cancelled by ${cancelledBy}` : 'Cancelled',
      formattedDate ? `on ${formattedDate}` : '',
    ].filter(Boolean).join(' ');

    const rawReason = (reason && !reason.includes('Read-only'))
      ? reason
      : (notes && !notes.includes('Read-only'))
      ? notes
      : (details && !details.includes('Read-only'))
      ? details
      : null;

    const cleanedReason = rawReason ? formatReason(rawReason, t) : null;

    return (
      <div
        className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5 shadow-2xs"
        style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
      >
        <Ban size={16} className="shrink-0" style={{ color: '#991B1B' }} />
        <p className="m-0 text-[13px] leading-normal" style={{ color: '#991B1B' }}>
          <strong>This shipment is cancelled.</strong>
          <span className="ml-1.5 font-normal" style={{ color: '#B91C1C' }}>
            {cancelInfo}
            {cleanedReason ? ` — ${cleanedReason}` : ''}
          </span>
        </p>
      </div>
    );
  }

  if (isUnfulfilled) {
    const formattedDate = formatDisplayDateTime(date);
    const formattedUnfulfilledReason = reason ? formatReason(reason, t) : null;

    return (
      <div
        className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5 shadow-2xs"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
      >
        <AlertCircle size={16} className="shrink-0" style={{ color: '#92400E' }} />
        <p className="m-0 text-[13px] leading-normal" style={{ color: '#92400E' }}>
          <strong>This trip concluded unfulfilled.</strong>
          <span className="ml-1.5 font-normal" style={{ color: '#B45309' }}>
            {`Finalized on ${formattedDate}${formattedUnfulfilledReason ? ` — ${formattedUnfulfilledReason}` : ''}`}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5 shadow-2xs"
      style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
    >
      <Clock size={16} className="shrink-0" style={{ color: '#DC2626' }} />
      <p className="m-0 text-[13px] leading-normal" style={{ color: '#991B1B' }}>
        <strong>Past Due Pickup.</strong>
        {date && (
          <span className="ml-1.5 font-normal" style={{ color: '#B91C1C' }}>
            Scheduled for {formatDisplayDateTime(date)}
          </span>
        )}
      </p>
    </div>
  );
};

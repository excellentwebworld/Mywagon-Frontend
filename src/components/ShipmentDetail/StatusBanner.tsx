import React from 'react';
import { Ban, AlertCircle, Clock, UserRound, CalendarClock, MessageSquareText } from 'lucide-react';
import { formatReason } from '../../pages/ManageShipments/utils/listingUtils';

interface StatusBannerProps {
  status: string;
  reason?: string | null;
  date?: string | null;
  details?: string | null;
  cancelledBy?: string | null;
  cancelledByType?: string | null;
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

function cancelledByLabel(
  cancelledBy?: string | null,
  cancelledByType?: string | null,
  t?: (key: string, fallback?: string) => string
): string | null {
  const type = (cancelledByType || '').toLowerCase();
  const role =
    type === 'shipper'
      ? t?.('shipper', 'Shipper') || 'Shipper'
      : type === 'carrier'
        ? t?.('carrier', 'Carrier') || 'Carrier'
        : type === 'driver'
          ? t?.('driver', 'Driver') || 'Driver'
          : null;

  const name = (cancelledBy || '').trim();
  if (name && /\b(first\s*name|last\s*name)\b/i.test(name)) {
    return role || name;
  }
  // API may already send "Shipper · Name" — prefer that cleanly
  if (name) {
    return name.replace(/\s*[·\-–—]\s*/g, ' · ').trim();
  }
  return role || null;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  reason,
  date,
  details,
  cancelledBy,
  cancelledByType,
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
    const byLabel = cancelledByLabel(cancelledBy, cancelledByType, t);

    const reasonText =
      reason &&
      !String(reason).includes('Read-only') &&
      !String(reason).includes('Cancellation Details')
        ? formatReason(reason, t)
        : null;
    const notesText =
      notes && !String(notes).includes('Read-only') ? String(notes).trim() : null;

    const hasDetails = Boolean(byLabel || reasonText || notesText || formattedDate);

    return (
      <div className="mb-4 rounded-2xl border border-red-200/80 dark:border-red-900/50 bg-gradient-to-br from-red-50 via-rose-50/80 to-white dark:from-red-950/40 dark:via-rose-950/20 dark:to-[var(--surface)] shadow-[0_1px_3px_rgba(185,28,28,0.06)] overflow-hidden">
        <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-800/60">
            <Ban size={18} strokeWidth={2.25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="m-0 text-[14px] sm:text-[15px] font-semibold tracking-tight text-red-900 dark:text-red-100">
                {t?.('cancellationDetails', 'Cancellation Details') || 'Cancellation Details'}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-red-600/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/50">
                {t?.('canceled', 'Canceled') || 'Canceled'}
              </span>
            </div>

            {hasDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(byLabel || formattedDate) && (
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    {byLabel && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white/80 dark:bg-slate-900/50 text-red-900 dark:text-red-100 border border-red-100 dark:border-red-900/40 shadow-2xs">
                        <UserRound size={13} className="text-red-500 dark:text-red-400 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500/80 dark:text-red-400/80">
                          {t?.('cancelledBy', 'Cancelled By') || 'Cancelled By'}
                        </span>
                        <span className="text-red-200 dark:text-red-800">|</span>
                        <span>{byLabel}</span>
                      </span>
                    )}
                    {formattedDate && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white/80 dark:bg-slate-900/50 text-red-900 dark:text-red-100 border border-red-100 dark:border-red-900/40 shadow-2xs">
                        <CalendarClock size={13} className="text-red-500 dark:text-red-400 shrink-0" />
                        <span>{formattedDate}</span>
                      </span>
                    )}
                  </div>
                )}

                {reasonText && (
                  <div className="sm:col-span-2 rounded-xl bg-white/90 dark:bg-slate-900/45 border border-red-100 dark:border-red-900/40 px-3.5 py-3 shadow-2xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 mb-1">
                      {t?.('cancellationReason', 'Cancellation Reason') || 'Cancellation Reason'}
                    </div>
                    <div className="text-[14px] font-semibold text-slate-900 dark:text-white leading-snug">
                      {reasonText}
                    </div>
                  </div>
                )}

                {notesText && (
                  <div className="sm:col-span-2 rounded-xl bg-white/70 dark:bg-slate-900/35 border border-red-100/80 dark:border-red-900/30 px-3.5 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500/90 dark:text-red-400/90 mb-1.5">
                      <MessageSquareText size={12} />
                      {t?.('cancellationNotes', 'Cancellation Notes') || 'Cancellation Notes'}
                    </div>
                    <p className="m-0 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                      {notesText}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="m-0 text-[13px] text-red-800 dark:text-red-200">
                {t?.('shipmentCancelled', 'This shipment is cancelled.') ||
                  'This shipment is cancelled.'}
                {details ? ` ${details}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isUnfulfilled) {
    const formattedDate = formatDisplayDateTime(date);
    const formattedUnfulfilledReason = reason ? formatReason(reason, t) : null;

    return (
      <div className="mb-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 via-amber-50/70 to-white dark:from-amber-950/35 dark:via-amber-950/15 dark:to-[var(--surface)] px-4 py-3.5 flex items-start gap-3 shadow-[0_1px_3px_rgba(180,83,9,0.06)]">
        <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/50">
          <AlertCircle size={16} />
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-amber-950 dark:text-amber-100 pt-1.5">
          <span className="font-semibold">
            {t?.('tripUnfulfilled', 'This trip concluded unfulfilled.') ||
              'This trip concluded unfulfilled.'}
          </span>
          <span className="ml-1.5 font-normal text-amber-800/90 dark:text-amber-200/90">
            {`Finalized on ${formattedDate}${
              formattedUnfulfilledReason ? ` — ${formattedUnfulfilledReason}` : ''
            }`}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-red-200/80 dark:border-red-900/50 bg-gradient-to-br from-red-50 via-rose-50/70 to-white dark:from-red-950/35 dark:via-rose-950/15 dark:to-[var(--surface)] px-4 py-3.5 flex items-start gap-3 shadow-[0_1px_3px_rgba(185,28,28,0.06)]">
      <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-800/50">
        <Clock size={16} />
      </div>
      <p className="m-0 text-[13px] leading-relaxed text-red-950 dark:text-red-100 pt-1.5">
        <span className="font-semibold">
          {t?.('pastDuePickup', 'Past Due Pickup.') || 'Past Due Pickup.'}
        </span>
        {date && (
          <span className="ml-1.5 font-normal text-red-800/90 dark:text-red-200/90">
            Scheduled for {formatDisplayDateTime(date)}
          </span>
        )}
      </p>
    </div>
  );
};

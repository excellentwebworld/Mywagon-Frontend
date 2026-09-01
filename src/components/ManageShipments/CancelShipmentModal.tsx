import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ApiError, createShipmentService, shipmentsService } from '../../api';
import type { ApiCancelReason, ApiCancelReasonsPayload } from '../../api/types/shipments';
import type { Shipment } from '../../context/AppContext';
import { CancelReasonsSkeleton } from '../skeletons/CancelReasonsSkeleton';

interface CancelShipmentModalProps {
  open: boolean;
  /** Single-shipment cancel target. Ignored when `shipmentIds` is set. */
  shipment: Shipment | null;
  /** Bulk cancel: numeric shipment ids. When set, modal runs in bulk mode. */
  shipmentIds?: number[] | null;
  onClose: () => void;
  onCancelled: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const CancelShipmentModal: React.FC<CancelShipmentModalProps> = ({
  open,
  shipment,
  shipmentIds = null,
  onClose,
  onCancelled,
  t,
}) => {
  const isBulk = Boolean(shipmentIds && shipmentIds.length > 0);
  const isDraft = !isBulk && shipment?.status === 'draft';
  const reasonSourceId = isBulk ? shipmentIds![0] : shipment?.id;
  const count = isBulk ? shipmentIds!.length : 1;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<ApiCancelReason[]>([]);
  const [chargeMessage, setChargeMessage] = useState('');
  const [reasonId, setReasonId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || reasonSourceId == null) return;

    // Drafts are deleted (no cancel reasons) — skip the cancel-reasons API.
    if (isDraft) {
      setLoading(false);
      setError(null);
      setNotes('');
      setReasonId(null);
      setReasons([]);
      setChargeMessage('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotes('');
    setReasonId(null);
    setReasons([]);
    setChargeMessage('');

    shipmentsService
      .cancelReasons(reasonSourceId)
      .then((data: ApiCancelReasonsPayload) => {
        if (cancelled) return;
        setReasons(data.reasons ?? []);
        setChargeMessage(data.cancellation_charge?.message ?? '');
        const first = data.reasons?.[0];
        if (first) setReasonId(first.id);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : t('cancelLoadFailed', 'Could not load cancellation reasons.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reasonSourceId, isDraft, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || reasonSourceId == null) return null;

  const selected = reasons.find((r) => r.id === reasonId);
  const isOther = Boolean(selected?.is_other || selected?.reason?.toLowerCase().trim() === 'other');

  const handleSubmit = async () => {
    if (isDraft) {
      if (!shipment) {
        setError(t('cancelFailed', 'Could not delete draft.'));
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await createShipmentService.deleteDraft(shipment.id);
        onCancelled();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof ApiError ? err.message : t('draftDeleteFailed', 'Could not delete draft.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!reasonId && reasons.length > 0) {
      setError(t('cancelSelectReason', 'Please select a cancellation reason.'));
      return;
    }
    if (isOther && !notes.trim()) {
      setError(t('cancelOtherNotesRequired', 'Please specify the reason in additional notes.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isBulk && shipmentIds) {
        await shipmentsService.bulkCancel({
          ids: shipmentIds,
          cancel_reason_id: reasonId || undefined,
          cancel_notes: notes.trim() || undefined,
        });
      } else if (shipment) {
        await shipmentsService.cancel(shipment.id, {
          cancel_reason_id: reasonId || undefined,
          cancel_notes: notes.trim() || undefined,
        });
      } else {
        setError(t('cancelFailed', 'Could not cancel shipment.'));
        return;
      }
      onCancelled();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t('cancelFailed', 'Could not cancel shipment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const title = isDraft
    ? t('draftDeleteTitle', 'Delete draft?')
    : isBulk
      ? t('bulkCancelTitle', 'Cancel shipments?')
      : t('reasonToCancelShipment', 'What is the reason for canceling this shipment?');

  const defaultChargeMsg =
    'Please note that cancellation fees may be applicable on public loads depending on the reason for cancelling, when cancelling a load that is already scheduled with a carrier, less than 48h prior to pickup time.';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[540px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-shipment-title"
      >
        {/* Close Icon Button at Top Right */}
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer bg-transparent border-0 p-1"
          onClick={onClose}
          aria-label={t('cancel', 'Close')}
        >
          <X size={20} />
        </button>

        {/* Content Container */}
        <div className="p-6 md:p-8 flex flex-col">
          {/* Centered Title */}
          <h2
            id="cancel-shipment-title"
            className="text-[17px] md:text-[19px] font-bold text-[#1E1B4B] text-center mb-6 mt-2 leading-snug"
          >
            {title}
          </h2>

          {isDraft ? (
            <p className="text-sm text-gray-600 text-center mb-6">
              {t('draftDeleteIntro', { id: shipment?.autoId || shipment?.id || '' }) ||
                `Are you sure you want to permanently delete draft ${shipment?.autoId || shipment?.id || ''}? This cannot be undone.`}
            </p>
          ) : loading ? (
            <div className="py-4">
              <CancelReasonsSkeleton />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Radio options list */}
              {reasons.length === 0 ? (
                <p className="text-sm text-gray-600 text-center">
                  {t('cancelNoReasons', 'No cancellation reasons are available for this status. Please add any optional notes below.')}
                </p>
              ) : (
                <div className="flex flex-col gap-3.5 pl-2">
                  {reasons.map((r) => {
                    const isChecked = reasonId === r.id;
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-3 text-[14px] cursor-pointer select-none transition-colors ${
                          isChecked ? 'text-[#DC2626] font-medium' : 'text-[#374151] hover:text-[#18181B]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancel-reason"
                          checked={isChecked}
                          onChange={() => {
                            setReasonId(r.id);
                            setError(null);
                          }}
                          className="w-4 h-4 text-[#DC2626] accent-[#DC2626] cursor-pointer"
                        />
                        <span>{r.reason}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Additional Notes Field (Always Rendered, matching Laravel shipper panel) */}
              <div className="flex flex-col gap-1.5 mt-3">
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <label htmlFor="cancel-notes" className="text-[13px] font-semibold text-[#1E1B4B]">
                    {t('cancelNotesLabel', 'Additional Notes')}
                  </label>
                  <span className="text-[12px] text-[#6B7280]">
                    ({isOther ? t('required', 'Required') : t('optional', 'Optional')})
                  </span>
                </div>

                <textarea
                  id="cancel-notes"
                  value={notes}
                  maxLength={100}
                  rows={3}
                  placeholder={t(
                    'cancelNotesPlaceholder',
                    'Please provide additional details about the cancellation...'
                  )}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (e.target.value.trim()) setError(null);
                  }}
                  className="text-[13px] p-3 rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9B51E0]/20 focus:border-[#9B51E0] resize-y w-full text-[#18181B]"
                />

                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-[#6B7280]">
                    {t('cancelNotesHelp', 'Explain what happened to help us improve our service')}
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-mono">{notes.length}/100</span>
                </div>
              </div>

              {/* Cancellation Charge Notice Banner */}
              <div className="mt-2 bg-[#FEF2F2] border-l-[3px] border-[#DC2626] rounded-md p-3">
                <p className="text-[11px] text-[#DC2626] italic leading-relaxed m-0">
                  {chargeMessage || defaultChargeMsg}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-[#DC2626] text-center font-medium mt-3 m-0 bg-red-50 p-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              type="button"
              className="w-40 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#1E1B4B] font-semibold text-[13px] hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={onClose}
              disabled={submitting}
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="button"
              className="w-40 py-2.5 rounded-lg bg-[#1E1B4B] text-white font-semibold text-[13px] hover:bg-[#2D286B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
              disabled={submitting || (isDraft ? false : loading)}
              onClick={() => void handleSubmit()}
            >
              {submitting
                ? t('processing', 'Processing…')
                : isDraft
                  ? t('deleteDraft', 'Delete draft')
                  : t('continue', 'Continue')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

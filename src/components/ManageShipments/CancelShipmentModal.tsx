import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
        setError(err instanceof ApiError ? err.message : t('cancelLoadFailed'));
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
  const needsNotes = Boolean(selected?.is_other);

  const handleSubmit = async () => {
    if (isDraft) {
      if (!shipment) {
        setError(t('cancelFailed'));
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await createShipmentService.deleteDraft(shipment.id);
        onCancelled();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof ApiError ? err.message : t('draftDeleteFailed'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!reasonId) {
      setError(t('cancelSelectReason'));
      return;
    }
    if (needsNotes && !notes.trim()) {
      setError(t('cancelOtherNotesRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isBulk && shipmentIds) {
        await shipmentsService.bulkCancel({
          ids: shipmentIds,
          cancel_reason_id: reasonId,
          cancel_notes: notes.trim() || undefined,
        });
      } else if (shipment) {
        await shipmentsService.cancel(shipment.id, {
          cancel_reason_id: reasonId,
          cancel_notes: notes.trim() || undefined,
        });
      } else {
        setError(t('cancelFailed'));
        return;
      }
      onCancelled();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t('cancelFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const title = isDraft
    ? t('draftDeleteTitle') || t('cancelShipmentTitle')
    : isBulk
      ? t('bulkCancelTitle') || t('cancelShipmentTitle')
      : t('cancelShipmentTitle');
  const intro = isDraft
    ? t('draftDeleteIntro', { id: shipment?.autoId || shipment?.id || '' })
    : isBulk
      ? t('bulkCancelIntro', { count }) || `Cancel ${count} selected shipments?`
      : t('cancelShipmentIntro', { id: shipment?.autoId || shipment?.id || '' });

  const canSubmit = isDraft
    ? !submitting
    : !loading && !submitting && reasons.length > 0 && reasonId != null && (!needsNotes || Boolean(notes.trim()));

  const confirmLabel = isDraft
    ? submitting
      ? t('deleting') || t('cancelling')
      : t('draftDeleteConfirm') || t('cancelShipmentConfirm')
    : submitting
      ? t('cancelling')
      : t('cancelShipmentConfirm');

  return createPortal(
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-shipment-title"
      >
        <div className="modal-header">
          <h2 id="cancel-shipment-title" style={{ color: 'var(--danger)' }}>
            {title}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('cancel')}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{intro}</p>
          {isDraft ? null : loading ? (
            <CancelReasonsSkeleton />
          ) : (
            <>
              {chargeMessage && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--warning, #b45309)' }}>{chargeMessage}</p>
              )}
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('cancelReasonLabel')}</legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {reasons.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('cancelNoReasons')}</span>
                  ) : (
                    reasons.map((r) => (
                      <label
                        key={r.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}
                      >
                        <input
                          type="radio"
                          name="cancel-reason"
                          checked={reasonId === r.id}
                          onChange={() => setReasonId(r.id)}
                        />
                        {r.reason}
                      </label>
                    ))
                  )}
                </div>
              </fieldset>
              {needsNotes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor="cancel-notes" style={{ fontSize: 12, fontWeight: 600 }}>
                    {t('cancelNotesLabel')}
                  </label>
                  <textarea
                    id="cancel-notes"
                    value={notes}
                    maxLength={100}
                    rows={3}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      fontSize: 13,
                      padding: 8,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </>
          )}
          {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

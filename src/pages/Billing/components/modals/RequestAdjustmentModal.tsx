import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '../../types';
import { formatCurrency } from '../../mockData';
import { BillingModalPortal } from './BillingModalPortal';

interface RequestAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  currency?: string;
  onSubmit: (invoiceId: number, amount: number, reason: string) => Promise<void>;
}

export const RequestAdjustmentModal: React.FC<RequestAdjustmentModalProps> = ({
  isOpen,
  onClose,
  invoices,
  currency = 'EUR',
  onSubmit,
}) => {
  const { t } = useTranslation();
  const unpaidInvoices = invoices.filter((inv) => inv.rem > 0 && inv.status !== 'Paid' && inv.status !== 'Voided');

  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const first = unpaidInvoices[0];
    setInvoiceId(first?.raw_id ? String(first.raw_id) : '');
    setAmount(first ? String(first.rem) : '');
    setReason('');
    setError('');
    setSubmitting(false);
  }, [isOpen, invoices]);

  const selected = unpaidInvoices.find((inv) => String(inv.raw_id ?? inv.id) === invoiceId);
  const hasEligible = unpaidInvoices.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEligible || !selected?.raw_id) {
      setError(t('billingPage.selectUnpaidInvoice', 'Please select an unpaid invoice'));
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t('billingPage.adjustmentAmountRequired', 'Please enter a valid adjustment amount.'));
      return;
    }

    if (reason.trim().length < 5) {
      setError(t('billingPage.adjustmentReasonRequired', 'Please provide a reason (at least 5 characters).'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit(selected.raw_id, parsedAmount, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('billingPage.adjustmentFailed', 'Unable to submit adjustment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BillingModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="billing-modal-bg show" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="billing-modal" onClick={(e) => e.stopPropagation()}>
          <div className="billing-modal-h">
            <h3>{t('billingPage.modalRequestAdjustment', 'Request Adjustment')}</h3>
            <button type="button" className="b-btn-ghost billing-modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="billing-modal-body">
              {error && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}

              {hasEligible ? (
                <>
                  <div className="billing-mf">
                    <label>
                      {t('billingPage.fldInvoice', 'Invoice')} <span className="req">*</span>
                    </label>
                    <select
                      value={invoiceId}
                      onChange={(e) => {
                        setInvoiceId(e.target.value);
                        const inv = unpaidInvoices.find((row) => String(row.raw_id ?? row.id) === e.target.value);
                        if (inv) setAmount(String(inv.rem));
                      }}
                      required
                    >
                      {unpaidInvoices.map((inv) => (
                        <option key={inv.raw_id ?? inv.id} value={inv.raw_id ?? inv.id}>
                          {inv.id} ({inv.type} — {inv.status}) · {formatCurrency(inv.rem, inv.cur || currency)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="billing-mf">
                    <label>
                      {t('billingPage.fldAmount', 'Amount')} <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="billing-mf">
                    <label>
                      {t('billingPage.fldReason', 'Reason')} <span className="req">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('billingPage.adjustmentReasonPlaceholder', 'Describe the billing issue or requested correction…')}
                      required
                    />
                  </div>

                  {selected && (
                    <div className="billing-upload-hint">
                      {t(
                        'billingPage.adjustmentHint',
                        'Your request will be reviewed by our billing team. You will be notified once it is processed.',
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="billing-empty-state">
                  <p>{t('billingPage.noAdjustmentInvoices', 'No unpaid invoices are available for an adjustment request.')}</p>
                </div>
              )}
            </div>

            <div className="billing-modal-ft">
              <button type="button" className="b-btn" onClick={onClose}>
                {t('common.close', 'Close')}
              </button>
              {hasEligible && (
                <button type="submit" className="b-btn b-btn-primary" disabled={submitting || !selected}>
                  {submitting
                    ? t('common.saving', 'Saving…')
                    : t('billingPage.btnSubmitAdjustment', 'Submit Request')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </BillingModalPortal>
  );
};

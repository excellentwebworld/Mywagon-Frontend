import React, { useEffect, useRef, useState } from 'react';
import { X, UploadCloud, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice, BillingSummary } from '../../types';
import { formatCurrency, canSubmitBankReceipt } from '../../mockData';
import { BillingModalPortal } from './BillingModalPortal';

interface RequestAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  bank?: BillingSummary['bank'];
  onSubmitReceipt: (invoiceId: number, file: File) => Promise<void>;
}

export const RequestAdjustmentModal: React.FC<RequestAdjustmentModalProps> = ({
  isOpen,
  onClose,
  invoices,
  bank,
  onSubmitReceipt,
}) => {
  const { t } = useTranslation();
  const unpaidInvoices = invoices.filter(canSubmitBankReceipt);

  const [invoiceId, setInvoiceId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const first = unpaidInvoices[0];
    setInvoiceId(first?.raw_id ? String(first.raw_id) : '');
    setFile(null);
    setError('');
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoices]);

  const selected = unpaidInvoices.find((inv) => String(inv.raw_id ?? inv.id) === invoiceId);
  const hasEligible = unpaidInvoices.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEligible) return;
    if (!selected?.raw_id) {
      setError(t('billingPage.selectUnpaidInvoice', 'Please select an unpaid invoice'));
      return;
    }
    if (!canSubmitBankReceipt(selected)) {
      setError(
        t(
          'billingPage.receiptUnderReview',
          'This invoice is already under process. You can upload a new receipt only if the admin rejects it.'
        )
      );
      return;
    }
    if (!file) {
      setError(t('billingPage.receiptRequired', 'Please upload a receipt.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('billingPage.receiptTooLarge', 'The receipt size must not exceed 5MB.'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmitReceipt(selected.raw_id, file);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('billingPage.uploadFailed', 'Unable to upload receipt.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BillingModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="billing-modal-bg show" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="billing-modal billing-modal--receipt" onClick={(e) => e.stopPropagation()}>
          <div className="billing-modal-h">
            <h3>{t('billingPage.modalBankTransfer', 'Bank Transfer Receipt')}</h3>
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
                    <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
                      {unpaidInvoices.map((inv) => (
                        <option key={inv.raw_id ?? inv.id} value={inv.raw_id ?? inv.id}>
                          {inv.id} ({inv.type} — {inv.status}) · {formatCurrency(inv.rem, inv.cur)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selected && (
                    <>
                      <div className="billing-bank-box">
                        <div>
                          <span className="font-semibold">{t('billingPage.iban', 'Account (IBAN)')}:</span>{' '}
                          {bank?.iban}
                        </div>
                        <div>
                          <span className="font-semibold">{t('billingPage.accountHolder', 'Account Holder')}:</span>{' '}
                          {bank?.account_holder}
                        </div>
                        <div>
                          <span className="font-semibold">{t('billingPage.bic', 'Bank BIC Code')}:</span>{' '}
                          {bank?.bic}
                        </div>
                        <div>
                          <span className="font-semibold">{t('billingPage.invoiceNumber', 'Invoice Number')}:</span>{' '}
                          # {selected.raw_id ?? selected.id}
                          <div className="billing-bank-note">
                            {t(
                              'billingPage.includeInvoiceMemo',
                              'Please include the invoice number in the transfer memo'
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="billing-upload-hint">
                        {t(
                          'billingPage.uploadReceiptPrompt',
                          'Please upload your bank transfer receipt. Accepted formats: PDF, JPG, PNG. Max size: 5MB.'
                        )}
                      </div>
                    </>
                  )}

                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    className="billing-upload-drop"
                    onClick={() => inputRef.current?.click()}
                  >
                    <UploadCloud size={36} className="text-purple-600" />
                    <span>
                      {file
                        ? file.name
                        : t('billingPage.clickToUpload', 'Click to upload or tap here on mobile')}
                    </span>
                  </button>
                </>
              ) : (
                <div className="billing-empty-state">
                  <Clock size={28} />
                  <p>
                    {t(
                      'billingPage.noBankEligibleInvoices',
                      'No invoices are available for bank transfer right now.'
                    )}
                  </p>
                  <span>
                    {t(
                      'billingPage.underProcessHint',
                      'Invoices already under process cannot be submitted again until an admin rejects the receipt.'
                    )}
                  </span>
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
                    : t('billingPage.btnSubmitReceipt', 'Submit Receipt')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </BillingModalPortal>
  );
};

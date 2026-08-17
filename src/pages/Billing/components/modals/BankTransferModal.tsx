import React, { useEffect, useRef, useState } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice, BillingSummary } from '../../types';
import { formatCurrency } from '../../mockData';
import { BillingModalPortal } from './BillingModalPortal';

interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  bank?: BillingSummary['bank'];
  onSubmitReceipt: (invoiceId: number, file: File) => Promise<void>;
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  isOpen,
  onClose,
  invoice,
  bank,
  onSubmitReceipt,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setError('');
    setSubmitting(false);
  }, [isOpen, invoice?.raw_id]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(t('billingPage.receiptRequired', 'Please upload a receipt.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('billingPage.receiptTooLarge', 'The receipt size must not exceed 5MB.'));
      return;
    }
    if (!invoice.raw_id) return;
    if (invoice.under_process || invoice.bank_transfer_admin_status === 'uploaded') {
      setError(
        t(
          'billingPage.receiptUnderReview',
          'This invoice is already under process. You can upload a new receipt only if the admin rejects it.'
        )
      );
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmitReceipt(invoice.raw_id, file);
      setFile(null);
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
                  # {invoice.raw_id ?? invoice.id}
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

              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="font-semibold text-gray-800">{invoice.id}</span>
                <span className="billing-mono font-bold text-red-600">
                  {formatCurrency(invoice.rem, invoice.cur)}
                </span>
              </div>

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
            </div>

            <div className="billing-modal-ft">
              <button type="button" className="b-btn" onClick={onClose} disabled={submitting}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="submit" className="b-btn b-btn-primary" disabled={submitting}>
                {submitting
                  ? t('common.saving', 'Saving…')
                  : t('billingPage.btnSubmitReceipt', 'Submit Receipt')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BillingModalPortal>
  );
};

import React, { useEffect, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '../../types';
import { formatCurrency } from '../../mockData';
import { BillingModalPortal } from './BillingModalPortal';
import { ApplyCreditModalSkeleton } from '../BillingSkeleton';

interface ApplyCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  walletBalance: number;
  loading?: boolean;
  onApply: (rawId: number) => Promise<void>;
}

export const ApplyCreditModal: React.FC<ApplyCreditModalProps> = ({
  isOpen,
  onClose,
  invoices,
  walletBalance,
  loading = false,
  onApply,
}) => {
  const { t } = useTranslation();
  const unpaidInvoices = invoices.filter((i) => i.rem > 0 && i.status !== 'Paid' && i.status !== 'Voided');
  const payableInvoices = unpaidInvoices.filter((i) => i.rem <= walletBalance);

  const [selectedInv, setSelectedInv] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSubmitting(false);
    const first = payableInvoices[0]?.raw_id;
    setSelectedInv(first ? String(first) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoices, walletBalance]);

  const selected = payableInvoices.find((i) => String(i.raw_id) === selectedInv) || payableInvoices[0];
  const hasUnpaid = unpaidInvoices.length > 0;
  const hasPayable = payableInvoices.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPayable || !selected?.raw_id || loading) return;
    if (walletBalance < selected.rem) {
      setError(t('billingPage.creditExceededError', 'Amount exceeds available credit balance'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onApply(selected.raw_id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('billingPage.walletPayFailed', 'Unable to pay with wallet.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BillingModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="billing-modal-bg show" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="billing-modal" onClick={(e) => e.stopPropagation()}>
          <div className="billing-modal-h">
            <h3>{t('billingPage.modalApplyCredit', 'Pay invoice using wallet credit')}</h3>
            <button type="button" className="b-btn-ghost" onClick={onClose}>
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

              {loading ? (
                <ApplyCreditModalSkeleton />
              ) : hasUnpaid ? (
                hasPayable ? (
                  <>
                    <div className="billing-mf">
                      <label>
                        {t('billingPage.fldSelectInvoice', 'Select Invoice')} <span className="req">*</span>
                      </label>
                      <select value={selectedInv} onChange={(e) => setSelectedInv(e.target.value)}>
                        {payableInvoices.map((inv) => (
                          <option key={inv.raw_id} value={inv.raw_id}>
                            {inv.id} — {formatCurrency(inv.rem, inv.cur)} ({inv.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selected && (
                      <div className="helper">
                        {t('billingPage.walletWillPay', 'Wallet will pay the full invoice amount')}{' '}
                        <strong className="billing-mono">{formatCurrency(selected.rem, selected.cur)}</strong>
                      </div>
                    )}

                    <div className="helper mt-2">
                      {t('billingPage.kpiCredits', 'Credits Available')}:{' '}
                      <strong className="billing-mono text-purple-700">{formatCurrency(walletBalance)}</strong>
                    </div>
                  </>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium leading-relaxed">
                    {t(
                      'billingPage.walletInsufficientHint',
                      'The invoice amount is higher than your available wallet balance. Therefore, this option is currently unavailable for use.'
                    )}
                  </div>
                )
              ) : (
                <div className="billing-empty-state">
                  <Wallet size={28} />
                  <p>{t('billingPage.noUnpaidInvoices', 'No unpaid invoices available')}</p>
                  <span>
                    {t(
                      'billingPage.noUnpaidWalletHint',
                      'There are no invoices to pay with wallet credit right now. You can use this balance when a new invoice is issued.'
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="billing-modal-ft">
              <button type="button" className="b-btn" onClick={onClose} disabled={submitting || loading}>
                {!loading && hasPayable ? t('common.cancel', 'Cancel') : t('common.close', 'Close')}
              </button>
              {!loading && hasPayable && (
                <button type="submit" className="b-btn b-btn-primary" disabled={submitting || !selected?.raw_id}>
                  {t('billingPage.btnPayWallet', 'Pay using wallet')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </BillingModalPortal>
  );
};

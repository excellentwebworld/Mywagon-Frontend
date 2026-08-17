import React, { useEffect, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '../../types';
import { formatCurrency } from '../../mockData';
import { BillingModalPortal } from './BillingModalPortal';

interface ApplyCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  walletBalance: number;
  onApply: (rawId: number) => Promise<void>;
}

export const ApplyCreditModal: React.FC<ApplyCreditModalProps> = ({
  isOpen,
  onClose,
  invoices,
  walletBalance,
  onApply,
}) => {
  const { t } = useTranslation();
  const unpaidInvoices = invoices.filter((i) => i.rem > 0 && i.can_pay_wallet !== false);
  const [selectedInv, setSelectedInv] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSubmitting(false);
    const covered = unpaidInvoices.find((i) => i.rem <= walletBalance);
    const first = covered?.raw_id ?? unpaidInvoices[0]?.raw_id;
    setSelectedInv(first ? String(first) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoices, walletBalance]);

  const selected = unpaidInvoices.find((i) => String(i.raw_id) === selectedInv);
  const hasUnpaid = unpaidInvoices.length > 0;
  const canPaySelected = Boolean(selected?.raw_id && walletBalance >= selected.rem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasUnpaid) return;
    if (!selected?.raw_id) {
      setError(t('billingPage.selectInvoiceError', 'Please select an invoice'));
      return;
    }
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

              {hasUnpaid ? (
                <>
                  {walletBalance <= 0 && (
                    <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium">
                      {t(
                        'billingPage.walletEmptyHint',
                        'Wallet balance is currently €0.00. You can still open this dialog, but wallet payment requires available credit.'
                      )}
                    </div>
                  )}

                  <div className="billing-mf">
                    <label>
                      {t('billingPage.fldSelectInvoice', 'Select Invoice')} <span className="req">*</span>
                    </label>
                    <select value={selectedInv} onChange={(e) => setSelectedInv(e.target.value)}>
                      {unpaidInvoices.map((inv) => (
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
              <button type="button" className="b-btn" onClick={onClose} disabled={submitting}>
                {hasUnpaid ? t('common.cancel', 'Cancel') : t('common.close', 'Close')}
              </button>
              {hasUnpaid && (
                <button type="submit" className="b-btn b-btn-primary" disabled={submitting || !canPaySelected}>
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

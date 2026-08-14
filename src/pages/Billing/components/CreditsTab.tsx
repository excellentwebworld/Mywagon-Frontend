import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CreditNote } from '../types';
import { formatCurrency, formatDate } from '../mockData';
import { BillingCreditsSkeleton, BillingTableSkeleton } from './BillingSkeleton';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const sk = { baseColor: '#f0f0f3', highlightColor: '#fafafe' };

interface CreditsTabProps {
  creditNotes: CreditNote[];
  walletBalance: number;
  loading?: boolean;
  onOpenApplyCredit: () => void;
  onOpenRequestAdj: () => void;
}

export const CreditsTab: React.FC<CreditsTabProps> = ({
  creditNotes,
  walletBalance,
  loading = false,
  onOpenApplyCredit,
  onOpenRequestAdj,
}) => {
  const { t, i18n } = useTranslation();
  const history = creditNotes.filter((c) => c.id !== 'WALLET');

  if (loading && creditNotes.length === 0) {
    return <BillingCreditsSkeleton />;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 px-6 pt-4">
        <div className={`credit-card ${loading ? 'billing-skeleton-block' : ''}`}>
          <div className="cc-label">{t('billingPage.creditBalance', 'Available Credit Balance')}</div>
          <div className="cc-val billing-mono">
            {loading ? <Skeleton width={100} height={28} borderRadius={4} {...sk} /> : formatCurrency(walletBalance)}
          </div>
          <div className="cc-sub">{t('billingPage.walletHint', 'Wallet balance available to pay invoices in full')}</div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="font-semibold text-sm text-gray-900 mb-3.5">
            {t('billingPage.quickActions', 'Quick Actions')}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="b-btn b-btn-primary" onClick={onOpenApplyCredit} disabled={loading}>
              {t('billingPage.btnPayWallet', 'Pay using wallet')}
            </button>
            <button type="button" className="b-btn" onClick={onOpenRequestAdj} disabled={loading}>
              {t('billingPage.btnRequestAdj', 'Request Adjustment')}
            </button>
          </div>
        </div>
      </div>

      <div className={`billing-tbl-card mt-4 ${loading ? 'is-loading' : ''}`}>
        <div className="billing-tbl-head font-bold text-sm text-gray-800">
          {t('billingPage.walletActivity', 'Wallet activity')}
        </div>
        <div className="overflow-x-auto">
          <table className="billing-t">
            <thead>
              <tr>
                <th>{t('billingPage.cnId', 'Reference')}</th>
                <th>{t('billingPage.cnDate', 'Date')}</th>
                <th>{t('billingPage.cnAmount', 'Amount')}</th>
                <th>{t('billingPage.cnReason', 'Reason')}</th>
                <th>{t('billingPage.cnApplied', 'Applied To')}</th>
                <th>{t('billingPage.debitCredit', 'Debit/Credit')}</th>
              </tr>
            </thead>
            {loading ? (
              <BillingTableSkeleton rows={6} columns={6} />
            ) : (
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                      {t('billingPage.noCredits', 'No wallet movements')}
                    </td>
                  </tr>
                )}
                {history.map((cn) => (
                  <tr key={cn.id}>
                    <td className="billing-mono text-purple-700 font-semibold text-xs">{cn.id}</td>
                    <td className="text-xs text-gray-600">{formatDate(cn.date, i18n.language)}</td>
                    <td className="billing-mono text-xs font-semibold">{formatCurrency(cn.amt)}</td>
                    <td className="text-xs text-gray-700">{cn.reason}</td>
                    <td className="text-xs">{cn.applied || '—'}</td>
                    <td className="text-xs">{cn.type || (cn.applied ? 'Debit' : 'Credit')}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

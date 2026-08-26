import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import type { CreditNote } from '../types';
import { formatCurrency, formatDate } from '../mockData';
import { BillingCreditsSkeleton, BillingTableSkeleton } from './BillingSkeleton';
import { BillingPagination } from './BillingPagination';
import { ReferralModal } from '../../../components/referral';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const sk = { baseColor: '#f0f0f3', highlightColor: '#fafafe' };

interface CreditsTabProps {
  creditNotes: CreditNote[];
  walletBalance: number;
  loading?: boolean;
  tableLoading?: boolean;
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onOpenApplyCredit: () => void;
  onOpenRequestAdj: () => void;
  compact?: boolean;
}

export const CreditsTab: React.FC<CreditsTabProps> = ({
  creditNotes,
  walletBalance,
  loading = false,
  tableLoading = false,
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  onOpenApplyCredit,
  onOpenRequestAdj,
  compact = false,
}) => {
  const { t, i18n } = useTranslation();
  const [referralOpen, setReferralOpen] = useState(false);
  const history = creditNotes.filter((c) => c.id !== 'WALLET');
  const showTableSkeleton = tableLoading || (loading && history.length === 0);


  if (loading && creditNotes.length === 0 && walletBalance === 0) {
    return <BillingCreditsSkeleton />;
  }

  return (
    <div className={compact ? 'credits-tab credits-tab--compact' : 'credits-tab'}>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3.5 ${compact ? 'px-0 pt-2' : 'px-6 pt-4'}`}>
        <div className={`credit-card ${loading ? 'billing-skeleton-block' : ''}`}>
          <div className="cc-label">{t('billingPage.creditBalance', 'Available Credit Balance')}</div>
          <div className="cc-val billing-mono">
            {loading ? <Skeleton width={100} height={28} borderRadius={4} {...sk} /> : formatCurrency(walletBalance)}
          </div>
          <div className="cc-sub">{t('billingPage.walletHint', 'Wallet / Rewards balance available to pay invoices in full')}</div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl flex flex-col justify-center shadow-sm billing-quick-actions">
          <div className="font-semibold text-sm text-gray-900 mb-3.5">
            {t('billingPage.quickActions', 'Quick Actions')}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="b-btn b-btn-primary" onClick={onOpenApplyCredit} disabled={loading}>
              {t('billingPage.btnPayWallet', 'Pay using wallet')}
            </button>
            <button
              type="button"
              className="b-btn"
              onClick={() => setReferralOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Users size={14} />
              <span>{t('referral.referBtn', 'Refer & Earn')}</span>
            </button>
          </div>

        </div>
      </div>

      <div className={`billing-tbl-card ${showTableSkeleton ? 'is-loading' : ''}`}>
        <div className="billing-tbl-head font-bold text-sm text-gray-800">
          {t('billingPage.walletActivity', 'Wallet activity')}
        </div>
        {compact ? (
          <div className="wv-wallet-list">
            {showTableSkeleton ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="wv-wallet-card">
                  <Skeleton height={14} width="45%" {...sk} />
                  <Skeleton height={12} width="60%" style={{ marginTop: 8 }} {...sk} />
                </div>
              ))
            ) : history.length === 0 ? (
              <div className="wv-invoice-empty">{t('billingPage.noCredits', 'No wallet movements')}</div>
            ) : (
              history.map((cn) => {
                const isCredit = (cn.type || (cn.applied ? 'Debit' : 'Credit')) === 'Credit';
                return (
                  <article key={cn.id} className="wv-wallet-card">
                    <div className="wv-wallet-card__top">
                      <span className="wv-wallet-card__id billing-mono">{cn.id}</span>
                      <span className={`b-badge ${isCredit ? 'b-credit' : 'b-debit'}`}>
                        {isCredit ? t('billingPage.credit', 'Credit') : t('billingPage.debit', 'Debit')}
                      </span>
                    </div>
                    <div className="wv-wallet-card__row">
                      <span>{formatDate(cn.date, i18n.language)}</span>
                      <strong className={`billing-mono ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : '−'}
                        {formatCurrency(Math.abs(cn.amt))}
                      </strong>
                    </div>
                    <div className="wv-wallet-card__reason">{cn.reason}</div>
                    {cn.applied ? (
                      <div className="wv-wallet-card__applied billing-mono">{cn.applied}</div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="billing-t billing-t-static">
              <thead>
                <tr>
                  <th>{t('billingPage.cnId', 'Credit Note #')}</th>
                  <th>{t('billingPage.cnDate', 'Date')}</th>
                  <th>{t('billingPage.cnAmount', 'Amount')}</th>
                  <th>{t('billingPage.cnReason', 'Reason')}</th>
                  <th>{t('billingPage.cnApplied', 'Applied To')}</th>
                  <th>{t('billingPage.debitCredit', 'Debit/Credit')}</th>
                </tr>
              </thead>
              {showTableSkeleton ? (
                <BillingTableSkeleton rows={8} columns={6} />
              ) : (
                <tbody>
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                        {t('billingPage.noCredits', 'No wallet movements')}
                      </td>
                    </tr>
                  )}
                  {history.map((cn) => {
                    const isCredit = (cn.type || (cn.applied ? 'Debit' : 'Credit')) === 'Credit';
                    return (
                      <tr key={cn.id}>
                        <td className="billing-mono text-purple-700 font-semibold text-xs">{cn.id}</td>
                        <td className="text-xs text-gray-600">{formatDate(cn.date, i18n.language)}</td>
                        <td className={`billing-mono text-xs font-semibold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '−'}
                          {formatCurrency(Math.abs(cn.amt))}
                        </td>
                        <td className="text-xs text-gray-700">{cn.reason}</td>
                        <td className="text-xs">
                          {cn.applied ? (
                            <span className="billing-mono text-purple-700 font-semibold">{cn.applied}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`b-badge ${isCredit ? 'b-credit' : 'b-debit'}`}>
                            {isCredit ? t('billingPage.credit', 'Credit') : t('billingPage.debit', 'Debit')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        )}
        <BillingPagination
          page={page}
          lastPage={lastPage}
          total={total}
          perPage={perPage}
          loading={showTableSkeleton}
          label={t('billingPage.movements', 'movements')}
          onPageChange={onPageChange}
          onPerPageChange={(next) => {
            onPerPageChange(next);
            onPageChange(1);
          }}
        />
      </div>

      <ReferralModal
        isOpen={referralOpen}
        onClose={() => setReferralOpen(false)}
        availableCredit={walletBalance}
      />
    </div>
  );
};


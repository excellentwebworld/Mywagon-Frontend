import React from 'react';
import { FileSpreadsheet, FileText, BarChart3, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BillingSummary } from '../types';
import { formatCurrency } from '../mockData';
import { BillingStatementsSkeleton } from './BillingSkeleton';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const sk = { baseColor: '#f0f0f3', highlightColor: '#fafafe' };

export type StatementExportAction = 'invoice-register' | 'line-items' | 'statement';

interface StatementsTabProps {
  summary: BillingSummary | null;
  loading?: boolean;
  exportingAction?: StatementExportAction | null;
  canExport?: boolean;
  compact?: boolean;
  onExportInvoiceRegister: () => void;
  onExportLineItems: () => void;
  onOpenStatementModal: () => void;
}

export const StatementsTab: React.FC<StatementsTabProps> = ({
  summary,
  loading = false,
  exportingAction = null,
  canExport = true,
  compact = false,
  onExportInvoiceRegister,
  onExportLineItems,
  onOpenStatementModal,
}) => {
  const { t } = useTranslation();

  const exportCards: {
    id: StatementExportAction;
    title: string;
    desc: string;
    icon: React.ReactNode;
    fmt: string;
    action: () => void;
  }[] = [
    {
      id: 'invoice-register',
      title: t('billingPage.stInvRegister', 'Invoice Register Export'),
      desc: t('billingPage.stInvRegisterDesc', 'Full invoice list with all filters applied'),
      icon: <FileSpreadsheet size={compact ? 18 : 22} className="text-purple-600" />,
      fmt: 'CSV',
      action: onExportInvoiceRegister,
    },
    {
      id: 'line-items',
      title: t('billingPage.stLineItem', 'Line Item Export'),
      desc: t('billingPage.stLineItemDesc', 'Detailed line items across all invoices and loads'),
      icon: <BarChart3 size={compact ? 18 : 22} className="text-purple-600" />,
      fmt: 'CSV',
      action: onExportLineItems,
    },
    {
      id: 'statement',
      title: t('billingPage.stMonthlyPDF', 'Monthly Statement PDF'),
      desc: t(
        'billingPage.stMonthlyPDFDesc',
        'Opening balance, invoices, credits, payments, and closing summary',
      ),
      icon: <FileText size={compact ? 18 : 22} className="text-purple-600" />,
      fmt: 'PDF',
      action: onOpenStatementModal,
    },
  ];

  if (loading && !summary) {
    return <BillingStatementsSkeleton />;
  }

  const aging = summary?.aging;
  const agingBuckets = [
    {
      label: t('billingPage.agingCurrent', 'Current (0–7d)'),
      val: formatCurrency(aging?.current?.amount ?? 0),
      count: aging?.current?.count ?? 0,
      clr: '#10b981',
      bg: '#ecfdf5',
    },
    {
      label: t('billingPage.aging8', '8–30 days'),
      val: formatCurrency(aging?.d8_30?.amount ?? 0),
      count: aging?.d8_30?.count ?? 0,
      clr: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      label: t('billingPage.aging31', '31–60 days'),
      val: formatCurrency(aging?.d31_60?.amount ?? 0),
      count: aging?.d31_60?.count ?? 0,
      clr: '#f97316',
      bg: '#fff7ed',
    },
    {
      label: t('billingPage.aging60', '60+ days'),
      val: formatCurrency(aging?.d60?.amount ?? 0),
      count: aging?.d60?.count ?? 0,
      clr: '#ef4444',
      bg: '#fef2f2',
    },
  ];

  return (
    <div className={`statements-tab${compact ? ' statements-tab--compact' : ''}${loading ? ' billing-skeleton-block' : ''}`}>
      <div className={`exp-grid${compact ? ' exp-grid--compact' : ''}`}>
        {exportCards.map((card) =>
          compact ? (
            <button
              key={card.id}
              type="button"
              className="exp-row"
              onClick={card.action}
              disabled={loading || exportingAction !== null || !canExport}
            >
              <span className="exp-icon exp-icon--sm bg-purple-50">{card.icon}</span>
              <span className="exp-row__body">
                <span className="exp-row__top">
                  <span className="exp-title">{card.title}</span>
                  <span className="exp-fmt">{card.fmt}</span>
                </span>
                <span className="exp-desc">{card.desc}</span>
                <span className="exp-row__cta">
                  {exportingAction === card.id
                    ? t('billingPage.exporting', 'Exporting…')
                    : t('billingPage.btnGenerateShort', 'Generate')}
                  <ChevronRight size={14} />
                </span>
              </span>
            </button>
          ) : (
            <div key={card.id} className="exp-card">
              <div className="flex justify-between items-start">
                <div className="exp-icon bg-purple-50">{card.icon}</div>
                <span className="exp-fmt">{card.fmt}</span>
              </div>
              <div className="exp-title">{card.title}</div>
              <div className="exp-desc">{card.desc}</div>
              <button
                type="button"
                className="b-btn b-btn-primary b-btn-sm mt-auto"
                onClick={card.action}
                disabled={loading || exportingAction !== null || !canExport}
              >
                {exportingAction === card.id
                  ? t('billingPage.exporting', 'Exporting…')
                  : t('billingPage.btnGenerate', 'Generate & Download')}
              </button>
            </div>
          ),
        )}
      </div>

      <section className={`aging-panel${compact ? ' aging-panel--compact' : ''} ${loading ? 'is-loading' : ''}`}>
        <div className="aging-panel__head">
          <h3 className="aging-panel__title">{t('billingPage.stAgingReport', 'Aging Report')}</h3>
          <p className="aging-panel__sub">
            {t('billingPage.stAgingReportSub', 'Unpaid invoices by due-date age')}
          </p>
        </div>
        <div className="aging-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="aging-item" style={{ borderLeftColor: '#e4e4e8' }}>
                  <Skeleton width="80%" height={10} borderRadius={4} {...sk} />
                  <div style={{ marginTop: 10 }}>
                    <Skeleton width={72} height={20} borderRadius={4} {...sk} />
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Skeleton width={48} height={10} borderRadius={4} {...sk} />
                  </div>
                </div>
              ))
            : agingBuckets.map((bucket, idx) => (
                <div
                  key={idx}
                  className="aging-item"
                  style={{ borderLeftColor: bucket.clr, background: compact ? bucket.bg : undefined }}
                >
                  <div className="aging-l">{bucket.label}</div>
                  <div className="aging-v billing-mono text-gray-900">{bucket.val}</div>
                  <div className="aging-c">
                    {bucket.count} {t('billingPage.invoices', 'invoices')}
                  </div>
                </div>
              ))}
        </div>
      </section>
    </div>
  );
};

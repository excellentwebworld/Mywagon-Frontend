import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X,
  Copy,
  FileText,
  Download,
  FileSpreadsheet,
  CreditCard,
  Wallet,
  Building2,
  Truck,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice, LineItem } from '../types';
import { formatCurrency, formatDate } from '../mockData';
import { Money, MvButton, RecordStatusBadge, Tag } from '../../../components/ui/mv';
import { BillingDrawerSkeleton } from './BillingSkeleton';

function invoiceStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'Paid':
      return 'success';
    case 'Overdue':
      return 'danger';
    case 'Unpaid':
      return 'warning';
    default:
      return 'neutral';
  }
}

function invoiceTypeVariant(type: string): 'outline' | 'brand' | 'navy' {
  if (type === 'Subscription' || type === 'Add-on') return 'brand';
  if (type === 'Penalty' || type === 'Commission with penalty') return 'navy';
  return 'outline';
}

function lineTypeVariant(type: string): 'outline' | 'brand' | 'navy' {
  return invoiceTypeVariant(type);
}

interface InvoiceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  lineItems: LineItem[];
  detailLoading?: boolean;
  payingId: number | null;
  walletBalance?: number;
  onPreviewPdf: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  onOfficialPrint?: (invoice: Invoice) => void;
  onExportCsv: (invoice: Invoice) => void;
  onPayNow: (invoice: Invoice) => void;
  onPayWallet: (invoice: Invoice) => void;
  onOpenBankTransfer: (invoice: Invoice) => void;
  onToast: (msg: string) => void;
}

export const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  isOpen,
  onClose,
  invoice,
  lineItems,
  detailLoading = false,
  payingId,
  walletBalance = 0,
  onPreviewPdf,
  onDownloadPdf,
  onOfficialPrint,
  onExportCsv,
  onPayNow,
  onPayWallet,
  onOpenBankTransfer,
  onToast,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'details' | 'loads'>('details');

  const drBodyRef = useRef<HTMLDivElement>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && invoice) {
      if (drBodyRef.current) {
        drBodyRef.current.scrollTop = 0;
      }
      if (drawerContentRef.current) {
        drawerContentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, invoice?.id, invoice?.raw_id, detailLoading]);

  useEffect(() => {
    if (drBodyRef.current) {
      drBodyRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  if (!isOpen || !invoice) return null;

  const typeVariant = invoiceTypeVariant(invoice.type);
  const statusTone = invoiceStatusTone(invoice.status);

  const copyInvoiceId = () => {
    navigator.clipboard.writeText(invoice.id);
    onToast(t('billingPage.copiedToClipboard', 'Copied to clipboard'));
  };

  const resolveLoadSid = (li: LineItem): { sid: string | null; linkId: string | null } => {
    const normalizeSid = (value: string): string =>
      `SID-${value.replace(/^SID-/i, '')}`;

    // Prefer API sid when it is already shipments.auto_id (SID-xxxxx).
    if (li.sid && /^SID-/i.test(li.sid)) {
      return {
        sid: normalizeSid(li.sid),
        linkId: li.shipment_id || normalizeSid(li.sid),
      };
    }

    // Recover SID from description ("Penalty 80% SID-394916") — never treat those digits as PK.
    if (li.desc) {
      const match = li.desc.match(/(SID-\d+)/i);
      if (match?.[1]) {
        return {
          sid: normalizeSid(match[1]),
          linkId: li.shipment_id || normalizeSid(match[1]),
        };
      }
    }

    // Legacy SHP-{primary key}: keep navigation by PK, do not display as SID.
    if (li.shipment_id) {
      return { sid: null, linkId: li.shipment_id };
    }
    if (li.sid && /^SHP-/i.test(li.sid)) {
      return { sid: null, linkId: li.sid.replace(/^SHP-/i, '') };
    }

    return { sid: null, linkId: null };
  };

  const renderLoadSidLink = (li: LineItem) => {
    const { sid, linkId } = resolveLoadSid(li);
    if (!sid || !linkId) {
      return <span>{sid || '—'}</span>;
    }
    return (
      <Link
        to={`/shipments/${linkId}`}
        onClick={onClose}
        className="text-purple-600 font-medium hover:underline"
      >
        {sid}
      </Link>
    );
  };

  const lineRateLabel = (li: LineItem) =>
    li.rate || formatCurrency(li.unit ?? li.amt, invoice.cur);

  return createPortal(
    <div
      className={`drawer-bg ${isOpen ? 'show' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="drawer-content" ref={drawerContentRef}>
        <div className="dr-head">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="billing-mono text-lg font-bold text-gray-900">{invoice.id}</span>
                <button type="button" className="b-btn-ghost p-1" title="Copy Invoice ID" onClick={copyInvoiceId}>
                  <Copy size={15} />
                </button>
              </div>
              <div className="flex gap-2">
                <Tag variant={typeVariant}>{invoice.type}</Tag>
                <RecordStatusBadge status={invoice.status} tone={statusTone} />
                {invoice.under_process ? (
                  <RecordStatusBadge status={t('billingPage.receiptUnderReview', 'Receipt under review')} tone="warning" />
                ) : null}
              </div>
            </div>
            <button type="button" className="b-btn-ghost" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="dr-summary-grid">
            <div>
              <div className="dr-summary-label">
                {t('billingPage.subtotal', 'Subtotal')}
              </div>
              <div className="billing-mono dr-summary-value">
                <Money value={invoice.subt} currency={invoice.cur} />
              </div>
            </div>
            <div>
              <div className="dr-summary-label">
                {t('billingPage.taxVat', 'Tax / VAT')}
              </div>
              <div className="billing-mono dr-summary-value">
                <Money value={invoice.tax} currency={invoice.cur} />
              </div>
            </div>
            <div>
              <div className="dr-summary-label">{t('billingPage.total', 'Total')}</div>
              <div className="billing-mono dr-summary-value">
                <Money value={invoice.tot} currency={invoice.cur} />
              </div>
            </div>
            <div>
              <div className="dr-summary-label">{t('billingPage.credits', 'Credits')}</div>
              <div className="billing-mono dr-summary-value">
                <Money value={invoice.cred} currency={invoice.cur} />
              </div>
            </div>
            <div>
              <div className="dr-summary-label">
                {t('billingPage.remaining', 'Remaining')}
              </div>
              <div className="billing-mono dr-summary-value dr-summary-value--remain">
                <Money value={invoice.rem} currency={invoice.cur} overdue={invoice.rem > 0 && invoice.status === 'Overdue'} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-3 text-[11px] text-gray-500">
            <span>
              {t('billingPage.issued', 'Issued')}: <strong>{formatDate(invoice.iDate, i18n.language)}</strong>
            </span>
            <span>
              {t('billingPage.due', 'Due')}: <strong>{formatDate(invoice.dDate, i18n.language)}</strong>
            </span>
            {invoice.pDate && (
              <span>
                {t('billingPage.paid', 'Paid')}:{' '}
                <strong className="text-[var(--mv-success-ink)] font-medium">{formatDate(invoice.pDate, i18n.language)}</strong>
              </span>
            )}
          </div>

          <div className="dr-actions flex gap-1.5 mt-3.5 flex-wrap">
            {onOfficialPrint && (
              <MvButton type="button" variant="primary" size="sm" icon={<FileText size={13} />} onClick={() => onOfficialPrint(invoice)}>
                {t('billingPage.btnOfficialInvoice', 'Official invoice')}
              </MvButton>
            )}
            <button type="button" className="b-btn b-btn-sm" onClick={() => onPreviewPdf(invoice)}>
              <FileText size={13} />
              <span>{t('billingPage.btnPreviewPDF', 'Preview PDF')}</span>
            </button>
            <button type="button" className="b-btn b-btn-sm" onClick={() => onDownloadPdf(invoice)}>
              <Download size={13} />
              <span>{t('billingPage.btnDownloadPDF', 'Download')}</span>
            </button>
            <button type="button" className="b-btn b-btn-sm" onClick={() => onExportCsv(invoice)}>
              <FileSpreadsheet size={13} />
              <span>{t('billingPage.btnCSV', 'CSV')}</span>
            </button>
            {invoice.can_pay_now && (
              <MvButton
                type="button"
                variant="primary"
                size="sm"
                icon={<CreditCard size={13} />}
                disabled={payingId === invoice.raw_id}
                onClick={() => onPayNow(invoice)}
              >
                {t('billingPage.btnPayNow', 'Pay Now')}
              </MvButton>
            )}
            {Boolean(invoice.can_pay_wallet) && walletBalance >= (invoice.rem > 0 ? invoice.rem : invoice.tot) && walletBalance >= invoice.tot && (
              <button type="button" className="b-btn b-btn-sm b-btn-success" onClick={() => onPayWallet(invoice)}>
                <Wallet size={13} />
                <span>{t('billingPage.btnPayWallet', 'Pay using wallet')}</span>
              </button>
            )}
            {invoice.can_bank_transfer && (
              <button type="button" className="b-btn b-btn-sm" onClick={() => onOpenBankTransfer(invoice)}>
                <Building2 size={13} />
                <span>{t('billingPage.btnBankTransfer', 'Bank Transfer')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="dr-tabs">
          <button
            type="button"
            className={`dr-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            {t('billingPage.drLineItems', 'Line Items')}
          </button>
          <button
            type="button"
            className={`dr-tab-btn ${activeTab === 'loads' ? 'active' : ''}`}
            onClick={() => setActiveTab('loads')}
          >
            {t('billingPage.drLinkedLoads', 'Linked Loads')}
          </button>
        </div>

        <div className="dr-body" ref={drBodyRef}>
          {detailLoading ? (
            <BillingDrawerSkeleton />
          ) : activeTab === 'details' ? (
            <>
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {t('billingPage.noLineItems', 'No line items')}
                </div>
              ) : (
                <>
                  <div className="dr-line-cards">
                    {lineItems.map((li, idx) => {
                      return (
                        <article key={li.id || idx} className="dr-line-card">
                          <div className="dr-line-card__top">
                            <Tag variant={lineTypeVariant(li.type)}>{li.type}</Tag>
                            <span className="billing-mono dr-line-card__amount">
                              <Money value={li.amt} currency={invoice.cur} />
                            </span>
                          </div>
                          <p className="dr-line-card__desc">{li.desc || '—'}</p>
                          <div className="dr-line-card__meta">
                            <div>
                              <span className="dr-line-card__label">{t('billingPage.liQty', 'Qty')}</span>
                              <span>{li.qty ?? 1}</span>
                            </div>
                            <div>
                              <span className="dr-line-card__label">{t('billingPage.liRate', 'Rate')}</span>
                              <span className="billing-mono">{lineRateLabel(li)}</span>
                            </div>
                            <div>
                              <span className="dr-line-card__label">{t('billingPage.liLoadSID', 'Load SID')}</span>
                              <span className="billing-mono dr-line-card__sid">{renderLoadSidLink(li)}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="dr-line-table-wrap">
                    <table className="billing-t billing-t-static">
                      <thead>
                        <tr>
                          <th>{t('billingPage.liType', 'Type')}</th>
                          <th>{t('billingPage.liDesc', 'Description')}</th>
                          <th>{t('billingPage.liQty', 'Qty')}</th>
                          <th>{t('billingPage.liRate', 'Rate')}</th>
                          <th>{t('billingPage.liAmount', 'Amount')}</th>
                          <th>{t('billingPage.liLoadSID', 'Load SID')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((li, idx) => (
                          <tr key={li.id || idx}>
                            <td>
                              <Tag variant={lineTypeVariant(li.type)}>{li.type}</Tag>
                            </td>
                            <td className="text-xs text-gray-800">{li.desc}</td>
                            <td className="text-xs text-gray-500 whitespace-nowrap">{li.qty}</td>
                            <td className="text-xs text-gray-500 whitespace-nowrap">{lineRateLabel(li)}</td>
                            <td className="billing-mono text-xs font-semibold text-gray-900 whitespace-nowrap">
                              <Money value={li.amt} currency={invoice.cur} />
                            </td>
                            <td className="billing-mono text-xs whitespace-nowrap">
                              {renderLoadSidLink(li)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : (
            <div>
              {lineItems.filter((l) => resolveLoadSid(l).sid).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {t('billingPage.noLinkedLoads', 'No linked loads')}
                </div>
              )}
              {lineItems
                .filter((l) => resolveLoadSid(l).sid)
                .map((li, idx) => {
                  const { sid, linkId } = resolveLoadSid(li);
                  return (
                    <Link
                      key={idx}
                      to={`/shipments/${linkId}`}
                      onClick={onClose}
                      className="p-3.5 border border-gray-200 rounded-xl mb-2.5 flex items-center gap-3.5 bg-gray-50 hover:bg-purple-50/50 transition-colors block no-underline text-inherit"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0">
                        <Truck size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="billing-mono font-bold text-purple-700 text-sm">{sid}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{li.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="billing-mono font-bold text-gray-900 text-sm">
                          <Money value={li.amt} currency={invoice.cur} />
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

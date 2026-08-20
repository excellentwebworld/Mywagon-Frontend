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
import { BillingDrawerSkeleton } from './BillingSkeleton';

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

  const typeBadgeClass =
    invoice.type === 'Subscription'
      ? 'b-subscription'
      : invoice.type === 'Commission'
      ? 'b-commission'
      : invoice.type === 'Penalty' || invoice.type === 'Commission with penalty'
      ? 'b-penalty'
      : invoice.type === 'Add-on'
      ? 'b-addon'
      : 'b-credit';

  const statusBadgeClass =
    invoice.status === 'Paid'
      ? 'b-paid'
      : invoice.status === 'Overdue'
      ? 'b-overdue'
      : invoice.status === 'Unpaid'
      ? 'b-unpaid'
      : 'b-draft';

  const copyInvoiceId = () => {
    navigator.clipboard.writeText(invoice.id);
    onToast(t('billingPage.copiedToClipboard', 'Copied to clipboard'));
  };

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
                <span className={`b-badge ${typeBadgeClass}`}>{invoice.type}</span>
                <span className={`b-badge ${statusBadgeClass}`}>{invoice.status}</span>
                {invoice.under_process ? (
                  <span className="b-badge b-unpaid">{t('billingPage.receiptUnderReview', 'Receipt under review')}</span>
                ) : null}
              </div>
            </div>
            <button type="button" className="b-btn-ghost" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-4 pt-3 border-t border-gray-100">
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">
                {t('billingPage.subtotal', 'Subtotal')}
              </div>
              <div className="billing-mono text-xs font-medium text-gray-800 mt-0.5">
                {formatCurrency(invoice.subt, invoice.cur)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">
                {t('billingPage.taxVat', 'Tax / VAT')}
              </div>
              <div className="billing-mono text-xs font-medium text-gray-800 mt-0.5">
                {formatCurrency(invoice.tax, invoice.cur)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">{t('billingPage.total', 'Total')}</div>
              <div className="billing-mono text-xs font-medium text-gray-800 mt-0.5">
                {formatCurrency(invoice.tot, invoice.cur)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">{t('billingPage.credits', 'Credits')}</div>
              <div className="billing-mono text-xs font-medium text-gray-800 mt-0.5">
                {formatCurrency(invoice.cred, invoice.cur)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">
                {t('billingPage.remaining', 'Remaining')}
              </div>
              <div className="billing-mono text-xs font-bold text-red-600 mt-0.5">
                {formatCurrency(invoice.rem, invoice.cur)}
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
                <strong className="text-emerald-700 font-medium">{formatDate(invoice.pDate, i18n.language)}</strong>
              </span>
            )}
          </div>

          <div className="flex gap-1.5 mt-3.5 flex-wrap">
            {onOfficialPrint && (
              <button type="button" className="b-btn b-btn-sm b-btn-primary" onClick={() => onOfficialPrint(invoice)}>
                <FileText size={13} />
                <span>{t('billingPage.btnOfficialInvoice', 'Official invoice')}</span>
              </button>
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
              <button
                type="button"
                className="b-btn b-btn-sm b-btn-primary"
                disabled={payingId === invoice.raw_id}
                onClick={() => onPayNow(invoice)}
              >
                <CreditCard size={13} />
                <span>{t('billingPage.btnPayNow', 'Pay Now')}</span>
              </button>
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
            <table className="billing-t">
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
                {lineItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                      {t('billingPage.noLineItems', 'No line items')}
                    </td>
                  </tr>
                )}
                {lineItems.map((li, idx) => {
                  const lineTypeBadgeClass =
                    li.type === 'Subscription'
                      ? 'b-subscription'
                      : li.type === 'Commission'
                      ? 'b-commission'
                      : li.type === 'Penalty' || li.type === 'Commission with penalty'
                      ? 'b-penalty'
                      : li.type === 'Add-on'
                      ? 'b-addon'
                      : 'b-credit';

                  return (
                    <tr key={li.id || idx}>
                      <td>
                        <span className={`b-badge ${lineTypeBadgeClass}`}>{li.type}</span>
                      </td>
                      <td className="text-xs text-gray-800">{li.desc}</td>
                      <td className="text-xs text-gray-500">{li.qty}</td>
                      <td className="text-xs text-gray-500">{li.rate}</td>
                      <td className="billing-mono text-xs font-semibold text-gray-900">
                        {formatCurrency(li.amt, invoice.cur)}
                      </td>
                      <td className="billing-mono text-xs text-purple-600 font-medium">{li.sid || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div>
              {lineItems.filter((l) => l.sid).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {t('billingPage.noLinkedLoads', 'No linked loads')}
                </div>
              )}
              {lineItems
                .filter((l) => l.sid)
                .map((li, idx) => {
                  const rawShipmentId = li.sid?.replace('SHP-', '');
                  return (
                    <Link
                      key={idx}
                      to={`/manage-shipments?q=${rawShipmentId}`}
                      className="p-3.5 border border-gray-200 rounded-xl mb-2.5 flex items-center gap-3.5 bg-gray-50 hover:bg-purple-50/50 transition-colors block no-underline text-inherit"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0">
                        <Truck size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="billing-mono font-bold text-purple-700 text-sm">{li.sid}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{li.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="billing-mono font-bold text-gray-900 text-sm">
                          {formatCurrency(li.amt, invoice.cur)}
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

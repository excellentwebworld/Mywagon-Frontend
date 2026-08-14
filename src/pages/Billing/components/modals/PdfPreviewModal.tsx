import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Invoice, LineItem } from '../../types';
import {
  buildInvoicePdfHtml,
  buildStatementPdfHtml,
  getBillingLogoUrl,
  openBillingPdfPrint,
  type BillingPdfLabels,
} from '../../billingPdfDocument';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  lineItems?: LineItem[];
  isStatement?: boolean;
  statementPeriod?: string;
  invoicesList?: Invoice[];
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  lineItems = [],
  isStatement = false,
  statementPeriod = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  invoicesList = [],
}) => {
  const { t, i18n } = useTranslation();
  const logoUrl = getBillingLogoUrl();

  const labels: BillingPdfLabels = useMemo(
    () => ({
      invoice: t('billingPage.pdfInvoice', 'INVOICE'),
      issued: t('billingPage.issued', 'Issued'),
      due: t('billingPage.due', 'Due'),
      paid: t('billingPage.paid', 'Paid'),
      billTo: t('billingPage.pdfBillTo', 'Bill To'),
      from: t('billingPage.pdfFrom', 'From'),
      lineItems: t('billingPage.drLineItems', 'Line Items'),
      liDesc: t('billingPage.liDesc', 'Description'),
      liQty: t('billingPage.liQty', 'Qty'),
      liRate: t('billingPage.liRate', 'Rate'),
      liAmount: t('billingPage.liAmount', 'Amount'),
      subtotal: t('billingPage.subtotal', 'Subtotal'),
      taxVat: t('billingPage.taxVat', 'Tax / VAT'),
      total: t('billingPage.total', 'Total Due'),
      monthlyStatement: t('billingPage.stMonthlyPDF', 'Monthly Statement'),
      invoicesInPeriod: t('billingPage.invoices', 'Invoices in Period'),
      thInvoice: t('billingPage.thInvoice', 'Invoice #'),
      thType: t('billingPage.thType', 'Type'),
      thStatus: t('billingPage.thStatus', 'Status'),
      thTotal: t('billingPage.thTotal', 'Total'),
      openingBalance: t('billingPage.openingBalance', 'Opening Balance'),
      closingBalance: t('billingPage.closingBalance', 'Closing Balance (Outstanding)'),
    }),
    [t]
  );

  const documentHtml = useMemo(() => {
    if (isStatement) {
      return buildStatementPdfHtml(statementPeriod, invoicesList, labels, logoUrl);
    }
    if (invoice) {
      return buildInvoicePdfHtml(invoice, lineItems, labels, i18n.language, logoUrl);
    }
    return '';
  }, [invoice, isStatement, invoicesList, labels, lineItems, i18n.language, logoUrl, statementPeriod]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!documentHtml) return;
    const title = isStatement
      ? `Statement_${statementPeriod}`
      : invoice
        ? invoice.id
        : 'Invoice';
    openBillingPdfPrint(title, documentHtml);
  };

  return createPortal(
    <div
      className="pdf-overlay show"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={
        isStatement
          ? `${labels.monthlyStatement} — ${statementPeriod}`
          : `${labels.invoice} — ${invoice?.id ?? ''}`
      }
    >
      <div className="pdf-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-header">
          <h4 className="font-semibold text-sm text-gray-800 flex-1">
            {isStatement
              ? `${labels.monthlyStatement} — ${statementPeriod}`
              : `${labels.invoice} — ${invoice?.id}`}
          </h4>
          <button
            type="button"
            className="b-btn b-btn-sm inline-flex items-center gap-1"
            onClick={handlePrint}
          >
            <Printer size={13} />
            <span>{t('billingPage.btnPrint', 'Print')}</span>
          </button>
          <button
            type="button"
            className="b-btn b-btn-sm b-btn-primary inline-flex items-center gap-1"
            onClick={handlePrint}
          >
            <Download size={13} />
            <span>{t('billingPage.btnDownloadPDF', 'Download PDF')}</span>
          </button>
          <button type="button" className="b-btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="pdf-body">
          <div
            className="pdf-page billing-pdf-preview"
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

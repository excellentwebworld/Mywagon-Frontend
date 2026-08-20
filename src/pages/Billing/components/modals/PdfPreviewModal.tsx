import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { billingService, type BillingApi } from '../../../../api/services/billingService';
import type { InvoicePrintPayload, StatementPayload } from '../../../../api/types/billing';
import { fillPrintWindow, preparePrintWindow } from '../../../../utils/printHtml';
import { downloadElementAsPdf } from '../../../../utils/downloadPdf';
import { InvoiceDocument } from '../../documents/InvoiceDocument';
import { StatementDocument } from '../../documents/StatementDocument';
import { BILLING_DOCUMENT_CSS } from '../../documents/documentStyles';
import { renderBillingDocumentHtml } from '../../documents/renderBillingDocument';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: number | null;
  isStatement?: boolean;
  statementPeriod?: string;
  statementFilters?: {
    month?: string;
  };
  billingApi?: BillingApi;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  isStatement = false,
  statementPeriod = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  statementFilters,
  billingApi: billingApiProp,
}) => {
  const api = billingApiProp ?? billingService;
  const { t } = useTranslation();
  const paperRef = useRef<HTMLDivElement>(null);
  const [invoicePrint, setInvoicePrint] = useState<InvoicePrintPayload | null>(null);
  const [statement, setStatement] = useState<StatementPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setInvoicePrint(null);
      setStatement(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (isStatement) {
          const month = statementFilters?.month || statementPeriod;
          setStatement(await api.getStatement(month, { month }));
          setInvoicePrint(null);
        } else if (invoiceId) {
          setInvoicePrint(await api.getInvoicePrint(invoiceId));
          setStatement(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('billingPage.printFailed', 'Unable to load document.'));
        setInvoicePrint(null);
        setStatement(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isOpen, isStatement, invoiceId, statementPeriod, statementFilters, t, api]);

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

  const title = isStatement
    ? `${t('billingPage.stMonthlyPDF', 'Monthly Statement')} — ${statementPeriod}`
    : invoicePrint?.invoice.id || t('billingPage.pdfInvoice', 'INVOICE');

  const documentHtml = () => {
    if (isStatement && statement) {
      return renderBillingDocumentHtml(title, <StatementDocument statement={statement} />);
    }
    if (invoicePrint) {
      return renderBillingDocumentHtml(
        title,
        <InvoiceDocument
          invoice={invoicePrint.invoice}
          issuer={invoicePrint.issuer}
          billTo={invoicePrint.bill_to}
          currency={invoicePrint.currency}
        />,
      );
    }
    return '';
  };

  const ready = Boolean((isStatement && statement) || invoicePrint);

  const handlePrint = () => {
    const html = documentHtml();
    if (!html) return;
    const printWindow = preparePrintWindow(title);
    if (!printWindow) return;
    fillPrintWindow(printWindow, title, html);
  };

  const handleDownload = async () => {
    const node = paperRef.current?.querySelector('.mv-doc') as HTMLElement | null;
    if (!node) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(node, title);
    } catch {
      setError(t('billingPage.printFailed', 'Unable to download the PDF.'));
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div
      className="pdf-overlay show"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="pdf-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-header">
          <h4 className="font-semibold text-sm text-gray-800 flex-1">{title}</h4>
          <button
            type="button"
            className="b-btn b-btn-sm inline-flex items-center gap-1"
            onClick={handlePrint}
            disabled={!ready || loading}
          >
            <Printer size={13} />
            <span>{t('billingPage.btnPrint', 'Print')}</span>
          </button>
          <button
            type="button"
            className="b-btn b-btn-sm b-btn-primary inline-flex items-center gap-1"
            onClick={handleDownload}
            disabled={!ready || loading || downloading}
          >
            <Download size={13} />
            <span>
              {downloading
                ? t('billingPage.exporting', 'Exporting…')
                : t('billingPage.btnDownloadPDF', 'Download PDF')}
            </span>
          </button>
          <button type="button" className="b-btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="pdf-body">
          {loading ? (
            <div className="text-center py-16 text-gray-500 text-sm">{t('common.loading', 'Loading…')}</div>
          ) : error ? (
            <div className="text-center py-16 text-red-600 text-sm">{error}</div>
          ) : (
            <div className="billing-doc-paper" ref={paperRef}>
              <style>{BILLING_DOCUMENT_CSS}</style>
              {isStatement && statement ? <StatementDocument statement={statement} /> : null}
              {invoicePrint ? (
                <InvoiceDocument
                  invoice={invoicePrint.invoice}
                  issuer={invoicePrint.issuer}
                  billTo={invoicePrint.bill_to}
                  currency={invoicePrint.currency}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

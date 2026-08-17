import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { billingService } from '../../../../api/services/billingService';
import {
  downloadHtmlFile,
  openHtmlPrintWindow,
  sanitizeHtmlForPreview,
} from '../../../../utils/printHtml';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: number | null;
  isStatement?: boolean;
  statementPeriod?: string;
  statementFilters?: {
    month?: string;
  };
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  isStatement = false,
  statementPeriod = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  statementFilters,
}) => {
  const { t } = useTranslation();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHtml('');
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (isStatement) {
          const month = statementFilters?.month || statementPeriod;
          setHtml(await billingService.getStatementPrintHtml(month, { month }, true));
        } else if (invoiceId) {
          setHtml(await billingService.getInvoicePrintHtml(invoiceId, true));
        } else {
          setHtml('');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('billingPage.printFailed', 'Unable to load document.'));
        setHtml('');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isOpen, isStatement, invoiceId, statementPeriod, statementFilters, t]);

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

  const previewHtml = useMemo(() => sanitizeHtmlForPreview(html), [html]);

  if (!isOpen) return null;

  const title = isStatement
    ? `${t('billingPage.stMonthlyPDF', 'Monthly Statement')} — ${statementPeriod}`
    : t('billingPage.pdfInvoice', 'INVOICE');

  const handlePrint = () => {
    if (!html) return;
    openHtmlPrintWindow(title, html);
  };

  const handleDownload = () => {
    if (!html) return;
    downloadHtmlFile(title, html);
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
            disabled={!html || loading}
          >
            <Printer size={13} />
            <span>{t('billingPage.btnPrint', 'Print')}</span>
          </button>
          <button
            type="button"
            className="b-btn b-btn-sm b-btn-primary inline-flex items-center gap-1"
            onClick={handleDownload}
            disabled={!html || loading}
          >
            <Download size={13} />
            <span>{t('billingPage.btnDownloadPDF', 'Download PDF')}</span>
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
            <iframe
              title={title}
              className="billing-pdf-preview"
              srcDoc={previewHtml}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

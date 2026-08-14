import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BillingModalPortal } from './BillingModalPortal';

interface StatementDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (month: string, format: 'PDF' | 'CSV' | 'XLSX') => void;
}

export const StatementDownloadModal: React.FC<StatementDownloadModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const { t } = useTranslation();
  const [month, setMonth] = useState(
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  );
  const [format, setFormat] = useState<'PDF' | 'CSV' | 'XLSX'>('PDF');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(month, format);
    onClose();
  };

  return (
    <BillingModalPortal isOpen={isOpen} onClose={onClose}>
    <div className="billing-modal-bg show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="billing-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="billing-modal-h">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-purple-600" />
            <h3>{t('billingPage.modalStatementDL', 'Generate Statement')}</h3>
          </div>
          <button type="button" className="b-btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="billing-modal-body">
            <div className="billing-mf">
              <label>
                {t('billingPage.fldMonth', 'Statement Period')} <span className="req">*</span>
              </label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} required>
                <option value="January 2026">January 2026</option>
                <option value="December 2025">December 2025</option>
                <option value="November 2025">November 2025</option>
                <option value="October 2025">October 2025</option>
                <option value="Q4 2025 (Oct–Dec)">Q4 2025 (Oct–Dec)</option>
              </select>
            </div>

            <div className="billing-mf">
              <label>{t('billingPage.fldFormat', 'Export Format')}</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'PDF' | 'CSV' | 'XLSX')}
              >
                <option value="PDF">PDF (Printable Statement)</option>
                <option value="CSV">CSV (Comma-separated values)</option>
                <option value="XLSX">Excel Spreadsheet (.xlsx)</option>
              </select>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 leading-normal">
              Includes opening balance, invoices issued, adjustments, credit notes applied, payments recorded, and closing balance for the selected period.
            </div>
          </div>

          <div className="billing-modal-ft">
            <button type="button" className="b-btn" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="b-btn b-btn-primary">
              {t('billingPage.btnGenerate', 'Generate & Download')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </BillingModalPortal>
  );
};

import React, { useCallback, useRef, useState } from 'react';
import { erpOrdersService, ApiError } from '../../api';
import type { AiMappedOrder, AiOrdersTransformErrorData } from '../../api/types/erpOrders';
import type { ApiErpOrderCustomer } from '../../api/types/erpOrders';
import type { LocationItem, SKU } from '../../context/AppContext';
import {
  OrdersAiWizardPreviewPanel,
  toConfirmImportOrders,
  initOrderPreviewRows,
  type OrderPreviewRow,
} from './OrdersAiWizardPreviewPanel';
import '../../styles/ai-wizard.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  downloadTemplate: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  companies: ApiErpOrderCustomer[];
  locations: LocationItem[];
  skus: SKU[];
  t: (key: string, options?: Record<string, unknown>) => string;
};

const ALLOWED_EXT = /\.(csv|tsv|txt|xlsx|xls)$/i;

type WizardStep = 1 | 2 | 3 | 4;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stepFromSection(section: 'upload' | 'processing' | 'preview' | 'done'): WizardStep {
  if (section === 'upload') return 1;
  if (section === 'processing') return 2;
  if (section === 'preview') return 3;
  return 4;
}

function stepClass(n: WizardStep, active: WizardStep): string {
  if (n < active) return 'ai-step done';
  if (n === active) return 'ai-step active';
  return 'ai-step';
}

function lineClass(beforeStep: WizardStep, active: WizardStep): string {
  return beforeStep < active ? 'ai-step-line done' : 'ai-step-line';
}

export const OrdersAiWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportSuccess,
  downloadTemplate,
  showToast,
  companies,
  locations,
  skus,
  t,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'done'>('upload');
  const [processingMode, setProcessingMode] = useState<'transform' | 'import'>('transform');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<OrderPreviewRow[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(
    null
  );
  const abortRef = useRef(false);

  const activeStep = stepFromSection(step);

  const reset = useCallback(() => {
    setStep('upload');
    setProcessingMode('transform');
    setFile(null);
    setDragOver(false);
    setRows([]);
    setFileHeaders([]);
    setError(null);
    setImportResult(null);
    abortRef.current = false;
  }, []);

  const handleClose = () => {
    if (step === 'processing') {
      if (!window.confirm(t('ordersAiWizardCloseConfirm'))) return;
      abortRef.current = true;
    }
    if (step === 'done') {
      onImportSuccess();
    }
    reset();
    onClose();
  };

  const pickFile = (selected: File | null | undefined) => {
    if (!selected) return;
    if (!ALLOWED_EXT.test(selected.name)) {
      showToast(t('aiWizardInvalidFormat'), 'error');
      return;
    }
    setFile(selected);
    setError(null);
  };

  const validateAcceptedRows = useCallback((): AiMappedOrder[] | null => {
    const toImport = toConfirmImportOrders(rows);
    if (!toImport.length) {
      showToast(t('ordersAiWizardNoAccepted'), 'warning');
      return null;
    }

    const invalid = rows.find(
      (r) =>
        r.status === 'accepted' &&
        (!r.order.order_reference?.trim() ||
          r.order.company_entity_id == null ||
          !r.order.customer_name?.trim() ||
          !r.order.delivery_date?.trim())
    );

    if (invalid) {
      showToast(t('ordersAiWizardValidationError'), 'error');
      return null;
    }

    return toImport;
  }, [rows, showToast, t]);

  const runTransform = async () => {
    if (!file) return;
    setStep('processing');
    setProcessingMode('transform');
    setError(null);
    abortRef.current = false;

    try {
      const result = await erpOrdersService.aiTransform(file);
      if (abortRef.current) return;
      const preview = initOrderPreviewRows(result.orders ?? []);
      if (!preview.length) {
        setError(t('ordersAiWizardNoOrders'));
        setStep('upload');
        return;
      }
      setRows(preview);
      setFileHeaders(result.file_headers ?? []);
      setStep('preview');
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const data = err.data as AiOrdersTransformErrorData;
        if (data.error_type === 'missing_columns') {
          setError(t('ordersAiWizardMissingCols', { count: data.missing_columns?.length ?? 0 }));
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : t('ordersAiWizardGenericError'));
      }
      setStep('upload');
    }
  };

  const confirmImport = async () => {
    const toImport = validateAcceptedRows();
    if (!toImport) return;

    setStep('processing');
    setProcessingMode('import');
    try {
      const result = await erpOrdersService.aiConfirmImport(toImport);
      setImportResult({
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      });
      setStep('done');
      showToast(t('ordersAiWizardImportDone'), 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t('ordersAiWizardImportFailed'), 'error');
      setStep('preview');
    }
  };

  if (!isOpen) return null;

  const requiredCols = [
    { label: t('erpOrdersColOrderId'), desc: t('ordersAiWizardReqOrderIdDesc') },
    { label: t('erpOrdersColDeliveryDate'), desc: t('ordersAiWizardReqDeliveryDesc') },
  ];

  const acceptedCount = rows.filter((r) => r.status === 'accepted').length;
  const processingTitle =
    processingMode === 'import' ? t('ordersAiWizardImporting') : t('ordersAiWizardAnalyzing');
  const processingSub =
    processingMode === 'import' ? t('ordersAiWizardImportingSub') : t('ordersAiWizardAnalyzingSub');

  return (
    <div className="modal-bg show ai-wizard-modal-bg">
      <div className="modal ai-wizard-modal ai-wizard-modal-wide">
        <div className="ai-wizard-header">
          <div className="ai-wizard-header-left">
            <div className="ai-wizard-icon-wrap">✨</div>
            <div>
              <div className="ai-wizard-title">{t('ordersAiWizardTitle')}</div>
              <div className="ai-wizard-subtitle-header">{t('ordersAiWizardIntro')}</div>
            </div>
          </div>
          <button type="button" className="ai-wizard-close-btn" onClick={handleClose} aria-label={t('cancel')}>
            ✕
          </button>
        </div>

        <div className="ai-wizard-steps">
          {[1, 2, 3, 4].map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && <div className={lineClass(i as WizardStep, activeStep)} />}
              <div className={stepClass(n as WizardStep, activeStep)}>
                <span className="ai-step-num">{n}</span>
                <span className="ai-step-label">
                  {n === 1
                    ? t('aiWizardStepUpload')
                    : n === 2
                      ? t('aiWizardStepProcessing')
                      : n === 3
                        ? t('aiWizardStepPreview')
                        : t('aiWizardStepDone')}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {step === 'upload' && (
          <div className="ai-wizard-form-section">
            <div className="modal-body ai-wizard-body">
              <div
                className={`ai-dropzone-area${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="ai-dropzone-upload-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="ai-dropzone-main-text">
                  {file ? `✓ ${file.name} (${formatBytes(file.size)})` : t('ordersAiWizardDropzone')}
                </div>
                <div className="ai-dropzone-hint">{t('ordersAiWizardDropzoneHint')}</div>
                <div className="ai-dropzone-formats">
                  {['XLSX', 'XLS', 'CSV', 'TXT'].map((fmt) => (
                    <span key={fmt} className="ai-format-chip">
                      {fmt}
                    </span>
                  ))}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xls"
                  hidden
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>

              {error && <div className="ai-error-detail-box" style={{ marginBottom: 16 }}>{error}</div>}

              <div className="ai-req-cols-box" style={{ marginBottom: 16 }}>
                <div className="ai-req-cols-title">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  {t('ordersAiWizardRequiredCols')}
                </div>
                <div className="ai-req-cols-grid">
                  {requiredCols.map((col) => (
                    <div key={col.label} className="ai-req-col-item ai-req-col-found">
                      <div className="ai-req-col-status">✓</div>
                      <div className="ai-req-col-info">
                        <div className="ai-req-col-label">{col.label}</div>
                        <div className="ai-req-col-desc">{col.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="ai-template-download-btn"
                onClick={downloadTemplate}
                style={{ width: '100%', border: 'none', font: 'inherit' }}
              >
                <div className="ai-template-download-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <div className="ai-template-download-title">{t('ordersAiWizardDownloadTemplate')}</div>
                  <div className="ai-template-download-sub">{t('ordersAiWizardDownloadTemplateSub')}</div>
                </div>
                <div className="ai-template-download-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>

              <div className="ai-how-it-works" style={{ marginTop: 16 }}>
                <div className="ai-how-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="ai-how-text">
                  <strong>{t('aiWizardHowItWorks')}</strong> {t('ordersAiWizardHowItWorksDesc')}
                </div>
              </div>
            </div>

            <div className="ai-wizard-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                {t('cancel')}
              </button>
              <button type="button" className="btn ai-primary-btn" disabled={!file} onClick={runTransform}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {t('ordersAiWizardAnalyze')}
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="ai-wizard-progress-section">
            <div className="modal-body ai-wizard-body">
              <div className="ai-processing-header">
                <div className="ai-processing-spinner">
                  <div className="ai-spinner-ring" />
                  <div className="ai-spinner-core">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                </div>
                <div className="ai-processing-info">
                  <div className="ai-processing-status">{processingTitle}</div>
                  <div className="ai-processing-substatus">{processingSub}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="ai-wizard-preview-section">
            <div className="modal-body ai-wizard-body ai-preview-body">
              <OrdersAiWizardPreviewPanel
                rows={rows}
                fileHeaders={fileHeaders}
                companies={companies}
                locations={locations}
                skus={skus}
                t={t}
                onRowsChange={setRows}
              />
            </div>
            <div className="ai-wizard-footer ai-footer-split">
              <button type="button" className="btn btn-secondary" onClick={() => setStep('upload')}>
                {t('ordersAiWizardReupload')}
              </button>
              <button type="button" className="btn ai-primary-btn" onClick={confirmImport}>
                {t('ordersAiWizardConfirmImport', { count: acceptedCount })}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && importResult && (
          <div className="ai-wizard-result-section">
            <div className="modal-body ai-wizard-body ai-result-center">
              <div className="ai-done-icon ai-done-icon-success">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="ai-done-title">{t('ordersAiWizardImportDone')}</h3>
              <p className="ai-done-desc">
                {t('ordersAiWizardImportSummary', {
                  created: importResult.created,
                  updated: importResult.updated,
                  failed: importResult.failed,
                })}
              </p>
            </div>
            <div className="ai-wizard-footer ai-footer-center">
              <button type="button" className="btn ai-primary-btn" onClick={handleClose}>
                {t('done')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

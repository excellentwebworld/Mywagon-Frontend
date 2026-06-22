import React, { useCallback, useRef, useState } from 'react';
import { erpOrdersService, ApiError } from '../../api';
import type { AiMappedOrder, AiOrdersTransformErrorData } from '../../api/types/erpOrders';
import '../../styles/ai-wizard.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  downloadTemplate: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const ALLOWED_EXT = /\.(csv|tsv|txt|xlsx|xls)$/i;

type PreviewRow = AiMappedOrder & { accepted: boolean };

export const OrdersAiWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportSuccess,
  downloadTemplate,
  showToast,
  t,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setProgress(0);
    setError(null);
    setImportResult(null);
    abortRef.current = false;
  }, []);

  const handleClose = () => {
    if (step === 'processing') {
      if (!window.confirm(t('ordersAiWizardCloseConfirm'))) return;
      abortRef.current = true;
    }
    reset();
    onClose();
  };

  const runTransform = async () => {
    if (!file) return;
    setStep('processing');
    setProgress(10);
    setError(null);
    abortRef.current = false;

    try {
      setProgress(40);
      const result = await erpOrdersService.aiTransform(file);
      if (abortRef.current) return;
      setProgress(90);
      const preview: PreviewRow[] = (result.orders ?? []).map((o) => ({ ...o, accepted: true }));
      if (!preview.length) {
        setError(t('ordersAiWizardNoOrders'));
        setStep('upload');
        return;
      }
      setRows(preview);
      setStep('preview');
      setProgress(100);
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
    const accepted = rows.filter((r) => r.accepted);
    if (!accepted.length) {
      showToast(t('ordersAiWizardNoAccepted'), 'warning');
      return;
    }
    setStep('processing');
    setProgress(20);
    try {
      const result = await erpOrdersService.aiConfirmImport(
        accepted.map(({ accepted: _a, ...order }) => order)
      );
      setImportResult({ created: result.created, failed: result.failed });
      setStep('done');
      onImportSuccess();
      showToast(t('ordersAiWizardImportDone'), 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t('ordersAiWizardImportFailed'), 'error');
      setStep('preview');
    }
  };

  if (!isOpen) return null;

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
          <button type="button" className="ai-wizard-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="ai-wizard-body">
          {step === 'upload' && (
            <div className="ai-wizard-form-section">
              <p>{t('ordersAiWizardIntro')}</p>
              <div
                className="ai-dropzone"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f && ALLOWED_EXT.test(f.name)) setFile(f);
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? file.name : t('ordersAiWizardDropzone')}
              </div>
              {error && <div className="ai-error-msg">{error}</div>}
              <button type="button" className="btn btn-sm" onClick={downloadTemplate}>
                {t('ordersAiWizardDownloadTemplate')}
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="ai-wizard-progress-section">
              <div className="ai-progress-bar">
                <div className="ai-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p>{t('ordersAiWizardAnalyzing')}</p>
            </div>
          )}

          {step === 'preview' && (
            <div className="ai-wizard-preview-section">
              <p>{t('ordersAiWizardPreviewSub')}</p>
              <div className="ai-preview-table-wrap">
                <table className="ai-preview-table">
                  <thead>
                    <tr>
                      <th>{t('erpOrdersColOrderId')}</th>
                      <th>{t('erpOrdersColCustomer')}</th>
                      <th>{t('erpOrdersColDeliveryDate')}</th>
                      <th>{t('erpOrdersColProducts')}</th>
                      <th>{t('ordersAiWizardAccept')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={`${row.order_reference}-${i}`} className={row.inferred?.customer ? 'ai-inferred' : ''}>
                        <td>{row.order_reference}</td>
                        <td>{row.customer_name}</td>
                        <td>{row.delivery_date}</td>
                        <td>{row.lines?.[0]?.product_name ?? '—'}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.accepted}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r, idx) => (idx === i ? { ...r, accepted: e.target.checked } : r))
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && importResult && (
            <div className="ai-wizard-result-section">
              <h3>{t('ordersAiWizardImportDone')}</h3>
              <p>
                {t('ordersAiWizardImportSummary', {
                  created: importResult.created,
                  failed: importResult.failed,
                })}
              </p>
            </div>
          )}
        </div>

        <div className="ai-wizard-footer">
          {step === 'upload' && (
            <button type="button" className="btn btn-p" disabled={!file} onClick={runTransform}>
              {t('ordersAiWizardAnalyze')}
            </button>
          )}
          {step === 'preview' && (
            <>
              <button type="button" className="btn" onClick={() => setStep('upload')}>
                {t('ordersAiWizardReupload')}
              </button>
              <button type="button" className="btn btn-p" onClick={confirmImport}>
                {t('ordersAiWizardConfirmImport', { count: rows.filter((r) => r.accepted).length })}
              </button>
            </>
          )}
          {step === 'done' && (
            <button type="button" className="btn btn-p" onClick={handleClose}>
              {t('done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

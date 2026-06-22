import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, productMasterService } from '../../api';
import type { AiMappedProduct, AiTransformErrorData, ApiImportResult } from '../../api/types/productMaster';
import {
  parseCsvHeaderLine,
  readCsvFirstLine,
  validateRequiredCsvColumns,
} from '../../pages/ProductMaster/utils/aiWizardUtils';

type WizardStep = 1 | 2 | 3 | 4;
type Section = 'form' | 'progress' | 'error' | 'preview' | 'result';

type LogEntry = { type: 'info' | 'success' | 'error' | 'warning'; message: string; ts: string };

type ColCheckResult = { label: string; icon: string; desc: string; found: boolean };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  downloadTemplate: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const ALLOWED_EXT = /\.(csv|tsv|txt|xlsx|xls)$/i;

const FIELD_KEYWORDS: Record<string, string[]> = {
  sku_name: ['sku name', 'sku_name', 'product name', 'item name', 'productname', 'itemname', 'sku nm', 'product nm'],
  sku_number: ['sku number', 'sku_number', 'sku no', 'sku#', 'skuno', 'sku id', 'skuid', 'item code', 'product code', 'product_code', 'item_code', 'sku code', 'sku_code'],
  barcode: ['barcode', 'bar_code', 'bar code', 'upc', 'ean', 'sku barcode'],
  category: ['category', 'product category', 'item category', 'product group', 'sku category'],
  product_type: ['product type', 'producttype', 'product_type', 'item type', 'sku type', 'sku_type'],
  unit: ['unit', 'unit of measure', 'uom', 'measure', 'sku unit', 'pack'],
  weight: ['weight', 'net weight', 'gross weight', 'weight kg', 'weight_kg', 'kg'],
  hazardous: ['hazardous', 'hazard', 'hazmat', 'is hazardous', 'dangerous goods'],
  pallet_type: ['pallet type', 'pallet_type', 'pallet', 'skids'],
  stackable: ['stackable', 'is stackable', 'stack'],
  temperature: ['temperature', 'temp', 'temp requirement', 'storage temp'],
  status: ['status', 'state', 'active'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function logTs(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function computeMissingFields(headers: string[]): Record<string, boolean> {
  const normalized = headers.map((h) => String(h).toLowerCase().trim().replace(/["']+/g, ''));
  const out: Record<string, boolean> = {};
  for (const [field, kws] of Object.entries(FIELD_KEYWORDS)) {
    if (!normalized.length) {
      out[field] = false;
      continue;
    }
    let found = false;
    for (const kw of kws) {
      for (const h of normalized) {
        if (h === kw || h.includes(kw)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    out[field] = !found;
  }
  return out;
}

function stepClass(step: WizardStep, activeStep: WizardStep): string {
  if (step < activeStep) return 'ai-step done';
  if (step === activeStep) return 'ai-step active';
  return 'ai-step';
}

function lineClass(idx: number, activeStep: WizardStep): string {
  return idx + 2 < activeStep ? 'ai-step-line done' : 'ai-step-line';
}

export const AiWizardModal: React.FC<Props> = ({ isOpen, onClose, onImportSuccess, downloadTemplate, t }) => {
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [section, setSection] = useState<Section>('form');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [products, setProducts] = useState<AiMappedProduct[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [substatusText, setSubstatusText] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logCounter, setLogCounter] = useState('0 / 0');
  const [running, setRunning] = useState(false);
  const [imported, setImported] = useState(false);
  const [importResult, setImportResult] = useState<ApiImportResult | null>(null);

  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [missingColsMode, setMissingColsMode] = useState(false);
  const [colChecklist, setColChecklist] = useState<ColCheckResult[]>([]);
  const [detectedCols, setDetectedCols] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logStreamRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [...prev, { type, message, ts: logTs() }]);
  }, []);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (logStreamRef.current) {
      clearTimeout(logStreamRef.current);
      logStreamRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    abortRef.current?.abort();
    abortRef.current = null;
    setActiveStep(1);
    setSection('form');
    setFile(null);
    setDragOver(false);
    setProducts([]);
    setFileHeaders([]);
    setProgress(0);
    setStatusText('');
    setSubstatusText('');
    setLogs([]);
    setLogCounter('0 / 0');
    setRunning(false);
    setImported(false);
    setImportResult(null);
    setErrorTitle('');
    setErrorMessage('');
    setErrorDetail(null);
    setMissingColsMode(false);
    setColChecklist([]);
    setDetectedCols([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [clearTimers]);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const showMissingColumnsError = useCallback(
    (parsedCols: string[], checkResults: ColCheckResult[]) => {
      const missingCount = checkResults.filter((r) => !r.found).length;
      setMissingColsMode(true);
      setColChecklist(checkResults);
      setDetectedCols(parsedCols);
      setErrorTitle(t('aiWizardErrorTitle'));
      setErrorMessage(
        missingCount === checkResults.length
          ? t('aiWizardMissingAllCols')
          : t('aiWizardMissingSomeCols', { count: missingCount })
      );
      setErrorDetail(null);
      setSection('error');
      setActiveStep(2);
    },
    [t]
  );

  const showGenericError = useCallback(
    (message: string, detail: string | null = null) => {
      setMissingColsMode(false);
      setErrorTitle(t('aiWizardErrorTitle'));
      setErrorMessage(message);
      setErrorDetail(detail);
      setSection('error');
      setActiveStep(2);
    },
    [t]
  );

  const startProgressSimulation = useCallback(
    (mode: 'transform' | 'import') => {
      clearTimers();
      setProgress(mode === 'import' ? 40 : 0);
      setStatusText(mode === 'import' ? t('aiWizardImporting') : t('aiWizardInit'));
      setSubstatusText(mode === 'import' ? t('aiWizardImportSub') : t('aiWizardInitSub'));

      progressTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          const next = prev + 2;
          if (mode === 'transform') {
            if (next < 25) {
              setStatusText(t('aiWizardUploading'));
              setSubstatusText(t('aiWizardUploadingSub'));
            } else if (next < 50) {
              setStatusText(t('aiWizardAnalyzing'));
              setSubstatusText(t('aiWizardAnalyzingSub'));
            } else if (next < 75) {
              setStatusText(t('aiWizardMapping'));
              setSubstatusText(t('aiWizardMappingSub'));
            } else {
              setStatusText(t('aiWizardFormulating'));
              setSubstatusText(t('aiWizardFormulatingSub'));
            }
          }
          return next;
        });
      }, 400);
    },
    [clearTimers, t]
  );

  const handleFile = useCallback((selected: File | null) => {
    if (!selected) return;
    setFile(selected);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0] ?? null);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile]
  );

  const runTransform = useCallback(
    async (selected: File) => {
      setSection('progress');
      setActiveStep(2);
      setLogs([]);
      appendLog('info', `${t('aiWizardFileSelected')}: ${selected.name} (${formatBytes(selected.size)})`);
      appendLog('info', t('aiWizardUploadLog'));

      setRunning(true);
      startProgressSimulation('transform');
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await productMasterService.aiTransform(selected, controller.signal);
        clearTimers();
        setProgress(100);
        setProducts(result.products);
        setFileHeaders(result.file_headers);
        setRunning(false);
        abortRef.current = null;
        setSection('preview');
        setActiveStep(3);
      } catch (err) {
        clearTimers();
        setRunning(false);
        abortRef.current = null;
        if (controller.signal.aborted) {
          appendLog('warning', t('aiWizardCancelled'));
          setSection('form');
          setActiveStep(1);
          return;
        }
        if (err instanceof ApiError && err.data) {
          const data = err.data as AiTransformErrorData;
          if (data.error_type === 'missing_columns') {
            appendLog('warning', `${t('aiWizardMissingColsLog')}: ${(data.missing_columns ?? []).join(', ')}`);
            const missingSet = new Set((data.missing_columns ?? []).map((c) => c.toLowerCase()));
            const checkResults: ColCheckResult[] = [
              { label: 'SKU Name', icon: '📦', desc: 'Product / item name', found: !missingSet.has('sku name') },
              { label: 'SKU Number', icon: '#️⃣', desc: 'Unique SKU code', found: !missingSet.has('sku number') },
              { label: 'Category', icon: '🗂️', desc: 'Product category', found: !missingSet.has('category') },
              { label: 'Product Type', icon: '🏷️', desc: 'Type of product', found: !missingSet.has('product type') },
            ];
            showMissingColumnsError(data.file_headers ?? [], checkResults);
            return;
          }
        }
        const message = err instanceof ApiError ? err.message : t('aiWizardGenericError');
        appendLog('error', `${t('aiWizardTransformFailed')}: ${message}`);
        showGenericError(message, err instanceof ApiError ? `HTTP ${err.status}` : null);
      }
    },
    [appendLog, clearTimers, showGenericError, showMissingColumnsError, startProgressSimulation, t]
  );

  const handleStartTransform = useCallback(async () => {
    if (!file) return;
    if (!ALLOWED_EXT.test(file.name)) {
      showGenericError(t('aiWizardInvalidFormat'), null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
      try {
        const firstLine = await readCsvFirstLine(file);
        const parsedCols = parseCsvHeaderLine(firstLine);
        const validation = validateRequiredCsvColumns(parsedCols);
        if (!validation.valid) {
          showMissingColumnsError(parsedCols, validation.results);
          return;
        }
      } catch {
        /* server validates */
      }
    }

    await runTransform(file);
  }, [file, runTransform, showGenericError, showMissingColumnsError, t]);

  const streamImportLogs = useCallback(
    (result: ApiImportResult, onDone: () => void) => {
      const allLogs: LogEntry[] = [
        ...(result.success_logs ?? []).map((msg) => ({ type: 'success' as const, message: msg, ts: '' })),
        ...(result.failures ?? []).map((msg) => ({ type: 'error' as const, message: msg, ts: '' })),
      ];
      setLogs([]);
      setLogCounter(`0 / ${allLogs.length}`);
      let idx = 0;

      const streamNext = () => {
        if (idx >= allLogs.length) {
          onDone();
          return;
        }
        const entry = allLogs[idx];
        setLogs((prev) => [...prev, { ...entry, ts: logTs() }]);
        setLogCounter(`${idx + 1} / ${allLogs.length}`);
        idx += 1;
        logStreamRef.current = setTimeout(streamNext, 80);
      };
      streamNext();
    },
    []
  );

  const handleConfirmImport = useCallback(async () => {
    if (!products.length) return;
    setSection('progress');
    setActiveStep(2);
    setLogs([]);
    setRunning(true);
    startProgressSimulation('import');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await productMasterService.aiConfirmImport(products);
      clearTimers();
      setProgress(100);
      setStatusText(t('aiWizardImportDone'));
      setSubstatusText(t('aiWizardImportDoneSub'));
      setRunning(false);
      abortRef.current = null;
      setImportResult(result);
      setImported(true);

      streamImportLogs(result, () => {
        setSection('result');
        setActiveStep(4);
      });
    } catch (err) {
      clearTimers();
      setRunning(false);
      abortRef.current = null;
      const message = err instanceof ApiError ? err.message : t('aiWizardImportFailed');
      showGenericError(message, null);
    }
  }, [clearTimers, products, showGenericError, startProgressSimulation, streamImportLogs, t]);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
    clearTimers();
    setRunning(false);
    setSection('form');
    setActiveStep(1);
    appendLog('warning', t('aiWizardCancelled'));
  }, [appendLog, clearTimers, t]);

  const handleClose = useCallback(() => {
    if (running) {
      if (!window.confirm(t('aiWizardCloseConfirm'))) return;
      handleAbort();
    }
    const wasImported = imported;
    reset();
    onClose();
    if (wasImported) onImportSuccess();
  }, [handleAbort, imported, onClose, onImportSuccess, reset, running, t]);

  const handleDone = useCallback(() => {
    const wasImported = imported;
    reset();
    onClose();
    if (wasImported) onImportSuccess();
  }, [imported, onClose, onImportSuccess, reset]);

  if (!isOpen) return null;

  const missingFields = computeMissingFields(fileHeaders);
  const hasFailures = (importResult?.failed ?? 0) > 0;

  return (
    <div className={`modal-bg ai-wizard-modal-bg show`} onClick={handleClose}>
      <div className="modal ai-wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-wizard-header">
          <div className="ai-wizard-header-left">
            <div className="ai-wizard-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="ai-wizard-title">{t('aiWizardTitle')}</div>
              <div className="ai-wizard-subtitle-header">{t('aiWizardPoweredBy')}</div>
            </div>
          </div>
          <button type="button" className="ai-wizard-close-btn" onClick={handleClose} aria-label={t('cancel')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="ai-wizard-steps">
          {[1, 2, 3, 4].map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && <div className={lineClass(i - 1, activeStep)} />}
              <div className={stepClass(n as WizardStep, activeStep)}>
                <span className="ai-step-num">{n}</span>
                <span className="ai-step-label">
                  {n === 1 ? t('aiWizardStepUpload') : n === 2 ? t('aiWizardStepProcessing') : n === 3 ? t('aiWizardStepPreview') : t('aiWizardStepDone')}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {section === 'form' && (
          <div className="ai-wizard-form-section">
            <div className="modal-body ai-wizard-body">
              <div className="ai-upload-intro">
                <p className="ai-upload-intro-text">{t('aiWizardIntro')}</p>
              </div>
              <div
                className={`ai-dropzone-area${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
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
                  {file ? `✓ ${file.name} (${formatBytes(file.size)})` : t('aiWizardDropzone')}
                </div>
                <div className="ai-dropzone-hint">{t('aiWizardDropzoneHint')}</div>
                <div className="ai-dropzone-formats">
                  {['XLSX', 'XLS', 'CSV', 'TXT'].map((fmt) => (
                    <span key={fmt} className="ai-format-chip">
                      {fmt}
                    </span>
                  ))}
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileInput} />
              </div>
              <div className="ai-how-it-works">
                <div className="ai-how-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="ai-how-text">
                  <strong>{t('aiWizardHowItWorks')}</strong> {t('aiWizardHowItWorksDesc')}
                </div>
              </div>
            </div>
            <div className="ai-wizard-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                {t('cancel')}
              </button>
              <button type="button" className="btn ai-primary-btn" disabled={!file || running} onClick={handleStartTransform}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {t('aiWizardAnalyze')}
              </button>
            </div>
          </div>
        )}

        {section === 'progress' && (
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
                  <div className="ai-processing-status">{statusText}</div>
                  <div className="ai-processing-substatus">{substatusText}</div>
                </div>
                <div className="ai-processing-pct">{progress}%</div>
              </div>
              <div className="ai-progress-track">
                <div className="ai-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="ai-terminal">
                <div className="ai-terminal-titlebar">
                  <div className="ai-terminal-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="ai-terminal-label">{t('aiWizardLogTitle')}</span>
                  <span className="ai-terminal-counter">{logCounter}</span>
                </div>
                <div className="ai-terminal-body">
                  {logs.length === 0 ? (
                    <div className="ai-terminal-placeholder">{t('aiWizardLogPlaceholder')}</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={`${log.ts}-${i}`} className={`ai-log-entry ${log.type}`}>
                        <span style={{ opacity: 0.4, marginRight: 6 }}>{log.ts}</span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="ai-wizard-footer ai-footer-split">
              <div className="ai-footer-pulse-wrap">
                <span className="ai-pulse-dot" />
                <span className="ai-footer-pulse-text">{t('aiWizardKeepOpen')}</span>
              </div>
              <button type="button" className="btn ai-abort-btn" onClick={handleAbort}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                {t('aiWizardStop')}
              </button>
            </div>
          </div>
        )}

        {section === 'error' && (
          <div className="ai-wizard-error-section">
            <div className="modal-body ai-wizard-body">
              <div className="ai-error-wrap">
                <div className="ai-error-icon-wrap">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h4 className="ai-error-title">{errorTitle}</h4>
                <p className="ai-error-desc">{errorMessage}</p>

                {missingColsMode && (
                  <div style={{ width: '100%' }}>
                    <div className="ai-req-cols-box">
                      <div className="ai-req-cols-title">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        {t('aiWizardRequiredCols')}
                      </div>
                      <div className="ai-req-cols-grid">
                        {colChecklist.map((col) => (
                          <div key={col.label} className={`ai-req-col-item ${col.found ? 'ai-req-col-found' : 'ai-req-col-missing'}`}>
                            <div className="ai-req-col-status">
                              {col.found ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              )}
                            </div>
                            <div className="ai-req-col-info">
                              <div className="ai-req-col-label">
                                {col.icon} {col.label}
                              </div>
                              <div className="ai-req-col-desc">{col.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {detectedCols.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                          {t('aiWizardDetectedCols')}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {detectedCols.slice(0, 12).map((col) => (
                            <span key={col} className="ai-detected-col-chip">
                              {col}
                            </span>
                          ))}
                          {detectedCols.length > 12 && (
                            <span className="ai-detected-col-chip ai-detected-col-more">+{detectedCols.length - 12} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="ai-error-download-template" style={{ marginTop: 16 }}>
                      <div className="ai-template-download-btn" onClick={downloadTemplate} role="button" tabIndex={0}>
                        <div className="ai-template-download-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </div>
                        <div>
                          <div className="ai-template-download-title">{t('aiWizardDownloadTemplate')}</div>
                          <div className="ai-template-download-sub">{t('aiWizardDownloadTemplateSub')}</div>
                        </div>
                        <div className="ai-template-download-arrow">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!missingColsMode && (
                  <div style={{ width: '100%' }}>
                    {errorDetail && (
                      <div className="ai-error-detail-box">
                        <div className="ai-error-detail-title">{t('aiWizardErrorDetails')}</div>
                        <div className="ai-error-detail-body">{errorDetail}</div>
                      </div>
                    )}
                    <div className="ai-error-tips">
                      <div className="ai-error-tips-title">{t('aiWizardCommonCauses')}</div>
                      <ul className="ai-error-tips-list">
                        <li>{t('aiWizardCauseEmpty')}</li>
                        <li>{t('aiWizardCauseCorrupt')}</li>
                        <li>{t('aiWizardCauseNoMatch')}</li>
                        <li>{t('aiWizardCauseNoCategories')}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="ai-wizard-footer ai-footer-split">
              <button type="button" className="btn btn-secondary" onClick={reset}>
                {t('aiWizardTryAgain')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                {t('close')}
              </button>
            </div>
          </div>
        )}

        {section === 'preview' && (
          <div className="ai-wizard-preview-section">
            <div className="modal-body ai-wizard-body ai-preview-body">
              <div className="ai-preview-bar">
                <div>
                  <div className="ai-preview-bar-title">{t('aiWizardPreviewTitle')}</div>
                  <div className="ai-preview-bar-sub">{t('aiWizardPreviewSub')}</div>
                </div>
                <div className="ai-count-chip">
                  {products.length} {products.length === 1 ? t('aiWizardProduct') : t('aiWizardProducts')}
                </div>
              </div>
              <div className="ai-table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('skuName')}</th>
                      <th>{t('skuNumber')}</th>
                      <th>{t('barcode')}</th>
                      <th>{t('category')}</th>
                      <th>{t('productType')}</th>
                      <th>{t('uom')}</th>
                      <th>{t('weight')}</th>
                      <th>{t('hazardous')}</th>
                      <th>{t('palletType')}</th>
                      <th>{t('stackable')}</th>
                      <th>{t('temp')}</th>
                      <th>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="ai-table-empty">
                          {t('aiWizardNoProducts')}
                        </td>
                      </tr>
                    ) : (
                      products.map((p, idx) => {
                        const isHazardous = String(p.hazardous || '').toLowerCase() === 'yes';
                        const isStackable = String(p.stackable || '').toLowerCase() !== 'no';
                        const isActive = String(p.status || '').toLowerCase() !== 'inactive';
                        const cell = (field: string, extra = '') =>
                          [extra, missingFields[field] ? 'ai-highlight-cell' : ''].filter(Boolean).join(' ');
                        return (
                          <tr key={`${p.sku_number}-${idx}`}>
                            <td className="ai-td-num">{idx + 1}</td>
                            <td className={cell('sku_name', 'ai-td-bold')}>{p.sku_name || ''}</td>
                            <td className={cell('sku_number', 'ai-td-mono')}>{p.sku_number || ''}</td>
                            <td className={cell('barcode')}>{p.barcode || '-'}</td>
                            <td className={cell('category')}>
                              <span className="cat-pill">{p.category || ''}</span>
                            </td>
                            <td className={cell('product_type')}>
                              <span className="type-pill">{p.product_type || ''}</span>
                            </td>
                            <td className={cell('unit', 'ai-td-medium')}>{p.unit || 'Case'}</td>
                            <td className={cell('weight')}>{p.weight ? `${p.weight} kg` : '-'}</td>
                            <td className={cell('hazardous')}>
                              <span className={`ai-badge ${isHazardous ? 'ai-badge-danger' : 'ai-badge-neutral'}`}>{p.hazardous || t('no')}</span>
                            </td>
                            <td className={cell('pallet_type')}>{p.pallet_type || 'EUR'}</td>
                            <td className={cell('stackable')}>
                              <span className={`ai-badge ${isStackable ? 'ai-badge-success' : 'ai-badge-danger'}`}>{p.stackable || t('yes')}</span>
                            </td>
                            <td className={cell('temperature')}>
                              <span className="ai-badge ai-badge-neutral">{p.temperature || 'Ambient'}</span>
                            </td>
                            <td className={cell('status')}>
                              <span className={`ai-badge ${isActive ? 'ai-badge-success' : 'ai-badge-muted'}`}>{p.status || 'Active'}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="ai-wizard-footer ai-footer-split">
              <button type="button" className="btn btn-secondary" onClick={reset}>
                {t('aiWizardReupload')}
              </button>
              <button type="button" className="btn ai-primary-btn" disabled={!products.length || running} onClick={handleConfirmImport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('aiWizardConfirmImport', { count: products.length })}
              </button>
            </div>
          </div>
        )}

        {section === 'result' && importResult && (
          <div className="ai-wizard-result-section">
            <div className="modal-body ai-wizard-body ai-result-center">
              {hasFailures ? (
                <div className="ai-done-icon ai-done-icon-warn">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
              ) : (
                <div className="ai-done-icon ai-done-icon-success">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              <h3 className="ai-done-title">{hasFailures ? t('aiWizardResultWarn') : t('aiWizardResultSuccess')}</h3>
              <p className="ai-done-desc">{t('aiWizardResultDesc')}</p>
              <div className="ai-done-stats">
                <div className="ai-done-stat">
                  <div className="ai-done-stat-val">{importResult.total}</div>
                  <div className="ai-done-stat-lbl">{t('total')}</div>
                </div>
                <div className="ai-done-stat ai-done-stat-success">
                  <div className="ai-done-stat-val">{importResult.success}</div>
                  <div className="ai-done-stat-lbl">{t('imported')}</div>
                </div>
                <div className="ai-done-stat ai-done-stat-fail">
                  <div className="ai-done-stat-val">{importResult.failed}</div>
                  <div className="ai-done-stat-lbl">{t('failed')}</div>
                </div>
              </div>
            </div>
            <div className="ai-wizard-footer ai-footer-center">
              <button type="button" className="btn ai-primary-btn" onClick={handleDone}>
                {t('aiWizardDone')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

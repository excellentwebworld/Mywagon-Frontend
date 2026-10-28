/**
 * The Orders page's import pop-up (MS3-360), on the same engine and the same
 * card as the Vagon AI chat: pick a file, then the analysis, the review
 * sections, the run and its summary - one flow wherever an import starts.
 *
 * It uploads with `source: 'orders_page'`, so the import belongs to no chat:
 * no conversation is created for it. Both places list in the shared Import
 * History (MS3-373), the pop-up's second tab.
 *
 * A server still on the Laravel engine answers the upload with `legacy`; the
 * page then opens its classic wizard (`onLegacy`), as it did before.
 */
import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, UploadCloud, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { userFacingError } from '../../utils/userFacingError';
import { ORDER_IMPORT_MAX_BYTES, uploadOrderImport, type ImportView } from './api/orderImportService';
import ErpImportCard from './ErpImportCard';
import { Button } from './flowPrimitives';
import { ImportHistory } from './ImportHistory';
import { isOrderIntakeFile, ORDER_INTAKE_ACCEPT } from './orderIntakeDetect';
import { TONE } from './importTones';

export type OrderImportTab = 'new' | 'history';

export function OrderImportModal({
  open, initialTab = 'new', onClose, onImported, onLegacy,
}: {
  open: boolean;
  initialTab?: OrderImportTab;
  onClose: () => void;
  /** Orders were written: the page's list should refresh. */
  onImported: () => void;
  /** This server runs the Laravel engine: open the classic wizard instead. */
  onLegacy: () => void;
}) {
  const { T } = useTheme();
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState<OrderImportTab>(initialTab);
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<ImportView | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  /** The shown import has run: the next opening starts a new one instead of reopening its summary. */
  const [ran, setRan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Each opening starts where it was asked to: a new import, or the history.
  // A review closed half-way is kept; a finished import is not.
  const [openedFor, setOpenedFor] = useState<{ open: boolean; tab: OrderImportTab }>({ open, tab: initialTab });
  if (openedFor.open !== open || openedFor.tab !== initialTab) {
    setOpenedFor({ open, tab: initialTab });
    if (open) setTab(initialTab);
    if (open && ran) {
      setFile(null);
      setView(null);
      setError(null);
      setRan(false);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setView(null);
    setError(null);
    setRan(false);
  };
  const pick = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    if (!isOrderIntakeFile(f)) return setError(t('vagonai.intake.unsupportedFile'));
    if (f.size > ORDER_IMPORT_MAX_BYTES) return setError(t('vagonai.orderImport.tooLarge'));
    setFile(f);
  };
  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadOrderImport({ file, source: 'orders_page', locale: lang });
      if (res.status === 'legacy') {
        onClose();
        onLegacy();
        return;
      }
      if (res.status !== 'ok' || !res.view) setError(res.message ?? t('vagonai.erpImport.error'));
      else setView(res.view);
    } catch (err) {
      setError(userFacingError(err, t, t('vagonai.erpImport.error')));
    } finally {
      setUploading(false);
    }
  };

  const tabButton = (key: OrderImportTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className="px-3 py-2 text-[13px] font-semibold"
      style={{ color: tab === key ? T.t1 : T.t3, borderBottom: `2px solid ${tab === key ? T.ac : 'transparent'}` }}
      data-testid={`order-import-tab-${key}`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(16, 16, 20, 0.45)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="order-import-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('vagonai.orderImportModal.title')}
        className="w-full max-w-[680px] rounded-2xl border shadow-xl"
        style={{ background: T.sf, borderColor: T.bd, color: T.t1 }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3 border-b" style={{ borderColor: T.bd }}>
          <div role="tablist" className="flex items-end gap-1">
            {tabButton('new', t('vagonai.orderImportModal.newTab'))}
            {tabButton('history', t('vagonai.importHistory.title'))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('vagonai.orderImportModal.close')}
            title={t('vagonai.orderImportModal.close')}
            className="rounded-md p-1 mb-1.5"
            style={{ color: T.t2 }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 max-h-[78vh] overflow-y-auto">
          {tab === 'history' ? (
            <ImportHistory T={T} />
          ) : view ? (
            <ErpImportCard
              view={view}
              T={T}
              onDismiss={onClose}
              onChooseAnother={reset}
              onImported={(summary) => {
                setRan(true);
                if (summary.orders.created + (summary.orders.updated ?? 0) > 0) onImported();
              }}
            />
          ) : (
            <div>
              <div
                className="rounded-xl border-2 border-dashed px-4 py-8 text-center"
                style={{ borderColor: dragging ? T.ac : T.bd, background: dragging ? T.sa : 'transparent' }}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes('Files')) return;
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pick(e.dataTransfer.files?.[0]);
                }}
                data-testid="order-import-drop"
              >
                <UploadCloud size={28} className="mx-auto" style={{ color: T.ac }} aria-hidden="true" />
                <p className="m-0 mt-2 text-[14px] font-semibold">{t('vagonai.orderImportModal.dropTitle')}</p>
                <p className="m-0 mt-1 text-[12.5px]" style={{ color: T.t3 }}>{t('vagonai.orderImportModal.dropHint')}</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ORDER_INTAKE_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <div className="mt-3 flex justify-center">
                  <Button T={T} variant="ghost" onClick={() => inputRef.current?.click()} data-testid="order-import-browse">
                    {t('vagonai.orderImportModal.browse')}
                  </Button>
                </div>
              </div>
              {file ? (
                <div className="mt-3 flex items-center gap-2.5 rounded-lg border px-3 py-2" style={{ borderColor: T.bd, background: T.sa }}>
                  <FileSpreadsheet size={18} style={{ color: T.ac }} aria-hidden="true" />
                  <span className="flex-1 min-w-0 truncate text-[13px] font-semibold" title={file.name}>{file.name}</span>
                  <button type="button" className="rounded-md p-1" style={{ color: T.t2 }} onClick={() => setFile(null)} aria-label={t('vagonai.orderImport.removeFile', { file: file.name })}>
                    <X size={14} />
                  </button>
                </div>
              ) : null}
              {error ? <p className="m-0 mt-3 text-[12.5px]" style={{ color: TONE.error.fg }} role="alert">{error}</p> : null}
              <div className="mt-4 flex items-center justify-end gap-2">
                <p className="m-0 mr-auto text-[12px]" style={{ color: T.t3 }}>{t('vagonai.orderImportModal.nothingSaved')}</p>
                <Button T={T} variant="ghost" onClick={onClose}>{t('vagonai.orderImportModal.cancel')}</Button>
                <Button
                  T={T}
                  disabled={!file || uploading}
                  onClick={() => void upload()}
                  icon={uploading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                  data-testid="order-import-start"
                >
                  {t('vagonai.orderImportModal.start')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

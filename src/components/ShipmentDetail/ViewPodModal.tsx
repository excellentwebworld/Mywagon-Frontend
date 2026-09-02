import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, CheckCircle2, Download, ExternalLink, ZoomIn } from 'lucide-react';
import type { PhysicalStop } from './StopsCard';

interface ViewPodModalProps {
  open: boolean;
  stop: PhysicalStop | null;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}

export const ViewPodModal: React.FC<ViewPodModalProps> = ({
  open,
  stop,
  onClose,
  t,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!open || !stop) return null;

  const images = (stop.podImages || []).filter((img) => Boolean(img?.url));

  return createPortal(
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mv-modal-header px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white m-0">
                {t('viewPodTitle', 'Proof of Delivery (POD)')}
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                {stop.location} · {stop.address}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1">
          {/* Status badge & stop info */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-[13px]">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>{t('deliveryConfirmed', 'Delivery Completed & POD Uploaded')}</span>
            </div>
            {stop.date && (
              <span className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">
                {stop.date} {stop.timeStart ? `· ${stop.timeStart}` : ''}
              </span>
            )}
          </div>

          {/* Orders delivered list */}
          {stop.orders && stop.orders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                {t('deliveredOrders', 'Delivered Orders & Products')}
              </span>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                {stop.orders.map((ord, i) => (
                  <div key={i} className="flex items-start justify-between text-[12px] flex-wrap gap-1">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {ord.orderId !== '—' ? `Order: ${ord.orderId}` : 'Delivered Cargo'}
                      </span>
                      {ord.customerName && (
                        <span className="text-slate-500 dark:text-slate-400 ml-2">({ord.customerName})</span>
                      )}
                    </div>
                    <span className="text-slate-600 dark:text-slate-300">
                      {ord.products.map((p) => p.name).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POD Images Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-bold text-slate-900 dark:text-white">
              {t('podDocumentsPhotos', 'POD Documents & Photos')}
            </span>

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/40 text-center">
                <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
                <p className="text-[13px] font-semibold text-slate-900 dark:text-white m-0">
                  {t('podConfirmedNoPhoto', 'Proof of delivery recorded by transporter')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-1 max-w-[340px]">
                  {t(
                    'podConfirmedNoPhotoDesc',
                    'The delivery was completed and marked as verified in the system.'
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex flex-col"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-black/5 flex items-center justify-center">
                      <img
                        src={img.url}
                        alt={`POD Document ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="w-9 h-9 rounded-full bg-white/90 text-slate-800 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-md"
                          onClick={() => setSelectedImage(img.url)}
                          title={t('zoomImage', 'View full size')}
                        >
                          <ZoomIn size={16} />
                        </button>
                        <a
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full bg-white/90 text-slate-800 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-md"
                          title={t('openInNewTab', 'Open in new tab')}
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {t('podImageLabel', `POD Document ${idx + 1}`)}
                      </span>
                      <a
                        href={img.url}
                        download={`POD-${stop.location}-${idx + 1}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        <Download size={12} />
                        <span>{t('download', 'Download')}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Size Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors cursor-pointer p-1"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="POD Full Preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

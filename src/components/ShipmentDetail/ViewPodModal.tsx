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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E8] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#18181B] m-0">
                {t('viewPodTitle', 'Proof of Delivery (POD)')}
              </h2>
              <p className="text-[12px] text-[#6B7280] m-0 mt-0.5">
                {stop.location} · {stop.address}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-[#E4E4E8] flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F4F5] transition-colors cursor-pointer bg-white"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1">
          {/* Status badge & stop info */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
            <div className="flex items-center gap-2 text-[#065F46] font-semibold text-[13px]">
              <CheckCircle2 size={16} className="text-[#10B981]" />
              <span>{t('deliveryConfirmed', 'Delivery Completed & POD Uploaded')}</span>
            </div>
            {stop.date && (
              <span className="text-[12px] text-[#047857] font-medium">
                {stop.date} {stop.timeStart ? `· ${stop.timeStart}` : ''}
              </span>
            )}
          </div>

          {/* Orders delivered list */}
          {stop.orders && stop.orders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-[#374151]">
                {t('deliveredOrders', 'Delivered Orders & Products')}
              </span>
              <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] flex flex-col gap-2">
                {stop.orders.map((ord, i) => (
                  <div key={i} className="flex items-start justify-between text-[12px]">
                    <div>
                      <span className="font-semibold text-[#18181B]">
                        {ord.orderId !== '—' ? `Order: ${ord.orderId}` : 'Delivered Cargo'}
                      </span>
                      {ord.customerName && (
                        <span className="text-[#6B7280] ml-2">({ord.customerName})</span>
                      )}
                    </div>
                    <span className="text-[#4B5563]">
                      {ord.products.map((p) => p.name).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POD Images Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-bold text-[#374151]">
              {t('podDocumentsPhotos', 'POD Documents & Photos')}
            </span>

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-center">
                <CheckCircle2 size={36} className="text-[#10B981] mb-2" />
                <p className="text-[13px] font-semibold text-[#18181B] m-0">
                  {t('podConfirmedNoPhoto', 'Proof of delivery recorded by transporter')}
                </p>
                <p className="text-[11px] text-[#6B7280] m-0 mt-1 max-w-[340px]">
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
                    className="relative group rounded-xl border border-[#E5E7EB] overflow-hidden bg-[#F3F4F6] flex flex-col"
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
                          className="w-9 h-9 rounded-full bg-white/90 text-gray-800 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-md"
                          onClick={() => setSelectedImage(img.url)}
                          title={t('zoomImage', 'View full size')}
                        >
                          <ZoomIn size={16} />
                        </button>
                        <a
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full bg-white/90 text-gray-800 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-md"
                          title={t('openInNewTab', 'Open in new tab')}
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white flex items-center justify-between border-t border-[#E5E7EB]">
                      <span className="text-[11px] font-medium text-[#4B5563]">
                        {t('podImageLabel', `POD Document ${idx + 1}`)}
                      </span>
                      <a
                        href={img.url}
                        download={`POD-${stop.location}-${idx + 1}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#10B981] hover:text-[#059669] font-semibold flex items-center gap-1 cursor-pointer"
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

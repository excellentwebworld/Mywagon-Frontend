import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { BidHistoryItem } from '../../pages/ShipmentDetail/detailViewModel';

interface BidsHistoryModalProps {
  open: boolean;
  bids?: BidHistoryItem[];
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}

export const BidsHistoryModal: React.FC<BidsHistoryModalProps> = ({
  open,
  bids = [],
  onClose,
  t,
}) => {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E8] flex items-center justify-between bg-[#F9FAFB]">
          <h2 className="text-[16px] font-semibold text-[#18181B] m-0">
            {t('bidsHistory', 'Bids History')}
          </h2>
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
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6">
          {bids && bids.length > 0 ? (
            bids.map((bid) => (
              <div
                key={bid.bidNumber}
                className="border-l-[3px] border-[#9B51E0] pl-4 mb-6"
              >
                {/* Bid Group Header */}
                <h3 className="text-[15px] font-bold text-[#2D2766] mb-2.5">
                  {t('bid', 'Bid')} #{bid.bidNumber} – {bid.initiatorName}
                </h3>

                {/* Root Bid Card */}
                <div className="bg-[#F8F7FC] rounded-lg p-3 mb-2.5">
                  <div className="text-[13px] text-[#374151]">
                    <strong>{t('offerPlaced', 'Offer Placed')}</strong>{' '}
                    {t('by', 'by')}{' '}
                    <strong>{bid.initiatorName}</strong>{' '}
                    {t('on', 'on')}{' '}
                    <strong>{bid.date}</strong>
                  </div>
                  <div className="font-bold text-[#9B51E0] text-[16px] mt-1">
                    € {bid.price}
                  </div>
                </div>

                {/* Negotiations Timeline for this Bid */}
                {bid.negotiations && bid.negotiations.length > 0 && (
                  <div className="ml-4 space-y-2 mt-2.5">
                    {bid.negotiations.map((neg) => (
                      <div
                        key={neg.id}
                        className="bg-white border-l-2 border-[#DDD] rounded p-2.5 px-3.5 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      >
                        <div className="text-[#374151]">
                          <strong>{neg.action}</strong>{' '}
                          {t('by', 'by')}{' '}
                          <strong>{neg.userName}</strong>{' '}
                          {t('on', 'on')}{' '}
                          <strong>{neg.date}</strong>
                        </div>

                        {neg.price && (
                          <div className="font-bold text-[#7C5BC4] text-[14px] mt-0.5">
                            € {neg.price}
                          </div>
                        )}

                        {neg.notes && (
                          <div className="text-[#666] text-[12px] italic mt-0.5">
                            ({neg.notes})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-[#9CA3AF] text-[13px]">
              {t('noBidsHistoryFound', 'No bids history found.')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

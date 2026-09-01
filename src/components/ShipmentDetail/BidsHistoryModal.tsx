import React from 'react';
import { createPortal } from 'react-dom';
import { X, History, ArrowRightLeft, Check, Tag, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import type { BidHistoryItem, BidHistoryNegotiation } from '../../pages/ShipmentDetail/detailViewModel';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';

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

  const getActionBadge = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('counter')) {
      return {
        label: t('counterOffer', 'Counter Offer'),
        dotBg: 'bg-[#F59E0B]',
        badgeBg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        icon: <ArrowRightLeft size={12} className="text-[#92400E]" />,
      };
    }
    if (act.includes('accept')) {
      return {
        label: t('accepted', 'Accepted'),
        dotBg: 'bg-[#10B981]',
        badgeBg: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
        icon: <Check size={12} className="text-[#065F46]" />,
      };
    }
    if (act.includes('reject') || act.includes('decline')) {
      return {
        label: t('rejected', 'Rejected'),
        dotBg: 'bg-[#EF4444]',
        badgeBg: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
        icon: <X size={12} className="text-[#991B1B]" />,
      };
    }
    if (act.includes('interest')) {
      return {
        label: t('interestExpressed', 'Interest Expressed'),
        dotBg: 'bg-[#8B5CF6]',
        badgeBg: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
        icon: <Tag size={12} className="text-[#5B21B6]" />,
      };
    }
    return {
      label: t('bidPlaced', 'Bid Placed'),
      dotBg: 'bg-[#3B82F6]',
      badgeBg: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
      icon: <Tag size={12} className="text-[#1E40AF]" />,
    };
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E8] flex items-center justify-between bg-[#FAF9FD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF5FF] border border-[#E9D5FF] text-[#9B51E0] flex items-center justify-center shadow-2xs">
              <History size={16} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#18181B] m-0 leading-tight">
                {t('negotiationHistory', 'Negotiation History')}
              </h2>
              <span className="text-[11px] text-[#64748B]">
                {t('negotiationTimelineSubtitle', 'Timeline of all offers, counter-bids, and responses')}
              </span>
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
          {bids && bids.length > 0 ? (
            bids.map((bid) => {
              // Ensure we have a timeline list without redundant duplicate initial root cards
              const timelineEvents: Array<{
                id: number | string;
                action: string;
                userName: string;
                date: string;
                price?: string | null;
                notes?: string | null;
              }> = bid.negotiations && bid.negotiations.length > 0
                ? bid.negotiations
                : [
                    {
                      id: `root-${bid.bidNumber}`,
                      action: 'Offer Placed',
                      userName: bid.initiatorName,
                      date: bid.date,
                      price: bid.price,
                      notes: null,
                    },
                  ];

              return (
                <div
                  key={bid.bidNumber}
                  className="rounded-2xl border border-[#E9D5FF] bg-[#FAF9FE] p-4 sm:p-5 transition-all shadow-[0_2px_8px_rgba(155,81,224,0.03)]"
                >
                  {/* Bid Group Header */}
                  <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#EDE9FE] flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <CarrierAvatar
                        size={32}
                        name={bid.initiatorName}
                        initials={bid.initiatorName.substring(0, 2).toUpperCase()}
                        className="carrier-av rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#9B51E0] text-white">
                            {t('bid', 'Bid')} #{bid.bidNumber}
                          </span>
                          <span className="font-bold text-[14px] text-[#18181B]">
                            {bid.initiatorName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider">
                        {t('initialBidPrice', 'Initial Bid')}
                      </span>
                      <span className="font-bold font-mono text-[14px] text-[#9B51E0]">
                        € {bid.price}
                      </span>
                    </div>
                  </div>

                  {/* Vertical Timeline Stepper */}
                  <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E2E8F0]">
                    {timelineEvents.map((neg, nIdx) => {
                      const badge = getActionBadge(neg.action);
                      const isLast = nIdx === timelineEvents.length - 1;

                      return (
                        <div key={neg.id || nIdx} className="relative group">
                          {/* Timeline Dot */}
                          <div
                            className={`absolute -left-[24px] top-1.5 w-[14px] h-[14px] rounded-full border-2 border-white shadow-xs flex items-center justify-center ${badge.dotBg}`}
                          />

                          {/* Event Card */}
                          <div className={`rounded-xl border p-3 bg-white transition-all shadow-2xs ${
                            isLast ? 'border-[#D8B4FE] ring-1 ring-[#9B51E0]/15' : 'border-[#E2E8F0]'
                          }`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.badgeBg}`}>
                                  {badge.icon}
                                  <span>{badge.label}</span>
                                </span>
                                <span className="text-[12px] font-semibold text-[#18181B]">
                                  {neg.userName}
                                </span>
                              </div>

                              {neg.date && (
                                <div className="flex items-center gap-1 text-[11px] text-[#8E8E9A]">
                                  <Clock size={11} />
                                  <span>{neg.date}</span>
                                </div>
                              )}
                            </div>

                            {/* Price Badge */}
                            {neg.price && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] text-[#64748B] font-medium">
                                  {t('amount', 'Amount')}:
                                </span>
                                <span className="px-2.5 py-0.5 rounded-md text-[13px] font-bold font-mono bg-[#FAF5FF] text-[#9B51E0] border border-[#E9D5FF]">
                                  € {neg.price}
                                </span>
                              </div>
                            )}

                            {/* Optional Notes Box */}
                            {neg.notes && (
                              <div className="mt-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#475569] flex items-start gap-1.5">
                                <MessageSquare size={13} className="text-[#94A3B8] flex-shrink-0 mt-0.5" />
                                <span className="italic leading-relaxed">“{neg.notes}”</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-[#9CA3AF]">
              <AlertCircle size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
              <p className="text-[13px] font-medium m-0">
                {t('noBidsHistoryFound', 'No bids history found.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

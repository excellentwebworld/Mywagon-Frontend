import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, History, ArrowRightLeft, Check, Tag, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import type { BidHistoryItem } from '../../pages/ShipmentDetail/detailViewModel';
import type { PartnerBidItem } from './BidsCard';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';

interface BidsHistoryModalProps {
  open: boolean;
  bids?: BidHistoryItem[];
  partner?: PartnerBidItem | null;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}

export const BidsHistoryModal: React.FC<BidsHistoryModalProps> = ({
  open,
  bids = [],
  partner = null,
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
        badgeBg: 'bg-[#FEF3C7] dark:bg-amber-950/60 text-[#92400E] dark:text-amber-300 border-[#FDE68A] dark:border-amber-800/60',
        icon: <ArrowRightLeft size={12} className="text-[#92400E] dark:text-amber-400" />,
      };
    }
    if (act.includes('accept')) {
      return {
        label: t('accepted', 'Accepted'),
        dotBg: 'bg-[#10B981]',
        badgeBg: 'bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-[#A7F3D0] dark:border-emerald-800/60',
        icon: <Check size={12} className="text-[#065F46] dark:text-emerald-400" />,
      };
    }
    if (act.includes('reject') || act.includes('decline')) {
      return {
        label: t('rejected', 'Rejected'),
        dotBg: 'bg-[#EF4444]',
        badgeBg: 'bg-[#FEE2E2] dark:bg-rose-950/60 text-[#991B1B] dark:text-rose-300 border-[#FECACA] dark:border-rose-800/60',
        icon: <X size={12} className="text-[#991B1B] dark:text-rose-400" />,
      };
    }
    if (act.includes('interest')) {
      return {
        label: t('interestExpressed', 'Interest Expressed'),
        dotBg: 'bg-[#8B5CF6]',
        badgeBg: 'bg-[#EDE9FE] dark:bg-purple-950/60 text-[#5B21B6] dark:text-purple-300 border-[#DDD6FE] dark:border-purple-800/60',
        icon: <Tag size={12} className="text-[#5B21B6] dark:text-purple-400" />,
      };
    }
    return {
      label: t('bidPlaced', 'Bid Placed'),
      dotBg: 'bg-[#3B82F6]',
      badgeBg: 'bg-[#DBEAFE] dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 border-[#BFDBFE] dark:border-blue-800/60',
      icon: <Tag size={12} className="text-[#1E40AF] dark:text-blue-400" />,
    };
  };

  const filteredBids = useMemo(() => {
    if (!partner) return bids;

    // 1. Match by numeric userId / bidableId / driverId
    if (partner.userId) {
      const matched = bids.filter(
        (b) => b.bidableId === partner.userId || b.driverId === partner.userId
      );
      if (matched.length > 0) return matched;
    }

    // 2. Match by bid id if partner.id is a numeric bid id
    const partnerNumId = Number(partner.id);
    if (!isNaN(partnerNumId) && partnerNumId > 0) {
      const matched = bids.filter((b) => b.bidId === partnerNumId);
      if (matched.length > 0) return matched;
    }

    // 3. Match by name
    const partnerName = (partner.name || '').trim().toLowerCase();
    if (partnerName) {
      const matched = bids.filter((b) => {
        const initName = (b.initiatorName || '').trim().toLowerCase();
        return (
          initName === partnerName ||
          initName.includes(partnerName) ||
          partnerName.includes(initName)
        );
      });
      if (matched.length > 0) return matched;
    }

    return [];
  }, [bids, partner]);

  return createPortal(
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 relative border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="mv-modal-header px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {partner ? (
              <CarrierAvatar
                size={36}
                avatar={partner.avatar}
                name={partner.name}
                initials={partner.initials}
                className="carrier-av rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden text-xs shadow-2xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-2xs shrink-0">
                <History size={16} />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white m-0 leading-tight truncate">
                {t('negotiationHistory', 'Negotiation History')}
                {partner?.name ? ` · ${partner.name}` : ''}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                {partner?.name
                  ? t('userNegotiationLog', 'Bidding and negotiation log for this transporter')
                  : t('negotiationTimelineSubtitle', 'Timeline of all offers, counter-bids, and responses')}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800 shrink-0 ml-2"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
          {filteredBids && filteredBids.length > 0 ? (
            filteredBids.map((bid) => {
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
                  className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-slate-950/60 p-4 sm:p-5 transition-all shadow-[0_2px_8px_rgba(155,81,224,0.03)]"
                >
                  {/* Bid Group Header */}
                  <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-purple-200 dark:border-purple-900/60 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <CarrierAvatar
                        size={32}
                        name={bid.initiatorName}
                        avatar={bid.avatar}
                        initials={bid.initiatorName.substring(0, 2).toUpperCase()}
                        className="carrier-av rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs shadow-2xs overflow-hidden"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#9B51E0] text-white">
                            {t('bid', 'Bid')} #{bid.bidNumber}
                          </span>
                          <span className="font-bold text-[14px] text-slate-900 dark:text-white">
                            {bid.initiatorName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                        {t('initialBidPrice', 'Initial Bid')}
                      </span>
                      <span className="font-bold font-mono text-[14px] text-purple-700 dark:text-purple-300">
                        € {bid.price}
                      </span>
                    </div>
                  </div>

                  {/* Vertical Timeline Stepper */}
                  <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                    {timelineEvents.map((neg, nIdx) => {
                      const badge = getActionBadge(neg.action);
                      const isLast = nIdx === timelineEvents.length - 1;

                      return (
                        <div key={neg.id || nIdx} className="relative group">
                          {/* Timeline Dot */}
                          <div
                            className={`absolute -left-[24px] top-1.5 w-[14px] h-[14px] rounded-full border-2 border-white dark:border-slate-900 shadow-xs flex items-center justify-center ${badge.dotBg}`}
                          />

                          {/* Event Card */}
                          <div className={`rounded-xl border p-3 bg-white dark:bg-slate-900 transition-all shadow-2xs ${
                            isLast ? 'border-purple-300 dark:border-purple-700 ring-1 ring-purple-500/15' : 'border-slate-200 dark:border-slate-800'
                          }`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.badgeBg}`}>
                                  {badge.icon}
                                  <span>{badge.label}</span>
                                </span>
                                <span className="text-[12px] font-semibold text-slate-900 dark:text-white">
                                  {neg.userName}
                                </span>
                              </div>

                              {neg.date && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  <Clock size={11} />
                                  <span>{neg.date}</span>
                                </div>
                              )}
                            </div>

                            {/* Price Badge */}
                            {neg.price && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  {t('amount', 'Amount')}:
                                </span>
                                <span className="px-2.5 py-0.5 rounded-md text-[13px] font-bold font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  € {neg.price}
                                </span>
                              </div>
                            )}

                            {/* Optional Notes Box */}
                            {neg.notes && (
                              <div className="mt-2 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                <MessageSquare size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
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
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <AlertCircle size={32} className="mx-auto mb-2 text-slate-400 dark:text-slate-600" />
              <p className="text-[13px] font-medium m-0">
                {partner?.name
                  ? t('noBidsHistoryForPartner', `No negotiation history recorded yet for ${partner.name}.`)
                  : t('noBidsHistoryFound', 'No bids history found.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

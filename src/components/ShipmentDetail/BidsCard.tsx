import React from 'react';
import { Users, Star, ArrowRightLeft, Check, X, History, MessageSquare, Loader2 } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';
import { useTransporterProfileOptional } from '../TransporterProfile/TransporterProfileContext';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';

export interface PartnerBidItem {
  id: string;
  userId?: number;
  userType?: 'carrier' | 'driver';
  name: string;
  transporterType?: 'carrier' | 'driver' | 'freelancer';
  initials?: string;
  avatar?: string | null;
  rating?: number | string;
  tripsCount?: number;
  bidAmount?: number | null;
  statusText?: string;
  time?: string;
  hasBid?: boolean;
  isInterested?: boolean;
  lastActionBy?: 'shipper' | 'transporter' | string | null;
  canCounter?: boolean;
}

interface BidsCardProps {
  shipmentId?: string | number;
  isPrivateLoad?: boolean;
  startingPrice?: number | string | null;
  partners?: PartnerBidItem[];
  expanded?: boolean;
  onToggle?: () => void;
  onAcceptBid?: (bid: PartnerBidItem) => void;
  acceptingBidId?: string | null;
  onRejectBid?: (bid: PartnerBidItem) => void;
  decliningBidId?: string | null;
  onCounterBid?: (bid: PartnerBidItem) => void;
  onCancelInvite?: (partner: PartnerBidItem) => void;
  cancellingInviteId?: number | null;
  onViewHistory?: (partner: PartnerBidItem) => void;
  onChat?: (partner: PartnerBidItem) => void;
  onInviteMore?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const BidsCard: React.FC<BidsCardProps> = ({
  shipmentId,
  isPrivateLoad = true,
  startingPrice,
  partners = [],
  expanded = true,
  onToggle = () => {},
  onAcceptBid,
  acceptingBidId = null,
  onRejectBid,
  decliningBidId = null,
  onCounterBid,
  onCancelInvite,
  cancellingInviteId = null,
  onViewHistory,
  onChat,
  onInviteMore,
  t,
}) => {
  const { openTransporterProfile } = useTransporterProfileOptional();

  // Sort: active bids/interests first, then invited partners
  const sortedPartners = [...partners].sort((a, b) => {
    if (a.hasBid && !b.hasBid) return -1;
    if (!a.hasBid && b.hasBid) return 1;
    return 0;
  });

  const handleOpenProfile = (partner: PartnerBidItem) => {
    if (partner.userId && partner.userType) {
      openTransporterProfile({
        id: partner.userId,
        type: partner.userType,
        name: partner.name,
      });
    }
  };

  const numStartingPrice = typeof startingPrice === 'number'
    ? startingPrice
    : startingPrice != null && !isNaN(Number(startingPrice))
    ? Number(startingPrice)
    : null;

  return (
    <CollapsibleCard
      id="bids"
      icon={<Users size={15} />}
      title={isPrivateLoad ? t('invitedPartners', 'Invited partners') : t('bidsReceived', 'Bids & partners')}
      count={sortedPartners.length}
      headerExtra={
        numStartingPrice != null && numStartingPrice > 0 ? (
          <div className="flex items-center gap-1.5 text-[13px] bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">{t('startingPrice', 'Starting Price')}:</span>
            <span className="font-bold font-mono text-purple-700 dark:text-purple-300 text-[13px]">
              € {numStartingPrice.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ) : null
      }
      expanded={expanded}
      onToggle={onToggle}
    >
      {sortedPartners.length === 0 ? (
        <p className="text-[12px] m-0 py-2.5 text-center text-slate-500 dark:text-slate-400">
          {isPrivateLoad
            ? t('noPartnersInvited', 'No partners invited yet.')
            : t('noBidsReceivedYet', 'No bids received yet. Transporters will appear here once they place a bid.')}
        </p>
      ) : (
        <div className="space-y-1">
          {sortedPartners.map((item, idx) => {
          const isFreelancer = item.transporterType === 'freelancer' || item.userType === 'driver';
          const isShipperWaiting = item.lastActionBy === 'shipper';
          const canCounter = item.hasBid && !isShipperWaiting && item.canCounter !== false;

          return (
            <div
              key={item.id}
              className={`py-2.5 ${idx > 0 ? 'border-t border-slate-200 dark:border-slate-800' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Transporter Avatar */}
                <CarrierAvatar
                  size={34}
                  avatar={item.avatar}
                  name={item.name}
                  initials={item.initials}
                  className="carrier-av rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5 overflow-hidden text-xs"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenProfile(item)}
                        className="font-bold text-[13px] text-left text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
                      >
                        {item.name}
                      </button>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {isFreelancer ? 'Freelancer' : 'Carrier'}
                      </span>
                    </div>

                    {/* Price or Actions */}
                    {item.bidAmount != null ? (
                      <div className="text-right">
                        <span className="font-bold font-mono text-[14px] text-purple-700 dark:text-purple-300">
                          € {item.bidAmount.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      onCancelInvite && (
                        <button
                          type="button"
                          disabled={cancellingInviteId === item.userId}
                          onClick={() => onCancelInvite(item)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 dark:hover:border-red-900 flex items-center gap-1 disabled:opacity-60"
                        >
                          {cancellingInviteId === item.userId ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : null}
                          <span>{t('cancelInvite', 'Cancel invite')}</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap text-slate-500 dark:text-slate-400">
                    {isShipperWaiting ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {t('counterBidSentWaiting', 'Counter-bid sent · Waiting response')}
                      </span>
                    ) : (
                      <span>{item.statusText || (item.hasBid ? 'Bid submitted' : 'Invited · Waiting response')}</span>
                    )}
                  </div>

                  {/* Actions when bid is received: Accept, Reject, Counter, History */}
                  {item.hasBid && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {onAcceptBid && (
                        <button
                          type="button"
                          disabled={acceptingBidId === item.id || decliningBidId === item.id}
                          onClick={() => onAcceptBid(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-2xs disabled:opacity-60 border-0"
                        >
                          {acceptingBidId === item.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          <span>{acceptingBidId === item.id ? t('accepting', 'Accepting...') : t('accept', 'Accept')}</span>
                        </button>
                      )}

                      {canCounter && onCounterBid && (
                        <button
                          type="button"
                          disabled={acceptingBidId === item.id || decliningBidId === item.id}
                          onClick={() => onCounterBid(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
                        >
                          <ArrowRightLeft size={12} />
                          <span>{t('counterBid', 'Counter')}</span>
                        </button>
                      )}

                      {onRejectBid && (
                        <button
                          type="button"
                          disabled={acceptingBidId === item.id || decliningBidId === item.id}
                          onClick={() => onRejectBid(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
                        >
                          {decliningBidId === item.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                          <span>{decliningBidId === item.id ? t('declining', 'Declining...') : t('decline', 'Decline')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onViewHistory && onViewHistory(item)}
                        title={t('biddingHistory', 'Bidding history')}
                        className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <History size={13} />
                      </button>

                      {/* Chat button */}
                      <button
                        type="button"
                        onClick={() => onChat ? onChat(item) : undefined}
                        title={t('chat', 'Chat')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-2xs"
                      >
                        <MessageSquare size={12} />
                        <span>{t('chat', 'Chat')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </CollapsibleCard>
  );
};

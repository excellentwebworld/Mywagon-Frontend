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
          <div className="flex items-center gap-1.5 text-[13px] bg-[#FAF5FF] border border-[#E9D5FF] px-2.5 py-1 rounded-lg">
            <span className="text-[#64748B] font-medium text-[11px]">{t('startingPrice', 'Starting Price')}:</span>
            <span className="font-bold font-mono text-[#9B51E0] text-[13px]">
              € {numStartingPrice.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ) : null
      }
      expanded={expanded}
      onToggle={onToggle}
    >
      {sortedPartners.length === 0 ? (
        <p className="text-[12px] m-0 py-2.5 text-center text-[#71717A]">
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
              className="py-2.5"
              style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
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
                        className="font-bold text-[13px] text-left hover:underline cursor-pointer"
                        style={{ color: '#18181B', background: 'none', border: 'none', padding: 0 }}
                      >
                        {item.name}
                      </button>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F0F3] text-[#5E5E6E]">
                        {isFreelancer ? 'Freelancer' : 'Carrier'}
                      </span>
                    </div>

                    {/* Price or Actions */}
                    {item.bidAmount != null ? (
                      <div className="text-right">
                        <span className="font-bold font-mono text-[14px]" style={{ color: '#9B51E0' }}>
                          € {item.bidAmount.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      onCancelInvite && (
                        <button
                          type="button"
                          disabled={cancellingInviteId === item.userId}
                          onClick={() => onCancelInvite(item)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border border-[#E4E4E8] bg-white text-[#DC2626] hover:bg-red-50 hover:border-[#FECACA] flex items-center gap-1 disabled:opacity-60"
                        >
                          {cancellingInviteId === item.userId ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : null}
                          <span>{t('cancelInvite', 'Cancel invite')}</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: '#8E8E9A' }}>
                    {isShipperWaiting ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
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
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-[#059669] hover:opacity-90 cursor-pointer shadow-2xs disabled:opacity-60"
                          style={{ border: 'none' }}
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-[#E4E4E8] text-[#18181B] hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-[#FECACA] text-[#DC2626] hover:bg-red-50 cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
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
                        className="p-1.5 rounded-lg border bg-white border-[#E4E4E8] text-[#5E5E6E] hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                      >
                        <History size={13} />
                      </button>

                      {/* Chat button */}
                      <button
                        type="button"
                        onClick={() => onChat ? onChat(item) : undefined}
                        title={t('chat', 'Chat')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
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

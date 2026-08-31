import React, { useState } from 'react';
import { Users, UserPlus, Star, ArrowRightLeft, Check, X, History } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';
import { useTransporterProfileOptional } from '../TransporterProfile/TransporterProfileContext';
import { NegotiationHistoryPanel } from '../ManageShipments/NegotiationHistoryPanel';

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
}

interface BidsCardProps {
  shipmentId?: string | number;
  isPrivateLoad?: boolean;
  partners?: PartnerBidItem[];
  expanded?: boolean;
  onToggle?: () => void;
  onAcceptBid?: (bid: PartnerBidItem) => void;
  onRejectBid?: (bid: PartnerBidItem) => void;
  onCounterBid?: (bid: PartnerBidItem, amount: number) => void;
  onCancelInvite?: (partner: PartnerBidItem) => void;
  onViewHistory?: (partner: PartnerBidItem) => void;
  onInviteMore?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const BidsCard: React.FC<BidsCardProps> = ({
  shipmentId,
  isPrivateLoad = true,
  partners = [],
  expanded = true,
  onToggle = () => {},
  onAcceptBid,
  onRejectBid,
  onCounterBid,
  onCancelInvite,
  onViewHistory,
  onInviteMore,
  t,
}) => {
  const { openTransporterProfile } = useTransporterProfileOptional();
  const [counterOpenId, setCounterOpenId] = useState<string | null>(null);
  const [counterAmounts, setCounterAmounts] = useState<Record<string, string>>({});
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);

  // Sort: active bids/interests first, then invited partners
  const sortedPartners = [...partners].sort((a, b) => {
    if (a.hasBid && !b.hasBid) return -1;
    if (!a.hasBid && b.hasBid) return 1;
    return 0;
  });

  // For public loads: do not show table unless at least one bid/interest is present
  const hasActiveBidsOrInterests = partners.some((p) => p.hasBid || p.isInterested);
  if (!isPrivateLoad && !hasActiveBidsOrInterests) {
    return null;
  }

  const handleOpenProfile = (partner: PartnerBidItem) => {
    if (partner.userId && partner.userType) {
      openTransporterProfile({
        id: partner.userId,
        type: partner.userType,
        name: partner.name,
      });
    }
  };

  const handleSendCounter = (partner: PartnerBidItem) => {
    const val = parseFloat(counterAmounts[partner.id]);
    if (!isNaN(val) && val > 0 && onCounterBid) {
      onCounterBid(partner, val);
      setCounterOpenId(null);
    }
  };

  const toggleHistory = (partner: PartnerBidItem) => {
    if (onViewHistory) {
      onViewHistory(partner);
    }
    setHistoryOpenId((prev) => (prev === partner.id ? null : partner.id));
  };

  return (
    <CollapsibleCard
      id="bids"
      icon={<Users size={15} />}
      title={isPrivateLoad ? t('invitedPartners', 'Invited partners') : t('bidsReceived', 'Bids & partners')}
      count={sortedPartners.length}
      expanded={expanded}
      onToggle={onToggle}
      headerExtra={
        isPrivateLoad && onInviteMore && (
          <button
            type="button"
            onClick={onInviteMore}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#9B51E0] hover:underline cursor-pointer"
            style={{ background: 'none', border: 'none' }}
          >
            <UserPlus size={12} />
            <span>{t('inviteMore', '+ Invite')}</span>
          </button>
        )
      }
    >
      <div className="space-y-1">
        {sortedPartners.map((item, idx) => {
          const isFreelancer = item.transporterType === 'freelancer' || item.userType === 'driver';
          const isCountering = counterOpenId === item.id;
          const isHistoryOpen = historyOpenId === item.id;

          return (
            <div
              key={item.id}
              className="py-2.5"
              style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
            >
              <div className="flex items-start gap-3">
                {/* Transporter Avatar */}
                <div
                  className="rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5"
                  style={{
                    width: 34,
                    height: 34,
                    fontSize: 12,
                    background: item.hasBid ? '#F3E8FF' : '#F4F4F5',
                    color: item.hasBid ? '#9B51E0' : '#71717A',
                  }}
                >
                  {item.initials || item.name.substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Clickable Transporter Name driving to profile */}
                      <button
                        type="button"
                        onClick={() => handleOpenProfile(item)}
                        className="font-bold text-[13px] text-left hover:underline cursor-pointer"
                        style={{ color: '#18181B', background: 'none', border: 'none', padding: 0 }}
                      >
                        {item.name}
                      </button>

                      {/* Rating and completed trips in parenthesis: ★ 4.9 (320) */}
                      {item.rating && item.rating !== '—' && (
                        <span className="text-[11px] font-semibold inline-flex items-center gap-0.5" style={{ color: '#9B51E0' }}>
                          <Star size={11} fill="#9B51E0" />
                          <span>
                            {item.rating} ({item.tripsCount || 0})
                          </span>
                        </span>
                      )}

                      {/* Type Badge: Carrier vs Freelancer */}
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.2 rounded"
                        style={{
                          background: isFreelancer ? '#FEF3C7' : '#EFF6FF',
                          color: isFreelancer ? '#B45309' : '#2563EB',
                        }}
                      >
                        {isFreelancer ? t('freelancer', 'Freelancer') : t('carrier', 'Carrier')}
                      </span>
                    </div>

                    {/* Bid Price Display if submitted */}
                    {item.bidAmount != null && (
                      <span
                        className="font-bold text-[15px]"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#18181B',
                        }}
                      >
                        € {item.bidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] mt-0.5" style={{ color: '#8E8E9A' }}>
                    {item.statusText || (item.hasBid ? 'Bid submitted' : 'Invited · Waiting response')}
                    {item.time ? ` · ${item.time}` : ''}
                  </div>

                  {/* Actions when bid is received: Accept, Reject, Counter, History */}
                  {item.hasBid ? (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {onAcceptBid && (
                        <button
                          type="button"
                          onClick={() => onAcceptBid(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-[#059669] hover:opacity-90 cursor-pointer"
                          style={{ border: 'none' }}
                        >
                          <Check size={12} />
                          <span>{t('accept', 'Accept')}</span>
                        </button>
                      )}

                      {onCounterBid && (
                        <button
                          type="button"
                          onClick={() => setCounterOpenId(isCountering ? null : item.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-[#E4E4E8] text-[#18181B] hover:bg-slate-50 cursor-pointer"
                        >
                          <ArrowRightLeft size={12} />
                          <span>{t('counterBid', 'Counter')}</span>
                        </button>
                      )}

                      {onRejectBid && (
                        <button
                          type="button"
                          onClick={() => onRejectBid(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-[#FECACA] text-[#DC2626] hover:bg-red-50 cursor-pointer"
                        >
                          <X size={12} />
                          <span>{t('decline', 'Decline')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleHistory(item)}
                        title={t('biddingHistory', 'Bidding history')}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isHistoryOpen
                            ? 'bg-[#9B51E0] text-white border-[#9B51E0]'
                            : 'bg-white border-[#E4E4E8] text-[#5E5E6E] hover:bg-slate-50'
                        }`}
                      >
                        <History size={13} />
                      </button>
                    </div>
                  ) : (
                    onCancelInvite && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => onCancelInvite(item)}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-slate-50 cursor-pointer"
                        >
                          {t('cancelInvite', 'Cancel invite')}
                        </button>
                      </div>
                    )
                  )}

                  {/* Inline Counter-Offer Drawer */}
                  {isCountering && (
                    <div className="mt-2 p-2.5 rounded-lg bg-[#FAF5FF] border border-[#E9D5FF] flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-[#18181B]">
                        {t('yourCounterOffer', 'Your counter (€):')}
                      </span>
                      <input
                        type="number"
                        placeholder="e.g. 400"
                        value={counterAmounts[item.id] || ''}
                        onChange={(e) =>
                          setCounterAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-24 px-2 py-1 text-xs rounded border border-[#CBD5E1] bg-white outline-none focus:border-[#9B51E0]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendCounter(item)}
                        className="px-3 py-1 rounded text-xs font-semibold text-white bg-[#9B51E0] hover:opacity-90 cursor-pointer"
                      >
                        {t('sendCounter', 'Send counter')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterOpenId(null)}
                        className="px-2 py-1 rounded text-xs font-medium text-[#5E5E6E] hover:underline cursor-pointer"
                      >
                        {t('cancel', 'Cancel')}
                      </button>
                    </div>
                  )}

                  {/* Inline Negotiation History Timeline */}
                  {isHistoryOpen && shipmentId && (
                    <div className="mt-2.5">
                      <NegotiationHistoryPanel
                        open={true}
                        shipmentId={shipmentId}
                        offerId={item.id}
                        t={t}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
};

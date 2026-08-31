import React, { useState } from 'react';
import { Gavel, Users, UserPlus } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';

export interface PartnerBidItem {
  id: string;
  name: string;
  initials?: string;
  avatar?: string | null;
  rating?: number | string;
  tripsCount?: number;
  bidAmount?: number | null;
  statusText?: string;
  time?: string;
  isInterested?: boolean;
}

interface BidsCardProps {
  interestedPartners?: PartnerBidItem[];
  invitedPartners?: PartnerBidItem[];
  expandedInterested?: boolean;
  expandedInvited?: boolean;
  onToggleInterested?: () => void;
  onToggleInvited?: () => void;
  onAcceptBid?: (bid: PartnerBidItem) => void;
  onRejectBid?: (bid: PartnerBidItem) => void;
  onCancelInvite?: (partner: PartnerBidItem) => void;
  onInvitePartners?: () => void;
  t: (key: string, fallback?: string) => string;
}

export const BidsCard: React.FC<BidsCardProps> = ({
  interestedPartners = [],
  invitedPartners = [
    {
      id: 'inv1',
      name: 'Transmed Logistics S.A.',
      initials: 'TL',
      rating: '4.9',
      tripsCount: 320,
      statusText: 'Invited · Waiting response',
      time: '26/02 11:45',
    },
    {
      id: 'inv2',
      name: 'Hellas Freight Express',
      initials: 'HF',
      rating: '4.8',
      tripsCount: 145,
      statusText: 'Invited · Waiting response',
      time: '26/02 11:46',
    },
    {
      id: 'inv3',
      name: 'Aegean Transport Hub',
      initials: 'AT',
      rating: '4.7',
      tripsCount: 88,
      statusText: 'Invited · Waiting response',
      time: '26/02 11:48',
    },
  ],
  expandedInterested = true,
  expandedInvited = true,
  onToggleInterested = () => {},
  onToggleInvited = () => {},
  onAcceptBid,
  onRejectBid,
  onCancelInvite,
  onInvitePartners,
  t,
}) => {
  const [activeTab, setActiveTab] = useState<'interested' | 'invited'>('interested');

  return (
    <div id="bids" className="flex flex-col gap-0">
      {/* Interested Partners Card */}
      <CollapsibleCard
        id="interested-bids"
        icon={<Gavel size={15} />}
        title={t('interestedPartners', 'Interested partners')}
        count={interestedPartners.length}
        expanded={expandedInterested}
        onToggle={onToggleInterested}
      >
        {interestedPartners.length === 0 ? (
          <p className="text-[13px] my-1" style={{ color: '#8E8E9A' }}>
            {t(
              'noBidsYet',
              'No bids or partner expressions of interest yet. Bids broadcast is active.'
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {interestedPartners.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
              >
                <div
                  className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    fontSize: 12,
                    background: '#F3E8FF',
                    color: '#9B51E0',
                  }}
                >
                  {item.initials || item.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[13px]" style={{ color: '#18181B' }}>
                      {item.name}
                    </span>
                    {item.rating && (
                      <span className="text-[11px] font-bold" style={{ color: '#9B51E0' }}>
                        ★ {item.rating}
                      </span>
                    )}
                    {item.tripsCount != null && (
                      <span className="text-[11px]" style={{ color: '#8E8E9A' }}>
                        · {item.tripsCount} trips
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#8E8E9A' }}>
                    {item.statusText || 'Bid submitted'}
                    {item.time ? ` · ${item.time}` : ''}
                  </div>
                </div>

                {item.bidAmount != null && (
                  <span
                    className="font-bold text-[14px]"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#18181B',
                    }}
                  >
                    € {item.bidAmount.toLocaleString('en-US')}
                  </span>
                )}

                <div className="flex gap-1.5">
                  {onAcceptBid && (
                    <button
                      type="button"
                      onClick={() => onAcceptBid(item)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer"
                      style={{ background: '#9B51E0', border: 'none' }}
                    >
                      {t('accept', 'Accept')}
                    </button>
                  )}
                  {onRejectBid && (
                    <button
                      type="button"
                      onClick={() => onRejectBid(item)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E4E4E8',
                        color: '#5E5E6E',
                      }}
                    >
                      {t('decline', 'Decline')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Invited Partners Card */}
      <CollapsibleCard
        id="invited-partners"
        icon={<Users size={15} />}
        title={t('invitedPartners', 'Invited partners')}
        count={invitedPartners.length}
        expanded={expandedInvited}
        onToggle={onToggleInvited}
        headerExtra={
          onInvitePartners && (
            <button
              type="button"
              onClick={onInvitePartners}
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
          {invitedPartners.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2.5"
              style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
            >
              <div
                className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  fontSize: 12,
                  background: '#F3E8FF',
                  color: '#9B51E0',
                }}
              >
                {item.initials || item.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[13px]" style={{ color: '#18181B' }}>
                    {item.name}
                  </span>
                  {item.rating && (
                    <span className="text-[11px] font-bold" style={{ color: '#9B51E0' }}>
                      ★ {item.rating}
                    </span>
                  )}
                  {item.tripsCount != null && (
                    <span className="text-[11px]" style={{ color: '#8E8E9A' }}>
                      · {item.tripsCount} trips
                    </span>
                  )}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#8E8E9A' }}>
                  {item.statusText || 'Invited · Waiting response'}
                  {item.time ? ` · ${item.time}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCancelInvite?.(item)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors hover:bg-black/5"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E8',
                  color: '#5E5E6E',
                }}
              >
                {t('cancelInvite', 'Cancel invite')}
              </button>
            </div>
          ))}
        </div>
      </CollapsibleCard>
    </div>
  );
};

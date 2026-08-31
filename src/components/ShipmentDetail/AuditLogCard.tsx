import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import type { AuditEntry, BidHistoryItem } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

const FILTER_CATEGORIES = [
  { key: 'all', labelKey: 'all', fallback: 'All' },
  { key: 'bidding', labelKey: 'bidsHistory', fallback: 'Bidding' },
  { key: 'operations', labelKey: 'shipmentLogs', fallback: 'Operations' },
] as const;

interface AuditLogCardProps {
  entries: AuditEntry[];
  bidsHistory?: BidHistoryItem[];
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}

export const AuditLogCard: React.FC<AuditLogCardProps> = ({
  entries,
  bidsHistory = [],
  expanded,
  onToggle,
  t,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filteredEntries =
    selectedCat === 'all'
      ? entries
      : entries.filter((e) => e.category === selectedCat);

  const getToneBackground = (tone?: AuditEntry['tone']) => {
    switch (tone) {
      case 'accept':
        return 'bg-[#ECFDF5] border border-[#A7F3D0]';
      case 'bid':
        return 'bg-[#F5F3FF] border border-[#DDD6FE]';
      case 'counter':
        return 'bg-[#FFFBEB] border border-[#FDE68A]';
      case 'reject':
        return 'bg-[#FEF2F2] border border-[#FECACA]';
      default:
        return 'bg-transparent border border-transparent hover:bg-[#F8F9FA]';
    }
  };

  return (
    <CollapsibleCard
      id="audit"
      icon={<ClipboardList size={15} />}
      title={t('auditLogTimeline', 'Audit log / activity timeline')}
      count={entries.length}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div>
        {/* Category filters */}
        <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
          {FILTER_CATEGORIES.map((cat) => {
            const isAct = selectedCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50 active:scale-95 ${
                  isAct
                    ? 'bg-[#18181B] text-white shadow-xs border border-[#18181B]'
                    : 'bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8]'
                }`}
                onClick={() => setSelectedCat(cat.key)}
              >
                {t(cat.labelKey, cat.fallback)}
              </button>
            );
          })}
        </div>

        {/* Group-wise Bidding History View */}
        {selectedCat === 'bidding' && bidsHistory && bidsHistory.length > 0 ? (
          <div className="space-y-5 pt-1">
            {bidsHistory.map((bid) => (
              <div
                key={bid.bidNumber}
                className="border-l-[3px] border-[#9B51E0] pl-4 mb-5"
              >
                {/* Bid Group Header */}
                <h4 className="text-[14px] font-bold text-[#2D2766] mb-2 leading-tight">
                  {t('bid', 'Bid')} #{bid.bidNumber} – {bid.initiatorName}
                </h4>

                {/* Root Bid Card */}
                <div className="bg-[#F8F7FC] border border-[#E9D5FF] rounded-xl p-3 mb-2.5 shadow-2xs">
                  <div className="text-[12px] text-[#374151]">
                    <strong className="font-semibold text-[#18181B]">{t('offerPlaced', 'Offer Placed')}</strong>{' '}
                    {t('by', 'by')}{' '}
                    <strong className="font-semibold text-[#18181B]">{bid.initiatorName}</strong>{' '}
                    {t('on', 'on')}{' '}
                    <strong className="font-semibold text-[#18181B]">{bid.date}</strong>
                  </div>
                  <div className="font-bold text-[#9B51E0] font-mono text-[16px] mt-1">
                    € {bid.price}
                  </div>
                </div>

                {/* Negotiations Timeline for this Bid */}
                {bid.negotiations && bid.negotiations.length > 0 && (
                  <div className="ml-3 space-y-2 mt-2">
                    {bid.negotiations.map((neg) => (
                      <div
                        key={neg.id}
                        className="bg-white border-l-2 border-[#CBD5E1] border border-[#E2E8F0] rounded-lg p-2.5 px-3 text-[12px] shadow-2xs"
                      >
                        <div className="text-[#374151]">
                          <strong className="font-semibold text-[#18181B]">{neg.action}</strong>{' '}
                          {t('by', 'by')}{' '}
                          <strong className="font-semibold text-[#18181B]">{neg.userName}</strong>{' '}
                          {t('on', 'on')}{' '}
                          <strong className="font-semibold text-[#18181B]">{neg.date}</strong>
                        </div>

                        {neg.price && (
                          <div className="font-bold text-[#7C5BC4] font-mono text-[14px] mt-0.5">
                            € {neg.price}
                          </div>
                        )}

                        {neg.notes && (
                          <div className="text-[#64748B] text-[11px] italic mt-0.5">
                            ({neg.notes})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <p className="text-[12px] py-3 text-center text-[#8E8E9A] font-medium m-0">
            {t('noAuditEntries', 'No events recorded in this category.')}
          </p>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((e) => (
              <div
                key={e.id}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg text-[12px] transition-colors ${getToneBackground(e.tone)}`}
              >
                <span className="flex-shrink-0 text-[11px] pt-0.5 text-[#8E8E9A] font-mono min-w-[84px] tabular-nums">
                  {e.time}
                </span>

                <div className="flex-1 min-w-0 text-[#18181B] leading-snug">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: e.text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#18181B]">$1</strong>'),
                    }}
                  />
                  {e.priceBadge && (
                    <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]">
                      {e.priceBadge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};


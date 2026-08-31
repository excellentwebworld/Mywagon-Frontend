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
        return '#ECFDF5';
      case 'bid':
        return '#F5F3FF';
      case 'counter':
        return '#FFFBEB';
      case 'reject':
        return '#FEF2F2';
      default:
        return 'transparent';
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
        {/* Category filters: ONLY All, Bidding, Operations */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {FILTER_CATEGORIES.map((cat) => {
            const isAct = selectedCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 cursor-pointer"
                style={{
                  background: isAct ? '#9B51E0' : '#FFFFFF',
                  color: isAct ? '#FFFFFF' : '#5E5E6E',
                  border: isAct ? '1px solid #9B51E0' : '1px solid #E4E4E8',
                }}
                onClick={() => setSelectedCat(cat.key)}
              >
                {t(cat.labelKey, cat.fallback)}
              </button>
            );
          })}
        </div>

        {/* Group-wise Bidding History View */}
        {selectedCat === 'bidding' && bidsHistory && bidsHistory.length > 0 ? (
          <div className="space-y-6 pt-2">
            {bidsHistory.map((bid) => (
              <div
                key={bid.bidNumber}
                className="border-l-[3px] border-[#9B51E0] pl-4 mb-6"
              >
                {/* Bid Group Header */}
                <h4 className="text-[15px] font-bold text-[#2D2766] mb-2.5">
                  {t('bid', 'Bid')} #{bid.bidNumber} – {bid.initiatorName}
                </h4>

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
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <p className="text-[12px] py-2" style={{ color: '#8E8E9A' }}>
            {t('noAuditEntries', 'No events recorded in this category.')}
          </p>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 px-2.5 py-2 rounded-lg text-[13px] transition-colors"
                style={{ background: getToneBackground(e.tone) }}
              >
                <span
                  className="flex-shrink-0 text-[11px] pt-0.5"
                  style={{
                    color: '#8E8E9A',
                    minWidth: '86px',
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {e.time}
                </span>

                <div className="flex-1 min-w-0" style={{ color: '#18181B' }}>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: e.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                    }}
                  />
                  {e.priceBadge && (
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded text-[11px] font-bold"
                      style={{
                        background: '#EDE9FE',
                        color: '#6D28D9',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
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


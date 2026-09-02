import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  ChevronDown,
  Tag,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  Activity,
  Layers,
  TrendingUp,
} from 'lucide-react';
import type { AuditEntry, BidHistoryItem, ShipmentLogItem } from '../../pages/ShipmentDetail/detailViewModel';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';
import { CollapsibleCard } from './CollapsibleCard';

const FILTER_CATEGORIES = [
  { key: 'all', labelKey: 'all', fallback: 'All' },
  { key: 'bidding', labelKey: 'bidsHistory', fallback: 'Bidding' },
  { key: 'operations', labelKey: 'operations', fallback: 'Operations' },
] as const;

interface AuditLogCardProps {
  entries?: AuditEntry[];
  shipmentLogs?: ShipmentLogItem[];
  bidsHistory?: BidHistoryItem[];
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}

interface UnifiedEvent {
  id: string;
  category: 'operations' | 'bidding';
  timestamp: number;
  date: string;
  action: string;
  actor: string;
  priceBadge?: string | null;
  notes?: string | null;
  tone?: 'bid' | 'counter' | 'reject' | 'accept' | 'operations' | 'default';
  isRejection?: boolean;
  rejectionReason?: string | null;
}

function parseEventTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0;
  // Format dd/mm/yyyy hh:mm or dd/mm/yyyy
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const hour = ddmmyyyy[4] ? parseInt(ddmmyyyy[4], 10) : 0;
    const min = ddmmyyyy[5] ? parseInt(ddmmyyyy[5], 10) : 0;
    return new Date(year, month, day, hour, min).getTime();
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
}

export const AuditLogCard: React.FC<AuditLogCardProps> = ({
  entries = [],
  shipmentLogs = [],
  bidsHistory = [],
  expanded,
  onToggle,
  t,
}) => {
  const [selectedCat, setSelectedCat] = useState<'all' | 'bidding' | 'operations'>('all');
  const [expandedBids, setExpandedBids] = useState<Record<string | number, boolean>>({
    0: true,
  });

  const toggleBid = (key: string | number) => {
    setExpandedBids((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const isBidOpen = (key: string | number, idx: number) => {
    if (expandedBids[key] !== undefined) {
      return expandedBids[key];
    }
    return idx === 0;
  };

  const formatPrice = (val?: string | number | null) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') {
      return `€ ${val.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.startsWith('€') ? val : `€ ${val}`;
  };

  const getBiddingTone = (action: string): UnifiedEvent['tone'] => {
    const act = (action || '').toLowerCase();
    if (act.includes('cancel') || act.includes('reject') || act.includes('decline') || act.includes('ακύρωσ')) return 'reject';
    if (act.includes('accept')) return 'accept';
    if (act.includes('counter')) return 'counter';
    if (act.includes('bid') || act.includes('offer')) return 'bid';
    return 'default';
  };

  // Compile Unified Events for 'All' sorted descending (most recent at top)
  const allEvents = useMemo<UnifiedEvent[]>(() => {
    const list: UnifiedEvent[] = [];

    // 1. Operational Shipment Logs
    const rawOps = shipmentLogs && shipmentLogs.length > 0
      ? shipmentLogs
      : entries.filter((e) => e.category === 'operations' || e.category === 'all');

    rawOps.forEach((op: any) => {
      const act = (op.action || op.text || '').toLowerCase();
      const isCancel = act.includes('cancel') || act.includes('ακύρωσ') || act.includes('canceled') || act.includes('cancelled');
      const isReject = Boolean(op.isRejection || op.is_rejection || act.includes('reject') || act.includes('decline'));

      list.push({
        id: `op-${op.id}`,
        category: 'operations',
        timestamp: parseEventTimestamp(op.date || op.time),
        date: op.date || op.time || '',
        action: op.action || op.text || '',
        actor: op.actor || 'System',
        isRejection: isCancel || isReject,
        rejectionReason: op.rejectionReason || op.rejection_reason || null,
        tone: isCancel || isReject ? 'reject' : 'operations',
      });
    });

    // 2. Bidding & Negotiation History Events
    bidsHistory.forEach((bid) => {
      if (bid.negotiations && bid.negotiations.length > 0) {
        bid.negotiations.forEach((neg) => {
          list.push({
            id: `neg-${neg.id}`,
            category: 'bidding',
            timestamp: parseEventTimestamp(neg.date),
            date: neg.date,
            action: neg.action,
            actor: neg.userName || bid.initiatorName,
            priceBadge: neg.price ? `€ ${neg.price}` : null,
            notes: neg.notes,
            tone: getBiddingTone(neg.action),
          });
        });
      } else {
        list.push({
          id: `bid-${bid.bidNumber}`,
          category: 'bidding',
          timestamp: parseEventTimestamp(bid.date),
          date: bid.date,
          action: 'Offer Placed',
          actor: bid.initiatorName,
          priceBadge: bid.price ? `€ ${bid.price}` : null,
          tone: 'bid',
        });
      }
    });

    // Sort by most recently happened at top
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [shipmentLogs, entries, bidsHistory]);

  const operationsEvents = useMemo(() => {
    return allEvents.filter((e) => e.category === 'operations');
  }, [allEvents]);

  const getEventBadge = (evt: UnifiedEvent) => {
    switch (evt.tone) {
      case 'accept':
        return {
          pill: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
          border: 'border-[#A7F3D0]',
          rowBg: 'bg-white border-[#E2E8F0]',
          icon: <CheckCircle2 size={11} className="text-[#065F46]" />,
        };
      case 'counter':
        return {
          pill: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          border: 'border-[#FDE68A]',
          rowBg: 'bg-white border-[#E2E8F0]',
          icon: <ArrowRight size={11} className="text-[#92400E]" />,
        };
      case 'reject':
        return {
          pill: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
          border: 'border-[#FECACA]',
          rowBg: 'bg-[#FEF2F2]/40 border-[#FECACA]',
          icon: <AlertCircle size={11} className="text-[#991B1B]" />,
        };
      case 'bid':
        return {
          pill: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
          border: 'border-[#DDD6FE]',
          rowBg: 'bg-white border-[#E2E8F0]',
          icon: <Tag size={11} className="text-[#5B21B6]" />,
        };
      case 'operations':
      default:
        return {
          pill: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]',
          border: 'border-[#E2E8F0]',
          rowBg: 'bg-white border-[#E2E8F0]',
          icon: <Activity size={11} className="text-[#64748B]" />,
        };
    }
  };

  const getCount = () => {
    if (selectedCat === 'all') return allEvents.length;
    if (selectedCat === 'bidding') return bidsHistory.length || allEvents.filter((e) => e.category === 'bidding').length;
    return operationsEvents.length;
  };

  return (
    <CollapsibleCard
      id="audit"
      icon={<ClipboardList size={15} />}
      title={t('auditLogTimeline', 'Audit log / activity timeline')}
      count={getCount()}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Category filters (All, Bidding, Operations) */}
        <div className="flex items-center gap-2 flex-wrap pb-1 border-b border-[#F0F0F3]">
          {FILTER_CATEGORIES.map((cat) => {
            const isAct = selectedCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50 active:scale-95 flex items-center gap-1.5 ${
                  isAct
                    ? 'bg-[#18181B] text-white shadow-xs border border-[#18181B]'
                    : 'bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8]'
                }`}
                onClick={() => setSelectedCat(cat.key as any)}
              >
                {cat.key === 'all' && <Layers size={13} />}
                {cat.key === 'bidding' && <TrendingUp size={13} />}
                {cat.key === 'operations' && <Activity size={13} />}
                <span>{t(cat.labelKey, cat.fallback)}</span>
              </button>
            );
          })}
        </div>

        {/* 1. BIDDING TAB: Today's "Bids History" with collapsible partner cards */}
        {selectedCat === 'bidding' && (
          bidsHistory && bidsHistory.length > 0 ? (
            <div className="space-y-3.5 pt-1">
              {bidsHistory.map((bid, bIdx) => {
                const bidKey = bid.bidNumber ?? bIdx;
                const open = isBidOpen(bidKey, bIdx);
                const negotiationsCount = bid.negotiations?.length || 0;
                const latestNeg =
                  bid.negotiations && bid.negotiations.length > 0
                    ? bid.negotiations[bid.negotiations.length - 1]
                    : null;
                const displayPrice = latestNeg?.price
                  ? formatPrice(latestNeg.price)
                  : formatPrice(bid.price);

                return (
                  <div
                    key={bidKey}
                    className="rounded-xl border border-[#E4E4E8] bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-[#D4D4D8]"
                  >
                    {/* Collapsible Header */}
                    <button
                      type="button"
                      onClick={() => toggleBid(bidKey)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#FAF9FD] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CarrierAvatar
                          size={32}
                          name={bid.initiatorName}
                          avatar={bid.avatar}
                          initials={bid.initiatorName?.substring(0, 2).toUpperCase() || 'TR'}
                          className="carrier-av rounded-full flex items-center justify-center font-bold flex-shrink-0 text-[12px] shadow-2xs overflow-hidden"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#EDE9FE] text-[#7C3AED]">
                              {t('bid', 'Bid')} #{bid.bidNumber}
                            </span>
                            <h4 className="text-[13px] font-bold text-[#18181B] truncate m-0">
                              {bid.initiatorName}
                            </h4>
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{bid.date}</span>
                            <span>·</span>
                            <span>
                              {negotiationsCount + 1}{' '}
                              {negotiationsCount + 1 === 1
                                ? t('activityEvent', 'activity')
                                : t('activityEvents', 'activities')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {displayPrice && (
                          <span className="px-2.5 py-1 rounded-lg text-[12px] font-bold font-mono bg-[#FAF5FF] text-[#7C3AED] border border-[#E9D5FF] shadow-2xs">
                            {displayPrice}
                          </span>
                        )}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] bg-[#F4F4F5] hover:bg-[#E4E4E7] transition-transform duration-200 ${
                            open ? 'rotate-180' : ''
                          }`}
                        >
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </button>

                    {/* Expanded Negotiations Body */}
                    {open && (
                      <div className="border-t border-[#F0F0F3] bg-[#FAFAFC] p-4 space-y-3">
                        {(() => {
                          const timelineList =
                            bid.negotiations && bid.negotiations.length > 0
                              ? bid.negotiations
                              : [
                                  {
                                    id: `root-${bid.bidNumber}`,
                                    action: 'Bid Placed',
                                    userName: bid.initiatorName,
                                    date: bid.date,
                                    price: bid.price,
                                    notes: null,
                                  },
                                ];

                          return timelineList.map((neg, nIdx) => {
                            const isReject = neg.action.toLowerCase().includes('reject');
                            const isAccept = neg.action.toLowerCase().includes('accept');
                            const isCounter = neg.action.toLowerCase().includes('counter');

                            return (
                              <div
                                key={neg.id || nIdx}
                                className="relative pl-6 pb-2 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-[#E2E8F0] last:before:hidden"
                              >
                                <div
                                  className={`absolute left-0 top-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold ${
                                    isReject
                                      ? 'bg-[#EF4444]'
                                      : isAccept
                                      ? 'bg-[#10B981]'
                                      : isCounter
                                      ? 'bg-[#F59E0B]'
                                      : 'bg-[#6366F1]'
                                  }`}
                                >
                                  {nIdx + 1}
                                </div>

                                <div
                                  className={`p-3 rounded-xl border shadow-2xs ${
                                    isReject
                                      ? 'bg-[#FEF2F2] border-[#FECACA]'
                                      : isAccept
                                      ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                                      : isCounter
                                      ? 'bg-white border-[#E2E8F0]'
                                      : 'bg-white border-[#E2E8F0]'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[12px] font-semibold text-[#18181B] flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isReject
                                              ? 'bg-[#FEE2E2] text-[#991B1B]'
                                              : isAccept
                                              ? 'bg-[#D1FAE5] text-[#065F46]'
                                              : isCounter
                                              ? 'bg-[#FEF3C7] text-[#92400E]'
                                              : 'bg-[#EDE9FE] text-[#7C3AED]'
                                          }`}
                                        >
                                          {isReject ? (
                                            <AlertCircle size={10} />
                                          ) : isAccept ? (
                                            <CheckCircle2 size={10} />
                                          ) : isCounter ? (
                                            <ArrowRight size={10} />
                                          ) : (
                                            <Tag size={10} />
                                          )}
                                          {neg.action}
                                        </span>
                                        <span>
                                          {t('by', 'by')}{' '}
                                          <strong className="font-semibold text-[#18181B]">
                                            {neg.userName}
                                          </strong>
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-[#64748B] mt-0.5">
                                        {neg.date}
                                      </div>

                                      {neg.notes && (
                                        <div className="text-[11px] text-[#64748B] mt-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 italic">
                                          {neg.notes}
                                        </div>
                                      )}
                                    </div>

                                    {neg.price && (
                                      <div
                                        className={`font-bold font-mono text-[14px] ${
                                          isReject
                                            ? 'text-[#991B1B]'
                                            : isAccept
                                            ? 'text-[#059669]'
                                            : 'text-[#7C3AED]'
                                        }`}
                                      >
                                        {formatPrice(neg.price)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[#8E8E9A] text-[13px] bg-[#FAF9FD] rounded-xl border border-dashed border-[#E4E4E8]">
              {t('noBidsHistoryFound', 'No bids history found.')}
            </div>
          )
        )}

        {/* 2. OPERATIONS TAB: Today's "Shipment Logs" */}
        {selectedCat === 'operations' && (
          operationsEvents.length > 0 ? (
            <div className="space-y-2 pt-1">
              {operationsEvents.map((evt) => {
                const b = getEventBadge(evt);
                return (
                  <div
                    key={evt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border shadow-2xs transition-all hover:border-[#CBD5E1] ${b.rowBg || 'bg-white border-[#E2E8F0]'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-mono min-w-[105px] flex-shrink-0 pt-0.5 font-semibold">
                      <Clock size={12} className="text-[#94A3B8]" />
                      <span>{evt.date}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.pill}`}>
                          {b.icon}
                          {evt.action}
                        </span>
                        <span className="text-[12px] text-[#475569]">
                          {t('by', 'by')} <strong className="text-[#18181B] font-semibold">{evt.actor}</strong>
                        </span>
                      </div>

                      {evt.rejectionReason && (
                        <div className="mt-1.5 text-[11px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-2">
                          <strong>{t('reason', 'Reason')}:</strong> {evt.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[#8E8E9A] text-[13px] bg-[#FAF9FD] rounded-xl border border-dashed border-[#E4E4E8]">
              {t('noShipmentLogs', 'No shipment logs recorded yet.')}
            </div>
          )
        )}

        {/* 3. ALL TAB: Unified chronological timeline (most recently happened at top) */}
        {selectedCat === 'all' && (
          allEvents.length > 0 ? (
            <div className="space-y-2 pt-1">
              {allEvents.map((evt) => {
                const b = getEventBadge(evt);
                const isBidding = evt.category === 'bidding';

                return (
                  <div
                    key={evt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border shadow-2xs transition-all hover:border-[#CBD5E1] ${b.rowBg || 'bg-white border-[#E2E8F0]'}`}
                  >
                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-mono min-w-[110px] flex-shrink-0 pt-0.5 font-semibold">
                      <Clock size={12} className="text-[#94A3B8]" />
                      <span>{evt.date}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                              isBidding
                                ? 'bg-[#FAF5FF] text-[#9B51E0] border border-[#E9D5FF]'
                                : 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]'
                            }`}
                          >
                            {isBidding ? t('bidding', 'Bidding') : t('operations', 'Operations')}
                          </span>

                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.pill}`}>
                            {b.icon}
                            {evt.action}
                          </span>

                          <span className="text-[12px] text-[#475569]">
                            {t('by', 'by')} <strong className="text-[#18181B] font-semibold">{evt.actor}</strong>
                          </span>
                        </div>

                        {evt.priceBadge && (
                          <span className="font-bold font-mono text-[13px] px-2.5 py-0.5 rounded-md bg-[#FAF5FF] text-[#7C3AED] border border-[#E9D5FF]">
                            {evt.priceBadge}
                          </span>
                        )}
                      </div>

                      {evt.notes && (
                        <div className="mt-1.5 text-[11px] text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 italic">
                          “{evt.notes}”
                        </div>
                      )}

                      {evt.rejectionReason && (
                        <div className="mt-1.5 text-[11px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-2">
                          <strong>{t('reason', 'Reason')}:</strong> {evt.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[#8E8E9A] text-[13px] bg-[#FAF9FD] rounded-xl border border-dashed border-[#E4E4E8]">
              {t('noAuditEntries', 'No activity recorded yet.')}
            </div>
          )
        )}
      </div>
    </CollapsibleCard>
  );
};

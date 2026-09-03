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
  const [expandedBids, setExpandedBids] = useState<Record<string | number, boolean>>({});
  const isBidOpen = (key: string | number, idx: number) => {
    if (expandedBids[key] !== undefined) {
      return expandedBids[key];
    }
    return idx === 0;
  };

  const toggleBid = (key: string | number, idx: number) => {
    setExpandedBids((prev) => {
      const currentOpen = prev[key] !== undefined ? prev[key] : (idx === 0);
      return {
        ...prev,
        [key]: !currentOpen,
      };
    });
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
        <div className="flex items-center gap-2 flex-wrap pb-1 border-b border-slate-200 dark:border-slate-800">
          {FILTER_CATEGORIES.map((cat) => {
            const isAct = selectedCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 active:scale-95 flex items-center gap-1.5 ${
                  isAct
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs border border-slate-900 dark:border-white font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    {/* Collapsible Header */}
                    <button
                      type="button"
                      onClick={() => toggleBid(bidKey, bIdx)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 select-none"
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
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {t('bid', 'Bid')} #{bid.bidNumber}
                            </span>
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white truncate m-0">
                              {bid.initiatorName}
                            </h4>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
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
                          <span className="px-2.5 py-1 rounded-lg text-[12px] font-bold font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
                            {displayPrice}
                          </span>
                        )}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-transform duration-200 ${
                            open ? 'rotate-180' : ''
                          }`}
                        >
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </button>

                    {/* Expanded Negotiations Body with Smooth Slide Transition */}
                    <div
                      className={`grid transition-all duration-200 ease-in-out ${
                        open ? 'grid-rows-[1fr] opacity-100 border-t border-slate-200 dark:border-slate-800' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
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
                                className="relative pl-6 pb-2 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 last:before:hidden"
                              >
                                <div
                                  className={`absolute left-0 top-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold ${
                                    isReject
                                      ? 'bg-red-500'
                                      : isAccept
                                      ? 'bg-emerald-500'
                                      : isCounter
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-500'
                                  }`}
                                >
                                  {nIdx + 1}
                                </div>

                                <div
                                  className={`p-3 rounded-xl border shadow-2xs ${
                                    isReject
                                      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                                      : isAccept
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                                      : isCounter
                                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[12px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isReject
                                              ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                                              : isAccept
                                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                              : isCounter
                                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                                              : 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
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
                                        <span className="text-slate-600 dark:text-slate-300">
                                          {t('by', 'by')}{' '}
                                          <strong className="font-semibold text-slate-900 dark:text-white">
                                            {neg.userName}
                                          </strong>
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {neg.date}
                                      </div>

                                      {neg.notes && (
                                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 italic">
                                          {neg.notes}
                                        </div>
                                      )}
                                    </div>

                                    {neg.price && (
                                      <div
                                        className={`font-bold font-mono text-[14px] ${
                                          isReject
                                            ? 'text-red-600 dark:text-red-400'
                                            : isAccept
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-purple-600 dark:text-purple-400'
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-[13px] bg-slate-50/50 dark:bg-slate-850/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
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
                    className={`flex items-start gap-3 p-3 rounded-xl border shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700 ${b.rowBg || 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono min-w-[105px] flex-shrink-0 pt-0.5 font-semibold">
                      <Clock size={12} className="text-slate-400 dark:text-slate-500" />
                      <span>{evt.date}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.pill}`}>
                          {b.icon}
                          {evt.action}
                        </span>
                        <span className="text-[12px] text-slate-600 dark:text-slate-300">
                          {t('by', 'by')} <strong className="text-slate-900 dark:text-white font-semibold">{evt.actor}</strong>
                        </span>
                      </div>

                      {evt.rejectionReason && (
                        <div className="mt-1.5 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-2">
                          <strong>{t('reason', 'Reason')}:</strong> {evt.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-[13px] bg-slate-50/50 dark:bg-slate-850/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
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
                    className={`flex items-start gap-3 p-3 rounded-xl border shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700 ${b.rowBg || 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'}`}
                  >
                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono min-w-[110px] flex-shrink-0 pt-0.5 font-semibold">
                      <Clock size={12} className="text-slate-400 dark:text-slate-500" />
                      <span>{evt.date}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                              isBidding
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isBidding ? t('bidding', 'Bidding') : t('operations', 'Operations')}
                          </span>

                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.pill}`}>
                            {b.icon}
                            {evt.action}
                          </span>

                          <span className="text-[12px] text-slate-600 dark:text-slate-300">
                            {t('by', 'by')} <strong className="text-slate-900 dark:text-white font-semibold">{evt.actor}</strong>
                          </span>
                        </div>

                        {evt.priceBadge && (
                          <span className="font-bold font-mono text-[13px] px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {evt.priceBadge}
                          </span>
                        )}
                      </div>

                      {evt.notes && (
                        <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 italic">
                          “{evt.notes}”
                        </div>
                      )}

                      {evt.rejectionReason && (
                        <div className="mt-1.5 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-2">
                          <strong>{t('reason', 'Reason')}:</strong> {evt.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-[13px] bg-slate-50/50 dark:bg-slate-850/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              {t('noAuditEntries', 'No activity recorded yet.')}
            </div>
          )
        )}
      </div>
    </CollapsibleCard>
  );
};

import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import type { AuditEntry } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

const FILTER_CATEGORIES = [
  { key: 'all', labelKey: 'all', fallback: 'All' },
  { key: 'bidding', labelKey: 'bidding', fallback: 'Bidding' },
  { key: 'operations', labelKey: 'operations', fallback: 'Operations' },
  { key: 'docs', labelKey: 'docs', fallback: 'Docs' },
  { key: 'billing', labelKey: 'billing', fallback: 'Billing' },
  { key: 'messages', labelKey: 'messages', fallback: 'Messages' },
] as const;

interface AuditLogCardProps {
  entries: AuditEntry[];
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}

export const AuditLogCard: React.FC<AuditLogCardProps> = ({
  entries,
  expanded,
  onToggle,
  t,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filteredEntries =
    selectedCat === 'all'
      ? entries
      : entries.filter((e) => e.category === selectedCat || e.category === 'all');

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
        {/* Category filters */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {FILTER_CATEGORIES.map((cat) => {
            const isAct = selectedCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 cursor-pointer"
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

        {/* Timeline list */}
        {filteredEntries.length === 0 ? (
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
                  <span dangerouslySetInnerHTML={{ __html: e.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
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

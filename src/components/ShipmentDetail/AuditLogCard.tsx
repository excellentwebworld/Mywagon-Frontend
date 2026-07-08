import React, { useMemo, useState } from 'react';
import type { AuditEntry } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface AuditLogCardProps {
  entries: AuditEntry[];
  expanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

const FILTERS = ['all', 'bidding', 'operations', 'docs', 'billing', 'messages'] as const;

export const AuditLogCard: React.FC<AuditLogCardProps> = ({ entries, expanded, onToggle, t }) => {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.category === filter)),
    [entries, filter]
  );

  return (
    <CollapsibleCard
      id="audit"
      title={<>📋 {t('auditLog')}</>}
      count={entries.length}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="ld-al-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`ld-al-chip ${filter === f ? 'act' : ''}`}
            onClick={() => setFilter(f)}
          >
            {t(`auditFilter_${f}`)}
          </button>
        ))}
      </div>
      {filtered.map((entry) => (
        <div
          key={entry.id}
          className={`ld-al-item ${
            entry.tone === 'bid'
              ? 'ld-al-row-bid'
              : entry.tone === 'counter'
                ? 'ld-al-row-counter'
                : entry.tone === 'accept'
                  ? 'ld-al-row-accept'
                  : ''
          }`}
        >
          <div className="ld-al-time">{entry.time}</div>
          <div className="ld-al-text">
            {entry.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split(/(<strong>.*?<\/strong>)/).map((part, i) =>
              part.startsWith('<strong>') ? (
                <strong key={i}>{part.replace(/<\/?strong>/g, '')}</strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
            {entry.priceBadge && (
              <span className="ld-bg ld-bg-ok" style={{ marginLeft: 8, fontSize: 10 }}>
                {entry.priceBadge}
              </span>
            )}
          </div>
        </div>
      ))}
    </CollapsibleCard>
  );
};

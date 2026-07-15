import React, { useEffect, useRef } from 'react';
import type { AvailableTruck, DrawerMode, SortKey } from '../../pages/SearchTrucks/types';
import { AvailabilityCard } from './AvailabilityCard';
import { AvailabilityDetailPanel } from './AvailabilityDetailPanel';

interface AvailabilityListProps {
  trucks: AvailableTruck[];
  total: number;
  page: number;
  totalPages: number;
  perPage: number;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  groupRecurring: boolean;
  onToggleGroup: () => void;
  hoveredId: string | null;
  selectedId: string | null;
  selectedTruck: AvailableTruck | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onBook: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  onPageChange: (page: number) => void;
  onMessage: (carrier: string) => void;
  onProfile: () => void;
  onClearFilters: () => void;
  mapExpanded: boolean;
  onCollapseMap: () => void;
  loading?: boolean;
  subscriptionBlocked?: boolean;
  t: (key: string) => string;
}

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'best_match', labelKey: 'satSortBestMatch' },
  { key: 'soonest_start', labelKey: 'satSortSoonest' },
  { key: 'lowest_price', labelKey: 'satSortLowestPrice' },
  { key: 'highest_rating', labelKey: 'satSortHighestRating' },
  { key: 'freshest', labelKey: 'satSortFreshest' },
];

export const AvailabilityList: React.FC<AvailabilityListProps> = ({
  trucks,
  total,
  page,
  totalPages,
  perPage,
  sortKey,
  onSortChange,
  groupRecurring,
  onToggleGroup,
  hoveredId,
  selectedId,
  selectedTruck,
  onHover,
  onSelect,
  onBook,
  onPageChange,
  onMessage,
  onProfile,
  onClearFilters,
  mapExpanded,
  onCollapseMap,
  loading = false,
  subscriptionBlocked = false,
  t,
}) => {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  if (mapExpanded) {
    return (
      <div className="sat-list-col sat-list-col--collapsed">
        <button type="button" className="sat-show-list-btn" onClick={onCollapseMap}>
          {t('satShowList')} ({total})
        </button>
      </div>
    );
  }

  return (
    <div className="sat-list-col">
      <div className="sat-list-toolbar">
        <div className="sat-list-count">
          {total} {t('satResults')}
        </div>
        <div className="sat-sort-row" style={{ marginBottom: 0 }}>
          <span className="sat-muted">{t('satSort')}:</span>
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label={t('satSort')}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          <div className="sat-toggle-wrap">
            <span>{t('satGroupRecurring')}</span>
            <button
              type="button"
              className={`sat-toggle ${groupRecurring ? 'on' : ''}`}
              onClick={onToggleGroup}
              aria-pressed={groupRecurring}
              aria-label={t('satGroupRecurring')}
            />
          </div>
        </div>
      </div>

      <div className="sat-list-scroll">
        {loading ? (
          <div className="sat-skeleton-list" aria-busy="true" aria-label={t('satLoading')}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="sat-skeleton-card">
                <div className="sat-skeleton-line sat-skeleton-line--lg" />
                <div className="sat-skeleton-line" />
                <div className="sat-skeleton-line sat-skeleton-line--sm" />
              </div>
            ))}
          </div>
        ) : subscriptionBlocked ? (
          <div className="sat-empty sat-empty--blocked">
            <div>{t('satUpgradeBody')}</div>
          </div>
        ) : trucks.length === 0 ? (
          <div className="sat-empty">
            <div style={{ marginBottom: 8 }}>{t('satNoResults')}</div>
            <button type="button" className="sat-f-clear" onClick={onClearFilters}>
              {t('satClearAll')}
            </button>
          </div>
        ) : (
          trucks.map((truck) => (
            <AvailabilityCard
              key={truck.id}
              truck={truck}
              selected={selectedId === truck.id}
              hovered={hoveredId === truck.id}
              onHover={onHover}
              onSelect={(id) => onSelect(id)}
              onBook={onBook}
              t={t}
              cardRef={(el) => {
                cardRefs.current[truck.id] = el;
              }}
            />
          ))
        )}
      </div>

      {total > 0 && (
        <div className="sat-pag">
          <div className="sat-pag-info">
            {t('showing')} {start}–{end} {t('of')} {total}
          </div>
          <div className="sat-pag-btns">
            <button
              type="button"
              className="sat-pg-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`sat-pg-btn ${page === p ? 'act' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="sat-pg-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {selectedTruck && (
        <AvailabilityDetailPanel
          truck={selectedTruck}
          onClose={() => onSelect(null)}
          onBook={onBook}
          onMessage={onMessage}
          onProfile={onProfile}
          t={t}
        />
      )}
    </div>
  );
};

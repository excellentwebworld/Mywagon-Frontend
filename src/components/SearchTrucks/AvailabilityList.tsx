import React, { useEffect, useRef } from 'react';
import type { AvailableTruck, DrawerMode } from '../../pages/SearchTrucks/types';
import { AvailabilityCard } from './AvailabilityCard';
import { AvailabilityDetailPanel } from './AvailabilityDetailPanel';

interface AvailabilityListProps {
  trucks: AvailableTruck[];
  total: number;
  hoveredId: string | null;
  selectedId: string | null;
  selectedTruck: AvailableTruck | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onBook: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  onMessage: (carrier: string) => void;
  onProfile: (truck: AvailableTruck) => void;
  onClearFilters: () => void;
  mapExpanded: boolean;
  onCollapseMap: () => void;
  loading?: boolean;
  fetchingMore?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  creatingShipment?: boolean;
  subscriptionBlocked?: boolean;
  /** Hide list-side detail when map hosts the bottom sheet (mobile overlay) */
  hideDetailPanel?: boolean;
  /** View If Posted Truck Received Bids */
  canViewBidsCount?: boolean;
  t: (key: string) => string;
}

function RichSkeletonCard() {
  return (
    <div className="sat-skeleton-card sat-skeleton-card--rich" aria-hidden>
      <div className="sat-skeleton-card__top">
        <div className="sat-skeleton-chip" />
        <div className="sat-skeleton-line sat-skeleton-line--sm" />
      </div>
      <div className="sat-skeleton-card__route">
        <div className="sat-skeleton-card__col">
          <div className="sat-skeleton-line sat-skeleton-line--lg" />
          <div className="sat-skeleton-line sat-skeleton-line--sm" />
        </div>
        <div className="sat-skeleton-arrow" />
        <div className="sat-skeleton-card__col">
          <div className="sat-skeleton-line sat-skeleton-line--lg" />
          <div className="sat-skeleton-line sat-skeleton-line--sm" />
        </div>
      </div>
      <div className="sat-skeleton-line" />
      <div className="sat-skeleton-line sat-skeleton-line--md" />
      <div className="sat-skeleton-card__footer">
        <div className="sat-skeleton-card__carrier">
          <div className="sat-skeleton-avatar" />
          <div className="sat-skeleton-card__col">
            <div className="sat-skeleton-line sat-skeleton-line--md" />
            <div className="sat-skeleton-line sat-skeleton-line--sm" />
          </div>
        </div>
        <div className="sat-skeleton-card__cta">
          <div className="sat-skeleton-line sat-skeleton-line--price" />
          <div className="sat-skeleton-btn" />
        </div>
      </div>
    </div>
  );
}

export const AvailabilityList: React.FC<AvailabilityListProps> = ({
  trucks,
  total,
  hoveredId,
  selectedId,
  selectedTruck,
  onHover,
  onSelect,
  onBook,
  onMessage,
  onProfile,
  onClearFilters,
  mapExpanded,
  onCollapseMap,
  loading = false,
  fetchingMore = false,
  hasNextPage = false,
  onLoadMore,
  creatingShipment = false,
  subscriptionBlocked = false,
  hideDetailPanel = false,
  canViewBidsCount = false,
  t,
}) => {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  useEffect(() => {
    if (!onLoadMore || !hasNextPage || loading || subscriptionBlocked) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onLoadMore();
        }
      },
      { root: node.parentElement, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore, hasNextPage, loading, subscriptionBlocked, trucks.length]);

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
          {loading ? '…' : total} {t('satResults')}
        </div>
      </div>

      <div className="sat-list-scroll">
        {loading ? (
          <div className="sat-skeleton-list" aria-busy="true" aria-label={t('satLoading')}>
            {Array.from({ length: 5 }, (_, i) => (
              <RichSkeletonCard key={i} />
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
          <>
            {trucks.map((truck) => (
              <AvailabilityCard
                key={truck.id}
                truck={truck}
                selected={selectedId === truck.id}
                hovered={hoveredId === truck.id}
                onHover={onHover}
                onSelect={(id) => onSelect(id)}
                onBook={onBook}
                t={t}
                canViewBidsCount={canViewBidsCount}
                cardRef={(el) => {
                  cardRefs.current[truck.id] = el;
                }}
              />
            ))}
            <div ref={sentinelRef} className="sat-infinite-sentinel" aria-hidden />
            {fetchingMore && (
              <div className="sat-infinite-loading" aria-busy="true">
                <RichSkeletonCard />
                <RichSkeletonCard />
                <div className="sat-muted sat-infinite-loading__label">{t('satLoadingMore')}</div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedTruck && !hideDetailPanel && (
        <AvailabilityDetailPanel
          truck={selectedTruck}
          onClose={() => onSelect(null)}
          onBook={onBook}
          onMessage={onMessage}
          onProfile={onProfile}
          creatingShipment={creatingShipment}
          t={t}
        />
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import type {
  AvailableTruck,
  BookingDraft,
  PendingShipment,
} from '../../pages/SearchTrucks/types';

function pendingKey(p: PendingShipment): string {
  return String(p.id ?? p.sid);
}

function PendingCardSkeleton({ variant = 0 }: { variant?: number }) {
  const sidW = ['42%', '36%', '48%'][variant % 3];
  const laneW = ['92%', '78%', '86%'][variant % 3];
  const lane2W = ['64%', '54%', '70%'][variant % 3];
  return (
    <div className="sat-pend-row sat-pend-row--skel" aria-hidden>
      <div className="sat-pend-skel-radio" />
      <div className="sat-pend-main">
        <div className="sat-pend-skel-sid" style={{ width: sidW }} />
        <div className="sat-pend-skel-lane" style={{ width: laneW }} />
        <div className="sat-pend-skel-lane sat-pend-skel-lane--2" style={{ width: lane2W }} />
        <div className="sat-pend-meta sat-pend-meta--skel">
          <span className="sat-pend-skel-chip" style={{ width: 56 }} />
          <span className="sat-pend-skel-chip" style={{ width: 72 }} />
          <span className="sat-pend-skel-chip" style={{ width: 64 }} />
        </div>
      </div>
    </div>
  );
}

function PendingListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="sat-pend-skel" role="status" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <PendingCardSkeleton key={i} variant={i} />
      ))}
    </div>
  );
}

interface BookingDrawerProps {
  open: boolean;
  step: number;
  onStepChange: (step: number) => void;
  truck: AvailableTruck | null;
  pending: PendingShipment[];
  pendingLoading?: boolean;
  pendingFetchingMore?: boolean;
  pendingHasMore?: boolean;
  pendingTotal?: number;
  pendingSearch?: string;
  onPendingSearchChange?: (search: string) => void;
  onLoadMorePending?: () => void;
  confirming?: boolean;
  selectedPendingIdx: number | null;
  onSelectPending: (idx: number) => void;
  draft: BookingDraft | null;
  onDraftChange: (patch: Partial<BookingDraft>) => void;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  open,
  step,
  onStepChange,
  truck,
  pending,
  pendingLoading,
  pendingFetchingMore,
  pendingHasMore,
  pendingTotal = 0,
  pendingSearch = '',
  onPendingSearchChange,
  onLoadMorePending,
  confirming,
  selectedPendingIdx,
  onSelectPending,
  draft,
  onDraftChange,
  onClose,
  onConfirm,
  t,
}) => {
  const [searchInput, setSearchInput] = useState(pendingSearch);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPending =
    selectedPendingIdx != null ? pending[selectedPendingIdx] : null;

  const canNextFromStep1 = selectedPendingIdx != null;

  useEffect(() => {
    if (!open) return;
    setSearchInput(pendingSearch);
  }, [open, truck?.id, pendingSearch]);

  useEffect(() => {
    if (!open) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (searchInput === pendingSearch) return;
      onPendingSearchChange?.(searchInput);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput, open, onPendingSearchChange, pendingSearch]);

  useEffect(() => {
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !pendingHasMore || pendingLoading || pendingFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMorePending?.();
      },
      { root, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    pendingHasMore,
    pendingLoading,
    pendingFetchingMore,
    onLoadMorePending,
    pending.length,
  ]);

  if (!open || !truck || !draft) return null;

  const shipLabel = selectedPending
    ? `${selectedPending.sid} — ${selectedPending.lane}`
    : '—';

  const showPrice = truck.price != null && !truck.priceBlurred;

  return (
    <div
      className={`sat-drawer-bg ${open ? 'show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className="sat-drawer" role="dialog" aria-modal="true" aria-labelledby="sat-drawer-title">
        <div className="sat-drawer-h">
          <div>
            <p className="sat-drawer-kicker">{t('satBookPending')}</p>
            <h3 id="sat-drawer-title">
              {truck.carrier} · {truck.truckType}
            </h3>
          </div>
          <button type="button" className="sat-drawer-close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <nav className="sat-stepper" aria-label={t('satBook')}>
          {(
            [
              { n: 1, label: t('satStepChoose') },
              { n: 2, label: t('satStepTerms') },
              { n: 3, label: t('satStepConfirm') },
            ] as const
          ).map((s, i, arr) => {
            const done = step > s.n;
            const act = step === s.n;
            return (
              <React.Fragment key={s.n}>
                <button
                  type="button"
                  className={`sat-step ${act ? 'act' : ''} ${done ? 'done' : ''}`}
                  disabled={!done && !act}
                  onClick={() => done && onStepChange(s.n)}
                  aria-current={act ? 'step' : undefined}
                >
                  <span className="sat-step-num">{done ? '✓' : s.n}</span>
                  <span className="sat-step-label">{s.label}</span>
                </button>
                {i < arr.length - 1 ? (
                  <div className={`sat-step-line ${step > s.n ? 'done' : ''} ${step === s.n ? 'act' : ''}`} />
                ) : null}
              </React.Fragment>
            );
          })}
        </nav>

        <div className={`sat-drawer-body ${step === 1 ? 'sat-drawer-body--pend' : ''}`}>
          {step === 1 && (
            <div className="sat-pend-panel">
              <div className="sat-pend-toolbar">
                <div className="sat-pend-toolbar-row">
                  <label className="sat-pend-search">
                    <span className="sat-pend-search-icon" aria-hidden>
                      ⌕
                    </span>
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t('satPendingSearchPh') || 'Search by ID, route, city…'}
                      aria-label={t('satPendingSearch') || 'Search pending shipments'}
                    />
                  </label>
                  <div className="sat-pend-count" aria-live="polite">
                    {pendingLoading ? '…' : pendingTotal}
                    <span>{t('satPendingCountLabel') || 'shipments'}</span>
                  </div>
                </div>
              </div>

              <div className="sat-pend-list-wrap">
                <div
                  ref={listRef}
                  className="sat-pend-list"
                  role="listbox"
                  aria-label={t('satStepChoose')}
                  aria-busy={pendingLoading || pendingFetchingMore || undefined}
                >
                  {pendingLoading ? (
                    <PendingListSkeleton rows={6} />
                  ) : pending.length === 0 ? (
                    <div className="sat-empty sat-pend-empty">
                      {pendingTotal === 0 && !pendingSearch
                        ? t('satNoPending') || 'No matching pending shipments for this availability.'
                        : t('satPendingNoFilterResults') ||
                          'No shipments match your search or filters.'}
                    </div>
                  ) : (
                    <>
                      {pending.map((p, idx) => {
                        const selected = selectedPendingIdx === idx;
                        return (
                          <div
                            key={pendingKey(p)}
                            className={`sat-pend-row ${selected ? 'sel' : ''}`}
                            onClick={() => onSelectPending(idx)}
                            role="option"
                            aria-selected={selected}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onSelectPending(idx)}
                          >
                            <div className="sat-pend-radio" />
                            <div className="sat-pend-main">
                              <div className="sat-pend-sid">
                                {p.sid}
                                {p.exactMatch ? (
                                  <span className="sat-bg sat-bg-ok">{t('satExactMatch')}</span>
                                ) : null}
                              </div>
                              <div className="sat-pend-lane">{p.lane}</div>
                              <div className="sat-pend-meta">
                                <span>{p.pickup}</span>
                                <span>{p.weight}</span>
                                <span>
                                  {p.stops} {t('satStops')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {pendingFetchingMore ? (
                        <div
                          className="sat-pend-append"
                          role="status"
                          aria-live="polite"
                          aria-label={t('satPendingLoadingMore') || 'Loading more…'}
                        >
                          <PendingCardSkeleton variant={pending.length} />
                        </div>
                      ) : null}

                      {!pendingHasMore && !pendingFetchingMore && pending.length > 0 ? (
                        <p className="sat-pend-end">
                          {(t('satPendingEndCount') || '{{count}} shipments shown').replace(
                            '{{count}}',
                            String(pendingTotal)
                          )}
                        </p>
                      ) : null}

                      {pendingHasMore ? (
                        <div ref={sentinelRef} className="sat-pend-sentinel-hit" aria-hidden />
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {selectedPending && !pendingLoading ? (
                <div className="sat-pend-match">
                  <h4>{t('satMatchScore')}</h4>
                  <div className="sat-match-grid">
                    <div className="sat-match-item">
                      <div className="label">{t('satCapacityFit')}</div>
                      <div className="val" style={{ color: 'var(--success)' }}>
                        {truck.capacity} ✅
                      </div>
                    </div>
                    <div className="sat-match-item">
                      <div className="label">{t('satTripPreference')}</div>
                      <div className="val">{truck.trip}</div>
                    </div>
                    <div className="sat-match-item">
                      <div className="label">{t('satTimingFit')}</div>
                      <div className="val" style={{ color: 'var(--success)' }}>
                        {t('satWithinWindow')} ✅
                      </div>
                    </div>
                    <div className="sat-match-item">
                      <div className="label">{t('satExactMatch')}</div>
                      <div
                        className="val"
                        style={{
                          color: selectedPending.exactMatch ? 'var(--success)' : 'var(--text-tertiary)',
                        }}
                      >
                        {selectedPending.exactMatch ? '✅' : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <>
              <div className="sat-truck-preview">
                <strong>{truck.carrier}</strong> · {truck.truckType} · {truck.specs}
                <br />
                <span className="sat-muted">
                  {truck.pickup} • {truck.radius}km → {truck.dest}
                </span>
              </div>

              {showPrice ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <span className="sat-muted">{t('satStartingPrice')}</span>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--accent)',
                      }}
                    >
                      € {truck.price!.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="sat-price-opt">
                      <input
                        type="radio"
                        name="priceOpt"
                        checked={draft.acceptStartingPrice}
                        onChange={() =>
                          onDraftChange({
                            acceptStartingPrice: true,
                            offerPrice: String(truck.price),
                          })
                        }
                      />
                      {t('satAcceptStarting')} (€ {truck.price})
                    </label>
                    <label className="sat-price-opt">
                      <input
                        type="radio"
                        name="priceOpt"
                        checked={!draft.acceptStartingPrice}
                        onChange={() => onDraftChange({ acceptStartingPrice: false })}
                      />
                      {t('satSendCustomOffer')}
                    </label>
                  </div>
                </>
              ) : (
                <div className="sat-warn-banner">
                  <strong>{t('satNoStartingPrice')}</strong> {t('satMustSendOffer')}
                </div>
              )}

              <div className="sat-field">
                <label>{t('satYourOffer')}</label>
                <input
                  type="number"
                  value={draft.offerPrice}
                  onChange={(e) =>
                    onDraftChange({ offerPrice: e.target.value, acceptStartingPrice: false })
                  }
                  placeholder={showPrice ? String(truck.price) : ''}
                />
              </div>
              <div className="sat-field">
                <label>{t('satNotesToProvider')}</label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => onDraftChange({ notes: e.target.value })}
                  placeholder={t('satTermsNotesPlaceholder')}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="sat-summary-card">
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                {t('satBookingSummary')}
              </h4>
              <div className="sat-sum-row">
                <span>{t('satAvailability')}</span>
                <span className="val">
                  {truck.id} · {truck.carrier}
                </span>
              </div>
              <div className="sat-sum-row">
                <span>{t('satTruck')}</span>
                <span className="val">
                  {truck.truckType} · {truck.specs} · {truck.capacity}
                </span>
              </div>
              <div className="sat-sum-row">
                <span>{t('satRoute')}</span>
                <span className="val">
                  {truck.pickup} → {truck.dest}
                </span>
              </div>
              <div className="sat-sum-row">
                <span>{t('satColAvailable')}</span>
                <span className="val">
                  {truck.startDt} {truck.startTm}
                </span>
              </div>
              <div className="sat-sum-row">
                <span>{t('satShipment')}</span>
                <span className="val">{shipLabel}</span>
              </div>
              <div className="sat-sum-row">
                <span>{t('satOfferPrice')}</span>
                <span
                  className="val"
                  style={{
                    color: 'var(--accent)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 15,
                  }}
                >
                  € {draft.offerPrice || '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="sat-drawer-ft">
          {step === 1 && (
            <>
              <button type="button" className="sat-btn" onClick={onClose}>
                {t('cancel')}
              </button>
              <button
                type="button"
                className="sat-btn sat-btn-pr"
                disabled={!canNextFromStep1}
                onClick={() => onStepChange(2)}
              >
                {t('satNext')} →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button type="button" className="sat-btn" onClick={() => onStepChange(1)}>
                ← {t('satBack')}
              </button>
              <button type="button" className="sat-btn sat-btn-pr" onClick={() => onStepChange(3)}>
                {t('satReview')} →
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button type="button" className="sat-btn" onClick={() => onStepChange(2)}>
                ← {t('satBack')}
              </button>
              <button
                type="button"
                className="sat-btn sat-btn-pr"
                disabled={confirming}
                onClick={onConfirm}
              >
                {confirming ? t('satSending') : `✅ ${t('satConfirmSend')}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

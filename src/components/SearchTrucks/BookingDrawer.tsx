import React from 'react';
import type {
  AvailableTruck,
  BookingDraft,
  DrawerMode,
  PendingShipment,
} from '../../pages/SearchTrucks/types';

interface BookingDrawerProps {
  open: boolean;
  step: number;
  onStepChange: (step: number) => void;
  mode: DrawerMode;
  onModeChange: (mode: DrawerMode) => void;
  truck: AvailableTruck | null;
  pending: PendingShipment[];
  pendingLoading?: boolean;
  confirming?: boolean;
  selectedPendingIdx: number | null;
  onSelectPending: (idx: number) => void;
  draft: BookingDraft | null;
  onDraftChange: (patch: Partial<BookingDraft>) => void;
  onClose: () => void;
  onConfirm: () => void;
  onGoCreateShipment?: () => void;
  t: (key: string) => string;
}

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  open,
  step,
  onStepChange,
  mode,
  onModeChange,
  truck,
  pending,
  pendingLoading,
  confirming,
  selectedPendingIdx,
  onSelectPending,
  draft,
  onDraftChange,
  onClose,
  onConfirm,
  onGoCreateShipment,
  t,
}) => {
  const selectedPending =
    selectedPendingIdx != null ? pending[selectedPendingIdx] : null;

  const canNextFromStep1 =
    mode === 'new' || (mode === 'pending' && selectedPendingIdx != null);

  if (!open || !truck || !draft) return null;

  const shipLabel =
    mode === 'pending' && selectedPending
      ? `${selectedPending.sid} — ${selectedPending.lane}`
      : t('satNewShipmentDraft');

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
          <h3 id="sat-drawer-title">
            {t('satBook')}: {truck.carrier} · {truck.truckType}
          </h3>
          <button type="button" className="sat-drawer-close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <div className="sat-stepper">
          <div className={`sat-step ${step === 1 ? 'act' : ''} ${step > 1 ? 'done' : ''}`}>
            <div className="sat-step-num">{step > 1 ? '✓' : '1'}</div>
            {t('satStepChoose')}
          </div>
          <div className={`sat-step-line ${step > 1 ? 'done' : ''}`} />
          <div className={`sat-step ${step === 2 ? 'act' : ''} ${step > 2 ? 'done' : ''}`}>
            <div className="sat-step-num">{step > 2 ? '✓' : '2'}</div>
            {t('satStepTerms')}
          </div>
          <div className={`sat-step-line ${step > 2 ? 'done' : ''}`} />
          <div className={`sat-step ${step === 3 ? 'act' : ''}`}>
            <div className="sat-step-num">3</div>
            {t('satStepConfirm')}
          </div>
        </div>

        <div className="sat-drawer-body">
          {step === 1 && (
            <>
              <div className="sat-f-tabs" style={{ marginBottom: 14, width: '100%' }}>
                <button
                  type="button"
                  className={`sat-f-tab ${mode === 'pending' ? 'act' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => onModeChange('pending')}
                >
                  {t('satUsePending')}
                </button>
                <button
                  type="button"
                  className={`sat-f-tab ${mode === 'new' ? 'act' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => onModeChange('new')}
                >
                  {t('satCreateNewShipment')}
                </button>
              </div>

              {mode === 'pending' ? (
                <>
                  {pendingLoading ? (
                    <div className="sat-empty">{t('satLoadingPending')}</div>
                  ) : pending.length === 0 ? (
                    <div className="sat-empty">{t('satNoPending')}</div>
                  ) : (
                    pending.map((p, pi) => (
                      <div
                        key={p.id ?? p.sid}
                        className={`sat-pend-row ${selectedPendingIdx === pi ? 'sel' : ''}`}
                        onClick={() => onSelectPending(pi)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectPending(pi)}
                      >
                        <div className="sat-pend-radio" />
                        <div>
                          <div className="sat-pend-sid">
                            {p.sid}
                            {p.exactMatch ? (
                              <span className="sat-bg sat-bg-ok" style={{ marginLeft: 8, fontSize: 10 }}>
                                {t('satExactMatch')}
                              </span>
                            ) : null}
                          </div>
                          <div className="sat-pend-lane">
                            {p.lane} · {p.pickup} · {p.weight} · {p.stops} {t('satStops')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {selectedPending && (
                    <div style={{ marginTop: 14 }}>
                      <h4
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                          marginBottom: 8,
                        }}
                      >
                        {t('satMatchScore')}
                      </h4>
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
                  )}
                </>
              ) : (
                <>
                  <div className="sat-info-banner">
                    ℹ️ <strong>{t('satSameAsCreate')}</strong> — {t('satCreateNewHint')}
                  </div>
                  <div className="sat-truck-preview">
                    <strong>{truck.carrier}</strong> · {truck.truckType}
                    <br />
                    <span className="sat-muted">
                      {truck.pickup} → {truck.dest} · {truck.startDt} {truck.startTm}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sat-btn sat-btn-pr sat-btn-block"
                    style={{ marginTop: 14 }}
                    onClick={() => onGoCreateShipment?.()}
                  >
                    {t('satContinueToCreateShipment')} →
                  </button>
                </>
              )}
            </>
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
              {mode === 'new' ? (
                <button
                  type="button"
                  className="sat-btn sat-btn-pr"
                  onClick={() => onGoCreateShipment?.()}
                >
                  {t('satContinueToCreateShipment')} →
                </button>
              ) : (
                <button
                  type="button"
                  className="sat-btn sat-btn-pr"
                  disabled={!canNextFromStep1}
                  onClick={() => onStepChange(2)}
                >
                  {t('satNext')} →
                </button>
              )}
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

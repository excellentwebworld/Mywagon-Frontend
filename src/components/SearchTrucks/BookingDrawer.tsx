import React, { useMemo } from 'react';
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
  mode,
  onModeChange,
  truck,
  pending,
  selectedPendingIdx,
  onSelectPending,
  draft,
  onDraftChange,
  onClose,
  onConfirm,
  t,
}) => {
  const matchDistance = useMemo(
    () => (selectedPendingIdx != null ? 10 + ((selectedPendingIdx + 1) * 7) % 40 : 0),
    [selectedPendingIdx]
  );

  if (!open || !truck || !draft) return null;

  const shipLabel =
    mode === 'pending' && selectedPendingIdx != null
      ? `${pending[selectedPendingIdx].sid} — ${pending[selectedPendingIdx].lane}`
      : t('satNewShipmentDraft');

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
                  {pending.length === 0 ? (
                    <div className="sat-empty">{t('satNoPending')}</div>
                  ) : (
                    pending.map((p, pi) => (
                      <div
                        key={p.sid}
                        className={`sat-pend-row ${selectedPendingIdx === pi ? 'sel' : ''}`}
                        onClick={() => onSelectPending(pi)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectPending(pi)}
                      >
                        <div className="sat-pend-radio" />
                        <div>
                          <div className="sat-pend-sid">{p.sid}</div>
                          <div className="sat-pend-lane">
                            {p.lane} · {p.pickup} · {p.weight} · {p.stops} {t('satStops')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {selectedPendingIdx != null && (
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
                          <div className="label">{t('satPickupDistance')}</div>
                          <div className="val" style={{ color: 'var(--success)' }}>
                            ~{matchDistance} km ✅
                          </div>
                        </div>
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
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="sat-info-banner">
                    ℹ️ <strong>{t('satSameAsCreate')}</strong> — {t('satDrawerFormHint')}
                  </div>
                  <div className="sat-field">
                    <label>{t('satPickupLocation')} *</label>
                    <input
                      type="text"
                      value={draft.newPickup}
                      onChange={(e) => onDraftChange({ newPickup: e.target.value })}
                      placeholder="e.g. Ioannina"
                    />
                  </div>
                  <div className="sat-field">
                    <label>{t('satPickupDateTime')}</label>
                    <input
                      type="text"
                      value={draft.newPickupDt}
                      onChange={(e) => onDraftChange({ newPickupDt: e.target.value })}
                      placeholder="DD/MM/YYYY HH:MM"
                    />
                  </div>
                  <div className="sat-field">
                    <label>{t('satDeliveryLocation')}</label>
                    <input
                      type="text"
                      value={draft.newDelivery}
                      onChange={(e) => onDraftChange({ newDelivery: e.target.value })}
                      placeholder="e.g. Athens"
                    />
                  </div>
                  <div className="sat-field">
                    <label>{t('satDeliveryDateTime')}</label>
                    <input
                      type="text"
                      value={draft.newDeliveryDt}
                      onChange={(e) => onDraftChange({ newDeliveryDt: e.target.value })}
                      placeholder="DD/MM/YYYY HH:MM"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="sat-field">
                      <label>{t('satColEquipment')}</label>
                      <input type="text" value={truck.truckType} readOnly />
                    </div>
                    <div className="sat-field">
                      <label>{t('satWeightPallets')}</label>
                      <input
                        type="text"
                        value={draft.newWeight}
                        onChange={(e) => onDraftChange({ newWeight: e.target.value })}
                        placeholder="e.g. 13T / 30 pallets"
                      />
                    </div>
                  </div>
                  <div className="sat-field">
                    <label>{t('satNotes')}</label>
                    <textarea
                      value={draft.newNotes}
                      onChange={(e) => onDraftChange({ newNotes: e.target.value })}
                      placeholder={t('satNotesPlaceholder')}
                    />
                  </div>
                  <label
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={draft.saveAsDraft}
                      onChange={(e) => onDraftChange({ saveAsDraft: e.target.checked })}
                    />
                    {t('satSaveAsDraft')}
                  </label>
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

              {truck.price != null ? (
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
                      € {truck.price.toLocaleString()}
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
                  placeholder={truck.price != null ? String(truck.price) : ''}
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
              <div className="sat-field">
                <label>{t('satTripPreference')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="radio"
                      name="tripPref"
                      checked={draft.tripPref === 'Multi-stop OK'}
                      onChange={() => onDraftChange({ tripPref: 'Multi-stop OK' })}
                    />
                    Multi-stop OK
                  </label>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="radio"
                      name="tripPref"
                      checked={draft.tripPref === 'Direct only'}
                      onChange={() => onDraftChange({ tripPref: 'Direct only' })}
                    />
                    Direct only
                  </label>
                </div>
              </div>
              {truck.recurring && truck.occurrences.length > 0 && (
                <div className="sat-field">
                  <label>{t('satSelectOccurrence')}</label>
                  <select
                    value={draft.occurrence}
                    onChange={(e) => onDraftChange({ occurrence: e.target.value })}
                  >
                    {truck.occurrences.map((o) => (
                      <option key={o} value={o}>
                        📅 {o}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
              <div className="sat-sum-row">
                <span>{t('satColTrip')}</span>
                <span className="val">{draft.tripPref}</span>
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
              <button type="button" className="sat-btn sat-btn-pr" onClick={() => onStepChange(2)}>
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
              <button type="button" className="sat-btn sat-btn-pr" onClick={onConfirm}>
                ✅ {t('satConfirmSend')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

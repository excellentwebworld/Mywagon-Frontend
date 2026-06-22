import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';

type Props = Pick<
  PartnersState,
  | 't'
  | 'genericModal'
  | 'closeGenericModal'
  | 'laneOrigin'
  | 'setLaneOrigin'
  | 'laneDest'
  | 'setLaneDest'
  | 'laneUnit'
  | 'setLaneUnit'
  | 'lanePrice'
  | 'setLanePrice'
  | 'saveContractLane'
>;

export const PartnersGenericModal: React.FC<Props> = ({
  t,
  genericModal,
  closeGenericModal,
  laneOrigin,
  setLaneOrigin,
  laneDest,
  setLaneDest,
  laneUnit,
  setLaneUnit,
  lanePrice,
  setLanePrice,
  saveContractLane,
}) => {
  if (genericModal !== 'addLane') return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeGenericModal();
  };

  return (
    <div className="modal-backdrop open" onClick={handleOverlayClick} id="generic-modal">
      <div className="modal ptn-gm-modal">
        <div className="modal-header">
          <h2>{t('addLaneTitle')}</h2>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeGenericModal} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="mf">
              <label className="form-label">{t('originCity')} <span className="rq">*</span></label>
              <input type="text" className="form-input" id="lane-origin" placeholder="Athens" value={laneOrigin} onChange={(e) => setLaneOrigin(e.target.value)} />
            </div>
            <div className="mf">
              <label className="form-label">{t('destCity')} <span className="rq">*</span></label>
              <input type="text" className="form-input" id="lane-dest" placeholder="Thessaloniki" value={laneDest} onChange={(e) => setLaneDest(e.target.value)} />
            </div>
          </div>
          <div className="mf" style={{ marginBottom: 12 }}>
            <label className="form-label">{t('pricingMode')}</label>
            <div className="ptn-tag-chips">
              {(['load', 'pallet'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`ptn-tag-chip${laneUnit === u ? ' selected' : ''}`}
                  onClick={() => setLaneUnit(u)}
                >
                  {u === 'load' ? t('perLoad') : t('perPallet')}
                </button>
              ))}
            </div>
          </div>
          <div className="mf">
            <label className="form-label">{t('priceEur')} <span className="rq">*</span></label>
            <input type="number" className="form-input" id="lane-price" placeholder="0" min="0" value={lanePrice} onChange={(e) => setLanePrice(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeGenericModal}>{t('cancel') || 'Cancel'}</button>
          <button type="button" className="btn btn-primary" onClick={saveContractLane}>{t('save') || 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

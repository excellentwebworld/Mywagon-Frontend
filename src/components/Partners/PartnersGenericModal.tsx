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
    if ((e.target as HTMLDivElement).classList.contains('modal-overlay')) closeGenericModal();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="generic-modal">
      <div className="modal-box ptn-gm-modal">
        <div className="modal-header">
          <div className="modal-title">{t('addLaneTitle')}</div>
          <button type="button" className="modal-close" onClick={closeGenericModal}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="mf">
              <label>{t('originCity')} <span className="rq">*</span></label>
              <input type="text" id="lane-origin" placeholder="Athens" value={laneOrigin} onChange={(e) => setLaneOrigin(e.target.value)} />
            </div>
            <div className="mf">
              <label>{t('destCity')} <span className="rq">*</span></label>
              <input type="text" id="lane-dest" placeholder="Thessaloniki" value={laneDest} onChange={(e) => setLaneDest(e.target.value)} />
            </div>
          </div>
          <div className="mf">
            <label>{t('pricingMode')}</label>
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
            <label>{t('priceEur')} <span className="rq">*</span></label>
            <input type="number" id="lane-price" placeholder="0" min="0" value={lanePrice} onChange={(e) => setLanePrice(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={closeGenericModal}>{t('cancel') || 'Cancel'}</button>
          <button type="button" className="btn btn-primary" onClick={saveContractLane}>{t('save') || 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import { TRUCK_TYPES, REGION_KEYS } from '../../pages/Partners/constants';

type Props = Pick<
  PartnersState,
  | 't'
  | 'selectedPartner'
  | 'genericModal'
  | 'closeGenericModal'
  | 'saveCapability'
  | 'capTruckType'
  | 'setCapTruckType'
  | 'laneOrigin'
  | 'setLaneOrigin'
  | 'laneDest'
  | 'setLaneDest'
  | 'laneUnit'
  | 'setLaneUnit'
  | 'lanePrice'
  | 'setLanePrice'
  | 'saveContractLane'
  | 'bankIban'
  | 'setBankIban'
  | 'bankBeneficiary'
  | 'setBankBeneficiary'
  | 'saveBankDetails'
  | 'custName'
  | 'setCustName'
  | 'custCompany'
  | 'setCustCompany'
  | 'custEmail'
  | 'setCustEmail'
  | 'custPhone'
  | 'setCustPhone'
  | 'custVat'
  | 'setCustVat'
  | 'custRegion'
  | 'setCustRegion'
  | 'saveCustomer'
  | 'showToast'
  | 'rName'
>;

export const PartnersGenericModal: React.FC<Props> = (props) => {
  const {
    t,
    selectedPartner,
    genericModal,
    closeGenericModal,
    saveCapability,
    capTruckType,
    setCapTruckType,
    laneOrigin,
    setLaneOrigin,
    laneDest,
    setLaneDest,
    laneUnit,
    setLaneUnit,
    lanePrice,
    setLanePrice,
    saveContractLane,
    bankIban,
    setBankIban,
    bankBeneficiary,
    setBankBeneficiary,
    saveBankDetails,
    custName,
    setCustName,
    custCompany,
    setCustCompany,
    custEmail,
    setCustEmail,
    custPhone,
    setCustPhone,
    custVat,
    setCustVat,
    custRegion,
    setCustRegion,
    saveCustomer,
    showToast,
    rName,
  } = props;

  if (!genericModal) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLDivElement).classList.contains('modal-overlay')) closeGenericModal();
  };

  // ── Add Capability ──────────────────────────────────
  if (genericModal === 'addCap') {
    const availableTrucks = TRUCK_TYPES.filter((tk) => !selectedPartner?.trucks.includes(tk));
    return (
      <div className="modal-overlay" onClick={handleOverlayClick} id="generic-modal">
        <div className="modal-box ptn-gm-modal">
          <div className="modal-header">
            <div className="modal-title">{t('addCapTitle')}</div>
            <button type="button" className="modal-close" onClick={closeGenericModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="mf">
              <label>{t('truckType')} <span className="rq">*</span></label>
              <select
                id="cap-truck-type"
                value={capTruckType}
                onChange={(e) => setCapTruckType(e.target.value)}
              >
                {availableTrucks.length > 0
                  ? availableTrucks.map((tk) => <option key={tk}>{tk}</option>)
                  : <option value="">— All types already added —</option>}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={closeGenericModal}>{t('cancel') || 'Cancel'}</button>
            <button type="button" className="btn btn-primary" onClick={saveCapability} disabled={availableTrucks.length === 0}>
              {t('save') || 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Add Contract Lane ───────────────────────────────
  if (genericModal === 'addLane') {
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
                {(['PER_LOAD', 'PER_PALLET'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`ptn-tag-chip${laneUnit === u ? ' selected' : ''}`}
                    onClick={() => setLaneUnit(u)}
                  >
                    {u === 'PER_LOAD' ? t('perLoad') : t('perPallet')}
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
  }

  // ── Edit Bank Details ───────────────────────────────
  if (genericModal === 'editBank') {
    return (
      <div className="modal-overlay" onClick={handleOverlayClick} id="generic-modal">
        <div className="modal-box ptn-gm-modal">
          <div className="modal-header">
            <div className="modal-title">{t('editBankTitle')}</div>
            <button type="button" className="modal-close" onClick={closeGenericModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="mf">
              <label>IBAN <span className="rq">*</span></label>
              <input
                type="text"
                id="bank-iban"
                placeholder="GRxx xxxx xxxx xxxx"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
              />
            </div>
            <div className="mf">
              <label>{t('beneficiary')} <span className="rq">*</span></label>
              <input
                type="text"
                id="bank-beneficiary"
                placeholder={selectedPartner?.name || ''}
                value={bankBeneficiary}
                onChange={(e) => setBankBeneficiary(e.target.value)}
              />
            </div>
            <div className="ptn-bank-warn">⚠ {t('bankWarn')}</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={closeGenericModal}>{t('cancel') || 'Cancel'}</button>
            <button type="button" className="btn btn-primary" onClick={saveBankDetails}>{t('save') || 'Save'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Add Customer ────────────────────────────────────
  if (genericModal === 'addCustomer') {
    return (
      <div className="modal-overlay" onClick={handleOverlayClick} id="generic-modal">
        <div className="modal-box ptn-gm-modal">
          <div className="modal-header">
            <div className="modal-title">{t('addCustomerTitle')}</div>
            <button type="button" className="modal-close" onClick={closeGenericModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="mf">
              <label>{t('customerName')} <span className="rq">*</span></label>
              <input type="text" id="cust-name" placeholder="e.g. FreshCo S.A." value={custName} onChange={(e) => setCustName(e.target.value)} />
            </div>
            <div className="mf">
              <label>{t('customerCompanyField')}</label>
              <input type="text" id="cust-company" placeholder="e.g. FreshCo Group" value={custCompany} onChange={(e) => setCustCompany(e.target.value)} />
            </div>
            <div className="mf">
              <label>{t('email') || 'Email'}</label>
              <input type="email" id="cust-email" placeholder="info@freshco.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
            </div>
            <div className="mf">
              <label>{t('phone') || 'Phone'}</label>
              <input type="text" id="cust-phone" placeholder="+30 210 1234567" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
            </div>
            <div className="mf">
              <label>{t('customerVat')}</label>
              <input type="text" id="cust-vat" placeholder="EL123456789" value={custVat} onChange={(e) => setCustVat(e.target.value)} />
            </div>
            <div className="mf">
              <label>{t('regionFilter')}</label>
              <select
                id="cust-region"
                value={custRegion}
                onChange={(e) => setCustRegion(parseInt(e.target.value))}
              >
                {REGION_KEYS.map((_, idx) => (
                  <option key={idx} value={idx}>{rName(idx)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ borderColor: 'var(--info, #0EA5E9)', color: 'var(--info, #0EA5E9)', flex: 1 }}
                onClick={() => { closeGenericModal(); showToast(t('comingSoon')); }}
              >
                🔄 {t('syncErp')}
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={closeGenericModal}>{t('cancel') || 'Cancel'}</button>
            <button type="button" className="btn btn-primary" onClick={saveCustomer} id="btn-save-customer">
              {t('save') || 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

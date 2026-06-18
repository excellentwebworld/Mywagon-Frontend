import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';

type Props = Pick<PartnersState, 't' | 'showToast' | 'openInviteModal' | 'openGenericModal' | 'exportCsv'>;

export const PartnersHeader: React.FC<Props> = ({ t, showToast, openInviteModal, openGenericModal, exportCsv }) => (
  <div className="ptn-head anim">
    <div className="ptn-head-l">
      <div className="ptn-title">{t('partnersTitle')}</div>
      <div className="ptn-sub">{t('partnersSubtitle')}</div>
    </div>
    <div className="ptn-head-r">
      <button
        type="button"
        className="btn"
        style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
        onClick={() => openGenericModal('addCustomer')}
        id="btn-add-customer"
      >
        🏪 {t('addCustomerBtn')}
      </button>
      <button
        type="button"
        className="btn"
        style={{ borderColor: 'var(--info, #0EA5E9)', color: 'var(--info, #0EA5E9)' }}
        onClick={() => showToast(t('comingSoon'))}
        id="btn-sync-erp"
      >
        🔄 {t('syncErp')}
      </button>
      <button type="button" className="btn" onClick={exportCsv} id="btn-export">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {t('partnerExport')}
      </button>
      <button type="button" className="btn btn-primary" onClick={openInviteModal} id="btn-invite-partner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('invitePartner')}
      </button>
    </div>
  </div>
);

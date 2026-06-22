import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { InviteMethod, InvitePartnerType } from '../../pages/Partners/types';

type Props = Pick<
  PartnersState,
  | 't'
  | 'isInviteOpen'
  | 'inviteForm'
  | 'setInviteForm'
  | 'closeInviteModal'
  | 'sendInvite'
  | 'inviteLoading'
>;

export const InvitePartnerModal: React.FC<Props> = ({
  t,
  isInviteOpen,
  inviteForm,
  setInviteForm,
  closeInviteModal,
  sendInvite,
  inviteLoading,
}) => {
  if (!isInviteOpen) return null;

  const { method, partnerType, contact, countryCode, relationship, sent } = inviteForm;

  const setMethod = (m: InviteMethod) => setInviteForm({ ...inviteForm, method: m, contact: '' });
  const setPartnerType = (pt: InvitePartnerType) => setInviteForm({ ...inviteForm, partnerType: pt });

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLDivElement).classList.contains('modal-overlay')) closeInviteModal();
  };

  if (sent) {
    return (
      <div className="modal-overlay" onClick={handleOverlayClick} id="invite-modal">
        <div className="modal-box ptn-inv-modal">
          <div className="modal-header">
            <div className="modal-title">{t('invSentTitle')}</div>
          </div>
          <div className="modal-body">
            <div className="ptn-invite-success">
              <div className="icon">✓</div>
              <div className="title">{t('invSentTitle')}</div>
              <div className="desc">{t('invSentDesc')}</div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn"
              onClick={() => setInviteForm({ ...inviteForm, sent: false, contact: '' })}
            >
              {t('invAnother')}
            </button>
            <button type="button" className="btn btn-primary" onClick={closeInviteModal}>
              {t('done') || 'Done'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="invite-modal">
      <div className="modal-box ptn-inv-modal">
        <div className="modal-header">
          <div className="modal-title">{t('inviteTitle')}</div>
          <button type="button" className="modal-close" onClick={closeInviteModal}>✕</button>
        </div>

        <div className="modal-body">
          <div className="ptn-mtog">
            {(['email', 'phone', 'unique_id'] as InviteMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                className={method === m ? 'active' : ''}
                onClick={() => setMethod(m)}
              >
                {m === 'email' ? '📧' : m === 'phone' ? '📱' : '🆔'}{' '}
                {m === 'unique_id' ? t('mvUniqueId') : t(m) || m}
              </button>
            ))}
          </div>

          {method === 'phone' && (
            <div className="mf">
              <label>{t('countryCode')}</label>
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setInviteForm({ ...inviteForm, countryCode: e.target.value })}
                placeholder="+30"
              />
            </div>
          )}

          <div className="mf">
            <label>
              {method === 'email'
                ? t('email')
                : method === 'phone'
                  ? t('phone')
                  : t('mvUniqueId')}{' '}
              <span className="rq">*</span>
            </label>
            <input
              type="text"
              id="invite-contact-input"
              placeholder={
                method === 'email'
                  ? 'partner@company.com'
                  : method === 'phone'
                    ? '6900000000'
                    : 'ABC123456'
              }
              value={contact}
              onChange={(e) => setInviteForm({ ...inviteForm, contact: e.target.value })}
            />
          </div>

          <div className="mf">
            <label>
              {t('partnerType')} <span className="rq">*</span>
            </label>
            <div className="ptn-tag-chips">
              {(
                [
                  { value: 'carrier_company', label: t('carrierCoType') },
                  { value: 'freelancer_driver', label: t('freelancerDrType') },
                  { value: 'supplier', label: t('supplierType') },
                ] as { value: InvitePartnerType; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`ptn-tag-chip${partnerType === value ? ' selected' : ''}`}
                  onClick={() => setPartnerType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mf">
            <label>{t('relationshipLabel')}</label>
            <div className="ptn-tag-chips">
              {(
                [
                  { value: 'preferred', label: t('prefTag') },
                  { value: 'standard', label: t('stdTag') },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`ptn-tag-chip${relationship === value ? ' selected' : ''}`}
                  onClick={() =>
                    setInviteForm({
                      ...inviteForm,
                      relationship: relationship === value ? null : value,
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={closeInviteModal}>
            {t('cancel') || 'Cancel'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={sendInvite}
            disabled={inviteLoading}
            id="btn-send-invite"
          >
            {inviteLoading ? '…' : `✉ ${t('sendInvitation')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { InviteTag, InviteMethod, InvitePartnerType } from '../../pages/Partners/types';

type Props = Pick<
  PartnersState,
  | 't'
  | 'isInviteOpen'
  | 'inviteForm'
  | 'setInviteForm'
  | 'closeInviteModal'
  | 'sendInvite'
  | 'openGenericModal'
>;

export const InvitePartnerModal: React.FC<Props> = ({
  t,
  isInviteOpen,
  inviteForm,
  setInviteForm,
  closeInviteModal,
  sendInvite,
  openGenericModal,
}) => {
  if (!isInviteOpen) return null;

  const { method, partnerType, tags, contact, sent } = inviteForm;

  const setMethod = (m: InviteMethod) => setInviteForm({ ...inviteForm, method: m });
  const setPartnerType = (pt: InvitePartnerType) => setInviteForm({ ...inviteForm, partnerType: pt });
  const toggleTag = (tag: InviteTag) => {
    const idx = tags.indexOf(tag);
    setInviteForm({
      ...inviteForm,
      tags: idx >= 0 ? tags.filter((_, i) => i !== idx) : [...tags, tag],
    });
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLDivElement).classList.contains('modal-overlay')) closeInviteModal();
  };

  // ── Success State ──────────────────────────────────
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
              onClick={() => setInviteForm({ ...inviteForm, sent: false })}
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

  // ── Customer Notice ────────────────────────────────
  const isCustomerType = partnerType === 'customer';

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="invite-modal">
      <div className="modal-box ptn-inv-modal">
        <div className="modal-header">
          <div className="modal-title">{t('inviteTitle')}</div>
          <button type="button" className="modal-close" onClick={closeInviteModal}>✕</button>
        </div>

        <div className="modal-body">
          {/* Method toggle */}
          <div className="ptn-mtog">
            {(['email', 'phone'] as InviteMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                className={method === m ? 'active' : ''}
                onClick={() => setMethod(m)}
              >
                {m === 'email' ? '📧' : '📱'} {t(m) || m}
              </button>
            ))}
          </div>

          {/* Contact input */}
          <div className="mf">
            <label>
              {method === 'email' ? t('email') || 'Email' : t('phone') || 'Phone'}{' '}
              <span className="rq">*</span>
            </label>
            <input
              type="text"
              id="invite-contact-input"
              placeholder={method === 'email' ? 'partner@company.com' : '+30 69x xxxx xxx'}
              value={contact}
              onChange={(e) => setInviteForm({ ...inviteForm, contact: e.target.value })}
            />
          </div>

          {/* Partner type */}
          <div className="mf">
            <label>
              {t('partnerType')} <span className="rq">*</span>
            </label>
            <div className="ptn-tag-chips">
              {(
                [
                  { value: 'carrier_company',  label: t('carrierCoType') },
                  { value: 'freelancer_driver', label: t('freelancerDrType') },
                  { value: 'customer',          label: t('customerType') },
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

          {/* Customer notice */}
          {isCustomerType && (
            <div className="ptn-customer-warn">
              <div className="title">⚠ {t('comingSoon')}</div>
              <div className="desc">{t('customerInviteNote')}</div>
              <div className="cta">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => { closeInviteModal(); openGenericModal('addCustomer'); }}
                >
                  🏪 {t('addCustomerBtn')}
                </button>
              </div>
            </div>
          )}

          {/* Relationship tags */}
          <div className="mf">
            <label>{t('relTags')}</label>
            <div className="ptn-tag-chips">
              {(
                [
                  { value: 'pref', label: t('prefTag') },
                  { value: 'priv', label: t('privLoadsTag') },
                  { value: 'std',  label: t('stdTag') },
                ] as { value: InviteTag; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`ptn-tag-chip${tags.includes(value) ? ' selected' : ''}`}
                  onClick={() => toggleTag(value)}
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
          {isCustomerType ? (
            <button type="button" className="btn" disabled style={{ opacity: .4, cursor: 'not-allowed' }}>
              🔒 {t('comingSoon')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={sendInvite} id="btn-send-invite">
              ✉ {t('sendInvitation')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

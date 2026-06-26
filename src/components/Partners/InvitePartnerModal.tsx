import React, { useState, useEffect, useRef } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { InviteMethod, InvitePartnerType } from '../../pages/Partners/types';
import { useTranslation } from '../../hooks/useTranslation';
import { FormFieldError } from '../AddressBook/FormFieldError';

function fieldClass(hasError: boolean): string {
  return hasError ? 'mf has-error' : 'mf';
}

const COUNTRIES = [
  { en: 'Albania', el: 'Αλβανία', code: '+355' },
  { en: 'Andorra', el: 'Ανδόρα', code: '+376' },
  { en: 'Armenia', el: 'Αρμενία', code: '+374' },
  { en: 'Austria', el: 'Αυστρία', code: '+43' },
  { en: 'Azerbaijan', el: 'Αζερμπαϊτζάν', code: '+994' },
  { en: 'Belarus', el: 'Λευκορωσία', code: '+375' },
  { en: 'Belgium', el: 'Βέλγιο', code: '+32' },
  { en: 'Bosnia and Herzegovina', el: 'Βοσνία και Ερζεγοβίνη', code: '+387' },
  { en: 'Bulgaria', el: 'Βουλγαρία', code: '+359' },
  { en: 'Croatia', el: 'Κροατία', code: '+385' },
  { en: 'Cyprus', el: 'Κύπρος', code: '+357' },
  { en: 'Czech Republic (Czechia)', el: 'Τσεχία', code: '+420' },
  { en: 'Denmark', el: 'Δανία', code: '+45' },
  { en: 'Estonia', el: 'Εσθονία', code: '+372' },
  { en: 'Finland', el: 'Φινλανδία', code: '+358' },
  { en: 'France', el: 'Γαλλία', code: '+33' },
  { en: 'Georgia', el: 'Γεωργία', code: '+995' },
  { en: 'Germany', el: 'Γερμανία', code: '+49' },
  { en: 'Greece', el: 'Ελλάδα', code: '+30' },
  { en: 'Hungary', el: 'Ουγγαρία', code: '+36' },
  { en: 'Iceland', el: 'Ισλανδία', code: '+354' },
  { en: 'Ireland', el: 'Ιρλανδία', code: '+353' },
  { en: 'Italy', el: 'Ιταλία', code: '+39' },
  { en: 'Kosovo', el: 'Κοσσυφοπέδιο', code: '+383' },
  { en: 'Latvia', el: 'Λετονία', code: '+371' },
  { en: 'Liechtenstein', el: 'Λιχτενστάιν', code: '+423' },
  { en: 'Lithuania', el: 'Λιθουανία', code: '+370' },
  { en: 'Luxembourg', el: 'Λουξεμβούργο', code: '+352' },
  { en: 'Malta', el: 'Μάλτα', code: '+356' },
  { en: 'Moldova', el: 'Μολδαβία', code: '+373' },
  { en: 'Monaco', el: 'Μονακό', code: '+377' },
  { en: 'Montenegro', el: 'Μαυροβούνιο', code: '+382' },
  { en: 'Netherlands', el: 'Ολλανδία', code: '+31' },
  { en: 'North Macedonia', el: 'Βόρεια Μακεδονία', code: '+389' },
  { en: 'Norway', el: 'Νορβηγία', code: '+47' },
  { en: 'Poland', el: 'Πολωνία', code: '+48' },
  { en: 'Portugal', el: 'Πορτογαλία', code: '+351' },
  { en: 'Romania', el: 'Ρουμανία', code: '+40' },
  { en: 'San Marino', el: 'Άγιος Μαρίνος', code: '+378' },
  { en: 'Serbia', el: 'Σερβία', code: '+381' },
  { en: 'Slovakia', el: 'Σλοβακία', code: '+421' },
  { en: 'Slovenia', el: 'Σλοβενία', code: '+386' },
  { en: 'Spain', el: 'Ισπανία', code: '+34' },
  { en: 'Sweden', el: 'Σουηδία', code: '+46' },
  { en: 'Switzerland', el: 'Ελβετία', code: '+41' },
  { en: 'Turkey', el: 'Τουρκία', code: '+90' },
  { en: 'United Kingdom', el: 'Ηνωμένο Βασίλειο', code: '+44' },
  { en: 'Vatican City', el: 'Βατικανό', code: '+379' },
];

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
  const { lang } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const validationSchema = React.useMemo(() => {
    return Yup.object().shape({
      method: Yup.string().required(),
      partnerType: Yup.string().required(),
      contact: Yup.string()
        .trim()
        .required(t('fillRequired') || 'Fill required fields')
        .test('method-validation', function (value) {
          const { method } = this.parent;
          if (!value) return true;
          if (method === 'email') {
            const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!EMAIL_PATTERN.test(value)) {
              return this.createError({
                message: t('partnerEmailInvalid') || 'Please enter a valid email address.',
              });
            }
          } else if (method === 'phone') {
            const clean = value.replace(/[\s-()]/g, '');
            if (!/^\d+$/.test(clean)) {
              return this.createError({
                message: t('partnerPhoneInvalidFormat') || 'Phone number must contain only digits.',
              });
            }
            if (clean.length < 9 || clean.length > 15) {
              return this.createError({
                message: t('partnerPhoneInvalidLength') || 'Phone number must be between 9 and 15 digits.',
              });
            }
          } else if (method === 'unique_id') {
            const { partnerType } = this.parent;
            if (partnerType === 'supplier') {
              const MVS_PATTERN = /^[mM][vV][sS]\d{6}$/;
              if (!MVS_PATTERN.test(value)) {
                return this.createError({
                  message: t('partnerUniqueIdMvsInvalid') || 'Unique ID must start with MVS followed by 6 digits (e.g. MVS000001).',
                });
              }
            } else if (partnerType === 'freelancer_driver') {
              const MVD_PATTERN = /^[mM][vV][dD]\d{6}$/;
              if (!MVD_PATTERN.test(value)) {
                return this.createError({
                  message: t('partnerUniqueIdMvdInvalid') || 'Unique ID must start with MVD followed by 6 digits (e.g. MVD000001).',
                });
              }
            } else if (partnerType === 'carrier_company') {
              const MVC_PATTERN = /^[mM][vV][cC]\d{6}$/;
              if (!MVC_PATTERN.test(value)) {
                return this.createError({
                  message: t('partnerUniqueIdMvcInvalid') || 'Unique ID must start with MVC followed by 6 digits (e.g. MVC000001).',
                });
              }
            } else {
              const GENERIC_PATTERN = /^[a-zA-Z]{3}\d{6}$/;
              if (!GENERIC_PATTERN.test(value)) {
                return this.createError({
                  message: t('partnerUniqueIdMvcInvalid') || 'Unique ID must start with MVC, MVD, or MVS followed by 6 digits.',
                });
              }
            }
          }
          return true;
        }),
    });
  }, [t]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isInviteOpen && !inviteForm.countryCode) {
      setInviteForm((prev) => ({ ...prev, countryCode: '+30' }));
    }
  }, [isInviteOpen, inviteForm.countryCode, setInviteForm]);

  if (!isInviteOpen) return null;

  const { method, partnerType, contact, countryCode, sent } = inviteForm;

  const setMethod = (m: InviteMethod) => setInviteForm({ ...inviteForm, method: m, contact: '' });
  const setPartnerType = (pt: InvitePartnerType) => setInviteForm({ ...inviteForm, partnerType: pt });

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeInviteModal();
  };

  if (sent) {
    return (
      <div className="modal-backdrop open ptn-inv-success-backdrop" onClick={handleOverlayClick} id="invite-modal">
        <div
          className="modal modal-sm ptn-inv-modal ptn-inv-modal--success"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="ptn-inv-success-close"
            onClick={closeInviteModal}
            aria-label={t('close') || 'Close'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="ptn-invite-success">
            <div className="icon" aria-hidden>✓</div>
            <h3 className="title">{t('invSentTitle')}</h3>
            <p className="desc">{t('invSentDesc')}</p>
          </div>
          <div className="modal-footer ptn-invite-success-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setInviteForm({ ...inviteForm, sent: false, contact: '' })}
            >
              {t('invAnother')}
            </button>
            <button type="button" className="btn btn-primary" onClick={closeInviteModal}>
              {t('done')}
            </button>
          </div>
        </div>
      </div>
    );
  }



  const initialValues = {
    method: method,
    partnerType: partnerType,
    contact: contact,
    countryCode: countryCode,
  };

  const handleSubmit = (values: typeof initialValues) => {
    sendInvite({
      method: values.method,
      partnerType: values.partnerType,
      contact: values.contact,
      countryCode: values.countryCode,
      relationship: null,
      sent: false,
    });
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        submitCount,
      }) => {
        const showError = (field: keyof typeof initialValues) =>
          Boolean((touched[field] || submitCount > 0) && errors[field]);

        return (
          <div className="modal-backdrop open" onClick={handleOverlayClick} id="invite-modal">
            <Form className="modal modal-md ptn-inv-modal" noValidate>
              <div className="modal-header">
                <h2>{t('inviteTitle')}</h2>
                <button type="button" className="modal-close" onClick={closeInviteModal} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                <div className="ptn-mtog">
                  {(['email', 'phone', 'unique_id'] as InviteMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={values.method === m ? 'active' : ''}
                      onClick={() => {
                        setFieldValue('method', m);
                        setFieldValue('contact', '');
                      }}
                    >
                      {m === 'email' ? '📧' : m === 'phone' ? '📱' : '🆔'}{' '}
                      {m === 'unique_id' ? t('mvUniqueId') : t(m) || m}
                    </button>
                  ))}
                </div>

                {values.method === 'phone' ? (
                  <div className={fieldClass(showError('contact'))} style={{ marginBottom: 12 }}>
                    <label className="form-label">
                      {t('phone')} <span className="rq">*</span>
                    </label>
                    <div className="ptn-phone-row" style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: '160px', flexShrink: 0 }}>
                        <div className="ptn-custom-select" ref={dropdownRef}>
                          <button
                            type="button"
                            className="ptn-custom-select-trigger"
                            onClick={() => {
                              setIsDropdownOpen(!isDropdownOpen);
                              setSearchQuery('');
                            }}
                          >
                            <span>
                              {(() => {
                                const selected = COUNTRIES.find((c) => c.code === values.countryCode) || { en: 'Greece', el: 'Ελλάδα', code: '+30' };
                                return `${selected.code} (${lang === 'el' ? selected.el : selected.en})`;
                              })()}
                            </span>
                            <span className="arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                          </button>
                          {isDropdownOpen && (
                            <div className="ptn-custom-select-dropdown">
                              <input
                                type="text"
                                className="ptn-custom-select-search"
                                placeholder=""
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                              />
                              <div className="ptn-custom-select-options">
                                {COUNTRIES.filter((c) => {
                                  const name = lang === 'el' ? c.el : c.en;
                                  const search = searchQuery.toLowerCase();
                                  return (
                                    c.code.toLowerCase().includes(search) ||
                                    name.toLowerCase().includes(search)
                                  );
                                }).map((c) => {
                                  const isSelected = c.code === values.countryCode;
                                  const label = `${c.code} (${lang === 'el' ? c.el : c.en})`;
                                  return (
                                    <div
                                      key={c.code}
                                      className={`ptn-custom-select-option${isSelected ? ' selected' : ''}`}
                                      onClick={() => {
                                        setFieldValue('countryCode', c.code);
                                        setIsDropdownOpen(false);
                                      }}
                                    >
                                      {label}
                                    </div>
                                  );
                                })}
                                {COUNTRIES.filter((c) => {
                                  const name = lang === 'el' ? c.el : c.en;
                                  const search = searchQuery.toLowerCase();
                                  return (
                                    c.code.toLowerCase().includes(search) ||
                                    name.toLowerCase().includes(search)
                                  );
                                }).length === 0 && (
                                  <div className="ptn-custom-select-no-results">No results</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          className="form-input"
                          id="invite-contact-input"
                          name="contact"
                          placeholder="69xxxxxxxx"
                          value={values.contact}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </div>
                    </div>
                    <FormFieldError message={showError('contact') ? errors.contact : undefined} />
                  </div>
                ) : (
                  <div className={fieldClass(showError('contact'))} style={{ marginBottom: 12 }}>
                    <label className="form-label">
                      {values.method === 'email' ? t('email') : t('mvUniqueId')} <span className="rq">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      id="invite-contact-input"
                      name="contact"
                      placeholder={
                        values.method === 'email'
                          ? 'partner@company.com'
                          : 'ABC123456'
                      }
                      value={values.contact}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('contact') ? errors.contact : undefined} />
                  </div>
                )}

                <div className="mf" style={{ marginBottom: 12 }}>
                  <label className="form-label">
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
                        className={`ptn-tag-chip${values.partnerType === value ? ' selected' : ''}`}
                        onClick={() => setFieldValue('partnerType', value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeInviteModal}>
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviteLoading}
                  id="btn-send-invite"
                >
                  {inviteLoading ? '…' : `✉ ${t('sendInvitation')}`}
                </button>
              </div>
            </Form>
          </div>
        );
      }}
    </Formik>
  );
};

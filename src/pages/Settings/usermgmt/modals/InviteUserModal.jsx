/**
 * InviteUserModal — 2-step modal for inviting new team members.
 *
 * Step 1: Identity & Role — name, email, phone, role selection, personal message
 * Step 2: Access Scope — customer access, location restrictions, lane visibility
 *
 * API dependencies:
 * - POST /api/v1/users/invite
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Users, Send } from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme';
import { SHIPPER_ROLES } from '../../../../mocks/userMgmtData';

export default function InviteUserModal({ open, onClose, onInvite }) {
  const { t } = useTranslation();
  const { T } = useTheme();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: '', message: '',
    customerAccess: 'all', locationRestrictions: 'none',
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validateStep1 = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = t('userMgmt.invite.required');
    if (!form.lastName.trim()) errs.lastName = t('userMgmt.invite.required');
    if (!form.email.trim()) errs.email = t('userMgmt.invite.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('userMgmt.invite.invalidEmail');
    if (!form.role) errs.role = t('userMgmt.invite.selectRole');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleSend = () => {
    // @API: POST /api/v1/users/invite
    // @TRIGGER: Click "Send Invitation"
    // @REQUEST: { firstName, lastName, email, phone, role, message, customerAccess, locationRestrictions }
    // @RESPONSE: { user: { id, status: 'invited', ... } }
    // @AUTH: security.users
    // @ERROR: "Email already in use" / "Domain not allowed"
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const newUser = {
      id: `USR-${String(Date.now()).slice(-3)}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      jobTitle: null,
      department: null,
      role: form.role,
      status: 'invited',
      mfa: false,
      isOwner: false,
      customPerms: null,
      lastActive: null,
      created: now,
      lastPasswordChange: null,
      inviteSentAt: now,
      inviteExpiresAt: expires,
      timezone: 'Europe/Athens',
      locale: 'el',
    };
    onInvite(newUser);
    // Reset form
    setStep(1);
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: '', message: '', customerAccess: 'all', locationRestrictions: 'none' });
    setErrors({});
  };

  const handleClose = () => {
    setStep(1);
    setErrors({});
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div>
            <h2 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>
              {t('userMgmt.invite.title')}
            </h2>
            <p style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
              {t(`userMgmt.invite.step${step}Title`)}
            </p>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
              style={{ background: T.ac, color: '#fff' }}>1</span>
            <div className="w-6 h-0.5" style={{ background: step >= 2 ? T.ac : T.bd }} />
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
              style={{ background: step >= 2 ? T.ac : T.bd, color: step >= 2 ? '#fff' : T.t3 }}>2</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('userMgmt.invite.firstName')} required error={errors.firstName}>
                  <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{ border: `1px solid ${errors.firstName ? '#EF4444' : T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
                </Field>
                <Field label={t('userMgmt.invite.lastName')} required error={errors.lastName}>
                  <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{ border: `1px solid ${errors.lastName ? '#EF4444' : T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
                </Field>
              </div>
              <Field label={t('userMgmt.invite.email')} required error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ border: `1px solid ${errors.email ? '#EF4444' : T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
              </Field>
              <Field label={t('userMgmt.invite.phone')}>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  placeholder="+30 6XX XXX XXXX"
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
              </Field>

              {/* Role selection */}
              <div>
                <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                  {t('userMgmt.invite.role')} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                {errors.role && <p style={{ fontSize: 11, color: '#EF4444', marginBottom: 4 }}>{errors.role}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {SHIPPER_ROLES.map(role => {
                    const sel = form.role === role.key;
                    return (
                      <button
                        key={role.key}
                        onClick={() => set('role', role.key)}
                        className="p-3 rounded-xl cursor-pointer border-none text-left transition-all duration-150"
                        style={{
                          background: sel ? `${T.ac}08` : T.sa,
                          border: sel ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: role.color }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{role.name}</span>
                          {sel && <span style={{ fontSize: 11, color: T.ac }}>✓</span>}
                        </div>
                        <p style={{ fontSize: 10, color: T.t3, lineHeight: 1.4 }}>{role.description}</p>
                        <div style={{ fontSize: 10, color: T.t3, marginTop: 4 }}>
                          {role.permissions === null
                            ? t('userMgmt.invite.allPermissions')
                            : t('userMgmt.invite.permCount', { n: role.permissions.length })
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal message */}
              <Field label={t('userMgmt.invite.personalMessage')}>
                <textarea
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder={t('userMgmt.invite.personalMessagePlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg outline-none resize-none"
                  style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Customer access */}
              <div>
                <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                  {t('userMgmt.invite.customerAccess')}
                </label>
                <div className="space-y-2">
                  {['all', 'selected'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer"
                      style={{ background: form.customerAccess === opt ? `${T.ac}08` : T.sa, border: `1px solid ${form.customerAccess === opt ? T.ac : T.bd}` }}>
                      <input type="radio" name="customerAccess" checked={form.customerAccess === opt}
                        onChange={() => set('customerAccess', opt)} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>
                        {t(`userMgmt.invite.customer_${opt}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location restrictions */}
              <div>
                <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                  {t('userMgmt.invite.locationRestrictions')}
                </label>
                <div className="space-y-2">
                  {['none', 'specific'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer"
                      style={{ background: form.locationRestrictions === opt ? `${T.ac}08` : T.sa, border: `1px solid ${form.locationRestrictions === opt ? T.ac : T.bd}` }}>
                      <input type="radio" name="locationRestrictions" checked={form.locationRestrictions === opt}
                        onChange={() => set('locationRestrictions', opt)} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>
                        {t(`userMgmt.invite.location_${opt}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          {step === 1 ? (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
                style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 13 }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold transition-opacity duration-150"
                style={{ background: T.ac, color: '#fff', fontSize: 13 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                {t('userMgmt.invite.continue')}
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
                style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 13 }}>
                <ChevronLeft size={14} />
                {t('userMgmt.invite.back')}
              </button>
              <button onClick={handleSend}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold transition-opacity duration-150"
                style={{ background: T.ac, color: '#fff', fontSize: 13 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                <Send size={14} />
                {t('userMgmt.invite.sendInvitation')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  const { T } = useTheme();
  return (
    <div>
      <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{error}</p>}
    </div>
  );
}

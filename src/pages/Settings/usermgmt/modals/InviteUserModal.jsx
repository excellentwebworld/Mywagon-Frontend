/**
 * InviteUserModal — single-step invite (PDS-937 Phase 2).
 * Identity + Admin/Dispatcher preset only. Access Scope removed.
 * Seeds directPermissions from preset (hybrid / old-platform compatible).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme';
import { SHIPPER_ROLES } from '../../../../mocks/userMgmtData';
import { seedDirectPermissionsForInvite } from '../../../../utils/shipperAccessPresets';

export default function InviteUserModal({ open, onClose, onInvite }) {
  const { t } = useTranslation();
  const { T } = useTheme();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: '', message: '',
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = t('userMgmt.invite.required');
    if (!form.lastName.trim()) errs.lastName = t('userMgmt.invite.required');
    if (!form.email.trim()) errs.email = t('userMgmt.invite.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('userMgmt.invite.invalidEmail');
    if (!form.role) errs.role = t('userMgmt.invite.selectRole');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSend = () => {
    if (!validate()) return;
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
      directPermissions: seedDirectPermissionsForInvite(form.role),
      lastActive: null,
      created: now,
      lastPasswordChange: null,
      inviteSentAt: now,
      inviteExpiresAt: expires,
      timezone: 'Europe/Athens',
      locale: 'el',
    };
    onInvite(newUser);
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: '', message: '' });
    setErrors({});
  };

  const handleClose = () => {
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
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div>
            <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{t('userMgmt.invite.title')}</h3>
            <p style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{t('userMgmt.invite.singleStepHint')}</p>
          </div>
          <button type="button" onClick={handleClose} className="cursor-pointer border-none bg-transparent" style={{ color: T.t3, fontSize: 20 }}>×</button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
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

          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
              {t('userMgmt.invite.role')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            {errors.role && <p style={{ fontSize: 11, color: '#EF4444', marginBottom: 4 }}>{errors.role}</p>}
            <div className="grid grid-cols-2 gap-2">
              {SHIPPER_ROLES.map((role) => {
                const sel = form.role === role.key;
                return (
                  <button
                    type="button"
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

        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button type="button" onClick={handleClose}
            className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 13 }}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleSend}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: T.ac, color: '#fff', fontSize: 13 }}>
            <Send size={14} />
            {t('userMgmt.invite.sendInvitation')}
          </button>
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

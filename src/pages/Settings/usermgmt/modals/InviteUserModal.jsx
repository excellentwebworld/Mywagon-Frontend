/**
 * InviteUserModal — invite via settings/users/invite API.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme';
import { useUserMgmt } from '../../../../context/UserMgmtContext';
import { usersSettingsService } from '../../../../api/services/usersSettingsService';
import { ApiError } from '../../../../api/client';
import { SHIPPER_ROLES } from '../../../../utils/shipperAccessPresets';

export default function InviteUserModal({ open, onClose, onInvite }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { roles, seats, setSeats } = useUserMgmt();

  const roleOptions = roles.length
    ? roles.map((r) => ({
        key: r.key,
        name: r.name,
        color: r.color,
        description: r.description,
        permissions: r.permissions,
        permission_names: r.permission_names,
      }))
    : SHIPPER_ROLES;

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: '', message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleSend = async () => {
    if (!validate()) return;
    if (seats && seats.can_invite === false) {
      setErrors({ email: t('userMgmt.seats.limitReached', { defaultValue: 'Seat limit reached' }) });
      return;
    }
    setSubmitting(true);
    try {
      const created = await usersSettingsService.invite({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
      });
      onInvite(created);
      setForm({ firstName: '', lastName: '', email: '', phone: '', role: '', message: '' });
      setErrors({});
      // Refresh seats via list is handled by parent refresh ideally; bump used locally.
      if (seats) {
        setSeats({
          ...seats,
          used: (seats.used || 0) + 1,
          remaining: Math.max(0, (seats.remaining || 0) - 1),
          can_invite: (seats.remaining || 0) - 1 > 0,
        });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('userMgmt.toast.inviteFailed', { defaultValue: 'Invite failed' });
      if (e instanceof ApiError && e.fieldErrors?.email?.[0]) {
        setErrors({ email: e.fieldErrors.email[0] });
      } else {
        setErrors({ email: msg });
      }
    } finally {
      setSubmitting(false);
    }
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
              {roleOptions.map((role) => {
                const sel = form.role === role.key;
                const permCount = role.permissions === null
                  ? null
                  : (role.permission_names || role.permissions || []).length;
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
                      {permCount === null
                        ? t('userMgmt.invite.allPermissions')
                        : t('userMgmt.invite.permCount', { n: permCount })
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t2, fontSize: 13 }}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: T.ac, color: '#fff', fontSize: 13, opacity: submitting ? 0.7 : 1 }}
          >
            <Send size={14} /> {submitting ? t('common.saving', { defaultValue: 'Sending…' }) : t('userMgmt.invite.sendInvitation')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
}

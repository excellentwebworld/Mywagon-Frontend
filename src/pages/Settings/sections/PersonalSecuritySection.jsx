/**
 * PersonalSecuritySection — password (live) + 2FA coming soon (PDS-937).
 * Sessions / login history stay under Users & Roles → Security.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyRound, ShieldCheck, AlertTriangle,
  Eye, EyeOff,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { SECURITY_POLICIES } from '../../../mocks/userMgmtData';
import { securitySettingsService } from '../../../api/services/securitySettingsService';
import { ApiError } from '../../../api/client';

export default function PersonalSecuritySection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const [showPwModal, setShowPwModal] = useState(false);
  const policy = SECURITY_POLICIES.passwordPolicy;

  return (
    <div className="space-y-4">
      <SCard title={t('settings.securitySection.password.title')} icon={<KeyRound size={16} style={{ color: T.ac }} />} T={T}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <InfoBox
            label={t('settings.securitySection.password.policy')}
            value={`${t('settings.securitySection.password.min')} ${policy.minLength} ${t('settings.securitySection.password.chars')}`}
            T={T}
          />
          <InfoBox
            label={t('settings.securitySection.password.hint', { defaultValue: 'Security' })}
            value={t('settings.securitySection.password.useStrong', { defaultValue: 'Use a strong unique password' })}
            T={T}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowPwModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
          style={{ background: T.ac, color: '#fff', fontSize: 12 }}
        >
          <KeyRound size={13} /> {t('settings.securitySection.password.change')}
        </button>
      </SCard>

      <SCard title={t('settings.securitySection.mfa.title')} icon={<ShieldCheck size={16} style={{ color: T.ac }} />} T={T}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: T.al, border: `1px solid ${T.ac}33` }}>
          <ShieldCheck size={14} style={{ color: T.ac }} />
          <span style={{ fontSize: 12, color: T.t1 }}>
            {t('settings.securitySection.mfa.comingSoon', {
              defaultValue: 'Two-factor authentication (OTP) is coming soon and will be required for all users.',
            })}
          </span>
        </div>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 0 }}>
          {t('settings.securitySection.mfa.recommendation')}
        </p>
        <button
          type="button"
          disabled
          className="mt-3 px-4 py-2 rounded-lg border-none font-semibold"
          style={{ background: T.sa, color: T.t3, fontSize: 12, opacity: 0.7, cursor: 'not-allowed' }}
        >
          <ShieldCheck size={13} className="inline mr-1.5" />
          {t('settings.securitySection.mfa.comingSoonBtn', { defaultValue: 'Coming soon' })}
        </button>
      </SCard>

      {showPwModal && (
        <ChangePasswordModal
          onClose={() => setShowPwModal(false)}
          T={T}
          t={t}
          toast={toast}
          policy={policy}
        />
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose, T, t, toast, policy }) {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const checks = [
    { label: t('settings.securitySection.password.ruleLength', { n: policy.minLength }), ok: newPw.length >= policy.minLength },
    { label: t('settings.securitySection.password.ruleUpper'), ok: /[A-Z]/.test(newPw) },
    { label: t('settings.securitySection.password.ruleNumber'), ok: /[0-9]/.test(newPw) },
  ];
  if (policy.requireSpecial) {
    checks.push({ label: t('settings.securitySection.password.ruleSpecial'), ok: /[^A-Za-z0-9]/.test(newPw) });
  }

  const canSave = current && newPw && confirm && newPw === confirm && checks.every((c) => c.ok);

  const handleSave = async () => {
    if (!canSave || saving) return;
    if (newPw !== confirm) {
      setError(t('settings.securitySection.password.noMatch'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await securitySettingsService.changePassword({
        current_password: current,
        password: newPw,
        password_confirmation: confirm,
      });
      toast.success(t('settings.settingsToast.passwordChanged'));
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError
        ? (e.fieldErrors?.current_password?.[0] || e.fieldErrors?.password?.[0] || e.message)
        : t('settings.securitySection.password.saveFailed', { defaultValue: 'Could not update password' });
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{t('settings.securitySection.password.changeTitle')}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer border-none bg-transparent" style={{ color: T.t3, fontSize: 20 }}>×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.securitySection.password.currentPw')}</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.securitySection.password.newPw')}</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg outline-none"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
              <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent" style={{ color: T.t3 }}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {checks.map((c) => (
                <li key={c.label} style={{ fontSize: 11, color: c.ok ? '#10B981' : T.t3 }}>{c.ok ? '✓' : '○'} {c.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.securitySection.password.confirmPw')}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
            {confirm && newPw !== confirm && (
              <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{t('settings.securitySection.password.noMatch')}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t2, fontSize: 13 }}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: canSave ? T.ac : T.sa, color: canSave ? '#fff' : T.t3, fontSize: 13, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? t('common.saving', { defaultValue: 'Saving…' }) : t('settings.securitySection.password.change')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SCard({ title, icon, children, T }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        {icon}
        <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function InfoBox({ label, value, T, warn }) {
  return (
    <div className="px-3 py-2.5 rounded-lg" style={{ background: T.sa, border: `1px solid ${warn ? '#FDE68A' : T.bd}` }}>
      <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 13, color: warn ? '#D97706' : T.t1, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}

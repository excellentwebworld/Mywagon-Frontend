/**
 * PersonalSecuritySection — User-level security settings (2 cards).
 *
 * Card 1: Password — last changed, strength, change modal
 * Card 2: Two-Factor Authentication — status, enable/disable
 *
 * Sessions / login history removed per PDS-937 (login history lives under Users & Roles → Security).
 * API: POST /api/v1/security/change-password, GET/POST /api/v1/security/mfa/* (Phase 5)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyRound, ShieldCheck, AlertTriangle,
  Eye, EyeOff, Copy, X,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import {
  CURRENT_USER, RECOVERY_CODES, passwordAgeDays,
} from '../../../mocks/settingsData';
import { SECURITY_POLICIES } from '../../../mocks/userMgmtData';

export default function PersonalSecuritySection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [user, setUser] = useState({ ...CURRENT_USER });
  const [showPwModal, setShowPwModal] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  const pwAge = passwordAgeDays(user.lastPasswordChange);
  const policy = SECURITY_POLICIES.passwordPolicy;

  return (
    <div className="space-y-4">

      {/* ═══ Card 1: Password ═══ */}
      <SCard title={t('settings.securitySection.password.title')} icon={<KeyRound size={16} style={{ color: T.ac }} />} T={T}>
        {pwAge > 90 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: 12, color: '#92400E' }}>
              {t('settings.securitySection.password.oldWarning', { days: pwAge })}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <InfoBox label={t('settings.securitySection.password.lastChanged')} value={`${pwAge} ${t('settings.securitySection.password.daysAgo')}`} warn={pwAge > 90} T={T} />
          <InfoBox label={t('settings.securitySection.password.strength')} value={t('settings.securitySection.password.strong')} T={T} />
          <InfoBox label={t('settings.securitySection.password.policy')} value={`${t('settings.securitySection.password.min')} ${policy.minLength} ${t('settings.securitySection.password.chars')}`} T={T} />
        </div>
        <button onClick={() => setShowPwModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
          <KeyRound size={13} /> {t('settings.securitySection.password.change')}
        </button>
      </SCard>

      {/* ═══ Card 2: Two-Factor Authentication ═══ */}
      <SCard title={t('settings.securitySection.mfa.title')} icon={<ShieldCheck size={16} style={{ color: T.ac }} />} T={T}>
        {user.mfaEnabled ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <InfoBox label={t('settings.securitySection.mfa.status')} value={`🛡️ ${t('settings.securitySection.mfa.enabled')}`} T={T} />
              <InfoBox label={t('settings.securitySection.mfa.method')} value={t('settings.securitySection.mfa.authenticator')} T={T} />
              <InfoBox label={t('settings.securitySection.mfa.since')} value={new Date(user.mfaEnabledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} T={T} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setUser(p => ({ ...p, mfaEnabled: false })); toast.success(t('settings.securitySection.mfa.disabled_toast')); }}
                className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 12, fontWeight: 500 }}>
                {t('settings.securitySection.mfa.disable')}
              </button>
              <button onClick={() => setShowCodes(true)} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12, fontWeight: 500 }}>
                {t('settings.securitySection.mfa.viewCodes')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 12, color: '#92400E' }}>{t('settings.securitySection.mfa.notEnabled')}</span>
            </div>
            <p style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{t('settings.securitySection.mfa.recommendation')}</p>
            <button onClick={() => { setUser(p => ({ ...p, mfaEnabled: true, mfaEnabledDate: new Date().toISOString() })); toast.success(t('settings.securitySection.mfa.enabled_toast')); }}
              className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
              <ShieldCheck size={13} className="inline mr-1.5" />{t('settings.securitySection.mfa.enable')}
            </button>
          </>
        )}

        {/* Recovery codes panel */}
        {showCodes && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold" style={{ fontSize: 13, color: T.t1 }}>{t('settings.securitySection.mfa.recoveryCodes')}</h4>
              <button onClick={() => setShowCodes(false)} className="cursor-pointer border-none bg-transparent"><X size={14} style={{ color: T.t3 }} /></button>
            </div>
            <p style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>{t('settings.securitySection.mfa.codesDesc')}</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {RECOVERY_CODES.map((code, i) => (
                <div key={i} className="px-2.5 py-1.5 rounded" style={{ background: T.sf, fontFamily: 'monospace', fontSize: 12, color: T.t1, border: `1px solid ${T.bd}` }}>
                  {code}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(RECOVERY_CODES.join('\n')); toast.success(t('settings.securitySection.mfa.codesCopied')); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}>
                <Copy size={11} /> {t('settings.securitySection.mfa.copyAll')}
              </button>
            </div>
          </div>
        )}
      </SCard>

      {/* ═══ Change Password Modal ═══ */}
      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} T={T} t={t} toast={toast} policy={policy} />}
    </div>
  );
}

/* ── Change Password Modal ── */
function ChangePasswordModal({ onClose, T, t, toast, policy }) {
  const { T: theme } = useTheme();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);

  const checks = [
    { label: t('settings.securitySection.password.ruleLength', { n: policy.minLength }), ok: newPw.length >= policy.minLength },
    { label: t('settings.securitySection.password.ruleUpper'), ok: /[A-Z]/.test(newPw) },
    { label: t('settings.securitySection.password.ruleNumber'), ok: /[0-9]/.test(newPw) },
  ];
  if (policy.requireSpecial) checks.push({ label: t('settings.securitySection.password.ruleSpecial'), ok: /[^A-Za-z0-9]/.test(newPw) });

  const allValid = checks.every(c => c.ok) && newPw === confirm && current.length > 0;

  const handleSave = () => {
    toast.success(t('settings.settingsToast.passwordChanged'));
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{ background: theme.sf, border: `1px solid ${theme.bd}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.bd}` }}>
          <h3 className="font-bold" style={{ fontSize: 16, color: theme.t1 }}>{t('settings.securitySection.password.changeTitle')}</h3>
          <button onClick={onClose} className="cursor-pointer border-none bg-transparent"><X size={16} style={{ color: theme.t3 }} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: theme.t2 }}>{t('settings.securitySection.password.currentPw')}</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${theme.bd}`, background: theme.sf, color: theme.t1, fontSize: 13 }} />
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: theme.t2 }}>{t('settings.securitySection.password.newPw')}</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg outline-none" style={{ border: `1px solid ${theme.bd}`, background: theme.sf, color: theme.t1, fontSize: 13 }} />
              <button onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent">
                {showNew ? <EyeOff size={14} style={{ color: theme.t3 }} /> : <Eye size={14} style={{ color: theme.t3 }} />}
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {checks.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5" style={{ fontSize: 11, color: c.ok ? '#10B981' : theme.t3 }}>
                  {c.ok ? '✅' : '⛔'} {c.label}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: theme.t2 }}>{t('settings.securitySection.password.confirmPw')}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${newPw && confirm && newPw !== confirm ? '#EF4444' : theme.bd}`, background: theme.sf, color: theme.t1, fontSize: 13 }} />
            {newPw && confirm && newPw !== confirm && (
              <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{t('settings.securitySection.password.noMatch')}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${theme.bd}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: theme.sa, border: `1px solid ${theme.bd}`, color: theme.t2, fontSize: 13 }}>
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} disabled={!allValid} className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: allValid ? theme.ac : theme.bd, color: '#fff', fontSize: 13, opacity: allValid ? 1 : 0.5 }}>
            {t('settings.securitySection.password.change')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared card ── */
function SCard({ title, icon, action, children, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: theme.sf, border: `1px solid ${theme.bd}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${theme.bd}` }}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold" style={{ fontSize: 14, color: theme.t1 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function InfoBox({ label, value, warn, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: theme.sa }}>
      <div style={{ fontSize: 10, color: theme.t3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: warn ? '#F59E0B' : theme.t1 }}>{value}</div>
    </div>
  );
}

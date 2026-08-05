/**
 * DisableTwoFactorModal / ConfirmTwoFactorModal — password + code for disable or view recovery codes.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { securitySettingsService } from '../../../api/services/securitySettingsService';
import { ApiError } from '../../../api/client';

export default function ConfirmTwoFactorModal({
  T,
  t,
  toast,
  mode, // 'disable' | 'view-codes' | 'regenerate'
  method,
  onClose,
  onSuccess,
}) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (method === 'email') {
      void securitySettingsService.resendTwoFactorEmail().catch(() => {});
      setResendSeconds(60);
    }
  }, [method]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendSeconds]);

  const titles = {
    disable: t('settings.securitySection.mfa.disable'),
    'view-codes': t('settings.securitySection.mfa.viewCodes'),
    regenerate: t('settings.securitySection.mfa.regenerateCodes', { defaultValue: 'Regenerate recovery codes' }),
  };

  const submit = async () => {
    if (!password || !code.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'disable') {
        await securitySettingsService.disableTwoFactor(password, code.trim());
        toast.success(t('settings.securitySection.mfa.disabled_toast'));
        onSuccess?.();
        onClose();
      } else if (mode === 'regenerate') {
        const codes = await securitySettingsService.regenerateRecoveryCodes(password, code.trim());
        onSuccess?.(codes);
        onClose();
      } else {
        const codes = await securitySettingsService.getRecoveryCodes(password, code.trim());
        onSuccess?.(codes);
        onClose();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('settings.securitySection.mfa.confirmFailed', { defaultValue: 'Could not verify' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{titles[mode]}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer border-none bg-transparent" style={{ color: T.t3, fontSize: 20 }}>×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && (
            <div className="px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12 }}>{error}</div>
          )}
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.securitySection.password.currentPw')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
            />
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              {method === 'email'
                ? t('settings.securitySection.mfa.emailCode', { defaultValue: 'Email verification code' })
                : t('settings.securitySection.mfa.verificationCode', { defaultValue: 'Verification code' })}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
              placeholder={method === 'email' || method === 'authenticator' ? '000000' : ''}
            />
            {method === 'email' && (
              <button
                type="button"
                disabled={resendSeconds > 0 || busy}
                onClick={() => {
                  void securitySettingsService.resendTwoFactorEmail()
                    .then(() => {
                      setResendSeconds(60);
                      toast.success(t('settings.securitySection.mfa.codeSent', { defaultValue: 'Verification code sent' }));
                    })
                    .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed'));
                }}
                className="mt-2 cursor-pointer border-none bg-transparent"
                style={{ fontSize: 12, color: T.ac, opacity: resendSeconds > 0 ? 0.6 : 1 }}
              >
                {resendSeconds > 0
                  ? t('settings.securitySection.mfa.resendIn', { n: resendSeconds, defaultValue: `Resend in ${resendSeconds}s` })
                  : t('settings.securitySection.mfa.resendCode', { defaultValue: 'Resend code' })}
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t2, fontSize: 13 }}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!password || !code.trim() || busy}
            onClick={() => void submit()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: mode === 'disable' ? '#EF4444' : T.ac, color: '#fff', fontSize: 13, opacity: busy ? 0.7 : 1 }}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === 'disable' ? t('settings.securitySection.mfa.disable') : t('common.confirm', { defaultValue: 'Confirm' })}
          </button>
        </div>
      </div>
    </div>
  );
}

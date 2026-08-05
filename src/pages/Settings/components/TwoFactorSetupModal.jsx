/**
 * TwoFactorSetupModal — choose method, scan QR / receive email OTP, verify & show recovery codes.
 */

import { useEffect, useState } from 'react';
import { ShieldCheck, Mail, Smartphone, Copy, Download, Loader2 } from 'lucide-react';
import { securitySettingsService } from '../../../api/services/securitySettingsService';
import { ApiError } from '../../../api/client';

function downloadRecoveryCodes(codes) {
  const blob = new Blob([codes.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `myvagon-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function TwoFactorSetupModal({ T, t, toast, onClose, onEnabled }) {
  const [step, setStep] = useState('choose'); // choose | verify | codes
  const [method, setMethod] = useState(null);
  const [qrSvg, setQrSvg] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendSeconds]);

  const startSetup = async (nextMethod) => {
    setBusy(true);
    setError('');
    try {
      const res = await securitySettingsService.setupTwoFactor(nextMethod);
      setMethod(nextMethod);
      if (nextMethod === 'authenticator') {
        setQrSvg(res.qr_code_svg || '');
      } else {
        setMaskedEmail(res.masked_email || '');
        setResendSeconds(60);
      }
      setStep('verify');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('settings.securitySection.mfa.setupFailed', { defaultValue: 'Could not start 2FA setup' }));
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    if (!method || !code.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await securitySettingsService.enableTwoFactor(method, code.trim());
      setRecoveryCodes(res.recovery_codes || []);
      setStep('codes');
      toast.success(t('settings.securitySection.mfa.enabled_toast'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('settings.securitySection.mfa.invalidCode', { defaultValue: 'Invalid verification code' }));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendSeconds > 0 || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await securitySettingsService.resendTwoFactorEmail();
      if (res.masked_email) setMaskedEmail(res.masked_email);
      setResendSeconds(60);
      toast.success(t('settings.securitySection.mfa.codeSent', { defaultValue: 'Verification code sent' }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('settings.securitySection.mfa.resendFailed', { defaultValue: 'Could not resend code' }));
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    onEnabled?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/40" onClick={step === 'codes' ? finish : onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>
            {step === 'codes'
              ? t('settings.securitySection.mfa.recoveryCodes')
              : t('settings.securitySection.mfa.enable')}
          </h3>
          <button type="button" onClick={step === 'codes' ? finish : onClose} className="cursor-pointer border-none bg-transparent" style={{ color: T.t3, fontSize: 20 }}>×</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {error && (
            <div className="px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12 }}>{error}</div>
          )}

          {step === 'choose' && (
            <>
              <p style={{ fontSize: 13, color: T.t2 }}>
                {t('settings.securitySection.mfa.setupChooseMethod', { defaultValue: 'Choose how you want to receive verification codes.' })}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startSetup('authenticator')}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl cursor-pointer text-left"
                style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t1 }}
              >
                <Smartphone size={18} style={{ color: T.ac }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t('settings.securitySection.mfa.methodAuthenticator', { defaultValue: 'Authenticator app' })}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{t('settings.securitySection.mfa.methodAuthenticatorDesc', { defaultValue: 'Microsoft / Google Authenticator' })}</div>
                </div>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startSetup('email')}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl cursor-pointer text-left"
                style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t1 }}
              >
                <Mail size={18} style={{ color: T.ac }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t('settings.securitySection.mfa.methodEmail', { defaultValue: 'Email OTP' })}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{t('settings.securitySection.mfa.methodEmailDesc', { defaultValue: 'Codes sent to your account email' })}</div>
                </div>
              </button>
              {busy && <div className="flex justify-center py-2"><Loader2 size={18} className="animate-spin" style={{ color: T.ac }} /></div>}
            </>
          )}

          {step === 'verify' && (
            <>
              {method === 'authenticator' && qrSvg && (
                <div className="flex flex-col items-center gap-2">
                  <p style={{ fontSize: 12, color: T.t3, textAlign: 'center' }}>
                    {t('settings.securitySection.mfa.scanQr', { defaultValue: 'Scan this QR code with your authenticator app, then enter the 6-digit code.' })}
                  </p>
                  <img
                    src={`data:image/svg+xml;base64,${qrSvg}`}
                    alt="2FA QR"
                    width={180}
                    height={180}
                    style={{ background: '#fff', borderRadius: 12, padding: 8 }}
                  />
                </div>
              )}
              {method === 'email' && (
                <p style={{ fontSize: 12, color: T.t3 }}>
                  {t('settings.securitySection.mfa.enterEmailCode', {
                    email: maskedEmail,
                    defaultValue: `Enter the code sent to ${maskedEmail}`,
                  })}
                </p>
              )}
              <div>
                <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
                  {t('settings.securitySection.mfa.verificationCode', { defaultValue: 'Verification code' })}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
                  placeholder="000000"
                  autoFocus
                />
              </div>
              {method === 'email' && (
                <button
                  type="button"
                  disabled={resendSeconds > 0 || busy}
                  onClick={() => void resend()}
                  className="cursor-pointer border-none bg-transparent"
                  style={{ fontSize: 12, color: T.ac, opacity: resendSeconds > 0 ? 0.6 : 1 }}
                >
                  {resendSeconds > 0
                    ? t('settings.securitySection.mfa.resendIn', { n: resendSeconds, defaultValue: `Resend in ${resendSeconds}s` })
                    : t('settings.securitySection.mfa.resendCode', { defaultValue: 'Resend code' })}
                </button>
              )}
            </>
          )}

          {step === 'codes' && (
            <>
              <p style={{ fontSize: 12, color: T.t3 }}>{t('settings.securitySection.mfa.codesDesc')}</p>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {recoveryCodes.map((c) => (
                  <div key={c} className="px-2.5 py-1.5 rounded" style={{ background: T.sa, fontFamily: 'monospace', fontSize: 12, color: T.t1, border: `1px solid ${T.bd}` }}>
                    {c}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(recoveryCodes.join('\n'));
                    toast.success(t('settings.securitySection.mfa.codesCopied'));
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                  style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}
                >
                  <Copy size={11} /> {t('settings.securitySection.mfa.copyAll')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadRecoveryCodes(recoveryCodes);
                    toast.success(t('settings.securitySection.mfa.codesDownloaded', { defaultValue: 'Recovery codes downloaded' }));
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                  style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}
                >
                  <Download size={11} /> {t('settings.securitySection.mfa.download', { defaultValue: 'Download' })}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          {step !== 'codes' && (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t2, fontSize: 13 }}>
              {t('common.cancel')}
            </button>
          )}
          {step === 'verify' && (
            <button
              type="button"
              disabled={!code.trim() || busy}
              onClick={() => void enable()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
              style={{ background: T.ac, color: '#fff', fontSize: 13, opacity: busy || !code.trim() ? 0.7 : 1 }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {t('settings.securitySection.mfa.enable')}
            </button>
          )}
          {step === 'codes' && (
            <button type="button" onClick={finish} className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 13 }}>
              {t('common.done', { defaultValue: 'Done' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

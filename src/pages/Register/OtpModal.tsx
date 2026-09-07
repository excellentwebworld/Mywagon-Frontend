import React, { useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  verifyLabel: string;
  cancelLabel: string;
  otpLabel: string;
};

export const OtpModal: React.FC<Props> = ({
  open,
  title,
  subtitle,
  onClose,
  onVerify,
  verifyLabel,
  cancelLabel,
  otpLabel,
}) => {
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleVerify = async () => {
    setError(null);
    if (!/^\d{4,6}$/.test(otp.trim())) {
      setError('Invalid OTP');
      return;
    }
    setBusy(true);
    try {
      await onVerify(otp.trim());
      setOtp('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="reg-modal-backdrop" role="dialog" aria-modal="true">
      <div className="reg-modal">
        <h3 className="reg-modal-title">{title}</h3>
        {subtitle ? <p className="reg-modal-sub">{subtitle}</p> : null}
        <label className="reg-label" htmlFor="reg-otp-input">
          {otpLabel}
        </label>
        <input
          id="reg-otp-input"
          className="reg-input"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoFocus
        />
        {error ? <p className="reg-error">{error}</p> : null}
        <div className="reg-modal-actions">
          <button type="button" className="reg-btn-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="reg-btn-primary" onClick={() => void handleVerify()} disabled={busy}>
            {busy ? '…' : verifyLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

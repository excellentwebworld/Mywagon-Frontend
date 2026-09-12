import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import './SocialAuthButtons.css';

type SocialProvider = 'google' | 'microsoft';

type SocialAuthButtonsProps = {
  disabled?: boolean;
  /** Shown above buttons, e.g. on register */
  compact?: boolean;
};

function socialRedirectUrl(provider: SocialProvider): string {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
    || '/api/shipper/v1';
  const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/$/, '');
  const path = `${apiBase}/auth/social/${provider}/redirect`;
  const qs = new URLSearchParams({ return_url: returnUrl });
  // Absolute when API is on another origin; relative when Vite proxies /api
  if (path.startsWith('http')) {
    return `${path}?${qs.toString()}`;
  }
  return `${path}?${qs.toString()}`;
}

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.3 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.3 29.3 3 24 3 16.1 3 9.2 7.5 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.2 26.7 37 24 37c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.1 40.4 16 45 24 45z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 45 31 45 24c0-1.4-.1-2.4-.4-3.5z" />
  </svg>
);

const MicrosoftIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ disabled, compact }) => {
  const { t } = useTranslation();

  const start = (provider: SocialProvider) => {
    if (disabled) return;
    window.location.assign(socialRedirectUrl(provider));
  };

  return (
    <div className={`social-auth${compact ? ' social-auth--compact' : ''}`}>
      {!compact && (
        <div className="social-auth-divider" role="separator">
          <span>{t('socialAuth.orContinueWith', { defaultValue: 'Or continue with' })}</span>
        </div>
      )}
      <div className="social-auth-buttons">
        <button
          type="button"
          className="social-auth-btn"
          disabled={disabled}
          onClick={() => start('google')}
        >
          <GoogleIcon />
          <span>{t('socialAuth.google', { defaultValue: 'Google' })}</span>
        </button>
        <button
          type="button"
          className="social-auth-btn"
          disabled={disabled}
          onClick={() => start('microsoft')}
        >
          <MicrosoftIcon />
          <span>{t('socialAuth.microsoft', { defaultValue: 'Microsoft 365' })}</span>
        </button>
      </div>
    </div>
  );
};

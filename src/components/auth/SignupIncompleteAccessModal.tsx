import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { SocialProfileStep } from '../../hooks/useSignupCompleteGate';

export type SignupIncompleteModalVariant = 'welcome' | 'gate';

type Props = {
  open: boolean;
  onOk: () => void;
  /** Kept for gate host compatibility */
  step?: SocialProfileStep;
  /**
   * welcome — first social login (“Welcome to MYVAGON”)
   * gate — feature soft-gate (“Almost there!”)
   */
  variant?: SignupIncompleteModalVariant;
};

/** Clipboard / profile / check illustration — matches KYC complete-profile design. */
function ProfileKycIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M22 38l2.2 5.2L29.5 45.5l-5.3 2.3L22 53l-2.2-5.2L14.5 45.5l5.3-2.3L22 38z" fill="#C4B5FD" opacity="0.9" />
      <path d="M98 28l1.6 3.8L103.5 33.5l-3.9 1.7L98 39l-1.6-3.8L92.5 33.5l3.9-1.7L98 28z" fill="#C4B5FD" opacity="0.85" />
      <path d="M102 72l1.4 3.2L106.5 76.5l-3.1 1.4L102 81l-1.4-3.1L97.5 76.5l3.1-1.3L102 72z" fill="#DDD6FE" />
      <path d="M18 78l1.2 2.8L22 82l-2.8 1.2L18 86l-1.2-2.8L14 82l2.8-1.2L18 78z" fill="#DDD6FE" />

      <rect x="34" y="28" width="52" height="68" rx="10" fill="#EDE9FE" />
      <rect x="38" y="32" width="44" height="60" rx="8" fill="#F5F3FF" stroke="#C4B5FD" strokeWidth="1.5" />

      <rect x="48" y="22" width="24" height="12" rx="4" fill="#A78BFA" />
      <rect x="52" y="25" width="16" height="6" rx="2" fill="#DDD6FE" />

      <circle cx="60" cy="52" r="12" fill="#9B51E0" />
      <circle cx="60" cy="48" r="4.5" fill="#F5F3FF" />
      <path d="M48.5 62.5c2.2-5 6-7.5 11.5-7.5s9.3 2.5 11.5 7.5" fill="#F5F3FF" />

      <rect x="46" y="70" width="28" height="3.5" rx="1.75" fill="#C4B5FD" />
      <rect x="46" y="78" width="22" height="3.5" rx="1.75" fill="#DDD6FE" />
      <rect x="46" y="86" width="18" height="3.5" rx="1.75" fill="#EDE9FE" />

      <circle cx="78" cy="88" r="12" fill="#22C55E" />
      <path
        d="M72.5 88.2l3.2 3.2 7.2-7.5"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Soft-gate / first-login modal for incomplete social prospects.
 * Complete Now / Get Started → related settings page.
 */
export const SignupIncompleteAccessModal: React.FC<Props> = ({
  open,
  onOk,
  variant = 'gate',
}) => {
  const { t } = useTranslation();
  const { T } = useTheme();

  if (!open || typeof document === 'undefined') return null;

  const isWelcome = variant === 'welcome';
  const title = isWelcome
    ? t('signupComplete.welcomeTitle', { defaultValue: 'Welcome to MYVAGON' })
    : t('signupComplete.almostThereTitle', { defaultValue: 'Almost there!' });
  const body = isWelcome
    ? t('signupComplete.welcomeBody', {
        defaultValue:
          'Please complete the required information to activate your account — including your phone number, company details, and KYC verification. This keeps shipping secure and compliant.',
      })
    : t('signupComplete.almostThereBody', {
        defaultValue:
          'Complete your profile and KYC verification to continue using MYVAGON.',
      });
  const cta = isWelcome
    ? t('signupComplete.getStartedCta', { defaultValue: 'Get Started' })
    : t('signupComplete.completeNowCta', { defaultValue: 'Complete Now' });

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 10050 }}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <div
        className="relative w-full max-w-[360px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', border: `1px solid ${T.bd}` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-incomplete-title"
      >
        <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center">
          <div className="mb-5">
            <ProfileKycIllustration />
          </div>

          <h2
            id="signup-incomplete-title"
            className="font-bold"
            style={{ fontSize: 22, color: '#111827', margin: '0 0 10px', letterSpacing: '-0.02em' }}
          >
            {title}
          </h2>

          <p
            style={{
              fontSize: 14,
              color: '#6B7280',
              lineHeight: 1.55,
              margin: '0 0 28px',
              maxWidth: 280,
            }}
          >
            {body}
          </p>

          <button
            type="button"
            onClick={onOk}
            className="w-full px-5 py-3 rounded-xl cursor-pointer border-none font-semibold"
            style={{
              background: T.ac || '#9B51E0',
              color: '#fff',
              fontSize: 15,
            }}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

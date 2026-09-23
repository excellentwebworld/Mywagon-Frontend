import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { SocialProfileStep } from '../../hooks/useSignupCompleteGate';

type Props = {
  open: boolean;
  onOk: () => void;
  /** Kept for gate host; copy matches KYC complete-profile design for all steps */
  step?: SocialProfileStep;
};

/** Clipboard / profile / check illustration — matches KYC “Almost there” modal. */
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
      {/* sparkles */}
      <path d="M22 38l2.2 5.2L29.5 45.5l-5.3 2.3L22 53l-2.2-5.2L14.5 45.5l5.3-2.3L22 38z" fill="#C4B5FD" opacity="0.9" />
      <path d="M98 28l1.6 3.8L103.5 33.5l-3.9 1.7L98 39l-1.6-3.8L92.5 33.5l3.9-1.7L98 28z" fill="#C4B5FD" opacity="0.85" />
      <path d="M102 72l1.4 3.2L106.5 76.5l-3.1 1.4L102 81l-1.4-3.1L97.5 76.5l3.1-1.3L102 72z" fill="#DDD6FE" />
      <path d="M18 78l1.2 2.8L22 82l-2.8 1.2L18 86l-1.2-2.8L14 82l2.8-1.2L18 78z" fill="#DDD6FE" />

      {/* clipboard body */}
      <rect x="34" y="28" width="52" height="68" rx="10" fill="#EDE9FE" />
      <rect x="38" y="32" width="44" height="60" rx="8" fill="#F5F3FF" stroke="#C4B5FD" strokeWidth="1.5" />

      {/* clip */}
      <rect x="48" y="22" width="24" height="12" rx="4" fill="#A78BFA" />
      <rect x="52" y="25" width="16" height="6" rx="2" fill="#DDD6FE" />

      {/* profile circle */}
      <circle cx="60" cy="52" r="12" fill="#8B5CF6" />
      <circle cx="60" cy="48" r="4.5" fill="#F5F3FF" />
      <path d="M48.5 62.5c2.2-5 6-7.5 11.5-7.5s9.3 2.5 11.5 7.5" fill="#F5F3FF" />

      {/* text lines */}
      <rect x="46" y="70" width="28" height="3.5" rx="1.75" fill="#C4B5FD" />
      <rect x="46" y="78" width="22" height="3.5" rx="1.75" fill="#DDD6FE" />
      <rect x="46" y="86" width="18" height="3.5" rx="1.75" fill="#EDE9FE" />

      {/* green check badge */}
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
 * Soft-gate modal — same visual/copy as KYC “Almost there!” design.
 * Complete Now → related settings page.
 */
export const SignupIncompleteAccessModal: React.FC<Props> = ({
  open,
  onOk,
}) => {
  const { t } = useTranslation();
  const { T } = useTheme();

  if (!open || typeof document === 'undefined') return null;

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
            {t('signupComplete.almostThereTitle', { defaultValue: 'Almost there!' })}
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
            {t('signupComplete.almostThereBody', {
              defaultValue:
                'Complete your profile and KYC verification to continue using MYVAGON.',
            })}
          </p>

          <button
            type="button"
            onClick={onOk}
            className="w-full px-5 py-3 rounded-xl cursor-pointer border-none font-semibold"
            style={{
              background: T.ac || '#7C3AED',
              color: '#fff',
              fontSize: 15,
            }}
          >
            {t('signupComplete.completeNowCta', { defaultValue: 'Complete Now' })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

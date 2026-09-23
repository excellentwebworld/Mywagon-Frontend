import React from 'react';
import Modal from '../ui/Modal';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { SocialProfileStep } from '../../hooks/useSignupCompleteGate';

type Props = {
  open: boolean;
  onOk: () => void;
  /** Which step they must complete next */
  step?: SocialProfileStep;
};

/**
 * Soft-gate modal when a social prospect uses a feature before finishing
 * required profile steps. OK sends them to the related settings page.
 */
export const SignupIncompleteAccessModal: React.FC<Props> = ({
  open,
  onOk,
  step = 'generic',
}) => {
  const { t } = useTranslation();
  const { T } = useTheme();

  const bodyByStep: Record<SocialProfileStep, string> = {
    phone: t('signupComplete.accessDeniedBodyPhone', {
      defaultValue:
        'To start using MYVAGON, please add your phone number. We need it to verify your account and contact you about your shipments.',
    }),
    company: t('signupComplete.accessDeniedBodyCompany', {
      defaultValue:
        'To start using MYVAGON, please add your company name and business address. This information is required for shipping and invoicing.',
    }),
    kyc: t('signupComplete.accessDeniedBodyKyc', {
      defaultValue:
        'To start using MYVAGON, please submit your VAT number and government certificate so we can verify your business.',
    }),
    generic: t('signupComplete.accessDeniedBody', {
      defaultValue:
        'To start using MYVAGON, please complete the required profile information for your account.',
    }),
  };

  return (
    <Modal
      open={open}
      onClose={onOk}
      title={t('signupComplete.accessDeniedTitle', {
        defaultValue: 'Complete your profile to continue',
      })}
      size="sm"
    >
      <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.5, margin: '0 0 1.5rem' }}>
        {bodyByStep[step] || bodyByStep.generic}
      </p>
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={onOk}
          className="px-5 py-2.5 rounded-lg cursor-pointer border-none font-medium"
          style={{
            background: T.ac,
            color: '#fff',
            fontSize: 13,
            minWidth: 140,
          }}
        >
          {t('signupComplete.accessDeniedCta', {
            defaultValue: 'Continue',
          })}
        </button>
      </div>
    </Modal>
  );
};

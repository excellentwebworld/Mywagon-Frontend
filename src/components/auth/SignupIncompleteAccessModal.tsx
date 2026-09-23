import React from 'react';
import Modal from '../ui/Modal';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  open: boolean;
  onOk: () => void;
  /** Which step they must complete next */
  step?: 'phone' | 'company' | 'kyc' | 'generic';
};

/**
 * Shown when a social prospect opens a page before finishing required profile steps.
 * OK sends them to the related settings page.
 */
export const SignupIncompleteAccessModal: React.FC<Props> = ({
  open,
  onOk,
  step = 'generic',
}) => {
  const { t } = useTranslation();
  const { T } = useTheme();

  const bodyByStep: Record<string, string> = {
    phone: t('signupComplete.accessDeniedBodyPhone', {
      defaultValue:
        'Your profile is incomplete. Please add your phone number to continue.',
    }),
    company: t('signupComplete.accessDeniedBodyCompany', {
      defaultValue:
        'Your profile is incomplete. Please add your company name and address to continue.',
    }),
    kyc: t('signupComplete.accessDeniedBodyKyc', {
      defaultValue:
        'Your profile is incomplete. Please upload your KYC documents to continue.',
    }),
    generic: t('signupComplete.accessDeniedBody', {
      defaultValue:
        'Your profile is incomplete. Please complete the required details to continue.',
    }),
  };

  return (
    <Modal
      open={open}
      onClose={onOk}
      title={t('signupComplete.accessDeniedTitle', {
        defaultValue: 'Your profile is incomplete',
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
            defaultValue: 'OK',
          })}
        </button>
      </div>
    </Modal>
  );
};

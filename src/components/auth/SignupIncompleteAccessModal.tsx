import React from 'react';
import Modal from '../ui/Modal';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Shown when a social prospect tries to open another app page before
 * completing required company / profile details.
 */
export const SignupIncompleteAccessModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { T } = useTheme();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('signupComplete.accessDeniedTitle', {
        defaultValue: 'Complete your profile first',
      })}
      size="sm"
    >
      <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.5, margin: '0 0 1.5rem' }}>
        {t('signupComplete.accessDeniedBody', {
          defaultValue:
            'You cannot access this page yet. Please fill in the required company and account details to continue. After that you will upload your KYC documents.',
        })}
      </p>
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg cursor-pointer border-none font-medium"
          style={{
            background: T.ac,
            color: '#fff',
            fontSize: 13,
            minWidth: 140,
          }}
        >
          {t('signupComplete.accessDeniedCta', {
            defaultValue: 'Continue setup',
          })}
        </button>
      </div>
    </Modal>
  );
};

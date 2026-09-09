import React, { useEffect } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

type RegisterSuccessModalProps = {
  messageHtml?: string | null;
  onClose: () => void;
};

export const RegisterSuccessModal: React.FC<RegisterSuccessModalProps> = ({
  messageHtml,
  onClose,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="reg-success-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registered-success-modal"
    >
      <div className="reg-success-modal">
        <button
          type="button"
          className="reg-success-close registered-success-modal-close"
          onClick={onClose}
          aria-label={t('registerClose', 'Close')}
        >
          &times;
        </button>
        <div className="reg-success-body">
          <div className="reg-success-inner text-center">
            <img
              src="/created-success-truck.svg"
              alt="created-success-truck"
              className="reg-success-truck-img mx-auto"
            />
            {messageHtml ? (
              <div
                className="register-success register-success-message"
                dangerouslySetInnerHTML={{ __html: messageHtml }}
              />
            ) : (
              <div className="register-success register-success-message">
                <p>
                  <strong>{t('registerSuccessTitle', 'Welcome to MYVAGON!')}</strong>
                </p>
                <br />
                <p>{t('registerSuccessThankYou', 'Thank you for signing up.')}</p>
                <p>
                  {t(
                    'registerSuccessUnderReview',
                    'Your application has been received and is now under review. Once your KYC information is approved, you’ll receive an email confirming that your account is active and ready to use.'
                  )}
                </p>
                <p>
                  {t(
                    'registerSuccessSafekeep',
                    'In the meantime, please make sure you safekeep your password for when you can log in.'
                  )}
                </p>
              </div>
            )}
            <div className="reg-success-actions">
              <button
                type="button"
                className="reg-btn-primary reg-success-btn"
                onClick={onClose}
              >
                {t('loginLogIn', 'Log In')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';
import { SuccessTruckIcon } from '../components/SuccessTruckIcon';

type SignupSuccessStepProps = {
  messageHtml?: string | null;
};

export const SignupSuccessStep: React.FC<SignupSuccessStepProps> = ({ messageHtml }) => {
  const { t } = useTranslation();

  return (
    <div className="reg-form reg-success-step">
      <SuccessTruckIcon className="reg-success-truck-img mx-auto" />
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
        <Link to="/login" className="reg-btn-primary reg-success-btn reg-success-btn-link">
          {t('loginLogIn', 'Log In')}
        </Link>
      </div>
    </div>
  );
};

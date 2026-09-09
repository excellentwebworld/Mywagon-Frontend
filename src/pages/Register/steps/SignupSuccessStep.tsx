import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';

type SignupSuccessStepProps = {
  messageHtml?: string | null;
};

export const SignupSuccessStep: React.FC<SignupSuccessStepProps> = ({ messageHtml }) => {
  const { t } = useTranslation();

  return (
    <div className="reg-form" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
      <img
        src="/created-success-truck.svg"
        alt="created-success-truck"
        className="reg-success-truck-img mx-auto"
        style={{ width: '88px', height: '60px', marginBottom: '1.5rem' }}
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
      <div className="reg-success-actions" style={{ marginTop: '2rem' }}>
        <Link
          to="/login"
          className="reg-btn-primary reg-success-btn"
          style={{ display: 'inline-block', textDecoration: 'none', maxWidth: '280px', margin: '0 auto' }}
        >
          {t('loginLogIn', 'Log In')}
        </Link>
      </div>
    </div>
  );
};

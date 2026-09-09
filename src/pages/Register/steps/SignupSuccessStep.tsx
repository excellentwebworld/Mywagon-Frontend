import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';

export const SignupSuccessStep: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step shipper-register-step--center">
      <p className="shipper-register-hold-title">
        {t('registerSuccessTitle', 'Welcome to MYVAGON')}
      </p>
      <p className="shipper-login-para">
        {t(
          'registerSuccessBody',
          'Your account was created and KYC is pending review. You can log in now; full access is available after admin approval.'
        )}
      </p>
      <div className="shipper-login-submit-wrap" style={{ marginTop: 16, width: '100%' }}>
        <Link
          to="/login"
          className="shipper-login-submit-btn"
          style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none', width: '100%' }}
        >
          {t('loginLogIn')}
        </Link>
      </div>
    </div>
  );
};

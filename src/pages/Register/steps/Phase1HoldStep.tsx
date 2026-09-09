import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';

export const Phase1HoldStep: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step shipper-register-step--center">
      <p className="shipper-register-hold-title">
        {t('registerHoldTitle', 'Account details saved')}
      </p>
      <p className="shipper-login-para">
        {t(
          'registerHoldBody',
          'Next you will add company information and KYC documents. That step is coming soon.'
        )}
      </p>
      <div className="shipper-login-join-wrap" style={{ marginTop: 16 }}>
        <Link to="/login" className="shipper-login-join">
          {t('registerBackToLogin', 'Back to login')}
        </Link>
      </div>
    </div>
  );
};

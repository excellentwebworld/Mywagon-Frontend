import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../../hooks/useTranslation';

export const Phase2HoldStep: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step shipper-register-step--center">
      <p className="shipper-register-hold-title">
        {t('registerHoldTitleP2', 'Company details saved')}
      </p>
      <p className="shipper-login-para">
        {t(
          'registerHoldBodyP2',
          'Next you will complete KYC verification (VAT and certificate). That step is coming soon.'
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

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoginParticles } from '../Login/useLoginParticles';
import fullLogo from '../../assets/logo/fullLogo.svg';
import './authSuccess.css';

export const PasswordChangeSuccessPage: React.FC = () => {
  const { t } = useTranslation();
  const particlesRef = useLoginParticles('shipper-success-particles');

  return (
    <div className="pw-success-page">
      <div ref={particlesRef} className="auth-particles" aria-hidden="true" />
      <div className="pw-success-container">
        <div className="pw-success-logo">
          <img src={fullLogo} alt={t('appName', 'MYVAGON')} height={35} />
        </div>

        <div className="pw-success-icon" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <path className="pw-success-checkmark" d="M14 27l7.5 7.5L38 18" />
          </svg>
        </div>

        <h1 className="pw-success-title">
          {t('resetPasswordSuccessTitle', 'Password Changed Successfully')}
        </h1>

        <p className="pw-success-message">
          {t(
            'resetPasswordSuccessMessage',
            'Your password has been updated successfully. You can now log in with your new password.'
          )}
        </p>

        <div className="pw-success-actions">
          <Link to="/login" className="pw-success-btn">
            {t('resetPasswordGoToLogin', 'Go to Login')}
          </Link>
        </div>

        <div className="pw-success-footer">
          {t('resetPasswordNeedHelp', 'Need help? Contact the MYVAGON support team')}
        </div>
      </div>
    </div>
  );
};

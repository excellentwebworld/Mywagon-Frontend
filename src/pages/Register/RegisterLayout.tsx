import React from 'react';
import { Link } from 'react-router-dom';
import fullLogo from '../../assets/logo/fullLogo.svg';
import { signupVideoUrl } from './registerConstants';
import { useRegisterReference } from './useRegisterReference';
import './RegisterPage.css';

type Props = {
  lang: string;
  onLangChange: (next: 'en' | 'el') => void;
  children: React.ReactNode;
  subtitle: string;
  title: string;
  variant?: 'shipper' | 'carrier';
};

export const RegisterLayout: React.FC<Props> = ({
  lang,
  onLangChange,
  children,
  subtitle,
  title,
  variant = 'shipper',
}) => {
  const { data: reference } = useRegisterReference(lang);
  const apiVideo =
    variant === 'carrier' ? reference?.videos?.carrier : reference?.videos?.shipper;
  const videoSrc = apiVideo || signupVideoUrl(variant);

  return (
    <div className={`reg-page reg-page--${variant}`}>
      <div className="reg-row">
        <div className="reg-form-col">
          <div className="reg-form-inner">
            <div className="reg-card-body">
              <label className="reg-lang-switch" title="Language">
                <input
                  type="checkbox"
                  checked={lang !== 'el'}
                  onChange={(e) => onLangChange(e.target.checked ? 'en' : 'el')}
                />
                <span className="reg-lang-slider" />
              </label>
              <div className="reg-brand">
                <Link to="/login" className="reg-logo-link">
                  <img src={fullLogo} alt="MYVAGON" />
                </Link>
                <p className="reg-subtitle">{subtitle}</p>
              </div>
              <h4 className="reg-page-title">{title}</h4>
              {children}
            </div>
          </div>
        </div>
        <div className="reg-video-col" aria-hidden>
          <div className="reg-video-body">
            {videoSrc ? (
              <video className="reg-video" autoPlay muted loop playsInline key={videoSrc}>
                <source src={videoSrc} type="video/mp4" />
              </video>
            ) : (
              <div className="reg-video-fallback" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

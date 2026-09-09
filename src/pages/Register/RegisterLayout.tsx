import React from 'react';
import { Link } from 'react-router-dom';
import fullLogo from '../../assets/logo/fullLogo.svg';
import { useApp } from '../../context/AppContext';
import { signupVideoUrl } from './registerConstants';
import './RegisterPage.css';

type Props = {
  lang: string;
  onLangChange: (next: 'en' | 'el') => void;
  children: React.ReactNode;
  subtitle: string;
  title: string;
  variant?: 'shipper' | 'carrier';
  videoSrc?: string | null;
};

export const RegisterLayout: React.FC<Props> = ({
  lang,
  onLangChange,
  children,
  subtitle,
  title,
  variant = 'shipper',
  videoSrc,
}) => {
  const { toast, hideToast } = useApp();
  const resolvedVideo = videoSrc || signupVideoUrl(variant);

  return (
    <div className={`reg-page reg-page--${variant}`}>
      {toast.show ? (
        <div className={`reg-toast reg-toast--${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button type="button" onClick={hideToast} aria-label="Close">
            ×
          </button>
        </div>
      ) : null}
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
            {resolvedVideo ? (
              <video className="reg-video" autoPlay muted loop playsInline key={resolvedVideo}>
                <source src={resolvedVideo} type="video/mp4" />
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

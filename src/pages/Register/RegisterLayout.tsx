import React from 'react';
import { Link } from 'react-router-dom';
import fullLogo from '../../assets/logo/fullLogo.svg';
import { signupVideoUrl } from './registerConstants';
import './RegisterPage.css';

type Props = {
  lang: string;
  onLangChange: (next: 'en' | 'el') => void;
  children: React.ReactNode;
  subtitle: string;
};

export const RegisterLayout: React.FC<Props> = ({ lang, onLangChange, children, subtitle }) => {
  const videoSrc = signupVideoUrl();

  return (
    <div className="reg-page">
      <div className="reg-row">
        <div className="reg-form-col">
          <div className="reg-card">
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
                  <img src={fullLogo} alt="MYVAGON" height={35} />
                </Link>
                <p className="reg-subtitle">{subtitle}</p>
              </div>
              {children}
            </div>
          </div>
        </div>
        <div className="reg-video-col">
          {videoSrc ? (
            <video className="reg-video" autoPlay muted loop playsInline>
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : (
            <div className="reg-video-fallback" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
};

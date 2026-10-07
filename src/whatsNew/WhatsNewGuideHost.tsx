import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { uiSwitchService } from '../api/services/uiSwitchService';
import { isOnboardingTourRunning } from '../onboarding';
import { needsCompanyInfoGate, needsKycGate } from '../hooks/useKycGate';
import { needsInfoFormHardGate } from '../hooks/useInfoFormGate';
import { needsSignupComplete } from '../hooks/useSignupCompleteGate';
import { WHATS_NEW_SLIDES, WHATS_NEW_VERSION } from './whatsNewSlides';
import './whatsNew.css';

function gatesClear(user: NonNullable<ReturnType<typeof useAuth>['user']>): boolean {
  if (needsSignupComplete(user)) return false;
  if (needsInfoFormHardGate(user)) return false;
  if (needsKycGate(user)) return false;
  if (needsCompanyInfoGate(user)) return false;
  return true;
}

function shouldShowWhatsNew(user: NonNullable<ReturnType<typeof useAuth>['user']>): boolean {
  if (user.onboarding_completed === false) return false;
  if (user.whats_new_revamp_seen === true) return false;
  if (!gatesClear(user)) return false;
  if (isOnboardingTourRunning()) return false;
  return true;
}

export const WhatsNewGuideHost: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { T } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const shownRef = useRef(false);

  const isWebViewPath = (location.pathname || '').startsWith('/webview/');

  useEffect(() => {
    if (!user || isWebViewPath) {
      setOpen(false);
      return;
    }
    if (shownRef.current) return;
    if (!shouldShowWhatsNew(user)) {
      setOpen(false);
      return;
    }
    shownRef.current = true;
    setIndex(0);
    setOpen(true);
  }, [user, isWebViewPath]);

  const dismiss = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await uiSwitchService.dismissWhatsNew(WHATS_NEW_VERSION);
      await refreshUser().catch(() => null);
    } catch {
      // Still close locally; next refresh reconciles.
    } finally {
      setOpen(false);
      setSaving(false);
    }
  }, [refreshUser, saving]);

  const goCta = async () => {
    const slide = WHATS_NEW_SLIDES[index];
    await dismiss();
    if (slide?.route) {
      navigate(slide.route);
    }
  };

  if (!open || !user) return null;

  const slide = WHATS_NEW_SLIDES[index];
  const isLast = index >= WHATS_NEW_SLIDES.length - 1;

  return (
    <div className="wn-overlay" role="dialog" aria-modal="true" aria-labelledby="wn-title">
      <div className="wn-modal" style={{ background: T.bg, borderColor: T.bd, color: T.t1 }}>
        <button
          type="button"
          className="wn-close"
          aria-label={t('common.close', 'Close')}
          onClick={() => void dismiss()}
          style={{ color: T.t3 }}
        >
          <X size={18} />
        </button>

        <div className="wn-badge" style={{ background: T.al, color: T.ac }}>
          <Sparkles size={14} />
          <span>{t('whatsNew.badge', 'What\'s new')}</span>
        </div>

        <h2 id="wn-title" className="wn-title">
          {t(slide.titleKey, slide.titleFallback)}
        </h2>
        <p className="wn-body" style={{ color: T.t2 }}>
          {t(slide.bodyKey, slide.bodyFallback)}
        </p>

        <div className="wn-dots" aria-hidden>
          {WHATS_NEW_SLIDES.map((s, i) => (
            <span
              key={s.id}
              className={`wn-dot${i === index ? ' is-active' : ''}`}
              style={{ background: i === index ? T.ac : T.bd }}
            />
          ))}
        </div>

        <div className="wn-actions">
          <button
            type="button"
            className="wn-btn wn-btn-ghost"
            disabled={index === 0 || saving}
            onClick={() => setIndex((v) => Math.max(0, v - 1))}
            style={{ color: T.t2, borderColor: T.bd }}
          >
            <ChevronLeft size={16} />
            {t('whatsNew.previous', 'Previous')}
          </button>

          <button
            type="button"
            className="wn-btn wn-btn-secondary"
            disabled={saving}
            onClick={() => void goCta()}
            style={{ color: T.ac, borderColor: T.ac }}
          >
            {t(slide.ctaKey, slide.ctaFallback)}
          </button>

          {isLast ? (
            <button
              type="button"
              className="wn-btn wn-btn-primary"
              disabled={saving}
              onClick={() => void dismiss()}
              style={{ background: T.ac, color: '#fff' }}
            >
              {saving
                ? t('whatsNew.saving', 'Saving…')
                : t('whatsNew.gotIt', 'Got it')}
            </button>
          ) : (
            <button
              type="button"
              className="wn-btn wn-btn-primary"
              disabled={saving}
              onClick={() => setIndex((v) => Math.min(WHATS_NEW_SLIDES.length - 1, v + 1))}
              style={{ background: T.ac, color: '#fff' }}
            >
              {t('whatsNew.next', 'Next')}
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="wn-skip"
          disabled={saving}
          onClick={() => void dismiss()}
          style={{ color: T.t3 }}
        >
          {t('whatsNew.skip', 'Skip for now')}
        </button>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { onboardingService } from '../api/services/onboardingService';
import { safeSessionGet, safeSessionRemove } from '../utils/safeStorage';
import {
  destroyOnboardingTour,
  FORCE_TOUR_SESSION_KEY,
  isOnboardingTourRunning,
  startOnboardingTour,
} from './startOnboardingTour';

const AUTO_START_DELAY_MS = 1200;

interface OnboardingTourHostProps {
  expandSidebar?: () => void;
}

export const OnboardingTourHost: React.FC<OnboardingTourHostProps> = ({ expandSidebar }) => {
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const [showHelpBtn, setShowHelpBtn] = useState(false);
  const startedRef = useRef(false);
  const markingRef = useRef(false);

  const incomplete = user != null && user.onboarding_completed === false;
  const isDashboard =
    location.pathname === '/dashboard' || location.pathname.endsWith('/dashboard');

  const markComplete = useCallback(async () => {
    if (markingRef.current) return;
    markingRef.current = true;
    try {
      await onboardingService.complete();
      // refreshUser flips soft_reminder/enforce flags (Laravel: reminder after tour)
      await refreshUser();
      showToast(
        t('tour.welcomeAboard', 'Welcome aboard! You are ready to start using MYVAGON.'),
        'success',
      );
    } catch {
      // Still hide help UI; next refresh will reconcile
    } finally {
      markingRef.current = false;
      setShowHelpBtn(false);
      safeSessionRemove(FORCE_TOUR_SESSION_KEY);
      startedRef.current = false;
    }
  }, [refreshUser, showToast, t]);

  const runTour = useCallback(() => {
    if (isOnboardingTourRunning()) return;
    startedRef.current = true;
    setShowHelpBtn(false);
    startOnboardingTour({
      t: (key, fallback) => t(key, fallback ?? key),
      onComplete: markComplete,
      expandSidebar,
    });
  }, [expandSidebar, markComplete, t]);

  // Auto-start on dashboard when incomplete (or forced replay).
  // Laravel parity: info-form reminder is suppressed until onboarding completes,
  // so the guided tour always opens first — no wait on the reminder modal.
  useEffect(() => {
    if (!user || !isDashboard) return;

    const forced = safeSessionGet(FORCE_TOUR_SESSION_KEY) === '1';
    if (!forced && !incomplete) {
      setShowHelpBtn(false);
      return;
    }
    if (startedRef.current || isOnboardingTourRunning()) return;

    setShowHelpBtn(incomplete || forced);

    const timer = setTimeout(() => {
      if (startedRef.current || isOnboardingTourRunning()) return;
      runTour();
    }, AUTO_START_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [user, incomplete, isDashboard, runTour]);

  // Cleanup tour on leave dashboard / logout
  useEffect(() => {
    return () => {
      destroyOnboardingTour({ persist: false });
      startedRef.current = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      destroyOnboardingTour({ persist: false });
      startedRef.current = false;
      setShowHelpBtn(false);
    }
  }, [user]);

  if (!showHelpBtn || !incomplete || isOnboardingTourRunning()) {
    return null;
  }

  return (
    <button
      type="button"
      className="mv-help-tour-btn"
      title={t('tour.help.start', 'Start Help Tour')}
      onClick={() => runTour()}
    >
      <HelpCircle size={16} strokeWidth={2.25} />
      <span>{t('tour.help.label', 'Help Tour')}</span>
    </button>
  );
};

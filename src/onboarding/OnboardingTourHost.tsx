import React, { useCallback, useEffect, useRef } from 'react';
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
import { canStartOnboardingTour } from '../hooks/postAuthDestination';

const AUTO_START_DELAY_MS = 1200;

interface OnboardingTourHostProps {
  expandSidebar?: () => void;
}

export const OnboardingTourHost: React.FC<OnboardingTourHostProps> = ({ expandSidebar }) => {
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const startedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const markingRef = useRef(false);

  const incomplete = user != null && user.onboarding_completed === false;
  const isDashboard =
    location.pathname === '/dashboard' || location.pathname.endsWith('/dashboard');

  const markComplete = useCallback(async () => {
    if (markingRef.current) return;
    markingRef.current = true;
    try {
      if (incomplete) {
        await onboardingService.complete();
        // refreshUser flips soft_reminder/enforce flags (Laravel: reminder after tour)
        await refreshUser();
        showToast(
          t('tour.welcomeAboard', 'Welcome aboard! You are ready to start using MYVAGON.'),
          'success',
        );
      }
    } catch {
      // Still succeed locally; next refresh will reconcile
    } finally {
      markingRef.current = false;
      safeSessionRemove(FORCE_TOUR_SESSION_KEY);
      startedRef.current = false;
    }
  }, [incomplete, refreshUser, showToast, t]);

  const runTour = useCallback(() => {
    if (isOnboardingTourRunning()) return;
    startedRef.current = true;
    startOnboardingTour({
      t: (key, fallback) => t(key, fallback ?? key),
      onComplete: markComplete,
      expandSidebar,
    });
  }, [expandSidebar, markComplete, t]);

  // Auto-start on dashboard only after KYC accepted + mandatory info form done.
  useEffect(() => {
    if (!user || !isDashboard) return;

    const forced = safeSessionGet(FORCE_TOUR_SESSION_KEY) === '1';
    const readyForTour = canStartOnboardingTour(user) || forced;

    if (!forced && !incomplete) {
      return;
    }
    if (!readyForTour) {
      return;
    }
    if (autoStartedRef.current || startedRef.current || isOnboardingTourRunning()) return;

    autoStartedRef.current = true;
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
    }
  }, [user]);

  // On dashboard page, always show the Help Tour button whenever the tour is not currently active
  if (!user || !isDashboard || isOnboardingTourRunning()) {
    return null;
  }

  return (
    <button
      type="button"
      className="mv-help-tour-btn"
      title={t('tour.help.start', 'Start Help Tour')}
      onClick={() => runTour()}
      aria-label={t('tour.help.label', 'Help Tour')}
    >
      <HelpCircle size={16} strokeWidth={2.25} />
      <span>{t('tour.help.label', 'Help Tour')}</span>
    </button>
  );
};

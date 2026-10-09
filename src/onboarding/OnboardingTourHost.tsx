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
  notifyOnboardingTourFinished,
  startOnboardingTour,
} from './startOnboardingTour';
import { canStartOnboardingTour } from '../hooks/postAuthDestination';
import {
  isWhatsNewPending,
  WHATS_NEW_DISMISSED_EVENT,
} from '../whatsNew/whatsNewVisibility';
import { needsSignupComplete } from '../hooks/useSignupCompleteGate';
import { needsInfoFormHardGate } from '../hooks/useInfoFormGate';
import { needsCompanyInfoGate, needsKycGate } from '../hooks/useKycGate';
import type { ShipperUser } from '../api/auth';

const AUTO_START_DELAY_MS = 1200;

interface OnboardingTourHostProps {
  expandSidebar?: () => void;
}

/** FORCE_TOUR must not skip signup / KYC / mandatory gates (avoids stacking over Get Started). */
function tourGatesClear(user: ShipperUser): boolean {
  if (needsSignupComplete(user)) return false;
  if (needsInfoFormHardGate(user)) return false;
  if (needsKycGate(user)) return false;
  if (needsCompanyInfoGate(user)) return false;
  return true;
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
      // Clear force flag before refresh so soft reminder can open after tour.
      safeSessionRemove(FORCE_TOUR_SESSION_KEY);
      if (incomplete) {
        await onboardingService.complete();
        // refreshUser flips soft_reminder/enforce flags (Laravel: reminder after tour)
        await refreshUser();
        showToast(
          t('tour.welcomeAboard', 'Welcome aboard! You are ready to start using MYVAGON.'),
          'success',
        );
      } else {
        await refreshUser().catch(() => null);
      }
    } catch {
      // Still succeed locally; next refresh will reconcile
    } finally {
      markingRef.current = false;
      startedRef.current = false;
      notifyOnboardingTourFinished();
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

  // Auto-start on dashboard only after signup + KYC + mandatory gates clear.
  // Never stack over the social “Get Started” welcome modal.
  useEffect(() => {
    if (!user || !isDashboard) return;

    // What's New is the first popup on a new UI login. Start the product tour after it closes.
    if (isWhatsNewPending(user)) {
      const onDismissed = () => {
        autoStartedRef.current = false;
        startedRef.current = false;
        if (!canStartOnboardingTour(user) && safeSessionGet(FORCE_TOUR_SESSION_KEY) !== '1') return;
        window.setTimeout(() => {
          if (isOnboardingTourRunning()) return;
          runTour();
        }, AUTO_START_DELAY_MS);
      };
      window.addEventListener(WHATS_NEW_DISMISSED_EVENT, onDismissed);
      return () => window.removeEventListener(WHATS_NEW_DISMISSED_EVENT, onDismissed);
    }

    // Incomplete social → welcome modal only; clear any stale force flag.
    if (needsSignupComplete(user)) {
      safeSessionRemove(FORCE_TOUR_SESSION_KEY);
      return;
    }

    const forced = safeSessionGet(FORCE_TOUR_SESSION_KEY) === '1';
    if (forced && !tourGatesClear(user)) {
      safeSessionRemove(FORCE_TOUR_SESSION_KEY);
      return;
    }

    const readyForTour = canStartOnboardingTour(user) || (forced && tourGatesClear(user));

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

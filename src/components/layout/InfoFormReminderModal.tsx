import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  needsInfoFormHardGate,
  needsInfoFormSoftReminder,
} from '../../hooks/useInfoFormGate';
import {
  FORCE_TOUR_SESSION_KEY,
  isOnboardingTourRunning,
  ONBOARDING_TOUR_FINISHED_EVENT,
} from '../../onboarding';
import {
  safeLocalGet,
  safeLocalRemove,
  safeLocalSet,
  safeSessionGet,
  safeSessionRemove,
  safeSessionSet,
} from '../../utils/safeStorage';

/**
 * Laravel session keys parity:
 * - `info_form_reminder_shown` — set when soft modal is shown/acked; cleared on login/logout
 *
 * Use localStorage (per user) so Skip/Yes in one tab is shared across tabs.
 * sessionStorage is tab-isolated and was causing the modal to reappear in new tabs.
 */
const SESSION_SHOWN_KEY = 'shipper_info_form_reminder_shown';
const LOCAL_SHOWN_PREFIX = 'shipper_info_form_reminder_shown_';
const LEGACY_LOCAL_SKIP_PREFIX = 'shipper_info_form_reminder_skipped_';
const LEGACY_SESSION_SKIP_KEY = 'shipper_info_form_reminder_skipped';

const INFO_FORM_TARGET = '/settings/organization?from=info_form';

function localShownKey(userId: string | number): string {
  return `${LOCAL_SHOWN_PREFIX}${userId}`;
}

/** Call on login / logout — matches Blade forgetting `info_form_reminder_shown`. */
export function clearInfoFormReminderSkip(userId?: string | number | null): void {
  safeSessionRemove(SESSION_SHOWN_KEY);
  safeSessionRemove(LEGACY_SESSION_SKIP_KEY);
  if (userId != null && userId !== '') {
    safeLocalRemove(localShownKey(userId));
    safeLocalRemove(`${LEGACY_LOCAL_SKIP_PREFIX}${userId}`);
  }
}

function hasReminderBeenShownThisLogin(userId?: string | number | null): boolean {
  if (userId != null && userId !== '') {
    if (safeLocalGet(localShownKey(userId)) === '1') return true;
    if (safeLocalGet(`${LEGACY_LOCAL_SKIP_PREFIX}${userId}`) === '1') return true;
  }
  return (
    safeSessionGet(SESSION_SHOWN_KEY) === '1' ||
    safeSessionGet(LEGACY_SESSION_SKIP_KEY) === '1'
  );
}

function markReminderShownThisLogin(userId?: string | number | null): void {
  safeSessionSet(SESSION_SHOWN_KEY, '1');
  if (userId != null && userId !== '') {
    safeLocalSet(localShownKey(userId), '1');
  }
}

/** Blade skips reminder on profile/info-form screens. */
function isInfoFormTargetPath(pathname: string, search: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/settings/organization' || path.startsWith('/settings/organization/')) {
    const params = new URLSearchParams(search);
    if (params.get('from') === 'info_form') return true;
  }
  return false;
}

function isTourBlockingReminder(): boolean {
  return (
    safeSessionGet(FORCE_TOUR_SESSION_KEY) === '1' ||
    isOnboardingTourRunning() ||
    (typeof document !== 'undefined' && document.body.classList.contains('mv-onboarding-active'))
  );
}

export const InfoFormReminderModal: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tourEpoch, setTourEpoch] = useState(0);
  const dismissedRef = useRef(false);

  // Re-evaluate after guided tour finishes (Laravel: reminder only after onboarding).
  useEffect(() => {
    const onTourFinished = () => setTourEpoch((n) => n + 1);
    window.addEventListener(ONBOARDING_TOUR_FINISHED_EVENT, onTourFinished);
    return () => window.removeEventListener(ONBOARDING_TOUR_FINISHED_EVENT, onTourFinished);
  }, []);

  useEffect(() => {
    if (!user) {
      dismissedRef.current = false;
      setOpen(false);
      return;
    }
    if (dismissedRef.current) {
      setOpen(false);
      return;
    }
    // Laravel: guided tour first — do not open reminder until onboarding is completed.
    if (user.onboarding_completed === false) {
      setOpen(false);
      return;
    }
    // Tour pending / running — never stack reminder over the tour.
    if (isTourBlockingReminder()) {
      setOpen(false);
      return;
    }
    // Already shown/acked this login (any tab) — do not reopen, and do not force-close
    // (marking shown on open used to immediately close on the next effect run).
    if (hasReminderBeenShownThisLogin(user.id)) {
      return;
    }
    // Soft modal only — hard gate uses ProtectedRoute redirect (Laravel enforce mode).
    if (needsInfoFormHardGate(user) || !needsInfoFormSoftReminder(user)) {
      setOpen(false);
      return;
    }
    if (isInfoFormTargetPath(location.pathname, location.search)) {
      setOpen(false);
      return;
    }
    // Blade puts `info_form_reminder_shown` when flashing the soft modal.
    markReminderShownThisLogin(user.id);
    setOpen(true);
  }, [user, location.pathname, location.search, tourEpoch]);

  // Close if another tab already marked the reminder as shown/skipped.
  useEffect(() => {
    if (!user?.id) return;
    const key = localShownKey(user.id);
    const legacyKey = `${LEGACY_LOCAL_SKIP_PREFIX}${user.id}`;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (e.key !== key && e.key !== legacyKey) return;
      if (e.newValue === '1') {
        dismissedRef.current = true;
        setOpen(false);
        document.body.style.overflow = '';
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user?.id]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    markReminderShownThisLogin(user?.id);
    setOpen(false);
    document.body.style.overflow = '';
  }, [user?.id]);

  const goComplete = useCallback(() => {
    dismissedRef.current = true;
    markReminderShownThisLogin(user?.id);
    setOpen(false);
    document.body.style.overflow = '';
    // Client-side only (no full reload). flushSync is defaulted on router.navigate.
    navigate(INFO_FORM_TARGET, { flushSync: true });
  }, [navigate, user?.id]);

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={t('settings.infoFormReminder.title', { defaultValue: 'Complete your profile' })}
      size="sm"
    >
      <div data-info-form-reminder={open ? 'open' : 'closed'}>
      <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.5, margin: '0 0 1.5rem' }}>
        {t('settings.infoFormReminder.body', {
          defaultValue:
            'Fill out the remaining fields to complete your profile! This will help MYVAGON provide better services.',
        })}
      </p>
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={dismiss}
          className="px-5 py-2.5 rounded-lg cursor-pointer font-medium"
          style={{
            border: `2px solid ${T.bd}`,
            background: T.sf,
            color: T.t1,
            fontSize: 13,
            minWidth: 120,
          }}
        >
          {t('settings.infoFormReminder.skip', { defaultValue: 'Skip' })}
        </button>
        <button
          type="button"
          onClick={goComplete}
          className="px-5 py-2.5 rounded-lg cursor-pointer border-none font-medium"
          style={{
            background: T.ac,
            color: '#fff',
            fontSize: 13,
            minWidth: 120,
          }}
        >
          {t('settings.infoFormReminder.yes', { defaultValue: 'Yes' })}
        </button>
      </div>
      </div>
    </Modal>
  );
};

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
  safeLocalRemove,
  safeSessionGet,
  safeSessionRemove,
  safeSessionSet,
} from '../../utils/safeStorage';

/**
 * Laravel session keys parity:
 * - `info_form_reminder_shown` — set when soft modal is shown/acked; cleared on login/logout
 */
const SESSION_SHOWN_KEY = 'shipper_info_form_reminder_shown';
const LEGACY_LOCAL_SKIP_PREFIX = 'shipper_info_form_reminder_skipped_';
const LEGACY_SESSION_SKIP_KEY = 'shipper_info_form_reminder_skipped';

const INFO_FORM_TARGET = '/settings/organization?from=info_form';

/** Call on login / logout — matches Blade forgetting `info_form_reminder_shown`. */
export function clearInfoFormReminderSkip(userId?: string | number | null): void {
  safeSessionRemove(SESSION_SHOWN_KEY);
  safeSessionRemove(LEGACY_SESSION_SKIP_KEY);
  if (userId != null && userId !== '') {
    safeLocalRemove(`${LEGACY_LOCAL_SKIP_PREFIX}${userId}`);
  }
}

function hasReminderBeenShownThisLogin(): boolean {
  return (
    safeSessionGet(SESSION_SHOWN_KEY) === '1' ||
    safeSessionGet(LEGACY_SESSION_SKIP_KEY) === '1'
  );
}

function markReminderShownThisLogin(): void {
  safeSessionSet(SESSION_SHOWN_KEY, '1');
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

export const InfoFormReminderModal: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const dismissedRef = useRef(false);

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
    // Already shown/acked this login — do not reopen, and do not force-close
    // (marking shown on open used to immediately close on the next effect run).
    if (hasReminderBeenShownThisLogin()) {
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
    markReminderShownThisLogin();
    setOpen(true);
  }, [user, location.pathname, location.search]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    markReminderShownThisLogin();
    setOpen(false);
    document.body.style.overflow = '';
  }, []);

  const goComplete = useCallback(() => {
    dismissedRef.current = true;
    markReminderShownThisLogin();
    setOpen(false);
    document.body.style.overflow = '';
    // Client-side only (no full reload). flushSync is defaulted on router.navigate.
    navigate(INFO_FORM_TARGET, { flushSync: true });
  }, [navigate]);

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

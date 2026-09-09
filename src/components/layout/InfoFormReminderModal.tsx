import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { needsInfoFormSoftReminder } from '../../hooks/useInfoFormGate';

const SESSION_SKIP_KEY = 'shipper_info_form_reminder_skipped';

export const InfoFormReminderModal: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!needsInfoFormSoftReminder(user)) {
      setOpen(false);
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_SKIP_KEY) === '1') {
        setOpen(false);
        return;
      }
    } catch {
      // ignore
    }
    setOpen(true);
  }, [user]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_SKIP_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const goComplete = () => {
    try {
      sessionStorage.setItem(SESSION_SKIP_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
    navigate('/settings/organization?from=info_form');
  };

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={t('settings.infoFormReminder.title', { defaultValue: 'Complete your profile' })}
      size="sm"
    >
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
    </Modal>
  );
};

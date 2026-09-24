import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export type UpgradeGateOptions = {
  title?: string;
  body?: string;
  upgradeUrl?: string;
};

type UpgradeGateContextValue = {
  openUpgradeGate: (options?: UpgradeGateOptions) => void;
  closeUpgradeGate: () => void;
};

const UpgradeGateContext = createContext<UpgradeGateContextValue | undefined>(undefined);

const DEFAULT_UPGRADE_URL = '/subscription';

export const UpgradeGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string | undefined>();
  const [body, setBody] = useState<string | undefined>();
  const [upgradeUrl, setUpgradeUrl] = useState(DEFAULT_UPGRADE_URL);

  const closeUpgradeGate = useCallback(() => {
    setOpen(false);
  }, []);

  const openUpgradeGate = useCallback((options?: UpgradeGateOptions) => {
    setTitle(options?.title);
    setBody(options?.body);
    setUpgradeUrl(options?.upgradeUrl?.trim() || DEFAULT_UPGRADE_URL);
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openUpgradeGate, closeUpgradeGate }),
    [openUpgradeGate, closeUpgradeGate],
  );

  const resolvedUrl = upgradeUrl || DEFAULT_UPGRADE_URL;
  const isInternal = resolvedUrl.startsWith('/') && !resolvedUrl.startsWith('/shipper/');

  const goUpgrade = () => {
    closeUpgradeGate();
    if (isInternal) {
      navigate(resolvedUrl);
      return;
    }
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <UpgradeGateContext.Provider value={value}>
      {children}
      {open ? (
        <div className="sat-gate-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-gate-title">
          <div className="sat-gate-modal__backdrop" onClick={closeUpgradeGate} />
          <div className="sat-gate-modal__panel">
            <div className="sat-gate-modal__body">
              <h2 id="upgrade-gate-title" className="sat-gate-modal__title">
                {title || t('satUpgradeTitle')}
              </h2>
              <p className="sat-gate-modal__copy">{body || t('satUpgradeBody')}</p>
            </div>
            <div className="sat-gate-modal__actions">
              <button type="button" className="sat-btn" onClick={closeUpgradeGate}>
                {t('satRemindLater')}
              </button>
              <button type="button" className="sat-btn sat-btn-pr" onClick={goUpgrade}>
                {t('satUpgradeNow')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UpgradeGateContext.Provider>
  );
};

export function useUpgradeGate(): UpgradeGateContextValue {
  const ctx = useContext(UpgradeGateContext);
  if (!ctx) {
    throw new Error('useUpgradeGate must be used within UpgradeGateProvider');
  }
  return ctx;
}

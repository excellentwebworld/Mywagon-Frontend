import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

/** Matches Laravel shipper `#subscribe-modal` / `#subscription-prompt` copy. */
export type UpgradeGateVariant = 'feature' | 'limit';

export type UpgradeGateOptions = {
  /** Optional override; prefer variant so all modules share Laravel wording. */
  title?: string;
  body?: string;
  upgradeUrl?: string;
  /** `feature` = not in plan; `limit` = quota reached (add-on / upgrade). */
  variant?: UpgradeGateVariant;
};

type UpgradeGateContextValue = {
  openUpgradeGate: (options?: UpgradeGateOptions) => void;
  closeUpgradeGate: () => void;
};

const UpgradeGateContext = createContext<UpgradeGateContextValue | undefined>(undefined);

const DEFAULT_UPGRADE_URL = '/subscription';

const FEATURE_BODY_EN =
  'Your current subscription plan does not support this feature. To unlock it, please upgrade to a higher tier plan.';
const LIMIT_BODY_EN =
  'You have reached the limit for this feature in your current plan. To use this feature now, visit the Subscription page to upgrade or purchase add-ons.';

/** i18next returns the key when missing — treat that as empty so defaults apply. */
function resolveCopy(raw: string | undefined, fallback: string): string {
  const value = (raw || '').trim();
  if (!value) return fallback;
  // Raw key leaked (e.g. "multiStopUpgradeBody")
  if (/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(value) && !value.includes(' ')) return fallback;
  return value;
}

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
    const variant = options?.variant ?? 'feature';
    const defaultBody =
      variant === 'limit'
        ? t('satUpgradeLimitBody', LIMIT_BODY_EN)
        : t('satUpgradeBody', FEATURE_BODY_EN);

    setTitle(resolveCopy(options?.title, t('satUpgradeTitle', 'Upgrade')));
    setBody(resolveCopy(options?.body, defaultBody));
    setUpgradeUrl(options?.upgradeUrl?.trim() || DEFAULT_UPGRADE_URL);
    setOpen(true);
  }, [t]);

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

  const displayTitle = title || t('satUpgradeTitle', 'Upgrade');
  const displayBody = body || t('satUpgradeBody', FEATURE_BODY_EN);

  return (
    <UpgradeGateContext.Provider value={value}>
      {children}
      {open ? (
        <div className="sat-gate-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-gate-title">
          <div className="sat-gate-modal__backdrop" onClick={closeUpgradeGate} />
          <div className="sat-gate-modal__panel">
            <button
              type="button"
              className="sat-gate-modal__close"
              aria-label={t('close', 'Close')}
              onClick={closeUpgradeGate}
            >
              ×
            </button>
            <div className="sat-gate-modal__body">
              <h2 id="upgrade-gate-title" className="sat-gate-modal__title">
                {displayTitle}
              </h2>
              <p className="sat-gate-modal__copy">{displayBody}</p>
            </div>
            <div className="sat-gate-modal__actions">
              <button type="button" className="sat-btn" onClick={closeUpgradeGate}>
                {t('satRemindLater', 'Remind me later')}
              </button>
              <button type="button" className="sat-btn sat-btn-pr" onClick={goUpgrade}>
                {t('satUpgradeNow', 'Upgrade Now')}
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

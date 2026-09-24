import React, { useEffect, useRef } from 'react';
import { useSubscriptionPermission } from '../../hooks/useSubscriptionPermission';
import { useUpgradeGate } from '../../context/UpgradeGateContext';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  /** Permission slug required to use this module. */
  slug: string;
  /** Optional custom copy. */
  title?: string;
  body?: string;
  children: React.ReactNode;
  /** When true, still render children but open gate once on deny. */
  soft?: boolean;
};

/**
 * Proactive page-level subscription gate (Laravel Blade parity).
 * Opens the global Upgrade modal when the plan lacks `slug`.
 */
export const SubscriptionPageGate: React.FC<Props> = ({
  slug,
  title,
  body,
  children,
  soft = false,
}) => {
  const { can } = useSubscriptionPermission();
  const { openUpgradeGate } = useUpgradeGate();
  const { t } = useTranslation();
  const prompted = useRef(false);
  const allowed = can(slug);

  useEffect(() => {
    if (allowed || prompted.current) return;
    prompted.current = true;
    openUpgradeGate({
      title: title || t('satUpgradeTitle'),
      body: body || t('satUpgradeBody'),
      upgradeUrl: '/subscription',
    });
  }, [allowed, openUpgradeGate, title, body, t]);

  if (!allowed && !soft) {
    return (
      <div className="ab-subscription-banner" role="alert" style={{ margin: 16 }}>
        {body || t('satUpgradeBody')}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 12 }}
          onClick={() =>
            openUpgradeGate({
              title: title || t('satUpgradeTitle'),
              body: body || t('satUpgradeBody'),
              upgradeUrl: '/subscription',
            })
          }
        >
          {t('satUpgradeNow')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

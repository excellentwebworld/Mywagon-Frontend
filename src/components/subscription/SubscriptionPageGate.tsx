import React, { useEffect, useRef } from 'react';
import { useSubscriptionPermission } from '../../hooks/useSubscriptionPermission';
import { useUpgradeGate } from '../../context/UpgradeGateContext';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  /** Permission slug required to use this module. */
  slug: string;
  children: React.ReactNode;
  /** When true, still render children but open gate once on deny. */
  soft?: boolean;
};

/**
 * Proactive page-level subscription gate (Laravel Blade parity).
 * Uses the shared Upgrade modal with the same general Laravel copy.
 */
export const SubscriptionPageGate: React.FC<Props> = ({
  slug,
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
    openUpgradeGate();
  }, [allowed, openUpgradeGate]);

  if (!allowed && !soft) {
    return (
      <div className="ab-subscription-banner" role="alert" style={{ margin: 16 }}>
        {t(
          'satUpgradeBody',
          'Your current subscription plan does not support this feature. To unlock it, please upgrade to a higher tier plan.',
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 12 }}
          onClick={() => openUpgradeGate()}
        >
          {t('satUpgradeNow', 'Upgrade Now')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

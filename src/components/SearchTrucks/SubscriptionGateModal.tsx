import React from 'react';
import { Link } from 'react-router-dom';

interface SubscriptionGateModalProps {
  open: boolean;
  upgradeUrl: string;
  onRemindLater: () => void;
  t: (key: string, ...args: any[]) => string;
}

/** Laravel-parity upgrade modal used by module-local 403 flows. */
export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  open,
  upgradeUrl,
  onRemindLater,
  t,
}) => {
  if (!open) return null;

  const isInternal = upgradeUrl.startsWith('/') && !upgradeUrl.startsWith('/shipper/');
  const body = t(
    'satUpgradeBody',
    'Your current subscription plan does not support this feature. To unlock it, please upgrade to a higher tier plan.',
  );

  return (
    <div className="sat-gate-modal" role="dialog" aria-modal="true" aria-labelledby="sat-gate-title">
      <div className="sat-gate-modal__backdrop" onClick={onRemindLater} />
      <div className="sat-gate-modal__panel">
        <button
          type="button"
          className="sat-gate-modal__close"
          aria-label={t('close', 'Close')}
          onClick={onRemindLater}
        >
          ×
        </button>
        <div className="sat-gate-modal__body">
          <h2 id="sat-gate-title" className="sat-gate-modal__title">
            {t('satUpgradeTitle', 'Upgrade')}
          </h2>
          <p className="sat-gate-modal__copy">{body}</p>
        </div>
        <div className="sat-gate-modal__actions">
          <button type="button" className="sat-btn" onClick={onRemindLater}>
            {t('satRemindLater', 'Remind me later')}
          </button>
          {isInternal ? (
            <Link className="sat-btn sat-btn-pr" to={upgradeUrl} onClick={onRemindLater}>
              {t('satUpgradeNow', 'Upgrade Now')}
            </Link>
          ) : (
            <a className="sat-btn sat-btn-pr" href={upgradeUrl} target="_blank" rel="noopener noreferrer">
              {t('satUpgradeNow', 'Upgrade Now')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

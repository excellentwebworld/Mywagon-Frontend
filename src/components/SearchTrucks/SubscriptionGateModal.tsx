import React from 'react';
import { Link } from 'react-router-dom';

interface SubscriptionGateModalProps {
  open: boolean;
  upgradeUrl: string;
  onRemindLater: () => void;
  t: (key: string) => string;
}

export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  open,
  upgradeUrl,
  onRemindLater,
  t,
}) => {
  if (!open) return null;

  const isInternal = upgradeUrl.startsWith('/') && !upgradeUrl.startsWith('/shipper/');

  return (
    <div className="sat-gate-modal" role="dialog" aria-modal="true" aria-labelledby="sat-gate-title">
      <div className="sat-gate-modal__backdrop" />
      <div className="sat-gate-modal__panel">
        <div className="sat-gate-modal__body">
          <h2 id="sat-gate-title" className="sat-gate-modal__title">
            {t('satUpgradeTitle')}
          </h2>
          <p className="sat-gate-modal__copy">{t('satUpgradeBody')}</p>
        </div>
        <div className="sat-gate-modal__actions">
          <button type="button" className="sat-btn" onClick={onRemindLater}>
            {t('satRemindLater')}
          </button>
          {isInternal ? (
            <Link className="sat-btn sat-btn-pr" to={upgradeUrl}>
              {t('satUpgradeNow')}
            </Link>
          ) : (
            <a className="sat-btn sat-btn-pr" href={upgradeUrl} target="_blank" rel="noopener noreferrer">
              {t('satUpgradeNow')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

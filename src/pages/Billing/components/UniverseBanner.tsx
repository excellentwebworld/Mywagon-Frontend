import React from 'react';
import { Layers, Truck, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  compact?: boolean;
};

export const UniverseBanner: React.FC<Props> = ({ compact = false }) => {
  const { t } = useTranslation();

  return (
    <div className={`uni-strip${compact ? ' uni-strip--compact' : ''}`}>
      <div className="uni-card active">
        <div className="uni-icon">
          <Layers size={compact ? 18 : 20} color="#c4b5fd" />
        </div>
        <div>
          <div className="uni-label">
            {t('billingPage.uniServicesLabel', 'MYVAGON Services')}
          </div>
          <div className="uni-desc">
            {compact
              ? t('billingPage.uniServicesDescShort', 'Subscriptions, commissions & add-ons')
              : t(
                  'billingPage.uniServicesDesc',
                  'SaaS subscriptions, marketplace commissions, penalties & add-ons',
                )}
          </div>
        </div>
        <div className="uni-dot" style={{ background: '#22c55e' }} />
      </div>

      {!compact ? (
        <div className="uni-card disabled">
          <div className="uni-icon">
            <Truck size={20} />
          </div>
          <div>
            <div className="uni-label flex items-center">
              <span>{t('billingPage.uniLoadsLabel', 'MYVAGON Loads')}</span>
              <span className="soon-badge">{t('common.comingSoon', 'Coming Soon')}</span>
            </div>
            <div className="uni-desc">
              {t(
                'billingPage.uniLoadsDesc',
                'Automated carrier payouts, escrow, funding & reconciliation',
              )}
            </div>
          </div>
          <Lock size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </div>
      ) : null}
    </div>
  );
};

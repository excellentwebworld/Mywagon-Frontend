import React from 'react';
import { ApiError } from '../../api';

export function formatDashError(
  err: unknown,
  fallbackKey: string
): { key: string; upgradeUrl?: string; forbidden: boolean } {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return {
        key: 'dashSubscriptionDenied',
        upgradeUrl: err.upgradeUrl || '/subscription',
        forbidden: true,
      };
    }
    return {
      key: err.message || fallbackKey,
      forbidden: false,
    };
  }
  if (err && typeof err === 'object' && 'response' in err) {
    const ax = err as { response?: { status?: number; data?: { message?: string; upgrade_url?: string } } };
    const status = ax.response?.status;
    if (status === 403) {
      return {
        key: 'dashSubscriptionDenied',
        upgradeUrl: ax.response?.data?.upgrade_url || '/subscription',
        forbidden: true,
      };
    }
  }
  if (err instanceof Error && err.message) {
    return { key: err.message, forbidden: false };
  }
  return { key: fallbackKey, forbidden: false };
}

export function translateDashMessage(t: (key: string) => string, key: string): string {
  const translated = t(key);
  return translated !== key ? translated : key;
}

interface DashUpgradeBlockProps {
  upgradeUrl?: string;
  t: (key: string) => string;
  compact?: boolean;
}

export const DashUpgradeBlock: React.FC<DashUpgradeBlockProps> = ({
  upgradeUrl = '/subscription',
  t,
  compact,
}) => (
  <div className={`dash-upgrade${compact ? ' dash-upgrade--compact' : ''}`}>
    <p className="dash-upgrade-title">{t('satUpgradeTitle')}</p>
    <p className="dash-upgrade-body">{t('satUpgradeBody')}</p>
    <a className="dash-upgrade-link" href={upgradeUrl} target="_blank" rel="noopener noreferrer">
      {t('satUpgradeNow')}
    </a>
  </div>
);

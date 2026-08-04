/**
 * TrustCenterPage — Security & Trust (dynamic via GET /settings/trust).
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { TrustCenterProvider, useTrustCenter } from './TrustCenterContext';
import HeroCard from './trust/HeroCard';
import PlatformStatus from './trust/PlatformStatus';
import SecurityPillars from './trust/SecurityPillars';
import InfrastructureSection from './trust/Infrastructure';
import EncryptionStack from './trust/EncryptionStack';
import ComplianceSection from './trust/ComplianceSection';
import OrgPosture from './trust/OrgPosture';
import TrustFooter from './trust/TrustFooter';

function TrustCenterBody({ embedded = false }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { data, loading, error, refresh } = useTrustCenter();

  if (loading && !data) {
    return (
      <div className="w-full flex justify-center py-16">
        <p style={{ fontSize: 13, color: T.t3 }}>{t('common.loading', { defaultValue: 'Loading…' })}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 gap-3">
        <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
          style={{ background: T.ac, color: '#fff', fontSize: 12 }}
        >
          {t('common.retry', { defaultValue: 'Retry' })}
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className="w-full flex justify-center"
      style={{ minHeight: embedded ? undefined : '100%' }}
    >
      <div
        className={embedded ? 'w-full' : 'w-full px-4 py-6 sm:py-10'}
        style={{ maxWidth: embedded ? '100%' : 960 }}
      >
        <div className="flex flex-col gap-12">
          <HeroCard data={data} />
          <PlatformStatus data={data} />
          <SecurityPillars data={data} />
          <InfrastructureSection data={data} />
          <EncryptionStack data={data} />
          <ComplianceSection data={data} />
          <OrgPosture data={data} />
          <TrustFooter data={data} />
        </div>
      </div>
    </div>
  );
}

export default function TrustCenterPage({ embedded = false }) {
  return (
    <TrustCenterProvider>
      <TrustCenterBody embedded={embedded} />
    </TrustCenterProvider>
  );
}

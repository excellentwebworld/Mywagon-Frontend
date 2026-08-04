/**
 * TrustCenterPage — Security & Trust (dynamic via GET /settings/trust).
 */

import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
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

function TrustSkeleton({ embedded = false }) {
  const { T } = useTheme();
  const sk = { baseColor: T.sa, highlightColor: T.bd };

  return (
    <div
      className="w-full flex justify-center"
      style={{ minHeight: embedded ? undefined : '100%' }}
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className={embedded ? 'w-full' : 'w-full px-4 py-6 sm:py-10'}
        style={{ maxWidth: embedded ? '100%' : 960 }}
      >
        <div className="flex flex-col gap-12">
          {/* Hero */}
          <div className="rounded-2xl overflow-hidden p-6 sm:p-8" style={{ background: T.sa }}>
            <Skeleton width={160} height={12} borderRadius={4} {...sk} />
            <div style={{ marginTop: 16 }}>
              <Skeleton width="70%" height={28} borderRadius={6} {...sk} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Skeleton width="90%" height={14} borderRadius={4} {...sk} />
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} width={100} height={36} borderRadius={10} {...sk} />
              ))}
            </div>
          </div>

          <SectionSkeleton T={T} sk={sk} cards={3} />
          <SectionSkeleton T={T} sk={sk} cards={4} />
          <SectionSkeleton T={T} sk={sk} cards={2} />
          <SectionSkeleton T={T} sk={sk} cards={3} />
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton({ T, sk, cards = 3 }) {
  return (
    <div>
      <Skeleton width={180} height={18} borderRadius={4} {...sk} />
      <div style={{ marginTop: 8 }}>
        <Skeleton width={260} height={12} borderRadius={4} {...sk} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: T.sf, border: `1px solid ${T.bd}` }}
          >
            <Skeleton width={28} height={28} borderRadius={8} {...sk} />
            <div style={{ marginTop: 12 }}>
              <Skeleton width="60%" height={14} borderRadius={4} {...sk} />
            </div>
            <div style={{ marginTop: 8 }}>
              <Skeleton height={10} borderRadius={4} {...sk} />
              <div style={{ marginTop: 6 }}>
                <Skeleton width="80%" height={10} borderRadius={4} {...sk} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustCenterBody({ embedded = false }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { data, loading, error, refresh } = useTrustCenter();

  if (loading && !data) {
    return <TrustSkeleton embedded={embedded} />;
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

/**
 * TrustCenterPage — Security & Trust showcase (ported from MV_Web_Panel_React).
 *
 * Used at /settings/trustCenter (with Settings sidebar) and legacy /trust redirect.
 */

import HeroCard from './trust/HeroCard';
import PlatformStatus from './trust/PlatformStatus';
import SecurityPillars from './trust/SecurityPillars';
import InfrastructureSection from './trust/Infrastructure';
import EncryptionStack from './trust/EncryptionStack';
import ComplianceSection from './trust/ComplianceSection';
import OrgPosture from './trust/OrgPosture';
import TrustFooter from './trust/TrustFooter';

export default function TrustCenterPage({ embedded = false }) {
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
          <HeroCard />
          <PlatformStatus />
          <SecurityPillars />
          <InfrastructureSection />
          <EncryptionStack />
          <ComplianceSection />
          <OrgPosture />
          <TrustFooter />
        </div>
      </div>
    </div>
  );
}

/**
 * TrustCenterPage — Security & Trust showcase (ported from MV_Web_Panel_React).
 *
 * Read-only page at /trust. Seven sections + footer, centered max-width 960px.
 * PDS-937 Compliance → Security & Trust.
 */

import HeroCard from './trust/HeroCard';
import PlatformStatus from './trust/PlatformStatus';
import SecurityPillars from './trust/SecurityPillars';
import InfrastructureSection from './trust/Infrastructure';
import EncryptionStack from './trust/EncryptionStack';
import ComplianceSection from './trust/ComplianceSection';
import OrgPosture from './trust/OrgPosture';
import TrustFooter from './trust/TrustFooter';

export default function TrustCenterPage() {
  return (
    <div className="w-full flex justify-center px-4 py-6 sm:py-10" style={{ minHeight: '100%' }}>
      <div className="w-full" style={{ maxWidth: 960 }}>
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

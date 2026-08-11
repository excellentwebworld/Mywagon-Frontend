import React, { useState } from 'react';
import { BookOpen, CalendarDays, ClipboardList, Lock } from 'lucide-react';
import '../../styles/support.css';
import { useTranslation } from '../../hooks/useTranslation';
import { SubscriptionGateModal } from '../../components/SearchTrucks/SubscriptionGateModal';
import { SupportPageHeader } from './components/SupportPageHeader';
import { SupportQuickActions } from './components/SupportQuickActions';
import { SupportCollapsibleSection } from './components/SupportCollapsibleSection';
import { KnowledgeBaseSection } from './components/sections/KnowledgeBaseSection';
import { RequestsSection } from './components/sections/RequestsSection';
import { BookCallSection } from './components/sections/BookCallSection';
import { useSupportPage } from './hooks/useSupportPage';

export default function SupportPage() {
  const { t } = useTranslation();
  const {
    sectionOpen,
    activeRequestTab,
    setActiveRequestTab,
    callType,
    setCallType,
    accessLoading,
    upgradeUrl,
    gateModalOpen,
    isGated,
    toggleSection,
    scrollToSection,
    registerSectionRef,
    dismissGateModal,
  } = useSupportPage();

  const [kbArticleCount, setKbArticleCount] = useState<number | null>(null);

  return (
    <>
      <div className={`support-page${accessLoading ? ' is-loading' : ''}`}>
        {isGated ? (
          <div className="support-gate-banner" role="status">
            <Lock size={16} aria-hidden />
            <span>{t('support.gateBanner')}</span>
          </div>
        ) : null}

        <SupportPageHeader />

        <SupportQuickActions
          onNavigate={scrollToSection}
          disabled={isGated}
        />

        <SupportCollapsibleSection
          id="kb"
          icon={<BookOpen size={17} strokeWidth={2} />}
          iconBg="var(--info-bg)"
          title={t('support.sections.knowledgeBase')}
          badge={
            kbArticleCount !== null && kbArticleCount > 0
              ? `${kbArticleCount} ${t('support.kb.articles')}`
              : undefined
          }
          collapsed={sectionOpen.kb}
          onToggle={() => toggleSection('kb')}
          sectionRef={(node) => registerSectionRef('kb', node)}
        >
          <KnowledgeBaseSection disabled={isGated} onArticleCountChange={setKbArticleCount} />
        </SupportCollapsibleSection>

        <SupportCollapsibleSection
          id="requests"
          icon={<ClipboardList size={17} strokeWidth={2} />}
          iconBg="var(--accent-light)"
          title={t('support.sections.requests')}
          collapsed={sectionOpen.requests}
          onToggle={() => toggleSection('requests')}
          sectionRef={(node) => registerSectionRef('requests', node)}
        >
          <RequestsSection
            activeTab={activeRequestTab}
            onTabChange={setActiveRequestTab}
            disabled={isGated}
          />
        </SupportCollapsibleSection>

        <SupportCollapsibleSection
          id="call"
          icon={<CalendarDays size={17} strokeWidth={2} />}
          iconBg="var(--success-bg)"
          title={t('support.sections.bookCall')}
          collapsed={sectionOpen.call}
          onToggle={() => toggleSection('call')}
          sectionRef={(node) => registerSectionRef('call', node)}
        >
          <BookCallSection
            callType={callType}
            onCallTypeChange={setCallType}
            active={!sectionOpen.call}
            disabled={isGated}
          />
        </SupportCollapsibleSection>
      </div>

      <SubscriptionGateModal
        open={gateModalOpen}
        upgradeUrl={upgradeUrl}
        onRemindLater={dismissGateModal}
        t={t}
      />
    </>
  );
}

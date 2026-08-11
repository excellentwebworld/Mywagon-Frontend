import { useCallback, useEffect, useRef, useState } from 'react';
import { supportService } from '../../../api/services/supportService';
import type {
  SupportCallType,
  SupportRequestTab,
  SupportSectionId,
  SupportSectionOpenState,
} from '../types';

const DEFAULT_SECTION_OPEN: SupportSectionOpenState = {
  kb: false,
  requests: false,
  call: false,
};

export function useSupportPage() {
  const [sectionOpen, setSectionOpen] = useState<SupportSectionOpenState>(DEFAULT_SECTION_OPEN);
  const [activeRequestTab, setActiveRequestTab] = useState<SupportRequestTab>('create');
  const [callType, setCallType] = useState<SupportCallType>('technical');
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [upgradeUrl, setUpgradeUrl] = useState('/subscription');
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);

  const sectionRefs = useRef<Partial<Record<SupportSectionId, HTMLElement | null>>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const access = await supportService.getAccess();
        if (cancelled) return;
        setAccessAllowed(access.allowed);
        setUpgradeUrl(access.upgradeUrl);
        if (!access.allowed) {
          setGateModalOpen(true);
        }
      } catch {
        if (!cancelled) {
          setAccessAllowed(true);
        }
      } finally {
        if (!cancelled) {
          setAccessLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSection = useCallback((id: SupportSectionId, forceOpen = false) => {
    setSectionOpen((prev) => ({
      ...prev,
      [id]: forceOpen ? false : !prev[id],
    }));
  }, []);

  const scrollToSection = useCallback((id: SupportSectionId, options?: { openRequestsTab?: SupportRequestTab }) => {
    if (options?.openRequestsTab) {
      setActiveRequestTab(options.openRequestsTab);
    }
    setSectionOpen((prev) => ({ ...prev, [id]: false }));
    window.setTimeout(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const registerSectionRef = useCallback((id: SupportSectionId, node: HTMLElement | null) => {
    sectionRefs.current[id] = node;
  }, []);

  const dismissGateModal = useCallback(() => {
    setGateModalOpen(false);
    setGateDismissed(true);
  }, []);

  const isGated = !accessLoading && !accessAllowed;

  return {
    sectionOpen,
    activeRequestTab,
    setActiveRequestTab,
    callType,
    setCallType,
    accessLoading,
    accessAllowed,
    upgradeUrl,
    gateModalOpen,
    gateDismissed,
    isGated,
    toggleSection,
    scrollToSection,
    registerSectionRef,
    dismissGateModal,
  };
}

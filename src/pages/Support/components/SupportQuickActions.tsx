import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { SupportRequestTab, SupportSectionId } from '../types';

interface SupportQuickActionsProps {
  onNavigate: (section: SupportSectionId, options?: { openRequestsTab?: SupportRequestTab }) => void;
  disabled?: boolean;
}

export function SupportQuickActions({ onNavigate, disabled = false }: SupportQuickActionsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      section: 'kb' as SupportSectionId,
      icon: '🔍',
      iconBg: '#EFF6FF',
      title: t('support.quickActions.knowledgeBase'),
      desc: t('support.quickActions.knowledgeBaseDesc'),
    },
    {
      section: 'requests' as SupportSectionId,
      openRequestsTab: 'create' as SupportRequestTab,
      icon: '✏️',
      iconBg: 'var(--accent-light)',
      title: t('support.quickActions.createRequest'),
      desc: t('support.quickActions.createRequestDesc'),
    },
    {
      section: 'call' as SupportSectionId,
      icon: '📅',
      iconBg: '#ECFDF5',
      title: t('support.quickActions.bookCall'),
      desc: t('support.quickActions.bookCallDesc'),
    },
  ];

  return (
    <div className="support-quick-actions quick-actions">
      {cards.map((card) => (
        <div
          key={card.section}
          className="qa-card support-qa-card"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={() => {
            if (disabled) return;
            onNavigate(card.section, card.openRequestsTab ? { openRequestsTab: card.openRequestsTab } : undefined);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate(card.section, card.openRequestsTab ? { openRequestsTab: card.openRequestsTab } : undefined);
            }
          }}
          style={disabled ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
        >
          <div className="qa-icon" style={{ background: card.iconBg }}>
            {card.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div className="qa-label" style={{ fontWeight: 700, fontSize: 14 }}>
              {card.title}
            </div>
            <div className="qa-sub" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>
              {card.desc}
            </div>
          </div>
          <span className="support-qa-arrow" aria-hidden>
            →
          </span>
        </div>
      ))}
    </div>
  );
}

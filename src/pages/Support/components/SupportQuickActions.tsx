import React from 'react';
import { ArrowRight, BookOpen, CalendarDays, PenLine } from 'lucide-react';
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
      icon: BookOpen,
      iconBg: 'var(--info-bg)',
      iconColor: 'var(--info)',
      title: t('support.quickActions.knowledgeBase'),
      desc: t('support.quickActions.knowledgeBaseDesc'),
    },
    {
      section: 'requests' as SupportSectionId,
      openRequestsTab: 'create' as SupportRequestTab,
      icon: PenLine,
      iconBg: 'var(--accent-light)',
      iconColor: 'var(--accent)',
      title: t('support.quickActions.createRequest'),
      desc: t('support.quickActions.createRequestDesc'),
    },
    {
      section: 'call' as SupportSectionId,
      icon: CalendarDays,
      iconBg: 'var(--success-bg)',
      iconColor: 'var(--success)',
      title: t('support.quickActions.bookCall'),
      desc: t('support.quickActions.bookCallDesc'),
    },
  ];

  return (
    <div className="support-quick-actions">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.section}
            className={`support-qa-card${disabled ? ' is-disabled' : ''}`}
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
          >
            <div
              className="support-qa-icon"
              style={{ background: card.iconBg, color: card.iconColor }}
            >
              <Icon size={20} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="support-qa-label">{card.title}</div>
              <div className="support-qa-sub">{card.desc}</div>
            </div>
            <ArrowRight className="support-qa-arrow" size={18} aria-hidden />
          </div>
        );
      })}
    </div>
  );
}

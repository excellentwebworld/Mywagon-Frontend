import React from 'react';
import {
  CalendarDays,
  CreditCard,
  GraduationCap,
  Lightbulb,
  Wrench,
} from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { SupportCallType } from '../../types';
import { useBookCall } from '../../hooks/useBookCall';
import { HubSpotMeetingEmbed } from '../call/HubSpotMeetingEmbed';

interface BookCallSectionProps {
  callType: SupportCallType;
  onCallTypeChange: (type: SupportCallType) => void;
  active?: boolean;
  disabled?: boolean;
}

const CALL_TYPES: {
  id: SupportCallType;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  labelKey: string;
}[] = [
  { id: 'onboarding', icon: GraduationCap, labelKey: 'support.callTypes.onboarding' },
  { id: 'technical', icon: Wrench, labelKey: 'support.callTypes.technical' },
  { id: 'billing', icon: CreditCard, labelKey: 'support.callTypes.billing' },
  { id: 'feedback', icon: Lightbulb, labelKey: 'support.callTypes.feedback' },
];

export function BookCallSection({
  callType,
  onCallTypeChange,
  active = true,
  disabled = false,
}: BookCallSectionProps) {
  const { t } = useTranslation();
  const bookCall = useBookCall({ callType, active: active && !disabled, disabled });

  if (disabled) {
    return <div className="support-placeholder">{t('support.call.gatedMessage')}</div>;
  }

  return (
    <div>
      <div className="support-call-types" role="group" aria-label={t('support.sections.bookCall')}>
        {CALL_TYPES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`support-call-type${callType === item.id ? ' active' : ''}`}
              onClick={() => onCallTypeChange(item.id)}
            >
              <Icon size={14} strokeWidth={2} />
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>

      {!bookCall.loading && bookCall.hasMeetingUrl ? (
        <div className="support-call-prep">{t('support.callPrep')}</div>
      ) : null}

      {bookCall.loading ? (
        <div className="kb-message">{t('support.call.loading')}</div>
      ) : bookCall.error ? (
        <div className="support-meeting-fallback">
          <div className="support-meeting-fallback-icon" aria-hidden>
            <CalendarDays size={24} strokeWidth={1.75} />
          </div>
          <p className="support-meeting-fallback-text">{t('support.call.loadError')}</p>
        </div>
      ) : bookCall.hasMeetingUrl ? (
        <HubSpotMeetingEmbed embedUrl={bookCall.embedUrl} externalUrl={bookCall.activeMeetingUrl} />
      ) : (
        <div className="support-meeting-fallback">
          <div className="support-meeting-fallback-icon" aria-hidden>
            <CalendarDays size={24} strokeWidth={1.75} />
          </div>
          <p className="support-meeting-fallback-text">{t('support.call.notConfigured')}</p>
        </div>
      )}
    </div>
  );
}

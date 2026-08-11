import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useTheme } from '../../../../hooks/useTheme';
import type { SupportCallType } from '../../types';
import { useBookCall } from '../../hooks/useBookCall';
import { HubSpotMeetingEmbed } from '../call/HubSpotMeetingEmbed';

interface BookCallSectionProps {
  callType: SupportCallType;
  onCallTypeChange: (type: SupportCallType) => void;
  active?: boolean;
  disabled?: boolean;
}

const CALL_TYPES: { id: SupportCallType; icon: string; labelKey: string; durationKey: string }[] = [
  { id: 'onboarding', icon: '🎓', labelKey: 'support.callTypes.onboarding', durationKey: 'support.callDuration.onboarding' },
  { id: 'technical', icon: '🔧', labelKey: 'support.callTypes.technical', durationKey: 'support.callDuration.technical' },
  { id: 'billing', icon: '💰', labelKey: 'support.callTypes.billing', durationKey: 'support.callDuration.billing' },
  { id: 'feedback', icon: '💡', labelKey: 'support.callTypes.feedback', durationKey: 'support.callDuration.feedback' },
];

export function BookCallSection({
  callType,
  onCallTypeChange,
  active = true,
  disabled = false,
}: BookCallSectionProps) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const bookCall = useBookCall({ callType, active: active && !disabled, disabled });
  const activeType = CALL_TYPES.find((c) => c.id === callType) ?? CALL_TYPES[1];
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (disabled) {
    return (
      <div
        className="support-placeholder"
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: T.t3,
          background: T.sa,
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        {t('support.call.gatedMessage')}
      </div>
    );
  }

  return (
    <div>
      <div className="support-call-types" role="group" aria-label={t('support.sections.bookCall')}>
        {CALL_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`support-call-type${callType === item.id ? ' active' : ''}`}
            onClick={() => onCallTypeChange(item.id)}
          >
            {item.icon} {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div className="support-call-info">
        <span>
          ⏱ {t('support.callDurationLabel')}{' '}
          <strong>{t(activeType.durationKey)}</strong>
        </span>
        <span>
          🌐 {t('support.callTimezoneLabel')}{' '}
          <strong>{timezone}</strong>
        </span>
      </div>

      <div
        className="support-call-prep"
        style={{
          padding: '12px 14px',
          background: T.sa,
          borderRadius: 8,
          fontSize: 12,
          color: T.t2,
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        {t('support.callPrep')}
      </div>

      {bookCall.loading ? (
        <div className="kb-message">{t('support.call.loading')}</div>
      ) : bookCall.error ? (
        <div className="support-meeting-fallback">
          <div className="support-meeting-fallback-icon" aria-hidden>
            📅
          </div>
          <p className="support-meeting-fallback-text">{t('support.call.loadError')}</p>
        </div>
      ) : bookCall.hasMeetingUrl ? (
        <HubSpotMeetingEmbed embedUrl={bookCall.embedUrl} externalUrl={bookCall.activeMeetingUrl} />
      ) : (
        <div className="support-meeting-fallback">
          <div className="support-meeting-fallback-icon" aria-hidden>
            📅
          </div>
          <p className="support-meeting-fallback-text">{t('support.call.notConfigured')}</p>
        </div>
      )}
    </div>
  );
}

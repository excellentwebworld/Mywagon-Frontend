import React from 'react';
import {
  CalendarDays,
  Clock,
  CreditCard,
  Globe,
  GraduationCap,
  Lightbulb,
  Wrench,
} from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { SupportCallType } from '../../types';
import { useBookCall } from '../../hooks/useBookCall';
import { HubSpotMeetingEmbed } from '../call/HubSpotMeetingEmbed';
import { CalendlyMeetingEmbed } from '../call/CalendlyMeetingEmbed';
import { ExternalLink } from 'lucide-react';

interface BookCallSectionProps {
  callType: SupportCallType;
  onCallTypeChange: (type: SupportCallType) => void;
  active?: boolean;
  disabled?: boolean;
}

const CALENDLY_URL = 'https://calendly.com/edoardo-myvagon/myvagon-carrier-introduction-call';

const CALL_TYPES: {
  id: SupportCallType;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  labelKey: string;
  durationKey: string;
}[] = [
  { id: 'onboarding', icon: GraduationCap, labelKey: 'support.callTypes.onboarding', durationKey: 'support.callDuration.onboarding' },
  { id: 'technical', icon: Wrench, labelKey: 'support.callTypes.technical', durationKey: 'support.callDuration.technical' },
  { id: 'billing', icon: CreditCard, labelKey: 'support.callTypes.billing', durationKey: 'support.callDuration.billing' },
  { id: 'feedback', icon: Lightbulb, labelKey: 'support.callTypes.feedback', durationKey: 'support.callDuration.feedback' },
];

export function BookCallSection({
  callType,
  onCallTypeChange,
  active = true,
  disabled = false,
}: BookCallSectionProps) {
  const { t } = useTranslation();
  const bookCall = useBookCall({ callType, active: active && !disabled, disabled });
  const activeType = CALL_TYPES.find((c) => c.id === callType) ?? CALL_TYPES[1];
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (disabled) {
    return <div className="support-placeholder">{t('support.call.gatedMessage')}</div>;
  }

  return (
    <div>
      {/* 
        PREVIOUS DESIGN (COMMENTED OUT AS REQUESTED - DO NOT REMOVE CODE)
      */}
      {/*
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

      <div className="support-call-info">
        <span className="support-call-info-item">
          <Clock size={14} aria-hidden />
          {t('support.callDurationLabel')}{' '}
          <strong>{t(activeType.durationKey)}</strong>
        </span>
        <span className="support-call-info-item">
          <Globe size={14} aria-hidden />
          {t('support.callTimezoneLabel')}{' '}
          <strong>{timezone}</strong>
        </span>
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
      */}
      {/* END PREVIOUS DESIGN */}

      {/* Calendly Integration (Like Laravel Shipper Panel) */}
      <div className="support-calendly-wrapper">
        <div className="support-calendly-header">
          <div className="support-calendly-header-info">
            <h4 className="support-calendly-title">
              {t('support.call.scheduleTitle', 'Schedule a Call')}
            </h4>
            <p className="support-calendly-desc">
              {t(
                'support.call.scheduleDesc',
                'Book an introduction, onboarding, or support session directly with our team.'
              )}
            </p>
          </div>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="support-calendly-badge-btn"
          >
            <CalendarDays size={16} strokeWidth={2} />
            <span>{t('support.call.scheduleButton', 'Schedule a Call')}</span>
            <ExternalLink size={14} strokeWidth={2} style={{ opacity: 0.85 }} />
          </a>
        </div>

        <CalendlyMeetingEmbed url={CALENDLY_URL} />
      </div>
    </div>
  );
}

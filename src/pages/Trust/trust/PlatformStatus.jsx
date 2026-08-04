/**
 * PlatformStatus — Live platform status section.
 *
 * 6 service cards (3×2 grid) + 90-day uptime bar + last incident note.
 *
 * Used by: TrustCenterPage
 * API: GET /api/v1/trust/status, GET /api/v1/trust/uptime, GET /api/v1/trust/incidents
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { CheckCircle } from 'lucide-react';
import { PLATFORM_STATUS } from '../../../mocks/trustData';
import ServiceCard from './ServiceCard';
import UptimeBar from './UptimeBar';

export default function PlatformStatus() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
  const incident = PLATFORM_STATUS.lastIncident;

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 16 }}>
        {t('trust.status.title')}
      </h2>

      {/* Service grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {PLATFORM_STATUS.services.map(svc => (
          <ServiceCard key={svc.id} service={svc} lang={lang} />
        ))}
      </div>

      {/* Uptime bar */}
      <div className="rounded-xl p-5 mb-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <UptimeBar
          history={PLATFORM_STATUS.uptimeHistory}
          overallUptime={PLATFORM_STATUS.overallUptime90Days}
          lang={lang}
        />
      </div>

      {/* Last incident */}
      {incident && (
        <div className="rounded-xl p-5" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} style={{ color: '#10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('trust.status.resolved')}
            </span>
            <span style={{ fontSize: 12, color: T.t3, marginLeft: 4 }}>
              — {new Date(incident.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.t1, marginBottom: 6 }}>
            {incident.title[lang] || incident.title.en} ({incident.duration})
          </div>
          <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.55, marginBottom: 10 }}>
            {incident.description[lang] || incident.description.en}
          </p>
          <div className="flex flex-wrap gap-4" style={{ fontSize: 12, color: T.t3 }}>
            <span>{t('trust.status.duration')}: {incident.duration}</span>
            <span>{t('trust.status.impact')}: {t(`trust.status.${incident.impact}`)}</span>
            <span>{t('trust.status.dataLoss')}: {t(`trust.status.${incident.dataLoss}`)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

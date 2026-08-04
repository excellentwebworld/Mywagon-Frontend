/**
 * Infrastructure — Distributed AWS architecture section.
 *
 * 3 region cards (Frankfurt primary, Ireland replica, Milan DR standby)
 * with sync direction indicators + EU data residency statement card.
 *
 * Used by: TrustCenterPage
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { ArrowRight } from 'lucide-react';
import { INFRASTRUCTURE } from '../../../mocks/trustData';

const ROLE_STYLES = {
  primary:    (T) => ({ bg: `${T.ac}18`, color: T.ac, label: 'PRIMARY' }),
  replica:    () => ({ bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', label: 'REPLICA' }),
  dr_standby: () => ({ bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'DR STANDBY' }),
};

const STATUS_DOT = { operational: '#10B981', standby: '#F59E0B' };

export default function InfrastructureSection() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
        {t('trust.infra.title')}
      </h2>
      <p style={{ fontSize: 13, color: T.t2, marginBottom: 16, lineHeight: 1.5 }}>
        {t('trust.infra.subtitle')}
      </p>

      {/* Region cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {INFRASTRUCTURE.map((reg, i) => {
          const rs = ROLE_STYLES[reg.role](T);
          const dot = STATUS_DOT[reg.status] || '#10B981';
          return (
            <div key={reg.code} className="rounded-xl p-4"
              style={{ background: T.sf, border: `1px solid ${T.bd}`, position: 'relative' }}>
              {/* Status dot */}
              <div className="flex items-center gap-2 mb-2">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
                <code style={{ fontSize: 11, color: T.t3 }}>{reg.code}</code>
              </div>
              {/* City */}
              <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
                {reg.city[lang] || reg.city.en}
              </div>
              {/* Role pill */}
              <span className="inline-block rounded-md px-2 py-0.5 mb-3"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, background: rs.bg, color: rs.color }}>
                {rs.label}
              </span>
              {/* Description */}
              <div style={{ fontSize: 12, color: T.t2 }}>
                {reg.description[lang] || reg.description.en}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync arrows row */}
      <div className="hidden sm:flex items-center justify-center gap-0 mb-4" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
        <div className="flex items-center gap-1" style={{ flex: 1 }}>
          <div style={{ flex: 1, height: 1, borderTop: `2px dashed ${T.bd}` }} />
          <ArrowRight size={14} style={{ color: T.t3 }} />
          <span style={{ fontSize: 9, color: T.t3, whiteSpace: 'nowrap' }}>{t('trust.infra.realtimeSync')}</span>
        </div>
        <div className="flex items-center gap-1" style={{ flex: 1 }}>
          <div style={{ flex: 1, height: 1, borderTop: `2px dashed ${T.bd}` }} />
          <ArrowRight size={14} style={{ color: T.t3 }} />
          <span style={{ fontSize: 9, color: T.t3, whiteSpace: 'nowrap' }}>{t('trust.infra.asyncReplication')}</span>
        </div>
      </div>

      {/* EU data residency */}
      <div className="rounded-xl p-5"
        style={{ background: 'rgba(59,130,246,0.06)', border: `1px solid rgba(59,130,246,0.18)` }}>
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 22 }}>🇪🇺</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
              {t('trust.infra.euDataResidency')}
            </div>
            <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.55, margin: 0 }}>
              {t('trust.infra.euDataDesc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

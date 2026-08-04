/**
 * Infrastructure — AWS eu-central-1 + ALB + Auto Scaling from API.
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';

const ROLE_STYLES = {
  primary: (T) => ({ bg: `${T.ac}18`, color: T.ac, labelKey: 'trust.infra.primary' }),
  load_balancer: () => ({ bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', labelKey: 'trust.infra.loadBalancer' }),
  autoscaling: () => ({ bg: 'rgba(16,185,129,0.12)', color: '#059669', labelKey: 'trust.infra.autoScaling' }),
};

const STATUS_DOT = { operational: '#10B981', standby: '#F59E0B' };

export default function InfrastructureSection({ data }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
  const items = data?.infrastructure || [];

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
        {t('trust.infra.title')}
      </h2>
      <p style={{ fontSize: 13, color: T.t2, marginBottom: 16, lineHeight: 1.5 }}>
        {t('trust.infra.subtitle')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {items.map((reg) => {
          const styleFn = ROLE_STYLES[reg.role] || ROLE_STYLES.primary;
          const rs = styleFn(T);
          const dot = STATUS_DOT[reg.status] || '#10B981';
          return (
            <div key={reg.code} className="rounded-xl p-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
                <code style={{ fontSize: 11, color: T.t3 }}>{reg.code}</code>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
                {reg.city[lang] || reg.city.en}
              </div>
              <span className="inline-block rounded-md px-2 py-0.5 mb-3"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, background: rs.bg, color: rs.color }}>
                {t(rs.labelKey)}
              </span>
              <div style={{ fontSize: 12, color: T.t2 }}>
                {reg.description[lang] || reg.description.en}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-5" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)' }}>
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

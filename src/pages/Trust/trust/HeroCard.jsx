/**
 * HeroCard — Trust Center hero (driven by /settings/trust).
 */

import { useTranslation } from 'react-i18next';
import { Lock, Shield, Cloud, CheckCircle } from 'lucide-react';

const STATUS_COLORS = {
  operational: '#86efac',
  degraded: '#FCD34D',
  outage: '#FCA5A5',
  maintenance: '#93C5FD',
};

const BADGE_ICONS = {
  aes256: Lock,
  gdpr: Shield,
  aws: Cloud,
  uptime: CheckCircle,
};

export default function HeroCard({ data }) {
  const { t } = useTranslation();
  const overall = data?.overall_status || 'operational';
  const dotColor = STATUS_COLORS[overall] || STATUS_COLORS.operational;
  const dates = data?.security_dates;

  const badges = (data?.badges || []).map((b) => ({
    icon: BADGE_ICONS[b.id] || CheckCircle,
    label: t(`trust.badges.${b.label_key}`),
    sub: t(`trust.badges.${b.sub_key}`),
  }));

  const fmt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const dateRows = [
    dates?.last_security_audit && { label: t('trust.hero.lastAudit'), value: fmt(dates.last_security_audit) },
    dates?.last_penetration_test && { label: t('trust.hero.lastPentest'), value: fmt(dates.last_penetration_test) },
    dates?.next_scheduled_audit && { label: t('trust.hero.nextAudit'), value: fmt(dates.next_scheduled_audit) },
  ].filter((r) => r && r.value);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        borderRadius: 16,
        padding: '48px 40px 36px',
        boxShadow: '0 8px 40px rgba(30,27,75,0.35)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div className="flex items-center gap-2 mb-6">
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, display: 'inline-block', boxShadow: `0 0 8px ${dotColor}` }} />
        <span style={{ color: dotColor, fontSize: 14, fontWeight: 600 }}>
          {overall === 'operational' && t('trust.hero.allOperational')}
          {overall === 'degraded' && t('trust.hero.degraded')}
          {overall === 'outage' && t('trust.hero.outage')}
          {overall === 'maintenance' && t('trust.hero.maintenance')}
        </span>
      </div>

      <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
        {t('trust.tagline')}
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.5, maxWidth: 560, marginBottom: 32 }}>
        {t('trust.subtitle')}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: dateRows.length ? 32 : 0 }}>
        {badges.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)' }}>
            <b.icon size={22} style={{ color: 'rgba(255,255,255,0.85)' }} />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{b.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{b.sub}</span>
          </div>
        ))}
      </div>

      {dateRows.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
          {dateRows.map((r) => (
            <span key={r.label}>{r.label}: {r.value}</span>
          ))}
        </div>
      )}
    </div>
  );
}

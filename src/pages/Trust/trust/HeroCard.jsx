/**
 * HeroCard — Trust Center hero section.
 *
 * Deep indigo gradient card with:
 * - Live status dot + message
 * - Tagline: "Your data. Our fortress."
 * - 4 trust badge cards (AES-256, GDPR, AWS Cloud, 99.99% Uptime)
 * - Security audit dates row
 *
 * Used by: TrustCenterPage
 * API: GET /api/v1/trust/status (status dot color)
 */

import { useTranslation } from 'react-i18next';
import { Lock, Shield, Cloud, CheckCircle } from 'lucide-react';
import { PLATFORM_STATUS, SECURITY_DATES } from '../../../mocks/trustData';

const STATUS_COLORS = {
  operational: '#86efac',
  degraded:    '#FCD34D',
  outage:      '#FCA5A5',
  maintenance: '#93C5FD',
};

export default function HeroCard() {
  const { t } = useTranslation();
  const overall = PLATFORM_STATUS.overall;
  const dotColor = STATUS_COLORS[overall] || STATUS_COLORS.operational;

  const badges = [
    { icon: Lock,        label: t('trust.badges.aes256'),   sub: t('trust.badges.encrypted') },
    { icon: Shield,      label: t('trust.badges.gdpr'),     sub: t('trust.badges.compliant') },
    { icon: Cloud,       label: t('trust.badges.awsCloud'), sub: t('trust.badges.cloud') },
    { icon: CheckCircle, label: t('trust.badges.uptime'),   sub: t('trust.badges.uptimePct') },
  ];

  const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  };

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
      {/* subtle decorative glow */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Status line */}
      <div className="flex items-center gap-2 mb-6">
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, display: 'inline-block', boxShadow: `0 0 8px ${dotColor}` }} />
        <span style={{ color: dotColor, fontSize: 14, fontWeight: 600 }}>
          {overall === 'operational' && t('trust.hero.allOperational')}
          {overall === 'degraded' && t('trust.hero.degraded')}
          {overall === 'outage' && t('trust.hero.outage')}
          {overall === 'maintenance' && t('trust.hero.maintenance')}
        </span>
      </div>

      {/* Tagline */}
      <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
        {t('trust.tagline')}
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.5, maxWidth: 560, marginBottom: 32 }}>
        {t('trust.subtitle')}
      </p>

      {/* Trust badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: 32 }}>
        {badges.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)' }}>
            <b.icon size={22} style={{ color: 'rgba(255,255,255,0.85)' }} />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{b.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{b.sub}</span>
          </div>
        ))}
      </div>

      {/* Audit dates */}
      <div className="flex flex-wrap gap-x-6 gap-y-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
        <span>{t('trust.hero.lastAudit')}: {fmt(SECURITY_DATES.lastSecurityAudit)}</span>
        <span>{t('trust.hero.lastPentest')}: {fmt(SECURITY_DATES.lastPenetrationTest)}</span>
        <span>{t('trust.hero.nextAudit')}: {fmt(SECURITY_DATES.nextScheduledAudit)}</span>
      </div>
    </div>
  );
}

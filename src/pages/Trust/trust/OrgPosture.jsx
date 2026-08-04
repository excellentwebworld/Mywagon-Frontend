/**
 * OrgPosture — live org security from /settings/trust (KYC, team, SSO/MFA, password).
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../hooks/useTheme';
import { ClipboardList, KeyRound, Shield, Lock, ArrowRight, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

function getKycStatus(status) {
  if (status === 'verified' || status === 'accepted') return { level: 'green', icon: CheckCircle, label: status === 'accepted' ? 'verified' : status };
  if (status === 'in_progress' || status === 'action_required' || status === 'pending') {
    return { level: 'amber', icon: AlertTriangle, label: 'in_progress' };
  }
  if (status === 'rejected') return { level: 'red', icon: XCircle, label: 'rejected' };
  return { level: 'red', icon: XCircle, label: 'not_started' };
}

function getComingSoon() {
  return { level: 'amber', icon: Clock, label: 'coming_soon' };
}

function getPwStatus(pw) {
  if (pw?.strength === 'strong') return { level: 'green', icon: CheckCircle };
  if (pw?.strength === 'medium') return { level: 'amber', icon: AlertTriangle };
  return { level: 'red', icon: XCircle };
}

const LEVEL_COLORS = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
};

function mapKycLabel(status) {
  if (status === 'accepted') return 'verified';
  if (status === 'pending') return 'in_progress';
  if (status === 'rejected') return 'rejected';
  return status || 'not_started';
}

export default function OrgPosture({ data }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const posture = data?.org_posture;

  if (!posture) return null;

  const kycLabel = mapKycLabel(posture.kyc?.status);
  const kycSt = getKycStatus(posture.kyc?.status);
  const ssoComing = posture.sso?.status === 'coming_soon' || !posture.sso?.enabled;
  const mfaComing = posture.mfa?.status === 'coming_soon';
  const ssoSt = ssoComing ? getComingSoon() : { level: 'green', icon: CheckCircle, label: 'active' };
  const mfaSt = mfaComing ? getComingSoon() : getComingSoon();
  const pwSt = getPwStatus(posture.password_policy);
  const pw = posture.password_policy;

  const fmt = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const cards = [
    {
      id: 'kyc',
      icon: ClipboardList,
      status: kycSt,
      title: t('trust.org.kyc'),
      lines: [
        t(`trust.org.${kycLabel}`, { defaultValue: kycLabel }),
        posture.kyc?.since ? `${t('trust.org.since')} ${fmt(posture.kyc.since)}` : null,
      ].filter(Boolean),
      action: t('trust.org.viewDetails'),
      route: '/settings/compliance',
    },
    {
      id: 'sso',
      icon: KeyRound,
      status: ssoSt,
      title: t('trust.org.sso'),
      lines: ssoComing
        ? [t('integrations.comingSoon', { defaultValue: 'Coming soon' })]
        : [t('trust.org.active'), posture.sso.provider].filter(Boolean),
      action: t('trust.org.manage'),
      route: '/settings/users',
    },
    {
      id: 'mfa',
      icon: Shield,
      status: mfaSt,
      title: t('trust.org.mfa'),
      lines: mfaComing
        ? [
          t('integrations.comingSoon', { defaultValue: 'Coming soon' }),
          posture.mfa?.note || t('trust.org.otpPlanned', { defaultValue: 'OTP planned for all users' }),
        ]
        : [
          `${posture.mfa.users_with_mfa} / ${posture.mfa.total_users} ${t('trust.org.usersWithMfa')}`,
        ],
      action: t('trust.org.manage'),
      route: '/settings/security',
    },
    {
      id: 'password',
      icon: Lock,
      status: pwSt,
      title: t('trust.org.password'),
      lines: [
        t(`trust.org.${pw?.strength || 'strong'}`),
        `${t('trust.org.minChars', { n: pw?.min_length || 8 })}`,
        pw?.hashing ? String(pw.hashing).toUpperCase() : 'bcrypt',
      ],
      action: t('trust.org.viewPolicy'),
      route: '/settings/security',
    },
  ];

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
        {t('trust.org.title')}
      </h2>
      <p style={{ fontSize: 13, color: T.t2, marginBottom: 16 }}>
        {t('trust.org.subtitle')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => {
          const StatusIcon = card.status.icon;
          const borderColor = LEVEL_COLORS[card.status.level];
          const CardIcon = card.icon;
          return (
            <div
              key={card.id}
              className="rounded-xl p-4 flex flex-col"
              style={{ background: T.sf, border: `1px solid ${T.bd}`, borderLeft: `3px solid ${borderColor}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CardIcon size={16} style={{ color: T.t3 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>{card.title}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <StatusIcon size={14} style={{ color: borderColor }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: borderColor }}>{card.lines[0]}</span>
              </div>
              {card.lines.slice(1).map((line, j) => (
                <div key={j} style={{ fontSize: 12, color: T.t2, marginLeft: 22 }}>{line}</div>
              ))}
              <button
                type="button"
                className="mt-auto flex items-center gap-1 pt-3 cursor-pointer border-none bg-transparent"
                style={{ fontSize: 12, fontWeight: 600, color: T.ac }}
                onClick={() => navigate(card.route)}
              >
                {card.action} <ArrowRight size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

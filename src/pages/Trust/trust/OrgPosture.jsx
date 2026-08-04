/**
 * OrgPosture — Organization security posture section.
 *
 * 4 cards: KYC (live), SSO, MFA, Password Policy.
 * KYC status loaded from /api/shipper/v1/settings/kyc when available.
 *
 * Used by: TrustCenterPage
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../hooks/useTheme';
import { ClipboardList, KeyRound, Shield, Lock, ArrowRight, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { ORG_SECURITY_POSTURE } from '../../../mocks/trustData';
import { kycSettingsService } from '../../../api/services/kycSettingsService';

function getKycStatus(kyc) {
  const status = kyc?.status;
  if (status === 'verified' || status === 'accepted') return { level: 'green', icon: CheckCircle };
  if (status === 'in_progress' || status === 'action_required' || status === 'pending') {
    return { level: 'amber', icon: AlertTriangle };
  }
  return { level: 'red', icon: XCircle };
}

function getSsoStatus(sso) {
  if (sso.enabled) return { level: 'green', icon: CheckCircle };
  return { level: 'red', icon: XCircle };
}

function getMfaStatus(mfa) {
  if (mfa.enforced || mfa.usersWithMfa === mfa.totalUsers) return { level: 'green', icon: CheckCircle };
  if (mfa.usersWithMfa > 0) return { level: 'amber', icon: AlertTriangle };
  return { level: 'red', icon: XCircle };
}

function getPwStatus(pw) {
  if (pw.strength === 'strong') return { level: 'green', icon: CheckCircle };
  if (pw.strength === 'medium') return { level: 'amber', icon: AlertTriangle };
  return { level: 'red', icon: XCircle };
}

const LEVEL_COLORS = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
};

function mapLiveKycLabel(status) {
  if (status === 'accepted') return 'verified';
  if (status === 'pending') return 'in_progress';
  if (status === 'rejected') return 'rejected';
  return 'not_started';
}

export default function OrgPosture() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const posture = ORG_SECURITY_POSTURE;

  const [kycLive, setKycLive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await kycSettingsService.get();
        if (!cancelled) {
          setKycLive({
            status: mapLiveKycLabel(data.kyc_status),
            since: data.kyc_update_date_time,
            renewsAt: null,
          });
        }
      } catch {
        if (!cancelled) setKycLive(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const kyc = kycLive || posture.kyc;
  const kycSt = getKycStatus(kyc);
  const ssoSt = getSsoStatus(posture.sso);
  const mfaSt = getMfaStatus(posture.mfa);
  const pwSt = getPwStatus(posture.passwordPolicy);

  const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const cards = [
    {
      id: 'kyc',
      icon: ClipboardList,
      status: kycSt,
      title: t('trust.org.kyc'),
      lines: [
        `${t(`trust.org.${kyc.status}`, { defaultValue: kyc.status })}`,
        kyc.since ? `${t('trust.org.since')} ${fmt(kyc.since)}` : null,
        kyc.renewsAt ? `${t('trust.org.renews')} ${fmt(kyc.renewsAt)}` : null,
      ].filter(Boolean),
      action: t('trust.org.viewDetails'),
      route: '/settings/compliance',
    },
    {
      id: 'sso',
      icon: KeyRound,
      status: ssoSt,
      title: t('trust.org.sso'),
      lines: posture.sso.enabled
        ? [`${t('trust.org.active')}`, posture.sso.provider, `${posture.sso.usersViaSso} ${t('trust.org.usersViaSso')}`]
        : [t('trust.org.notConfigured')],
      action: t('trust.org.manage'),
      route: '/settings/users',
    },
    {
      id: 'mfa',
      icon: Shield,
      status: mfaSt,
      title: t('trust.org.mfa'),
      lines: [
        `${posture.mfa.usersWithMfa} / ${posture.mfa.totalUsers} ${t('trust.org.usersWithMfa')}`,
        ...(posture.mfa.usersWithMfa < posture.mfa.totalUsers
          ? [`${posture.mfa.totalUsers - posture.mfa.usersWithMfa} ${t('trust.org.withoutMfa')}`]
          : []),
      ],
      action: posture.mfa.enforced ? t('trust.org.manage') : t('trust.org.enforce'),
      route: '/settings/security',
    },
    {
      id: 'password',
      icon: Lock,
      status: pwSt,
      title: t('trust.org.password'),
      lines: [
        t(`trust.org.${posture.passwordPolicy.strength}`),
        `${t('trust.org.minChars', { n: posture.passwordPolicy.minLength })}`,
        [
          posture.passwordPolicy.requireUppercase && t('trust.org.uppercase'),
          posture.passwordPolicy.requireNumbers && t('trust.org.numbers'),
          posture.passwordPolicy.requireSpecial && t('trust.org.special'),
        ].filter(Boolean).join(' + '),
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

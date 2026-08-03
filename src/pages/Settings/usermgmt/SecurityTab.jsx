/**
 * SecurityTab — Security policies, active sessions, password policy, failed logins.
 *
 * Sections:
 * 1. MFA Enforcement toggle
 * 2. Allowed Email Domains
 * 3. Session Timeout
 * 4. Password Policy (min length, uppercase, numbers, special, expiry, reuse)
 * 5. Failed Login Alerts
 * 6. Active Sessions table with revoke actions
 *
 * API dependencies:
 * - GET    /api/v1/security/policies
 * - PATCH  /api/v1/security/policies
 * - GET    /api/v1/security/sessions
 * - DELETE /api/v1/security/sessions/:id
 * - DELETE /api/v1/security/sessions (revoke all)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, Globe, Clock, KeyRound, AlertTriangle,
  Monitor, X, Lightbulb,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { toUpperGreek } from '../../../utils/greekUppercase';
import { SECURITY_POLICIES, ACTIVE_SESSIONS, LOGIN_HISTORY, getUserFullName } from '../../../mocks/userMgmtData';
import { useUserMgmt } from '../../../context/UserMgmtContext';
import SsoCard from './SsoCard';

export default function SecurityTab() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const { users } = useUserMgmt();
  const isGreek = i18n.language === 'el';

  const [policies, setPolicies] = useState({ ...SECURITY_POLICIES, passwordPolicy: { ...SECURITY_POLICIES.passwordPolicy }, failedLoginAlerts: { ...SECURITY_POLICIES.failedLoginAlerts } });
  const [sessions, setSessions] = useState([...ACTIVE_SESSIONS]);
  const [newDomain, setNewDomain] = useState('');

  const updatePolicy = (key, val) => setPolicies(prev => ({ ...prev, [key]: val }));
  const updatePwPolicy = (key, val) => setPolicies(prev => ({
    ...prev,
    passwordPolicy: { ...prev.passwordPolicy, [key]: val },
  }));
  const updateFailedAlerts = (key, val) => setPolicies(prev => ({
    ...prev,
    failedLoginAlerts: { ...prev.failedLoginAlerts, [key]: val },
  }));

  const revokeSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success(t('userMgmt.security.sessionRevoked'));
  };

  const revokeAll = () => {
    setSessions(prev => prev.slice(0, 1)); // keep only current
    toast.success(t('userMgmt.security.allRevoked'));
  };

  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return t('userMgmt.table.justNow');
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  /* ── Policy strength ── */
  const pw = policies.passwordPolicy;
  const strengthScore = (pw.minLength >= 12 ? 1 : 0) + (pw.requireUppercase ? 1 : 0) + (pw.requireNumbers ? 1 : 0) + (pw.requireSpecial ? 1 : 0);
  const strengthLabel = strengthScore >= 3 ? t('userMgmt.security.strong') : strengthScore >= 2 ? t('userMgmt.security.moderate') : t('userMgmt.security.weak');
  const strengthColor = strengthScore >= 3 ? '#10B981' : strengthScore >= 2 ? '#F59E0B' : '#EF4444';

  const sectionTitle = (text) => isGreek ? toUpperGreek(text) : text;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── 0. Single Sign-On (SSO) ── */}
      <SsoCard />

      {/* ── 1. MFA Enforcement ── */}
      <Section icon={ShieldCheck} title={sectionTitle(t('userMgmt.security.mfaTitle'))} T={T}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold" style={{ fontSize: 13, color: T.t1 }}>{t('userMgmt.security.enforceMfa')}</div>
            <div style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.security.enforceMfaDesc')}</div>
          </div>
          <Toggle on={policies.mfaEnforced} onChange={(v) => updatePolicy('mfaEnforced', v)} T={T} />
        </div>
      </Section>

      {/* ── 2. Email Domains ── */}
      <Section icon={Globe} title={sectionTitle(t('userMgmt.security.domainsTitle'))} T={T}>
        <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{t('userMgmt.security.domainsDesc')}</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {policies.allowedDomains.map((d, i) => (
            <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: T.al, fontSize: 12, color: T.ac, fontWeight: 500 }}>
              @{d}
              <button onClick={() => updatePolicy('allowedDomains', policies.allowedDomains.filter((_, j) => j !== i))}
                className="cursor-pointer border-none bg-transparent p-0" style={{ color: T.t3 }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value.toLowerCase().replace(/^@/, ''))}
            placeholder={t('userMgmt.security.domainPlaceholder')}
            className="flex-1 px-3 py-1.5 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12, maxWidth: 220 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newDomain.trim() && newDomain.includes('.')) {
                updatePolicy('allowedDomains', [...policies.allowedDomains, newDomain.trim()]);
                setNewDomain('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newDomain.trim() && newDomain.includes('.')) {
                updatePolicy('allowedDomains', [...policies.allowedDomains, newDomain.trim()]);
                setNewDomain('');
              }
            }}
            className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: T.ac, color: '#fff', fontSize: 11, opacity: newDomain.trim() && newDomain.includes('.') ? 1 : 0.4 }}
          >
            {t('userMgmt.security.addDomain')}
          </button>
        </div>
      </Section>

      {/* ── 3. Session Timeout ── */}
      <Section icon={Clock} title={sectionTitle(t('userMgmt.security.sessionTitle'))} T={T}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 12, color: T.t1 }}>{t('userMgmt.security.timeoutAfter')}</span>
          <select
            value={policies.sessionTimeout}
            onChange={(e) => updatePolicy('sessionTimeout', Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }}
          >
            {[1, 2, 4, 8, 12, 24].map(h => (
              <option key={h} value={h}>{h} {t('userMgmt.security.hours')}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* ── 4. Password Policy ── */}
      <Section icon={KeyRound} title={sectionTitle(t('userMgmt.security.passwordTitle'))} T={T}>
        <div className="space-y-3">
          <Row label={t('userMgmt.security.minLength')} T={T}>
            <input type="number" min={6} max={32} value={pw.minLength}
              onChange={(e) => updatePwPolicy('minLength', Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-lg outline-none text-center"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
            <span style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.security.characters')}</span>
          </Row>
          <ToggleRow label={t('userMgmt.security.requireUpper')} on={pw.requireUppercase} onChange={(v) => updatePwPolicy('requireUppercase', v)} T={T} />
          <ToggleRow label={t('userMgmt.security.requireNumbers')} on={pw.requireNumbers} onChange={(v) => updatePwPolicy('requireNumbers', v)} T={T} />
          <ToggleRow label={t('userMgmt.security.requireSpecial')} on={pw.requireSpecial} onChange={(v) => updatePwPolicy('requireSpecial', v)} T={T} />
          <Row label={t('userMgmt.security.passwordExpiry')} T={T}>
            <input type="number" min={0} max={365} value={pw.expiryDays}
              onChange={(e) => updatePwPolicy('expiryDays', Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-lg outline-none text-center"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
            <span style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.security.days')}</span>
          </Row>
          <Row label={t('userMgmt.security.preventReuse')} T={T}>
            <input type="number" min={0} max={20} value={pw.preventReuse}
              onChange={(e) => updatePwPolicy('preventReuse', Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-lg outline-none text-center"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
            <span style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.security.passwords')}</span>
          </Row>

          {/* Strength indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.sa }}>
            <Lightbulb size={14} style={{ color: strengthColor }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
            <span style={{ fontSize: 11, color: T.t3 }}>
              — {pw.minLength}+ {t('userMgmt.security.charsWith')}{pw.requireUppercase ? ` ${t('userMgmt.security.uppercase')}` : ''}{pw.requireNumbers ? ` ${t('userMgmt.security.numbers')}` : ''}{pw.requireSpecial ? ` ${t('userMgmt.security.special')}` : ''}
            </span>
          </div>
        </div>
      </Section>

      {/* ── 5. Failed Login Alerts ── */}
      <Section icon={AlertTriangle} title={sectionTitle(t('userMgmt.security.failedTitle'))} T={T}>
        <div className="space-y-3">
          <Row label={t('userMgmt.security.alertAfter')} T={T}>
            <input type="number" min={1} max={20} value={policies.failedLoginAlerts.threshold}
              onChange={(e) => updateFailedAlerts('threshold', Number(e.target.value))}
              className="w-14 px-2 py-1 rounded-lg outline-none text-center"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
            <span style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.security.attemptsIn')}</span>
            <input type="number" min={1} max={24} value={policies.failedLoginAlerts.windowHours}
              onChange={(e) => updateFailedAlerts('windowHours', Number(e.target.value))}
              className="w-14 px-2 py-1 rounded-lg outline-none text-center"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
            <span style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.security.hours')}</span>
          </Row>

          <div className="space-y-1.5">
            {[
              { key: 'notify_only', label: t('userMgmt.security.notifyOnly') },
              { key: 'lock_temp', label: t('userMgmt.security.lockTemp') },
              { key: 'lock_perm', label: t('userMgmt.security.lockPerm') },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="failedAction" checked={policies.failedLoginAlerts.action === opt.key}
                  onChange={() => updateFailedAlerts('action', opt.key)} />
                <span style={{ fontSize: 12, color: T.t1 }}>{opt.label}</span>
              </label>
            ))}
          </div>

          {policies.failedLoginAlerts.action === 'lock_temp' && (
            <Row label={t('userMgmt.security.lockDuration')} T={T}>
              <input type="number" min={5} max={1440} value={policies.failedLoginAlerts.lockMinutes}
                onChange={(e) => updateFailedAlerts('lockMinutes', Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-lg outline-none text-center"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
              <span style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.security.minutes')}</span>
            </Row>
          )}
        </div>
      </Section>

      {/* ── 6. Active Sessions ── */}
      <Section icon={Monitor} title={sectionTitle(t('userMgmt.security.sessionsTitle'))} T={T}>
        <div className="flex justify-end mb-2">
          <button onClick={revokeAll} className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 11 }}>
            {t('userMgmt.security.revokeAll')}
          </button>
        </div>
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
              <Monitor size={16} style={{ color: i === 0 ? '#10B981' : T.t3 }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ fontSize: 12, color: T.t1 }}>{s.userName}</div>
                <div style={{ fontSize: 11, color: T.t3 }}>{s.device} · {s.city} · {s.ip}</div>
              </div>
              <span style={{ fontSize: 11, color: T.t3, whiteSpace: 'nowrap' }}>{relativeTime(s.started)}</span>
              {i > 0 && (
                <button onClick={() => revokeSession(s.id)} className="px-2 py-1 rounded cursor-pointer border-none" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 10, fontWeight: 600 }}>
                  {t('userMgmt.security.revoke')}
                </button>
              )}
              {i === 0 && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#10B981', fontSize: 10, fontWeight: 600 }}>
                  {t('userMgmt.security.current')}
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── 7. Login history (all users) — PDS-937 ── */}
      <Section icon={Clock} title={sectionTitle(t('userMgmt.security.loginHistoryAllTitle'))} T={T}>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{t('userMgmt.security.loginHistoryAllDesc')}</p>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {users.flatMap((u) => {
            const entries = LOGIN_HISTORY[u.id] || [];
            if (entries.length === 0) {
              return [{
                key: `${u.id}-empty`,
                user: u,
                empty: true,
              }];
            }
            return entries.map((entry, idx) => ({
              key: `${u.id}-${idx}-${entry.ts}`,
              user: u,
              entry,
              empty: false,
            }));
          }).sort((a, b) => {
            if (a.empty || b.empty) return a.empty ? 1 : -1;
            return new Date(b.entry.ts).getTime() - new Date(a.entry.ts).getTime();
          }).slice(0, 50).map((row) => (
            <div key={row.key} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: row.empty ? T.sa : (row.entry.ok ? T.sa : '#FEF2F2'),
                border: `1px solid ${row.empty ? T.bd : (row.entry.ok ? T.bd : '#FECACA')}`,
              }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: row.empty ? T.t3 : (row.entry.ok ? '#10B981' : '#EF4444') }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{getUserFullName(row.user)}</div>
                {row.empty ? (
                  <div style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.empty.noLoginHistory')}</div>
                ) : (
                  <div style={{ fontSize: 11, color: T.t3 }}>
                    {row.entry.device} · {row.entry.city} · {row.entry.ip}
                  </div>
                )}
              </div>
              {!row.empty && (
                <>
                  <span style={{ fontSize: 11, color: T.t3, whiteSpace: 'nowrap' }}>{relativeTime(row.entry.ts)}</span>
                  {!row.entry.ok && (
                    <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, background: '#FECACA', color: '#991B1B' }}>
                      {t('userMgmt.drawer.failedLogin')}
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ── Shared sub-components ── */

function Section({ icon: Icon, title, children, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="rounded-xl p-4" style={{ background: theme.sf, border: `1px solid ${theme.bd}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: theme.ac }} />
        <h3 className="font-bold" style={{ fontSize: 14, color: theme.t1 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, T }) {
  const { T: theme } = useTheme();
  return (
    <button onClick={() => onChange(!on)} className="relative cursor-pointer border-none rounded-full shrink-0" style={{ width: 44, height: 24, background: on ? theme.ac : theme.bd, padding: 0 }}>
      <span className="absolute rounded-full bg-white shadow" style={{ width: 20, height: 20, top: 2, left: on ? 22 : 2, transition: 'left 0.2s' }} />
    </button>
  );
}

function Row({ label, children, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0" style={{ fontSize: 12, color: theme.t1, minWidth: 160 }}>{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({ label, on, onChange, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: theme.t1 }}>{label}</span>
      <Toggle on={on} onChange={onChange} T={theme} />
    </div>
  );
}

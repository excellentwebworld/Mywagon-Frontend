/**
 * SsoCard — Single Sign-On card for the User Management Security tab.
 *
 * States:
 * - Not configured: description + benefits + [Set up SSO] button
 * - Active: provider info, connection health, sign-in stats, SCIM provisioning,
 *   certificate expiry warning, [Edit] [Test] [Disable] actions
 *
 * Includes inline 5-step setup wizard modal.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, Copy, Check, X, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle, ExternalLink, RefreshCw, Settings,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { SSO_CONFIG, SSO_PROVIDERS, DOMAIN_VERIFICATION_TOKEN } from '../../../mocks/ssoData';
import { toUpperGreek } from '../../../utils/greekUppercase';
import { relativeTime } from '../../../mocks/settingsData';

export default function SsoCard() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const isGreek = i18n.language === 'el';

  const [sso, setSso] = useState({ ...SSO_CONFIG });
  const [showWizard, setShowWizard] = useState(false);

  const certDaysLeft = sso.enabled ? Math.ceil((new Date(sso.idp.certificateExpiry) - Date.now()) / 86400000) : 0;
  const sectionTitle = (text) => isGreek ? toUpperGreek(text) : text;

  const handleDisable = () => {
    setSso(prev => ({ ...prev, enabled: false }));
    toast.success(t('userMgmt.sso.toast.deactivated'));
  };

  const handleActivate = () => {
    setSso(prev => ({ ...prev, enabled: true }));
    setShowWizard(false);
    toast.success(t('userMgmt.sso.toast.activated'));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    toast.success(t('userMgmt.sso.copied'));
  };

  return (
    <>
      <div className="rounded-xl p-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: T.ac }} />
            <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>
              {sectionTitle(t('userMgmt.sso.title'))}
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-full" style={{
            fontSize: 10, fontWeight: 700,
            background: sso.enabled ? '#ECFDF5' : T.sa,
            color: sso.enabled ? '#10B981' : T.t3,
          }}>
            {sso.enabled ? t('userMgmt.sso.active') : t('userMgmt.sso.notConfigured')}
          </span>
        </div>

        {/* ── Certificate expiry warning ── */}
        {sso.enabled && certDaysLeft < 30 && certDaysLeft > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: 12, color: '#92400E' }}>
              {t('userMgmt.sso.health.certWarning', { days: certDaysLeft })}
            </span>
          </div>
        )}

        {!sso.enabled ? (
          /* ── NOT CONFIGURED ── */
          <div>
            <p style={{ fontSize: 12, color: T.t3, marginBottom: 12, lineHeight: 1.6 }}>
              {t('userMgmt.sso.description')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {['oneClick', 'centralized', 'scim', 'mfaByIdp'].map(b => (
                <div key={b} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.sa }}>
                  <CheckCircle size={12} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: 11, color: T.t1 }}>{t(`userMgmt.sso.benefits.${b}`)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowWizard(true)}
              className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
              style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
              {t('userMgmt.sso.setupBtn')}
            </button>
          </div>
        ) : (
          /* ── ACTIVE ── */
          <div className="space-y-4">
            {/* Provider info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <InfoBox label={t('userMgmt.sso.provider')} value={sso.providerLabel} T={T} />
              <InfoBox label={t('userMgmt.sso.protocol')} value={sso.protocol.toUpperCase()} T={T} />
              <InfoBox label={t('userMgmt.sso.domainLabel')} value={`${sso.domain} ✅`} T={T} />
              <InfoBox label={t('userMgmt.sso.enforcement')} value={t(`userMgmt.sso.enforce.${sso.enforcement}`)} T={T} />
            </div>

            {sso.exceptionEmails.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.sso.enforce.backupAccounts')}:</span>
                {sso.exceptionEmails.map(e => (
                  <span key={e} className="px-2 py-0.5 rounded-full" style={{ fontSize: 11, background: T.al, color: T.ac, fontWeight: 500 }}>{e}</span>
                ))}
              </div>
            )}

            {/* Connection health */}
            <div>
              <div className="font-semibold mb-2" style={{ fontSize: 11, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('userMgmt.sso.health.title')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <InfoBox label={t('userMgmt.sso.health.lastSuccess')} value={`${relativeTime(sso.health.lastSuccessfulLogin.timestamp)} (${sso.health.lastSuccessfulLogin.user})`} T={T} />
                <InfoBox label={t('userMgmt.sso.health.lastFailed')} value={sso.health.lastFailedLogin.reason} T={T} />
                <InfoBox label={t('userMgmt.sso.health.certExpiry')} value={`${sso.idp.certificateExpiry} (${certDaysLeft}d)`} warn={certDaysLeft < 30} T={T} />
              </div>
            </div>

            {/* Stats */}
            <div>
              <div className="font-semibold mb-2" style={{ fontSize: 11, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('userMgmt.sso.stats.title')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <InfoBox label={t('userMgmt.sso.stats.ssoLogins')} value={String(sso.stats.ssoLogins30d)} T={T} />
                <InfoBox label={t('userMgmt.sso.stats.passwordLogins')} value={String(sso.stats.passwordLogins30d)} T={T} />
                <InfoBox label={t('userMgmt.sso.stats.failedSso')} value={String(sso.stats.failedSso30d)} T={T} />
                <InfoBox label={t('userMgmt.sso.stats.newViaScim')} value={String(sso.stats.newUsersScim)} T={T} />
              </div>
            </div>

            {/* SCIM */}
            {sso.provisioning.scimEnabled && (
              <div>
                <div className="font-semibold mb-2" style={{ fontSize: 11, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('userMgmt.sso.scim.title')}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <InfoBox label={t('userMgmt.sso.scim.status')} value="✅ Active" T={T} />
                  <InfoBox label={t('userMgmt.sso.scim.synced')} value={`${sso.provisioning.usersSynced} / ${sso.provisioning.totalUsers}`} T={T} />
                  <InfoBox label={t('userMgmt.sso.scim.lastSync')} value={relativeTime(sso.provisioning.lastSync)} T={T} />
                  <InfoBox label={t('userMgmt.sso.scim.defaultRole')} value={sso.provisioning.defaultRole} T={T} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => setShowWizard(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
                <Settings size={12} /> {t('userMgmt.sso.actions.edit')}
              </button>
              <button onClick={() => toast.success(t('userMgmt.sso.toast.tested'))} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
                <RefreshCw size={12} /> {t('userMgmt.sso.actions.test')}
              </button>
              <button onClick={handleDisable} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 12 }}>
                {t('userMgmt.sso.actions.disable')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Setup Wizard Modal ── */}
      {showWizard && (
        <SsoSetupWizard
          onClose={() => setShowWizard(false)}
          onActivate={handleActivate}
          sso={sso}
          copyToClipboard={copyToClipboard}
        />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SSO SETUP WIZARD — 5-step modal
   ══════════════════════════════════════════════════════════════ */
function SsoSetupWizard({ onClose, onActivate, sso, copyToClipboard }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState(sso.provider || '');
  const [metadataUrl, setMetadataUrl] = useState(sso.idp?.metadataUrl || '');
  const [domainMethod, setDomainMethod] = useState('dns');
  const [domainVerified, setDomainVerified] = useState(sso.domainVerified || false);
  const [enforcement, setEnforcement] = useState(sso.enforcement || 'optional');
  const [backupEmail, setBackupEmail] = useState(sso.exceptionEmails?.[0] || '');
  const [testResult, setTestResult] = useState(null);
  const [scimEnabled, setScimEnabled] = useState(sso.provisioning?.scimEnabled || false);

  const STEPS = [
    t('userMgmt.sso.setup.step1'),
    t('userMgmt.sso.setup.step2'),
    t('userMgmt.sso.setup.step3'),
    t('userMgmt.sso.setup.step4'),
    t('userMgmt.sso.setup.step5'),
  ];

  const selectedProvider = SSO_PROVIDERS.find(p => p.key === provider);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div>
            <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{t('userMgmt.sso.setup.title')}</h3>
            <p style={{ fontSize: 12, color: T.t3 }}>{STEPS[step - 1]}</p>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="flex items-center justify-center rounded-full" style={{
                  width: 22, height: 22, fontSize: 10, fontWeight: 700,
                  background: step > i + 1 ? '#10B981' : step === i + 1 ? T.ac : T.bd,
                  color: step >= i + 1 ? '#fff' : T.t3,
                }}>
                  {step > i + 1 ? '✓' : i + 1}
                </span>
                {i < 4 && <div className="w-4 h-0.5" style={{ background: step > i + 1 ? '#10B981' : T.bd }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1: Choose Provider */}
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SSO_PROVIDERS.map(p => (
                <button key={p.key} onClick={() => setProvider(p.key)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer border-none text-center transition-all"
                  style={{
                    background: provider === p.key ? `${T.ac}08` : T.sa,
                    border: provider === p.key ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
                  }}>
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <span className="font-semibold" style={{ fontSize: 12, color: T.t1 }}>{p.label}</span>
                  <span style={{ fontSize: 10, color: T.t3 }}>{p.protocol.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Connection Config */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('userMgmt.sso.sp.title')}</div>
              {[
                { label: 'ACS / Reply URL', value: sso.sp.acsUrl },
                { label: 'Entity ID', value: sso.sp.entityId },
                { label: 'Sign-on URL', value: sso.sp.signOnUrl },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.t3 }}>{row.label}</div>
                    <div className="truncate" style={{ fontSize: 12, color: T.t1, fontFamily: 'monospace' }}>{row.value}</div>
                  </div>
                  <button onClick={() => copyToClipboard(row.value)} className="shrink-0 cursor-pointer border-none bg-transparent"><Copy size={13} style={{ color: T.t3 }} /></button>
                </div>
              ))}

              <div className="font-semibold mt-4 mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('userMgmt.sso.idp.title')}</div>
              <div>
                <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('userMgmt.sso.idp.metadataUrl')}</label>
                <div className="flex gap-2">
                  <input value={metadataUrl} onChange={(e) => setMetadataUrl(e.target.value)}
                    placeholder="https://login.microsoftonline.com/..."
                    className="flex-1 px-3 py-2 rounded-lg outline-none"
                    style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12, fontFamily: 'monospace' }} />
                  <button onClick={() => toast.success(t('userMgmt.sso.idp.autoConfigured'))}
                    className="px-3 py-2 rounded-lg cursor-pointer border-none font-semibold shrink-0"
                    style={{ background: T.ac, color: '#fff', fontSize: 11 }}>
                    {t('userMgmt.sso.idp.autoConfig')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Domain Verification */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: 12, color: T.t1 }}>{t('userMgmt.sso.domain.domain')}: <strong>{sso.domain}</strong></span>
                {domainVerified && <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: '#ECFDF5', color: '#10B981' }}>✅ {t('userMgmt.sso.domain.verified')}</span>}
              </div>

              {!domainVerified && (
                <>
                  {['dns', 'html', 'email'].map(m => (
                    <label key={m} className="flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer" style={{ background: domainMethod === m ? T.al : T.sa, border: `1px solid ${domainMethod === m ? T.ac + '40' : T.bd}` }}>
                      <input type="radio" name="domainMethod" checked={domainMethod === m} onChange={() => setDomainMethod(m)} className="mt-0.5" />
                      <div>
                        <div className="font-semibold" style={{ fontSize: 12, color: T.t1 }}>{t(`userMgmt.sso.domain.method_${m}`)}</div>
                        <div style={{ fontSize: 11, color: T.t3 }}>{t(`userMgmt.sso.domain.method_${m}_desc`)}</div>
                      </div>
                    </label>
                  ))}

                  {domainMethod === 'dns' && (
                    <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontFamily: 'monospace', fontSize: 11, color: T.t1, border: `1px solid ${T.bd}` }}>
                      <div style={{ color: T.t3, fontFamily: 'inherit' }}>TXT Record:</div>
                      _myvagon-verification.{sso.domain}<br />
                      {DOMAIN_VERIFICATION_TOKEN}
                    </div>
                  )}

                  <button onClick={() => { setDomainVerified(true); toast.success(t('userMgmt.sso.domain.verifiedToast')); }}
                    className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
                    style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
                    {t('userMgmt.sso.domain.verify')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 4: Attribute Mapping */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('userMgmt.sso.mapping.title')}</div>
              {[
                { field: 'email', label: t('userMgmt.sso.mapping.email'), required: true },
                { field: 'firstName', label: t('userMgmt.sso.mapping.firstName') },
                { field: 'lastName', label: t('userMgmt.sso.mapping.lastName') },
                { field: 'phone', label: t('userMgmt.sso.mapping.phone') },
                { field: 'department', label: t('userMgmt.sso.mapping.department') },
                { field: 'jobTitle', label: t('userMgmt.sso.mapping.jobTitle') },
              ].map(row => (
                <div key={row.field} className="flex items-center gap-3">
                  <span className="shrink-0" style={{ fontSize: 12, color: T.t1, width: 140 }}>
                    {row.label} {row.required && <span style={{ color: '#EF4444' }}>*</span>}
                  </span>
                  <span style={{ color: T.t3 }}>←</span>
                  <select className="flex-1 px-3 py-1.5 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }}
                    defaultValue={sso.attributeMapping[row.field] || ''}>
                    <option value="email">email</option>
                    <option value="givenName">givenName</option>
                    <option value="surname">surname</option>
                    <option value="telephoneNumber">telephoneNumber</option>
                    <option value="department">department</option>
                    <option value="jobTitle">jobTitle</option>
                    <option value="custom">Custom…</option>
                  </select>
                </div>
              ))}

              {/* SCIM toggle */}
              <div className="mt-4 px-3 py-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold" style={{ fontSize: 12, color: T.t1 }}>{t('userMgmt.sso.scim.enable')}</div>
                    <div style={{ fontSize: 11, color: T.t3 }}>{t('userMgmt.sso.scim.desc')}</div>
                  </div>
                  <button onClick={() => setScimEnabled(!scimEnabled)} className="relative cursor-pointer border-none rounded-full shrink-0" style={{ width: 44, height: 24, background: scimEnabled ? T.ac : T.bd, padding: 0 }}>
                    <span className="absolute rounded-full bg-white shadow" style={{ width: 20, height: 20, top: 2, left: scimEnabled ? 22 : 2, transition: 'left 0.2s' }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Test & Enforce */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Test */}
              <div className="px-4 py-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                <button onClick={() => setTestResult({ success: true, email: 'pavlos@vikos.com', attrs: ['email', 'firstName', 'lastName', 'department'] })}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold mb-3"
                  style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
                  🧪 {t('userMgmt.sso.test.testBtn')}
                </button>
                {testResult && (
                  <div className="px-3 py-2 rounded-lg" style={{ background: testResult.success ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${testResult.success ? '#A7F3D0' : '#FECACA'}` }}>
                    <div className="font-semibold mb-1" style={{ fontSize: 12, color: testResult.success ? '#047857' : '#991B1B' }}>
                      {testResult.success ? `✅ ${t('userMgmt.sso.test.success')}` : `❌ ${t('userMgmt.sso.test.failed')}`}
                    </div>
                    {testResult.success && (
                      <div style={{ fontSize: 11, color: '#047857' }}>
                        {t('userMgmt.sso.test.signedInAs')}: {testResult.email}<br />
                        {t('userMgmt.sso.test.attributes')}: {testResult.attrs.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Enforcement */}
              <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('userMgmt.sso.enforce.title')}</div>
              {[
                { key: 'optional', desc: t('userMgmt.sso.enforce.optionalDesc') },
                { key: 'required', desc: t('userMgmt.sso.enforce.requiredDesc') },
                { key: 'required_with_exceptions', desc: t('userMgmt.sso.enforce.backupDesc') },
              ].map(opt => (
                <label key={opt.key} className="flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer" style={{ background: enforcement === opt.key ? T.al : T.sa, border: `1px solid ${enforcement === opt.key ? T.ac + '40' : T.bd}` }}>
                  <input type="radio" name="enforce" checked={enforcement === opt.key} onChange={() => setEnforcement(opt.key)} className="mt-0.5" />
                  <div>
                    <div className="font-semibold" style={{ fontSize: 12, color: T.t1 }}>{t(`userMgmt.sso.enforce.${opt.key}`)}</div>
                    <div style={{ fontSize: 11, color: T.t3 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}

              {enforcement === 'required_with_exceptions' && (
                <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                  <div className="font-semibold mb-2" style={{ fontSize: 11, color: T.t2 }}>{t('userMgmt.sso.enforce.backupAccounts')}</div>
                  <input value={backupEmail} onChange={(e) => setBackupEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full px-3 py-1.5 rounded-lg outline-none"
                    style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 13 }}>
              <ChevronLeft size={14} /> {t('common.back')}
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 13 }}>
              {t('common.cancel')}
            </button>
          )}
          {step < 5 ? (
            <button onClick={() => setStep(step + 1)}
              disabled={step === 1 && !provider}
              className="flex items-center gap-1 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
              style={{ background: (step === 1 && !provider) ? T.bd : T.ac, color: '#fff', fontSize: 13 }}>
              {t('common.next')} <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={onActivate} className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 13 }}>
              {t('userMgmt.sso.actions.activate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── InfoBox ── */
function InfoBox({ label, value, warn, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: theme.sa }}>
      <div style={{ fontSize: 10, color: theme.t3, fontWeight: 600 }}>{label}</div>
      <div className="truncate" style={{ fontSize: 12, fontWeight: 600, color: warn ? '#F59E0B' : theme.t1 }}>{value}</div>
    </div>
  );
}

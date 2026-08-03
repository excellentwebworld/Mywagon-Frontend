/**
 * Settings — ported from MV_Web_Panel_React (shipper adaptations:
 * - Appearance: navigation mode + dark/light only (theme picker removed per PDS-937)
 * - Section paths under ./sections
 * - Active section driven by URL: /settings/:section (survives refresh)
 * - Users & Roles tabs: /settings/users[/roles]
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  User, Building2, Users, Lock, CreditCard, Star,
  Zap, ClipboardList, Bell, Palette, Clock, Sun, Moon,
  Bot, Globe, FileText, ExternalLink, ShieldCheck,
  PanelLeft, PanelTop,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { LANGUAGES } from '../../constants/panel';
import { useApp } from '../../context/AppContext';
import UserManagementSection from './UserManagementPage';
import PersonalSection from './sections/PersonalSection';
import OrganizationSection from './sections/OrganizationSection';
import PersonalSecuritySection from './sections/PersonalSecuritySection';
import KycSection from './sections/KycSection';
import PoliciesSection from './sections/PoliciesSection';
import AuditLogSection from './sections/AuditLogSection';
import IntegrationsSection from './sections/IntegrationsSection';
import AiSettingsSection from './sections/AiSettingsSection';
import NotificationsSection from './sections/NotificationsSection';
import { KYC_OVERALL, POLICIES, POLICY_ACCEPTANCES } from '../../mocks/complianceData';

const DEFAULT_SECTION = 'personal';

const MENU = [
  { group: 'settings.groupPersonal', items: [
    { id: 'personal', icon: User, labelKey: 'settings.personal' },
    { id: 'security', icon: Lock, labelKey: 'settings.security' },
    { id: 'notifications', icon: Bell, labelKey: 'settings.notificationSettings' },
    { id: 'appearance', icon: Palette, labelKey: 'settings.appearance' },
    { id: 'language', icon: Globe, labelKey: 'topbar.language' },
  ]},
  { group: 'settings.groupAdmin', items: [
    { id: 'organization', icon: Building2, labelKey: 'settings.organization' },
    { id: 'users', icon: Users, labelKey: 'settings.usersRoles' },
    { id: 'subscription', icon: Star, labelKey: 'settings.subscription' },
    { id: 'billing', icon: CreditCard, labelKey: 'settings.billingSettings' },
  ]},
  { group: 'settings.groupTools', items: [
    { id: 'integrations', icon: Zap, labelKey: 'settings.integrations' },
    { id: 'aiSettings', icon: Bot, labelKey: 'settings.aiSettings' },
  ]},
  { group: 'settings.groupLegal', items: [
    { id: 'trustCenter', icon: ShieldCheck, labelKey: 'settings.securityTrust', link: '/trust' },
    { id: 'compliance', icon: ClipboardList, labelKey: 'settings.complianceKyc' },
    { id: 'legal', icon: FileText, labelKey: 'settings.agreements' },
    { id: 'audit', icon: Clock, labelKey: 'settings.auditLog' },
  ]},
];

const BUILT = new Set([
  'appearance', 'aiSettings', 'language', 'legal', 'users', 'personal',
  'organization', 'security', 'compliance', 'audit', 'integrations', 'notifications',
]);

const SECTION_IDS = new Set(
  MENU.flatMap((g) => g.items)
    .filter((i) => !('link' in i && i.link))
    .map((i) => i.id),
);

function isValidSection(id: string | undefined): id is string {
  return !!id && SECTION_IDS.has(id);
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { T, isDark, toggleDark, navMode, setNavMode } = useTheme();
  const { setLang } = useApp();
  const navigate = useNavigate();
  const { section: sectionParam } = useParams<{ section?: string; tab?: string }>();

  const sectionValid = isValidSection(sectionParam);
  const activeSection = sectionValid ? sectionParam : DEFAULT_SECTION;

  const setActiveSection = useCallback((id: string) => {
    if (!SECTION_IDS.has(id)) return;
    navigate(`/settings/${id}`);
  }, [navigate]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const allItems = useMemo(() => MENU.flatMap((g) => g.items), []);
  const activeItem = allItems.find((i) => i.id === activeSection);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeSection]);

  const kycNeedsAttention = KYC_OVERALL.percent < 100;
  const [pendingPolicyCount, setPendingPolicyCount] = useState(() => {
    return POLICIES.filter((p: { applicable?: boolean; isToggle?: boolean; id: string }) => {
      if (!p.applicable || p.isToggle) return false;
      const acc = (POLICY_ACCEPTANCES as Record<string, { current?: boolean } | undefined>)[p.id];
      return !acc || !acc.current;
    }).length;
  });
  const BADGES: Record<string, boolean> = {
    compliance: kycNeedsAttention,
    legal: pendingPolicyCount > 0,
  };

  const changeLanguage = (code: string, dir: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = dir;
    if (code === 'en' || code === 'el') {
      setLang(code);
    }
  };

  // /settings or unknown slug → canonical URL
  if (!sectionValid) {
    return <Navigate to={`/settings/${DEFAULT_SECTION}`} replace />;
  }

  return (
    <div className="settings-layout">
      {/* Mobile settings nav */}
      <div className="settings-nav-mobile">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border-none"
          style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t1 }}
        >
          <div className="flex items-center gap-2">
            {activeItem && <activeItem.icon size={16} style={{ color: T.ac }} />}
            <span className="font-semibold" style={{ fontSize: 14 }}>
              {activeItem ? t(activeItem.labelKey) : t('settings.title')}
            </span>
          </div>
          <LucideIcons.ChevronDown
            size={16}
            style={{ color: T.t3, transform: mobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </button>
        {mobileMenuOpen && (
          <div
            className="mt-2 rounded-xl overflow-hidden shadow-lg"
            style={{ background: T.sf, border: `1px solid ${T.bd}`, maxHeight: 400, overflowY: 'auto' }}
          >
            {MENU.map((group) => (
              <div key={group.group}>
                <div
                  className="px-4 pt-3 pb-1"
                  style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: T.t3 }}
                >
                  {t(group.group)}
                </div>
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      if ('link' in item && item.link) navigate(item.link);
                      else setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 cursor-pointer border-none transition-all duration-150"
                    style={{
                      background: activeSection === item.id ? T.al : 'transparent',
                      color: activeSection === item.id ? T.ac : T.t1,
                      fontSize: 13,
                      fontWeight: activeSection === item.id ? 600 : 400,
                    }}
                  >
                    <item.icon size={16} />
                    <span>{t(item.labelKey)}</span>
                    {'link' in item && item.link && <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop left menu — Personal / Admin / Tools / Compliance */}
      <div className="settings-nav-desktop">
        {MENU.map((group, gi) => (
          <div key={group.group}>
            {gi > 0 && <div className="my-2" style={{ borderTop: `1px solid ${T.bd}` }} />}
            <div
              className="px-3 pt-3 pb-1"
              style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: T.t3 }}
            >
              {t(group.group)}
            </div>
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => ('link' in item && item.link ? navigate(item.link) : setActiveSection(item.id))}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer border-none mb-0.5 transition-all duration-150"
                style={{
                  background: activeSection === item.id ? T.al : 'transparent',
                  color: activeSection === item.id ? T.ac : T.t1,
                  fontSize: 13,
                  fontWeight: activeSection === item.id ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== item.id) {
                    e.currentTarget.style.background = T.sa;
                    e.currentTarget.style.paddingLeft = '14px';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.paddingLeft = '12px';
                  }
                }}
              >
                <item.icon size={16} />
                <span className="truncate">{t(item.labelKey)}</span>
                {'link' in item && item.link && <ExternalLink size={11} style={{ marginLeft: 'auto', opacity: 0.35 }} />}
                {!('link' in item && item.link) && BADGES[item.id] && (
                  <span className="ml-auto w-2 h-2 rounded-full shrink-0" style={{ background: '#EF4444' }} />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        className="settings-content"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}
      >
        {activeSection === 'appearance' && (
          <div>
            <h2 className="font-bold mb-6" style={{ fontSize: 18, color: T.t1 }}>{t('settings.appearance')}</h2>

            <div className="mb-8">
              <div className="font-semibold mb-3" style={{ fontSize: 13, color: T.t2 }}>
                {t('settings.navigationMode') || 'Navigation mode'}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                {(
                  [
                    { key: 'sidebar' as const, icon: PanelLeft, labelKey: 'settings.sidebarMode', descKey: 'settings.sidebarDesc', fallback: 'Sidebar', descFallback: 'Classic left sidebar navigation' },
                    { key: 'top' as const, icon: PanelTop, labelKey: 'settings.topMenuMode', descKey: 'settings.topMenuDesc', fallback: 'Top menu', descFallback: 'Horizontal top bar with dropdown menus' },
                  ]
                ).map((mode) => (
                  <button
                    type="button"
                    key={mode.key}
                    onClick={() => setNavMode(mode.key)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 min-w-0"
                    style={{
                      border: navMode === mode.key ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
                      background: navMode === mode.key ? T.al : T.sf,
                      color: navMode === mode.key ? T.ac : T.t1,
                    }}
                  >
                    <mode.icon size={20} className="shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-semibold" style={{ fontSize: 13 }}>
                        {t(mode.labelKey) || mode.fallback}
                      </div>
                      <div style={{ fontSize: 11, color: T.t3 }}>
                        {t(mode.descKey) || mode.descFallback}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between max-w-md">
              <div>
                <div className="font-semibold" style={{ fontSize: 14, color: T.t1 }}>{t('settings.darkModeToggle')}</div>
                <div style={{ fontSize: 12, color: T.t3 }}>{t('settings.darkModeDesc')}</div>
              </div>
              <button
                type="button"
                onClick={toggleDark}
                className="relative cursor-pointer border-none rounded-full shrink-0"
                style={{ width: 48, height: 26, background: isDark ? T.ac : T.bd, padding: 0 }}
              >
                <span
                  className="absolute rounded-full bg-white shadow flex items-center justify-center"
                  style={{ width: 22, height: 22, top: 2, left: isDark ? 24 : 2, transition: 'left 0.2s' }}
                >
                  {isDark ? <Moon size={12} style={{ color: T.ac }} /> : <Sun size={12} style={{ color: T.t3 }} />}
                </span>
              </button>
            </div>
          </div>
        )}

        {activeSection === 'integrations' && <IntegrationsSection />}
        {activeSection === 'aiSettings' && <AiSettingsSection />}

        {activeSection === 'language' && (
          <div>
            <h2 className="font-bold" style={{ fontSize: 18, color: T.t1 }}>{t('topbar.language')}</h2>
            <p style={{ fontSize: 12, color: T.t3, marginTop: 4, marginBottom: 20 }}>
              {t('settings.languageSection.subtitle', {
                defaultValue: 'Choose your preferred language for the shipper panel. English and Greek are available.',
              })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              {LANGUAGES.map((lang) => {
                const selected = (i18n.language || '').startsWith(lang.code);
                return (
                  <button
                    type="button"
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code, lang.dir)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150 text-left"
                    style={{
                      border: selected ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
                      background: selected ? T.al : T.sf,
                      color: selected ? T.ac : T.t1,
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    <span
                      className="inline-flex items-center justify-center rounded-md font-bold shrink-0"
                      style={{
                        width: 36,
                        height: 28,
                        fontSize: 11,
                        letterSpacing: 0.4,
                        background: selected ? T.ac : T.sa,
                        color: selected ? '#fff' : T.t2,
                      }}
                    >
                      {lang.tag}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span style={{ fontSize: 14 }}>{lang.nativeLabel}</span>
                      <span style={{ fontSize: 11, color: T.t3, fontWeight: 400 }}>
                        {t(`settings.languageSection.${lang.code}`, { defaultValue: lang.label })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeSection === 'compliance' && <KycSection />}
        {activeSection === 'legal' && <PoliciesSection onPendingChange={setPendingPolicyCount} />}
        {activeSection === 'audit' && <AuditLogSection />}
        {activeSection === 'personal' && <PersonalSection />}
        {activeSection === 'organization' && <OrganizationSection />}
        {activeSection === 'security' && <PersonalSecuritySection />}
        {activeSection === 'notifications' && <NotificationsSection />}
        {activeSection === 'users' && <UserManagementSection />}

        {!BUILT.has(activeSection) && (
          <div className="flex flex-col items-center justify-center py-16">
            {(() => {
              const f = MENU.flatMap((g) => g.items).find((i) => i.id === activeSection);
              return f ? <f.icon size={32} style={{ color: T.ac }} /> : null;
            })()}
            <h3 className="font-semibold mt-3" style={{ fontSize: 15, color: T.t1 }}>
              {t(MENU.flatMap((g) => g.items).find((i) => i.id === activeSection)?.labelKey || 'settings.title')}
            </h3>
            <p style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>{t('settings.fullSettings')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

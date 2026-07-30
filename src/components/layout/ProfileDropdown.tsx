/**
 * ProfileDropdown — click-triggered (shipper UX), visual match to MV_Web_Panel.
 * Dev-tools / multi-role switcher omitted for shipper SPA.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, ChevronDown, LogOut, Building2,
  CreditCard, Star, HelpCircle,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useApp } from '../../context/AppContext';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { LANGUAGES } from '../../constants/panel';
import { THEMES, type ThemeKey } from '../../utils/themes';

export function ProfileDropdown() {
  const { t, i18n, lang } = useTranslation();
  const { setLang, showToast } = useApp();
  const { T, theme, isDark, setTheme, toggleDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const menuRef = useOutsideClick<HTMLDivElement>(() => {
    setOpen(false);
    setLangOpen(false);
  }, open);

  const currentLang =
    LANGUAGES.find((l) => l.code === (i18n.language || lang)) || LANGUAGES[0];

  const displayName = `${user.firstName} ${user.lastName}`.trim();
  // Match reference TopBar: always use gradient initials (no broken photo placeholders)
  const initials = user.initials || 'SV';

  const changeLang = (code: string, dir: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = dir || 'ltr';
    if (code === 'en' || code === 'el') setLang(code);
    setLangOpen(false);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      setSignOutConfirmOpen(false);
      navigate('/login');
    } catch {
      showToast(t('failedToLogout') || 'Failed to logout', 'error');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative" style={{ zIndex: 200 }}>
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer border-none transition-all duration-200"
          aria-label={t('topbar.profile') || t('profile')}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => {
            setOpen(!open);
            setLangOpen(false);
          }}
          style={{ background: open ? T.sa : 'transparent' }}
        >
          <div
            className="flex items-center justify-center rounded-full text-white font-semibold overflow-hidden"
            style={{
              width: 32,
              height: 32,
              background: `linear-gradient(135deg, ${T.grad1}, ${T.grad2})`,
              fontSize: 11,
            }}
          >
            {initials}
          </div>
          <ChevronDown size={12} style={{ color: T.t3 }} />
        </button>

        {open && (
          <div className="absolute right-0 top-full pt-1" style={{ zIndex: 200 }}>
            <div
              className="rounded-xl shadow-xl overflow-hidden"
              role="menu"
              style={{ background: T.sf, border: `1px solid ${T.bd}`, width: 300 }}
            >
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold shrink-0 overflow-hidden"
                  style={{
                    width: 38,
                    height: 38,
                    background: `linear-gradient(135deg, ${T.grad1}, ${T.grad2})`,
                    fontSize: 13,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <div className="font-semibold" style={{ fontSize: 13, color: T.t1 }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{t('roles.shipper') || t('shipper') || 'Shipper'}</div>
                </div>
              </div>

              <div className="py-1" role="group" style={{ borderBottom: `1px solid ${T.bd}` }}>
                {[
                  { icon: Building2, label: t('topbar.companyInfo') || 'Company info', route: '/settings' },
                  { icon: CreditCard, label: t('sidebar.billing') || t('billing') || 'Billing', route: '/billing' },
                  { icon: Star, label: t('sidebar.subscription') || t('navSubscription') || 'Subscription', route: '/subscription' },
                  { icon: HelpCircle, label: t('sidebar.support') || t('support') || 'Support', route: '/support' },
                ].map((link) => (
                  <button
                    type="button"
                    key={link.route}
                    onClick={() => {
                      navigate(link.route);
                      setOpen(false);
                    }}
                    role="menuitem"
                    className="flex items-center gap-2 w-full px-4 py-2 cursor-pointer border-none transition-all duration-200"
                    style={{ background: 'transparent', color: T.t1, fontSize: 13 }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.sa;
                      e.currentTarget.style.paddingLeft = '18px';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.paddingLeft = '16px';
                    }}
                  >
                    <link.icon size={15} style={{ color: T.t2 }} />
                    {link.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
                <div className="flex items-center gap-2">
                  {isDark ? <Moon size={15} style={{ color: T.t2 }} /> : <Sun size={15} style={{ color: T.t2 }} />}
                  <span style={{ fontSize: 13, color: T.t1 }}>
                    {isDark ? (t('topbar.darkMode') || 'Dark mode') : (t('topbar.lightMode') || 'Light mode')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleDark}
                  aria-label={isDark ? t('topbar.lightMode') : t('topbar.darkMode')}
                  className="relative cursor-pointer border-none rounded-full"
                  style={{ width: 38, height: 22, background: isDark ? T.ac : T.bd, transition: 'background 0.2s', padding: 0 }}
                >
                  <span
                    className="absolute top-0.5 rounded-full bg-white shadow"
                    style={{ width: 18, height: 18, left: isDark ? 18 : 2, transition: 'left 0.2s' }}
                  />
                </button>
              </div>

              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>
                  {t('topbar.theme') || 'Theme'}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([key, themeObj]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setTheme(key)}
                      className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg cursor-pointer transition-all duration-200"
                      style={{
                        border: theme === key ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
                        background: theme === key ? T.al : 'transparent',
                        fontSize: 10,
                        fontWeight: 500,
                        color: T.t2,
                      }}
                    >
                      <div className="flex gap-0.5">
                        {themeObj.preview.map((color, i) => (
                          <span key={i} className="rounded-full" style={{ width: 12, height: 12, background: color }} />
                        ))}
                      </div>
                      <span className="truncate">{themeObj.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>
                  {t('topbar.language') || 'Language'}
                </div>
                <button
                  type="button"
                  onClick={() => setLangOpen(!langOpen)}
                  aria-expanded={langOpen}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg cursor-pointer border-none"
                  style={{ background: T.sa, color: T.t1, fontSize: 13 }}
                >
                  <div className="flex items-center gap-2">
                    <span>{currentLang.flag}</span>
                    <span>{currentLang.label}</span>
                  </div>
                  <ChevronDown
                    size={12}
                    style={{
                      opacity: 0.5,
                      transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                {langOpen && (
                  <div
                    className="mt-2 rounded-lg overflow-hidden"
                    style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${T.bd}` }}
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        type="button"
                        key={l.code}
                        onClick={() => changeLang(l.code, l.dir)}
                        className="flex items-center gap-2 w-full px-3 py-1.5 cursor-pointer border-none transition-all duration-150"
                        style={{
                          background: (i18n.language || lang) === l.code ? T.al : 'transparent',
                          color: (i18n.language || lang) === l.code ? T.ac : T.t1,
                          fontSize: 12,
                          fontWeight: (i18n.language || lang) === l.code ? 600 : 400,
                        }}
                      >
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSignOutConfirmOpen(true);
                }}
                role="menuitem"
                className="flex items-center gap-2 w-full px-4 py-3 cursor-pointer border-none transition-all duration-200"
                style={{ background: 'transparent', color: '#EF4444', fontSize: 13, fontWeight: 500 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FEF2F2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut size={15} /> {t('topbar.logout') || t('signOut') || 'Log Out'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={signOutConfirmOpen}
        onClose={() => !isSigningOut && setSignOutConfirmOpen(false)}
        onConfirm={confirmSignOut}
        title={t('signOutConfirmTitle') || 'Sign out?'}
        message={t('signOutConfirmMessage') || 'Are you sure you want to sign out?'}
        confirmText={t('signOut') || 'Sign out'}
        type="danger"
        confirmLoading={isSigningOut}
      />
    </>
  );
}

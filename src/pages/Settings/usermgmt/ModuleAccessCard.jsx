/**
 * ModuleAccessCard — Visual grid showing which sidebar pages a user can access.
 *
 * Derives access from the user's effective permissions using MODULE_ACCESS_MAP.
 * Each module shows ✅ or ⛔ with the module name.
 * Clicking a module name scrolls to the corresponding permission group (when in edit mode).
 *
 * Used by: UserDrawer
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { resolveModuleAccess, getEffectivePermissions } from '../../../mocks/userMgmtData';

const MODULE_KEYS = [
  'dashboard', 'shipments', 'orders', 'addressBook',
  'products', 'partners', 'fleet', 'priceLists',
  'billing', 'analytics', 'settings', 'userManagement',
];

export default function ModuleAccessCard({ user, onScrollToGroup }) {
  const { t } = useTranslation();
  const { T } = useTheme();

  const access = useMemo(() => {
    const perms = getEffectivePermissions(user);
    return resolveModuleAccess(perms);
  }, [user]);

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5, marginBottom: 8 }}>
        {t('userMgmt.drawer.moduleAccess')}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {MODULE_KEYS.map(mod => {
          const hasAccess = access[mod];
          return (
            <button
              key={mod}
              onClick={() => onScrollToGroup?.(mod)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer border-none text-left transition-all duration-100"
              style={{
                background: hasAccess ? `${T.ac}08` : T.sa,
                border: `1px solid ${hasAccess ? `${T.ac}20` : T.bd}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = hasAccess ? `${T.ac}14` : T.sh; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = hasAccess ? `${T.ac}08` : T.sa; }}
            >
              <span style={{ fontSize: 13 }}>{hasAccess ? '✅' : '⛔'}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: hasAccess ? T.t1 : T.t3 }}>
                {t(`userMgmt.moduleAccess.${mod}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

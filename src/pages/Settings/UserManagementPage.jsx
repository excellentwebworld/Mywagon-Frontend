/**
 * UserManagementSection — Orchestrator for the User Management module.
 *
 * Tabs are URL-driven (PDS-937):
 *   /settings/users           → Users
 *   /settings/users/roles     → Roles
 *   /settings/users/audit     → Audit Log
 *
 * User edit uses the Invite/Edit popup (no separate page).
 * Security tab removed (mock-only; live login history pending).
 */

import { useCallback, memo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Shield, Clock } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { toUpperGreek } from '../../utils/greekUppercase';
import SeatBanner from './usermgmt/SeatBanner';
import UsersTab from './usermgmt/UsersTab';
import RolesTab from './usermgmt/RolesTab';
import AuditTab from './usermgmt/AuditTab';

const TABS = [
  { id: 'users', Icon: Users },
  { id: 'roles', Icon: Shield },
  { id: 'audit', Icon: Clock },
];

const TAB_IDS = new Set(TABS.map((t) => t.id));

function resolveTab(tabParam) {
  if (!tabParam || tabParam === 'users') return 'users';
  if (TAB_IDS.has(tabParam)) return tabParam;
  return null;
}

function tabPath(id) {
  return id === 'users' ? '/settings/users' : `/settings/users/${id}`;
}

function UserManagementSection() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const activeTab = resolveTab(tabParam);
  const isGreek = i18n.language === 'el';

  const handleTabClick = useCallback(
    (id) => {
      navigate(tabPath(id));
    },
    [navigate],
  );

  if (!activeTab) {
    return <Navigate to="/settings/users" replace />;
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 500 }}>
      <h2 className="font-bold mb-1" style={{ fontSize: 18, color: T.t1 }}>
        {t('userMgmt.title')}
      </h2>
      <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>
        {t('userMgmt.subtitle')}
      </p>

      <SeatBanner />

      <div
        className="flex gap-0 overflow-x-auto mt-4"
        style={{ borderBottom: `2px solid ${T.bd}` }}
      >
        {TABS.map(({ id, Icon }) => {
          const active = activeTab === id;
          const label = t(`userMgmt.tabs.${id}`);
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabClick(id)}
              className="flex items-center gap-2 px-4 py-2.5 shrink-0 cursor-pointer border-none transition-all duration-150"
              style={{
                background: 'transparent',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? T.ac : T.t3,
                borderBottom: `2px solid ${active ? T.ac : 'transparent'}`,
                marginBottom: -2,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = T.t1; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = T.t3; }}
            >
              <Icon size={15} />
              <span>{isGreek ? toUpperGreek(label) : label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 mt-4">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

export default memo(UserManagementSection);

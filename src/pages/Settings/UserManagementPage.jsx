/**
 * UserManagementSection — Orchestrator for the User Management module.
 *
 * Renders INLINE within Settings.jsx right panel (not as a separate route).
 * When the user clicks "Users & Roles" in the Settings left menu, this
 * component renders in the same content area as other settings sections.
 *
 * 4 tabs:
 * 1. Users — table + filters + bulk actions + user drawer
 * 2. Roles & Permissions — 2-pane role editor
 * 3. Security — policies + sessions + password policy + failed logins
 * 4. Audit Log — filtered timeline + export
 *
 * API dependencies:
 * - GET /api/v1/users
 * - GET /api/v1/roles
 * - GET /api/v1/security/policies
 * - GET /api/v1/audit-log
 */

import { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Shield, Lock, Clock } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { toUpperGreek } from '../../utils/greekUppercase';
import SeatBanner from './usermgmt/SeatBanner';
import UsersTab from './usermgmt/UsersTab';
import RolesTab from './usermgmt/RolesTab';
import SecurityTab from './usermgmt/SecurityTab';
import AuditTab from './usermgmt/AuditTab';

const TABS = [
  { id: 'users', Icon: Users },
  { id: 'roles', Icon: Shield },
  { id: 'security', Icon: Lock },
  { id: 'audit', Icon: Clock },
];

function UserManagementSection() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const [activeTab, setActiveTab] = useState('users');
  const isGreek = i18n.language === 'el';

  const handleTabClick = useCallback((id) => setActiveTab(id), []);

  return (
    <div className="flex flex-col" style={{ minHeight: 500 }}>
      {/* ─── Title + Seat Banner ─── */}
      <h2 className="font-bold mb-1" style={{ fontSize: 18, color: T.t1 }}>
        {t('userMgmt.title')}
      </h2>
      <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>
        {t('userMgmt.subtitle')}
      </p>

      <SeatBanner />

      {/* ─── Tab Bar ─── */}
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

      {/* ─── Tab Content ─── */}
      <div className="flex-1 mt-4">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

export default memo(UserManagementSection);

/**
 * RolesTab — Admin / Dispatcher role packs from live Spatie API.
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Pencil, X, Check, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { toUpperGreek } from '../../../utils/greekUppercase';
import PermissionGrid from './PermissionGrid';
import { useUserMgmt } from '../../../context/UserMgmtContext';
import { rolesSettingsService } from '../../../api/services/rolesSettingsService';
import { ApiError } from '../../../api/client';

export default function RolesTab() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const { users, roles, setRoles, setPermissionGroups, loading } = useUserMgmt();
  const isGreek = i18n.language === 'el';

  const [selectedKey, setSelectedKey] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editPerms, setEditPerms] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedKey && roles.length) {
      setSelectedKey(roles[0].key);
    }
  }, [roles, selectedKey]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.key === selectedKey),
    [roles, selectedKey],
  );

  const usersOnRole = useMemo(() => {
    if (!selectedRole) return [];
    return users.filter((u) => u.role === selectedRole.key && u.status !== 'deactivated');
  }, [selectedRole, users]);

  const startEdit = () => {
    if (!selectedRole) return;
    setEditPerms(selectedRole.permissions === null ? null : [...(selectedRole.permission_names || selectedRole.permissions || [])]);
    setAutoEnabled(new Set());
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditPerms(null);
    setPermSearch('');
  };

  const saveEdit = async () => {
    if (!selectedRole || editPerms === null) {
      // Admin pack is locked to full catalog on backend; skip empty save for admin.
      if (selectedRole?.key === 'admin') {
        cancelEdit();
        return;
      }
    }
    setSaving(true);
    try {
      const payload = selectedRole.key === 'admin'
        ? (editPerms || [])
        : (editPerms || []);
      const data = await rolesSettingsService.update(selectedRole.key, payload);
      setRoles(data.roles || []);
      setPermissionGroups(data.groups || []);
      cancelEdit();
      toast.success(t('userMgmt.toast.roleSaved'));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !roles.length) {
    return <div className="py-16 text-center" style={{ color: T.t3 }}>{t('common.loading', { defaultValue: 'Loading…' })}</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: 400 }}>
      <div className="shrink-0 md:w-[280px]">
        <div className="mb-3 flex items-center justify-between">
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.t3 }}>
            {isGreek
              ? toUpperGreek(t('userMgmt.roles.presetsTitle'))
              : t('userMgmt.roles.presetsTitle')
            }
          </span>
        </div>

        <div className="space-y-1 mb-3">
          {roles.map((role) => {
            const sel = selectedKey === role.key;
            const count = role.userCount ?? role.user_count ?? 0;
            return (
              <button
                type="button"
                key={role.key}
                onClick={() => { setSelectedKey(role.key); cancelEdit(); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg cursor-pointer border-none text-left transition-all duration-150"
                style={{
                  background: sel ? T.al : 'transparent',
                  border: sel ? `1px solid ${T.ac}40` : '1px solid transparent',
                }}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate" style={{ fontSize: 13, color: sel ? T.ac : T.t1 }}>
                      {role.name}
                    </span>
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: `${T.ac}15`, color: T.ac }}
                    >
                      {t('userMgmt.roles.system')}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: T.t3 }}>
                    {role.permissions === null
                      ? t('userMgmt.invite.allPermissions')
                      : t('userMgmt.invite.permCount', { n: (role.permission_names || role.permissions || []).length })
                    }
                    {' · '}
                    {t('userMgmt.roles.userCount', { n: sel ? Math.max(count, usersOnRole.length) : count })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {selectedRole ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full" style={{ background: selectedRole.color }} />
                <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{selectedRole.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <button
                    type="button"
                    onClick={startEdit}
                    disabled={selectedRole.key === 'admin'}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold transition-opacity"
                    style={{
                      background: selectedRole.key === 'admin' ? T.sa : T.ac,
                      color: selectedRole.key === 'admin' ? T.t3 : '#fff',
                      fontSize: 12,
                      opacity: selectedRole.key === 'admin' ? 0.7 : 1,
                    }}
                    title={selectedRole.key === 'admin' ? t('userMgmt.roles.adminLocked', { defaultValue: 'Admin always has all permissions' }) : undefined}
                  >
                    <Pencil size={12} /> {t('common.edit')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
                      style={{ background: T.ac, color: '#fff', fontSize: 12 }}
                    >
                      <Check size={12} /> {t('common.save')}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                      style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}
                    >
                      <X size={12} /> {t('common.cancel')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectedRole.description && (
              <p style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{selectedRole.description}</p>
            )}

            {editing && usersOnRole.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: 12, color: '#92400E' }}>
                  {t('userMgmt.roles.affectsUsers', { n: usersOnRole.length })}
                </span>
              </div>
            )}

            {editing && (
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
                <input
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder={t('userMgmt.roles.searchPermissions')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg outline-none"
                  style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }}
                />
              </div>
            )}

            <PermissionGrid
              permissions={editing ? editPerms : selectedRole.permissions}
              editing={editing && selectedRole.key !== 'admin'}
              onChange={setEditPerms}
              autoEnabledKeys={autoEnabled}
              onAutoEnabled={setAutoEnabled}
              searchQuery={permSearch}
              defaultCollapsed={!editing}
            />
          </>
        ) : (
          <div className="flex items-center justify-center py-20" style={{ color: T.t3, fontSize: 13 }}>
            {t('userMgmt.roles.selectRole')}
          </div>
        )}
      </div>
    </div>
  );
}

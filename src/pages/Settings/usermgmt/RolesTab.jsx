/**
 * RolesTab — 2-pane role editor (sidebar 280px + permission grid).
 *
 * Features:
 * - Role sidebar with account-type indicator, System/Custom badges
 * - View mode: compact ✅/⛔ permission summary
 * - Edit mode: full PermissionGrid with dependency enforcement
 * - Create / duplicate / delete role flows
 * - Warning when editing a role with assigned users
 * - Permission search
 * - "Who has this permission?" user count in view mode
 *
 * API dependencies:
 * - GET    /api/v1/roles
 * - POST   /api/v1/roles
 * - PATCH  /api/v1/roles/:id
 * - DELETE /api/v1/roles/:id
 * - POST   /api/v1/roles/:id/duplicate
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Copy, Trash2, Search, Pencil, X, Check, AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { toUpperGreek } from '../../../utils/greekUppercase';
import PermissionGrid from './PermissionGrid';
import {
  SHIPPER_ROLES,
  ALL_PERMISSION_KEYS,
} from '../../../mocks/userMgmtData';
import { useUserMgmt } from '../../../context/UserMgmtContext';

export default function RolesTab() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const { users } = useUserMgmt();
  const isGreek = i18n.language === 'el';

  // PDS-937: Admin / Dispatcher permission templates only (not backend Spatie roles yet)
  const [roles, setRoles] = useState(() => SHIPPER_ROLES.map((r) => ({ ...r })));
  const [selectedId, setSelectedId] = useState(roles[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const [editPerms, setEditPerms] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3B82F6');

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedId),
    [roles, selectedId],
  );

  const usersOnRole = useMemo(() => {
    if (!selectedRole) return [];
    return users.filter((u) => u.role === selectedRole.key && u.status !== 'deactivated');
  }, [selectedRole, users]);

  /* ─── Editing ─── */
  const startEdit = () => {
    if (!selectedRole) return;
    setEditPerms(selectedRole.permissions ? [...selectedRole.permissions] : null);
    setAutoEnabled(new Set());
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setEditPerms(null); setPermSearch(''); };

  const saveEdit = () => {
    if (!selectedRole) return;
    setRoles(prev => prev.map(r =>
      r.id === selectedRole.id ? { ...r, permissions: editPerms } : r
    ));
    setEditing(false);
    setEditPerms(null);
    setPermSearch('');
    toast.success(t('userMgmt.toast.roleSaved'));
  };

  /* ─── Create ─── */
  const handleCreate = () => {
    if (!newRoleName.trim()) return;
    const newRole = {
      id: `role-custom-${Date.now()}`,
      key: newRoleName.trim().toLowerCase().replace(/\s+/g, '_'),
      name: newRoleName.trim(),
      color: newRoleColor,
      isSystem: false,
      description: '',
      permissions: [],
      userCount: 0,
    };
    setRoles(prev => [...prev, newRole]);
    setSelectedId(newRole.id);
    setShowCreate(false);
    setNewRoleName('');
    toast.success(t('userMgmt.toast.roleCreated'));
  };

  /* ─── Duplicate ─── */
  const handleDuplicate = () => {
    if (!selectedRole) return;
    const dup = {
      ...selectedRole,
      id: `role-dup-${Date.now()}`,
      key: `${selectedRole.key}_copy`,
      name: `${selectedRole.name} (Copy)`,
      isSystem: false,
      userCount: 0,
    };
    setRoles(prev => [...prev, dup]);
    setSelectedId(dup.id);
    toast.success(t('userMgmt.toast.roleDuplicated'));
  };

  /* ─── Delete ─── */
  const handleDelete = () => {
    if (!selectedRole) return;
    if (selectedRole.userCount > 0 || usersOnRole.length > 0) {
      toast.error(t('userMgmt.roles.cannotDelete', { n: usersOnRole.length }));
      return;
    }
    setRoles(prev => prev.filter(r => r.id !== selectedRole.id));
    setSelectedId(roles[0]?.id || null);
    toast.success(t('userMgmt.toast.roleDeleted'));
  };

  const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#8B5CF6'];

  return (
    <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: 400 }}>

      {/* ─── Role Sidebar (280px) ─── */}
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
          {roles.map(role => {
            const sel = selectedId === role.id;
            return (
              <button
                key={role.id}
                onClick={() => { setSelectedId(role.id); cancelEdit(); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg cursor-pointer border-none text-left transition-all duration-150"
                style={{
                  background: sel ? T.al : 'transparent',
                  border: sel ? `1px solid ${T.ac}40` : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = T.sa; }}
                onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate" style={{ fontSize: 13, color: sel ? T.ac : T.t1 }}>
                      {role.name}
                    </span>
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background: role.isSystem ? `${T.ac}15` : `${T.t3}15`,
                        color: role.isSystem ? T.ac : T.t3,
                      }}
                    >
                      {role.isSystem ? t('userMgmt.roles.system') : t('userMgmt.roles.custom')}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: T.t3 }}>
                    {role.permissions === null
                      ? t('userMgmt.invite.allPermissions')
                      : t('userMgmt.invite.permCount', { n: role.permissions.length })
                    }
                    {' · '}
                    {t('userMgmt.roles.userCount', { n: usersOnRole.length > 0 && role.id === selectedId ? usersOnRole.length : role.userCount })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg cursor-pointer border-none transition-all duration-150"
          style={{ background: T.sa, border: `1px dashed ${T.bd}`, color: T.ac, fontSize: 13, fontWeight: 500 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.al; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.sa; }}
        >
          <Plus size={14} /> {t('userMgmt.roles.createRole')}
        </button>

        {/* Create inline form */}
        {showCreate && (
          <div className="mt-2 p-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder={t('userMgmt.roles.roleName')}
              className="w-full px-2.5 py-1.5 rounded-lg outline-none mb-2"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }}
              autoFocus
            />
            <div className="flex gap-1 mb-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewRoleColor(c)}
                  className="w-5 h-5 rounded-full cursor-pointer border-none"
                  style={{ background: c, outline: newRoleColor === c ? `2px solid ${T.ac}` : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 px-2 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 11 }}>
                {t('common.create')}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-2 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Permission Grid (right pane) ─── */}
      <div className="flex-1 min-w-0">
        {selectedRole ? (
          <>
            {/* Role header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full" style={{ background: selectedRole.color }} />
                <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{selectedRole.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <>
                    <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold transition-opacity" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
                      <Pencil size={12} /> {t('common.edit')}
                    </button>
                    <button onClick={handleDuplicate} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
                      <Copy size={12} /> {t('userMgmt.roles.duplicate')}
                    </button>
                    {!selectedRole.isSystem && (
                      <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 12 }}>
                        <Trash2 size={12} /> {t('common.delete')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
                      <Check size={12} /> {t('common.save')}
                    </button>
                    <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
                      <X size={12} /> {t('common.cancel')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectedRole.description && (
              <p style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{selectedRole.description}</p>
            )}

            {/* Warning if users assigned */}
            {editing && usersOnRole.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: 12, color: '#92400E' }}>
                  {t('userMgmt.roles.affectsUsers', { n: usersOnRole.length })}
                </span>
              </div>
            )}

            {/* Permission search */}
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

            {/* Grid */}
            <PermissionGrid
              permissions={editing ? editPerms : selectedRole.permissions}
              editing={editing}
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

/**
 * RolesTab — Admin / Dispatcher from live API + custom Add role (design parity).
 * System roles save via API; custom roles persist locally until backend supports them.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Pencil, X, Check, AlertTriangle, Plus, Copy, Trash2,
} from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { toUpperGreek } from '../../../utils/greekUppercase';
import PermissionGrid from './PermissionGrid';
import { useUserMgmt } from '../../../context/UserMgmtContext';
import { rolesSettingsService } from '../../../api/services/rolesSettingsService';
import { ApiError } from '../../../api/client';

const CUSTOM_ROLES_KEY = 'mv_shipper_custom_roles';
const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#8B5CF6'];

function loadCustomRoles() {
  try {
    const raw = localStorage.getItem(CUSTOM_ROLES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomRoles(roles) {
  try {
    localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
  } catch {
    /* ignore quota */
  }
}

export default function RolesTab() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const { users, roles: apiRoles, setRoles: setApiRoles, setPermissionGroups, loading } = useUserMgmt();
  const isGreek = i18n.language === 'el';

  const [customRoles, setCustomRoles] = useState(loadCustomRoles);
  const [selectedKey, setSelectedKey] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editPerms, setEditPerms] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3B82F6');
  const [nameError, setNameError] = useState('');

  const persistCustom = useCallback((next) => {
    setCustomRoles(next);
    saveCustomRoles(next);
  }, []);

  const roles = useMemo(() => [...(apiRoles || []), ...customRoles], [apiRoles, customRoles]);

  useEffect(() => {
    if (!selectedKey && roles.length) {
      setSelectedKey(roles[0].key);
    }
  }, [roles, selectedKey]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.key === selectedKey),
    [roles, selectedKey],
  );

  const isSystem = !!(selectedRole?.isSystem || selectedRole?.is_system);
  const isCustom = selectedRole && !isSystem;

  const usersOnRole = useMemo(() => {
    if (!selectedRole) return [];
    return users.filter((u) => u.role === selectedRole.key && u.status !== 'deactivated');
  }, [selectedRole, users]);

  const startEdit = () => {
    if (!selectedRole) return;
    if (selectedRole.key === 'admin') return;
    setEditPerms(
      selectedRole.permissions === null
        ? []
        : [...(selectedRole.permission_names || selectedRole.permissions || [])],
    );
    setAutoEnabled(new Set());
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditPerms(null);
    setPermSearch('');
  };

  const saveEdit = async () => {
    if (!selectedRole) return;

    if (isCustom) {
      const next = customRoles.map((r) => (
        r.key === selectedRole.key
          ? { ...r, permissions: editPerms || [], permission_names: editPerms || [] }
          : r
      ));
      persistCustom(next);
      cancelEdit();
      toast.success(t('userMgmt.toast.roleSaved'));
      return;
    }

    setSaving(true);
    try {
      const data = await rolesSettingsService.update(selectedRole.key, editPerms || []);
      setApiRoles(data.roles || []);
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

  const handleCreate = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setNameError(t('userMgmt.roles.nameRequired', { defaultValue: 'Role name is required.' }));
      return;
    }
    const key = trimmed.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!key) {
      setNameError(t('userMgmt.roles.nameInvalid', { defaultValue: 'Enter a valid role name using letters or numbers.' }));
      return;
    }
    if (roles.some((r) => r.key === key || String(r.name || r.label || '').trim().toLowerCase() === trimmed.toLowerCase())) {
      setNameError(t('userMgmt.roles.nameTaken', { defaultValue: 'A role with this name already exists.' }));
      return;
    }
    const newRole = {
      id: `role-custom-${Date.now()}`,
      key,
      name: trimmed,
      label: trimmed,
      color: newRoleColor,
      isSystem: false,
      is_system: false,
      description: '',
      permissions: [],
      permission_names: [],
      userCount: 0,
      user_count: 0,
    };
    persistCustom([...customRoles, newRole]);
    setSelectedKey(newRole.key);
    setShowCreate(false);
    setNewRoleName('');
    setNewRoleColor('#3B82F6');
    setNameError('');
    toast.success(t('userMgmt.toast.roleCreated'));
  };

  const handleDuplicate = () => {
    if (!selectedRole) return;
    const baseKey = `${selectedRole.key}_copy`;
    let key = baseKey;
    let i = 2;
    while (roles.some((r) => r.key === key)) {
      key = `${baseKey}_${i++}`;
    }
    const dup = {
      ...selectedRole,
      id: `role-dup-${Date.now()}`,
      key,
      name: `${selectedRole.name} (Copy)`,
      label: `${selectedRole.name} (Copy)`,
      isSystem: false,
      is_system: false,
      permissions: selectedRole.permissions === null
        ? []
        : [...(selectedRole.permission_names || selectedRole.permissions || [])],
      permission_names: selectedRole.permissions === null
        ? []
        : [...(selectedRole.permission_names || selectedRole.permissions || [])],
      userCount: 0,
      user_count: 0,
    };
    persistCustom([...customRoles, dup]);
    setSelectedKey(dup.key);
    cancelEdit();
    toast.success(t('userMgmt.toast.roleDuplicated'));
  };

  const handleDelete = () => {
    if (!selectedRole || isSystem) return;
    if (usersOnRole.length > 0) {
      toast.error(t('userMgmt.roles.cannotDelete', { n: usersOnRole.length }));
      return;
    }
    const next = customRoles.filter((r) => r.key !== selectedRole.key);
    persistCustom(next);
    const remaining = [...(apiRoles || []), ...next];
    setSelectedKey(remaining[0]?.key || null);
    cancelEdit();
    toast.success(t('userMgmt.toast.roleDeleted'));
  };

  if (loading && !apiRoles.length) {
    const sk = { baseColor: T.sa, highlightColor: T.bd };
    return (
      <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: 400 }} aria-busy="true">
        <div className="shrink-0 md:w-[280px] space-y-2">
          <Skeleton width={160} height={10} borderRadius={4} {...sk} />
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl p-3" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
              <Skeleton width={100} height={14} borderRadius={4} {...sk} />
              <div style={{ marginTop: 8 }}>
                <Skeleton width={140} height={11} borderRadius={4} {...sk} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-xl p-4 space-y-3" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
          <Skeleton width={220} height={14} borderRadius={4} {...sk} />
          <Skeleton width="80%" height={12} borderRadius={4} {...sk} />
        </div>
      </div>
    );
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
            const system = !!(role.isSystem || role.is_system);
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
                      style={{
                        background: system ? `${T.ac}15` : `${T.t3}15`,
                        color: system ? T.ac : T.t3,
                      }}
                    >
                      {system ? t('userMgmt.roles.system') : t('userMgmt.roles.custom')}
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

        <button
          type="button"
          onClick={() => { setShowCreate(true); setNameError(''); }}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg cursor-pointer border-none transition-all duration-150"
          style={{ background: T.sa, border: `1px dashed ${T.bd}`, color: T.ac, fontSize: 13, fontWeight: 500 }}
        >
          <Plus size={14} /> {t('userMgmt.roles.createRole')}
        </button>

        {showCreate && (
          <div className="mt-2 p-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
            <input
              value={newRoleName}
              onChange={(e) => {
                setNewRoleName(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder={t('userMgmt.roles.roleName')}
              className="w-full px-2.5 py-1.5 rounded-lg outline-none"
              style={{
                border: `1px solid ${nameError ? '#EF4444' : T.bd}`,
                background: T.sf,
                color: T.t1,
                fontSize: 12,
                marginBottom: nameError ? 4 : 8,
              }}
              autoFocus
              aria-invalid={Boolean(nameError)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />
            {!!nameError && (
              <div style={{ color: '#DC2626', fontSize: 11, marginBottom: 8, lineHeight: 1.35 }}>
                {nameError}
              </div>
            )}
            <div className="flex gap-1 mb-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewRoleColor(c)}
                  className="w-5 h-5 rounded-full cursor-pointer border-none"
                  style={{ background: c, outline: newRoleColor === c ? `2px solid ${T.ac}` : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 px-2 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
                style={{ background: T.ac, color: '#fff', fontSize: 11 }}
              >
                {t('common.create', { defaultValue: 'Create' })}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewRoleName(''); setNameError(''); }}
                className="px-2 py-1.5 rounded-lg cursor-pointer border-none"
                style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {selectedRole ? (
          <>
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full" style={{ background: selectedRole.color }} />
                <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{selectedRole.name}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!editing ? (
                  <>
                    <button
                      type="button"
                      onClick={startEdit}
                      disabled={selectedRole.key === 'admin'}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
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
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                      style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}
                    >
                      <Copy size={12} /> {t('userMgmt.roles.duplicate')}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 12 }}
                      >
                        <Trash2 size={12} /> {t('common.delete')}
                      </button>
                    )}
                  </>
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
            />
          </>
        ) : (
          <div className="flex items-center justify-center py-16" style={{ color: T.t3, fontSize: 13 }}>
            {t('userMgmt.roles.selectRole')}
          </div>
        )}
      </div>
    </div>
  );
}

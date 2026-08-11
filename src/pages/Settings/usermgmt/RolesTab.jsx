/**
 * RolesTab — system + custom roles from live API (PDS-937).
 */

import { useState, useMemo, useEffect } from 'react';
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

const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#8B5CF6'];

function FieldLabel({ children, T }) {
  return (
    <label className="block mb-1.5" style={{ fontSize: 11, fontWeight: 600, color: T.t3, letterSpacing: 0.2 }}>
      {children}
    </label>
  );
}

function ColorSwatches({ value, onChange, size = 'md' }) {
  const dim = size === 'sm' ? 20 : 28;
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => {
        const selected = value === c;
        return (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            aria-label={c}
            aria-pressed={selected}
            className="rounded-full cursor-pointer border-none shrink-0 transition-transform duration-150"
            style={{
              width: dim,
              height: dim,
              background: c,
              boxShadow: selected ? '0 0 0 2px #fff, 0 0 0 4px currentColor' : 'none',
              color: c,
              transform: selected ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        );
      })}
    </div>
  );
}

function applyRolesPayload(data, setApiRoles, setPermissionGroups) {
  setApiRoles(data.roles || []);
  setPermissionGroups(data.groups || []);
}

export default function RolesTab() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const {
    users,
    roles,
    setRoles: setApiRoles,
    setPermissionGroups,
    refresh,
    loading,
  } = useUserMgmt();
  const isGreek = i18n.language === 'el';

  const [selectedKey, setSelectedKey] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editPerms, setEditPerms] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editDescription, setEditDescription] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3B82F6');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [nameError, setNameError] = useState('');

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
    setEditName(selectedRole.name || '');
    setEditColor(selectedRole.color || '#3B82F6');
    setEditDescription(selectedRole.description || '');
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

    setSaving(true);
    try {
      if (isCustom) {
        const trimmed = editName.trim();
        if (!trimmed) {
          toast.error(t('userMgmt.roles.nameRequired', { defaultValue: 'Role name is required.' }));
          return;
        }
        const data = await rolesSettingsService.update(selectedRole.key, {
          name: trimmed,
          color: editColor,
          description: editDescription,
          permissions: editPerms || [],
        });
        applyRolesPayload(data, setApiRoles, setPermissionGroups);
      } else {
        const data = await rolesSettingsService.update(selectedRole.key, editPerms || []);
        applyRolesPayload(data, setApiRoles, setPermissionGroups);
      }
      cancelEdit();
      toast.success(t('userMgmt.toast.roleSaved'));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setNameError(t('userMgmt.roles.nameRequired', { defaultValue: 'Role name is required.' }));
      return;
    }
    if (roles.some((r) => String(r.name || r.label || '').trim().toLowerCase() === trimmed.toLowerCase())) {
      setNameError(t('userMgmt.roles.nameTaken', { defaultValue: 'A role with this name already exists.' }));
      return;
    }

    setSaving(true);
    try {
      const data = await rolesSettingsService.create({
        name: trimmed,
        color: newRoleColor,
        description: newRoleDescription.trim() || undefined,
        permissions: [],
      });
      applyRolesPayload(data, setApiRoles, setPermissionGroups);
      const created = data.roles?.find((r) => r.name === trimmed) || data.roles?.[data.roles.length - 1];
      if (created) setSelectedKey(created.key);
      setShowCreate(false);
      setNewRoleName('');
      setNewRoleColor('#3B82F6');
      setNewRoleDescription('');
      setNameError('');
      toast.success(t('userMgmt.toast.roleCreated'));
      await refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedRole) return;
    const copyName = `${selectedRole.name} (Copy)`;
    setSaving(true);
    try {
      const data = await rolesSettingsService.create({
        name: copyName,
        color: selectedRole.color,
        description: selectedRole.description,
        permissions: selectedRole.permissions === null
          ? []
          : [...(selectedRole.permission_names || selectedRole.permissions || [])],
      });
      applyRolesPayload(data, setApiRoles, setPermissionGroups);
      const created = data.roles?.find((r) => r.name === copyName);
      if (created) setSelectedKey(created.key);
      cancelEdit();
      toast.success(t('userMgmt.toast.roleDuplicated'));
      await refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole || isSystem) return;
    if (usersOnRole.length > 0) {
      toast.error(t('userMgmt.roles.cannotDelete', { n: usersOnRole.length }));
      return;
    }

    setSaving(true);
    try {
      const data = await rolesSettingsService.destroy(selectedRole.key);
      applyRolesPayload(data, setApiRoles, setPermissionGroups);
      setSelectedKey(data.roles?.[0]?.key || null);
      cancelEdit();
      toast.success(t('userMgmt.toast.roleDeleted'));
      await refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !roles.length) {
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
          <div className="mt-2 p-3 rounded-xl space-y-3" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>
              {t('userMgmt.roles.createRole')}
            </div>
            <div>
              <FieldLabel T={T}>{t('userMgmt.roles.roleName')}</FieldLabel>
              <input
                value={newRoleName}
                onChange={(e) => {
                  setNewRoleName(e.target.value);
                  if (nameError) setNameError('');
                }}
                placeholder={t('userMgmt.roles.roleName')}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  border: `1px solid ${nameError ? '#EF4444' : T.bd}`,
                  background: T.sf,
                  color: T.t1,
                  fontSize: 13,
                }}
                autoFocus
                aria-invalid={Boolean(nameError)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
              />
              {!!nameError && (
                <div style={{ color: '#DC2626', fontSize: 11, marginTop: 4, lineHeight: 1.35 }}>
                  {nameError}
                </div>
              )}
            </div>
            <div>
              <FieldLabel T={T}>{t('userMgmt.roles.color', { defaultValue: 'Color' })}</FieldLabel>
              <ColorSwatches value={newRoleColor} onChange={setNewRoleColor} size="sm" />
            </div>
            <div>
              <FieldLabel T={T}>{t('userMgmt.roles.description', { defaultValue: 'Description' })}</FieldLabel>
              <textarea
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder={t('userMgmt.roles.descriptionPlaceholder', { defaultValue: 'Short description shown when inviting users…' })}
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg outline-none resize-none"
                style={{
                  border: `1px solid ${T.bd}`,
                  background: T.sf,
                  color: T.t1,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={saving}
                className="flex-1 px-2 py-2 rounded-lg cursor-pointer border-none font-semibold"
                style={{ background: T.ac, color: '#fff', fontSize: 12 }}
              >
                {t('common.create', { defaultValue: 'Create' })}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewRoleName(''); setNewRoleDescription(''); setNameError(''); }}
                className="px-3 py-2 rounded-lg cursor-pointer border-none"
                style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}
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
            {editing && isCustom ? (
              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: T.sf, border: `1px solid ${T.bd}` }}
              >
                <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
                  <span
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: `${editColor}18`, border: `2px solid ${editColor}` }}
                  >
                    <span className="w-4 h-4 rounded-full" style={{ background: editColor }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
                      {editName.trim() || selectedRole.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>
                      {t('userMgmt.roles.custom')} · {t('userMgmt.roles.editDetailsHint', { defaultValue: 'Update name, color, and description' })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <FieldLabel T={T}>{t('userMgmt.roles.roleName')}</FieldLabel>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg outline-none"
                      style={{ border: `1px solid ${T.bd}`, background: T.sa, color: T.t1, fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <FieldLabel T={T}>{t('userMgmt.roles.color', { defaultValue: 'Color' })}</FieldLabel>
                    <ColorSwatches value={editColor} onChange={setEditColor} />
                  </div>
                  <div>
                    <FieldLabel T={T}>{t('userMgmt.roles.description', { defaultValue: 'Description' })}</FieldLabel>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder={t('userMgmt.roles.descriptionPlaceholder', { defaultValue: 'Short description shown when inviting users…' })}
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2.5 rounded-lg outline-none resize-none"
                      style={{ border: `1px solid ${T.bd}`, background: T.sa, color: T.t1, fontSize: 13, lineHeight: 1.5 }}
                    />
                    <div className="mt-1 text-right" style={{ fontSize: 10, color: T.t3 }}>
                      {editDescription.length}/500
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-end gap-2 mt-4 pt-4"
                  style={{ borderTop: `1px solid ${T.bd}` }}
                >
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer border-none"
                    style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}
                  >
                    <X size={12} /> {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
                    style={{ background: T.ac, color: '#fff', fontSize: 12 }}
                  >
                    <Check size={12} /> {t('common.save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: selectedRole.color }} />
                  <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{selectedRole.name}</h3>
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{
                      background: isSystem ? `${T.ac}15` : `${T.t3}15`,
                      color: isSystem ? T.ac : T.t3,
                    }}
                  >
                    {isSystem ? t('userMgmt.roles.system') : t('userMgmt.roles.custom')}
                  </span>
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
                        onClick={() => void handleDuplicate()}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                        style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}
                      >
                        <Copy size={12} /> {t('userMgmt.roles.duplicate')}
                      </button>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => void handleDelete()}
                          disabled={saving}
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
                        onClick={() => void saveEdit()}
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
            )}

            {!editing && (((selectedRole.description || '').trim()) || isCustom) && (
              <p style={{ fontSize: 12, color: T.t3, marginBottom: 12, lineHeight: 1.45 }}>
                {(selectedRole.description || '').trim()
                  ? selectedRole.description
                  : (
                    <span style={{ opacity: 0.65, fontStyle: 'italic' }}>
                      {t('userMgmt.roles.noDescription', { defaultValue: 'No description provided.' })}
                    </span>
                  )}
              </p>
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
              <div className="mb-2">
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: T.t3 }}>
                  {t('userMgmt.roles.permissionsSection', { defaultValue: 'Permissions' })}
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

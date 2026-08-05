/**
 * UserEditPage — live user detail via settings/users API.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Key, LogOut, RotateCcw, XCircle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { useUserMgmt } from '../../../context/UserMgmtContext';
import PermissionGrid from './PermissionGrid';
import {
  USER_STATUS_CONFIG,
  getUserInitials, getUserFullName, getUserAvatarColor,
} from '../../../mocks/userMgmtData';
import { hasCustomDirectPermissions, SHIPPER_ROLES } from '../../../utils/shipperAccessPresets';
import { usersSettingsService } from '../../../api/services/usersSettingsService';
import { ApiError } from '../../../api/client';

function effectivePermissions(user) {
  if (!user) return [];
  const direct = user.directPermissions ?? user.direct_permissions;
  if (direct !== undefined && direct !== null) return direct;
  if (user.permissions === null) return null;
  return user.permissions || user.permission_names || [];
}

export default function UserEditPage() {
  const { userId: userIdParam, tab } = useParams();
  const userId = userIdParam || tab;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const { getUser, updateUser, roles, refresh, loading: listLoading } = useUserMgmt();

  const [remoteUser, setRemoteUser] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [draft, setDraft] = useState(null);
  const [editingPerms, setEditingPerms] = useState(false);
  const [editedPerms, setEditedPerms] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const cached = getUser(userId || '');
  const user = remoteUser || cached;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const data = await usersSettingsService.get(userId);
        if (!cancelled) setRemoteUser(data);
      } catch {
        if (!cancelled && cached) setRemoteUser(cached);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (user) {
      setDraft({
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        phone: user.phone || '',
        jobTitle: user.jobTitle || user.job_title || '',
        role: user.role || 'dispatcher',
      });
      setEditingPerms(false);
      setEditedPerms(null);
      setAutoEnabled(new Set());
    }
  }, [user?.id, user?.role, user?.firstName, user?.first_name]);

  const goBack = () => navigate('/settings/users');

  const roleOptions = roles.length
    ? roles.map((r) => ({ key: r.key, name: r.name, color: r.color, description: r.description }))
    : SHIPPER_ROLES;

  const effectivePerms = user ? effectivePermissions(user) : [];
  const isFullAdmin = effectivePerms === null || (!!user?.isOwner && user?.role === 'admin' && (user?.directPermissions ?? user?.direct_permissions) == null);
  const permSummary = useMemo(() => {
    if (!user) return '—';
    if (isFullAdmin || effectivePerms === null) return t('userMgmt.invite.allPermissions');
    return t('userMgmt.invite.permCount', { n: (effectivePerms || []).length });
  }, [user, isFullAdmin, effectivePerms, t]);

  if (fetching || (listLoading && !user)) {
    return (
      <div className="p-6" style={{ color: T.t3 }}>
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!user || !draft) {
    return (
      <div className="p-6">
        <button type="button" onClick={goBack} className="flex items-center gap-2 mb-4 cursor-pointer border-none bg-transparent" style={{ color: T.ac, fontSize: 13 }}>
          <ArrowLeft size={16} /> {t('userMgmt.editPage.back')}
        </button>
        <p style={{ color: T.t3 }}>{t('userMgmt.editPage.notFound')}</p>
      </div>
    );
  }

  const roleMeta = roleOptions.find((r) => r.key === draft.role) || roleOptions[1] || SHIPPER_ROLES[1];
  const sc = USER_STATUS_CONFIG[user.status] || USER_STATUS_CONFIG.active;
  const custom = hasCustomDirectPermissions(user);
  const isOwner = !!(user.isOwner || user.is_owner);

  const applyServerUser = (updated) => {
    setRemoteUser(updated);
    updateUser(updated);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await usersSettingsService.update(user.id, {
        first_name: draft.firstName.trim(),
        last_name: draft.lastName.trim(),
        phone: draft.phone.trim() || null,
        job_title: draft.jobTitle.trim() || null,
        role: isOwner ? undefined : draft.role,
      });
      applyServerUser(updated);
      toast.success(t('userMgmt.toast.userUpdated'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' }));
    } finally {
      setSaving(false);
    }
  };

  const resetToPreset = async () => {
    if (isOwner) return;
    setSaving(true);
    try {
      const updated = await usersSettingsService.update(user.id, {
        role: draft.role,
        reset_to_role: true,
      });
      applyServerUser(updated);
      setEditingPerms(false);
      setEditedPerms(null);
      toast.success(t('userMgmt.toast.resetToDefaults'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' }));
    } finally {
      setSaving(false);
    }
  };

  const startEditPerms = () => {
    const current = effectivePermissions({ ...user, role: draft.role });
    setEditedPerms(current === null ? null : [...current]);
    setAutoEnabled(new Set());
    setEditingPerms(true);
  };

  const savePerms = async () => {
    if (isOwner) return;
    setSaving(true);
    try {
      const updated = await usersSettingsService.update(user.id, {
        role: draft.role,
        first_name: draft.firstName.trim(),
        last_name: draft.lastName.trim(),
        phone: draft.phone.trim() || null,
        permissions: editedPerms === null ? undefined : editedPerms,
        reset_to_role: editedPerms === null,
      });
      applyServerUser(updated);
      setEditingPerms(false);
      setEditedPerms(null);
      toast.success(t('userMgmt.toast.permissionsSaved'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Save failed' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const updated = await usersSettingsService.deactivate(user.id);
      applyServerUser(updated);
      toast.success(t('userMgmt.toast.deactivated', { name: getUserFullName(user) }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
    }
  };

  const handleReactivate = async () => {
    try {
      const updated = await usersSettingsService.reactivate(user.id);
      applyServerUser(updated);
      await refresh();
      toast.success(t('userMgmt.toast.reactivated', { name: getUserFullName(user) }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
    }
  };

  const handleResend = async () => {
    try {
      await usersSettingsService.resendInvite(user.id);
      toast.success(t('userMgmt.toast.inviteResent', { email: user.email }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
    }
  };

  const handleForceSignOut = async () => {
    try {
      await usersSettingsService.forceSignOut(user.id);
      toast.success(t('userMgmt.toast.sessionRevoked', { name: getUserFullName(user) }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <button type="button" onClick={goBack} className="flex items-center gap-2 cursor-pointer border-none bg-transparent mb-2" style={{ color: T.ac, fontSize: 13, fontWeight: 600 }}>
        <ArrowLeft size={16} /> {t('userMgmt.editPage.back')}
      </button>

      <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: getUserAvatarColor(String(user.id)), fontSize: 18 }}>
          {getUserInitials(user)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold" style={{ fontSize: 18, color: T.t1 }}>{getUserFullName(user)}</div>
          <div style={{ fontSize: 13, color: T.t3 }}>{user.email}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: `${roleMeta.color}18`, color: roleMeta.color }}>
              {roleMeta.name}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>
              {t(`userMgmt.status.${user.status}`)}
            </span>
            {custom && (
              <span className="inline-flex px-2 py-0.5 rounded" style={{ fontSize: 10, fontWeight: 700, background: '#F59E0B18', color: '#D97706' }}>
                {t('userMgmt.role.customPermissions')}
              </span>
            )}
          </div>
        </div>
      </div>

      <Section title={t('userMgmt.editPage.userInfo')} T={T}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('userMgmt.invite.firstName')} T={T}>
            <input value={draft.firstName} onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
          </Field>
          <Field label={t('userMgmt.invite.lastName')} T={T}>
            <input value={draft.lastName} onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
          </Field>
          <Field label={t('userMgmt.invite.email')} T={T}>
            <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 13, color: T.t3 }}>{user.email}</div>
          </Field>
          <Field label={t('userMgmt.invite.phone')} T={T}>
            <input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
          </Field>
          <Field label={t('userMgmt.editPage.jobTitle')} T={T}>
            <input value={draft.jobTitle} onChange={(e) => setDraft((d) => ({ ...d, jobTitle: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
          </Field>
        </div>
        <button type="button" disabled={saving} onClick={saveProfile} className="mt-4 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
          {t('common.save')}
        </button>
      </Section>

      {!isOwner && (
        <Section title={t('userMgmt.editPage.rolePreset')} T={T}>
          <p style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{t('userMgmt.editPage.rolePresetHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {roleOptions.map((r) => {
              const sel = draft.role === r.key;
              return (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setDraft((d) => ({ ...d, role: r.key }))}
                  className="p-3 rounded-xl cursor-pointer border-none text-left"
                  style={{
                    background: sel ? `${T.ac}08` : T.sa,
                    border: sel ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
                  }}
                >
                  <div className="font-semibold" style={{ fontSize: 13, color: T.t1 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{r.description}</div>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={resetToPreset} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.ac, fontSize: 12, fontWeight: 600 }}>
            {t('userMgmt.editPage.resetToPreset')}
          </button>
        </Section>
      )}

      {!isOwner && (
        <Section title={t('userMgmt.editPage.directPermissions')} T={T}
          action={!editingPerms ? (
            <button type="button" onClick={startEditPerms} className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 11 }}>
              {t('common.edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={savePerms} className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 11 }}>{t('common.save')}</button>
              <button type="button" onClick={() => { setEditingPerms(false); setEditedPerms(null); }} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t2, fontSize: 11 }}>{t('common.cancel')}</button>
            </div>
          )}
        >
          <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{t('userMgmt.editPage.directPermissionsHint')}</p>
          {!editingPerms && (
            <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 12, color: T.t1 }}>{permSummary}</div>
          )}
          {editingPerms ? (
            <PermissionGrid
              permissions={editedPerms}
              editing
              onChange={setEditedPerms}
              autoEnabledKeys={autoEnabled}
              onAutoEnabled={setAutoEnabled}
            />
          ) : (
            !(isFullAdmin || effectivePerms === null) && effectivePerms && (
              <PermissionGrid permissions={effectivePerms} editing={false} />
            )
          )}
          {(isFullAdmin || effectivePerms === null) && !editingPerms && (
            <p style={{ fontSize: 12, color: T.t3 }}>{t('userMgmt.drawer.fullAdminDesc')}</p>
          )}
        </Section>
      )}

      <Section title={t('userMgmt.editPage.actions')} T={T}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleResend} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t1, fontSize: 12 }}>
            <Key size={13} /> {t('userMgmt.actions.resetPassword')}
          </button>
          {user.status === 'active' && !isOwner && (
            <>
              <button type="button" onClick={handleForceSignOut} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t1, fontSize: 12 }}>
                <LogOut size={13} /> {t('userMgmt.actions.forceSignout')}
              </button>
              <button type="button" onClick={handleDeactivate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12 }}>
                <XCircle size={13} /> {t('userMgmt.actions.deactivate')}
              </button>
            </>
          )}
          {(user.status === 'suspended' || user.status === 'deactivated') && !isOwner && (
            <button type="button" onClick={handleReactivate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.ac, fontSize: 12 }}>
              <RotateCcw size={13} /> {t('userMgmt.actions.reactivate')}
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children, T, action }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{title}</h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, children, T }) {
  return (
    <div>
      <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{label}</label>
      {children}
    </div>
  );
}

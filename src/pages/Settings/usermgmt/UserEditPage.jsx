/**
 * UserEditPage — full-page Edit Details (PDS-937 Phase 2).
 * Replaces UserDrawer. Back returns to Settings → Users tab.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Key, LogOut, RotateCcw, XCircle, AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { useUserMgmt } from '../../../context/UserMgmtContext';
import PermissionGrid from './PermissionGrid';
import {
  SHIPPER_ROLES, USER_STATUS_CONFIG,
  getUserInitials, getUserFullName, getUserAvatarColor,
  getEffectivePermissions, getInviteStatus,
} from '../../../mocks/userMgmtData';
import {
  hasCustomDirectPermissions,
  seedDirectPermissionsForInvite,
} from '../../../utils/shipperAccessPresets';

export default function UserEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const { getUser, updateUser, removeUser } = useUserMgmt();

  const user = getUser(userId || '');
  const [draft, setDraft] = useState(null);
  const [editingPerms, setEditingPerms] = useState(false);
  const [editedPerms, setEditedPerms] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(new Set());

  useEffect(() => {
    if (user) {
      setDraft({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        jobTitle: user.jobTitle || '',
        role: user.role || 'dispatcher',
      });
      setEditingPerms(false);
      setEditedPerms(null);
      setAutoEnabled(new Set());
    }
  }, [user?.id]);

  const goBack = () => {
    navigate('/settings/users');
  };

  const effectivePerms = user ? getEffectivePermissions(user) : [];
  const isFullAdmin = effectivePerms === null;
  const permSummary = useMemo(() => {
    if (!user) return '—';
    if (isFullAdmin) return t('userMgmt.invite.allPermissions');
    if (!effectivePerms) return '—';
    return t('userMgmt.invite.permCount', { n: effectivePerms.length });
  }, [user, isFullAdmin, effectivePerms, t]);

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

  const roleMeta = SHIPPER_ROLES.find((r) => r.key === draft.role) || SHIPPER_ROLES[1];
  const sc = USER_STATUS_CONFIG[user.status] || USER_STATUS_CONFIG.active;
  const custom = hasCustomDirectPermissions(user);
  const inviteInfo = getInviteStatus(user);

  const saveProfile = () => {
    updateUser({
      ...user,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: draft.phone.trim() || null,
      jobTitle: draft.jobTitle.trim() || null,
      role: draft.role,
    });
    toast.success(t('userMgmt.toast.userUpdated'));
  };

  const resetToPreset = () => {
    const seeded = seedDirectPermissionsForInvite(draft.role);
    updateUser({ ...user, role: draft.role, directPermissions: seeded });
    setEditingPerms(false);
    setEditedPerms(null);
    toast.success(t('userMgmt.toast.resetToDefaults'));
  };

  const startEditPerms = () => {
    const current = getEffectivePermissions({ ...user, role: draft.role });
    setEditedPerms(current === null ? null : [...current]);
    setAutoEnabled(new Set());
    setEditingPerms(true);
  };

  const savePerms = () => {
    updateUser({
      ...user,
      role: draft.role,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: draft.phone.trim() || null,
      jobTitle: draft.jobTitle.trim() || null,
      directPermissions: editedPerms,
    });
    setEditingPerms(false);
    setEditedPerms(null);
    toast.success(t('userMgmt.toast.permissionsSaved'));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <button type="button" onClick={goBack} className="flex items-center gap-2 cursor-pointer border-none bg-transparent mb-2" style={{ color: T.ac, fontSize: 13, fontWeight: 600 }}>
        <ArrowLeft size={16} /> {t('userMgmt.editPage.back')}
      </button>

      <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: getUserAvatarColor(user.id), fontSize: 18 }}>
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
        <button type="button" onClick={saveProfile} className="mt-4 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
          {t('common.save')}
        </button>
      </Section>

      <Section title={t('userMgmt.editPage.rolePreset')} T={T}>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{t('userMgmt.editPage.rolePresetHint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {SHIPPER_ROLES.map((r) => {
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
          !isFullAdmin && effectivePerms && (
            <PermissionGrid permissions={effectivePerms} editing={false} />
          )
        )}
        {isFullAdmin && !editingPerms && (
          <p style={{ fontSize: 12, color: T.t3 }}>{t('userMgmt.drawer.fullAdminDesc')}</p>
        )}
      </Section>

      <Section title={t('userMgmt.editPage.actions')} T={T}>
        <div className="flex flex-wrap gap-2">
          {user.status !== 'invited' && (
            <button type="button" onClick={() => toast.success(t('userMgmt.toast.passwordResetSent', { email: user.email }))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t1, fontSize: 12 }}>
              <Key size={13} /> {t('userMgmt.actions.resetPassword')}
            </button>
          )}
          {user.status === 'active' && (
            <>
              <button type="button" onClick={() => toast.success(t('userMgmt.toast.sessionRevoked', { name: getUserFullName(user) }))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.t1, fontSize: 12 }}>
                <LogOut size={13} /> {t('userMgmt.actions.forceSignout')}
              </button>
              <button type="button" onClick={() => { updateUser({ ...user, status: 'deactivated' }); toast.success(t('userMgmt.toast.deactivated', { name: getUserFullName(user) })); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12 }}>
                <XCircle size={13} /> {t('userMgmt.actions.deactivate')}
              </button>
            </>
          )}
          {(user.status === 'suspended' || user.status === 'deactivated') && (
            <button type="button" onClick={() => { updateUser({ ...user, status: 'active' }); toast.success(t('userMgmt.toast.reactivated', { name: getUserFullName(user) })); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, color: T.ac, fontSize: 12 }}>
              <RotateCcw size={13} /> {t('userMgmt.actions.reactivate')}
            </button>
          )}
          {user.status === 'deactivated' && (
            <button type="button" onClick={() => { removeUser(user.id); toast.success(t('userMgmt.toast.deleted', { name: getUserFullName(user) })); goBack(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12 }}>
              <XCircle size={13} /> {t('userMgmt.actions.deletePerm')}
            </button>
          )}
        </div>
        {inviteInfo?.label === 'expired' && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: '#FFFBEB' }}>
            <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: 12, color: '#92400E' }}>{t('userMgmt.status.expired')}</span>
          </div>
        )}
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

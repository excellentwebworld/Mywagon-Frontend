/**
 * PersonalSection — Personal Profile settings section.
 *
 * Card 1: My Information — admin-only editing, profile pic upload, no language (separate tab)
 * Card 2: My Role & Permissions — read-only module access grid + permission summary
 * Card 3: Preferences & Activity — recent activity, account info
 *
 * API: GET/PATCH /api/v1/profile, GET /api/v1/profile/permissions
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pencil, X, Check, Lock, Briefcase, Camera,
  Clock, Shield, Send,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { CURRENT_USER, RECENT_ACTIVITY, TIMEZONES, relativeTime, passwordAgeDays } from '../../../mocks/settingsData';
import { resolveModuleAccess, getEffectivePermissions, PERMISSION_GROUPS, ROLES_BY_KEY, ALL_PERMISSION_KEYS } from '../../../mocks/userMgmtData';

/** PDS-937: Personal settings show Admin / Dispatcher only */
const SHIPPER_PERSONAL_ROLES = {
  admin: { name: 'Admin', color: '#7C3AED' },
  dispatcher: { name: 'Dispatcher', color: '#3B82F6' },
};

function resolvePersonalRole(roleKey) {
  const key = String(roleKey || '').toLowerCase();
  if (SHIPPER_PERSONAL_ROLES[key]) return SHIPPER_PERSONAL_ROLES[key];
  const fromCatalog = ROLES_BY_KEY[key];
  if (fromCatalog && (key === 'admin' || key === 'dispatcher')) {
    return { name: fromCatalog.name, color: fromCatalog.color };
  }
  // Never surface Finance/Viewer on Personal — fall back to Dispatcher label for unknowns
  return { name: 'Dispatcher', color: '#3B82F6' };
}

export default function PersonalSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { user: authUser, role: authRole } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const isAdmin = authRole === 'shipper' || CURRENT_USER.role === 'admin'; // mock: treat as admin for demo
  const [user, setUser] = useState({
    ...CURRENT_USER,
    firstName: authUser.firstName || CURRENT_USER.firstName,
    lastName: authUser.lastName || CURRENT_USER.lastName,
    email: authUser.email || CURRENT_USER.email,
    avatarUrl: authUser.avatarUrl || CURRENT_USER.avatarUrl,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [showAccessReq, setShowAccessReq] = useState(false);
  const [accessMsg, setAccessMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

  const startEdit = () => { setDraft({ ...user }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setAvatarPreview(null); };
  const saveEdit = () => {
    setUser({ ...draft, avatarUrl: avatarPreview || draft.avatarUrl });
    setEditing(false);
    toast.success(t('settings.settingsToast.profileUpdated'));
  };
  const set = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t('settings.profileSection.avatarTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const rawPerms = getEffectivePermissions(user);
  const effectivePerms = rawPerms === null ? new Set(ALL_PERMISSION_KEYS) : new Set(rawPerms);
  const moduleAccess = resolveModuleAccess(rawPerms);
  const role = resolvePersonalRole(user.role);
  const pwAge = passwordAgeDays(user.lastPasswordChange);

  const currentAvatar = avatarPreview || null;

  return (
    <div className="space-y-4">

      {/* ═══ Card 1: My Information ═══ */}
      <Card title={t('settings.profileSection.myInfo')} icon={<Briefcase size={16} style={{ color: T.ac }} />}
        action={isAdmin && !editing ? (
          <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
            <Pencil size={12} /> {t('common.edit')}
          </button>
        ) : editing ? (
          <div className="flex gap-2">
            <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
              <Check size={12} /> {t('common.save')}
            </button>
            <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
              <X size={12} /> {t('common.cancel')}
            </button>
          </div>
        ) : null} T={T}>

        {/* Avatar + Name header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            {currentAvatar ? (
              <img src={currentAvatar} alt="" className="rounded-2xl object-cover" style={{ width: 64, height: 64 }} />
            ) : (
              <div className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: 64, height: 64, background: `linear-gradient(135deg, ${T.ac}, ${T.ac}CC)`, color: '#fff', fontSize: 22, fontWeight: 700 }}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
            )}
            {editing && (
              <button onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full cursor-pointer border-none"
                style={{ width: 26, height: 26, background: T.ac, color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                <Camera size={13} />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <div className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{user.firstName} {user.lastName}</div>
            <div style={{ fontSize: 12, color: T.t3 }}>{user.email}</div>
            {role && <span className="inline-block mt-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: `${role.color}15`, color: role.color }}>{role.name}</span>}
          </div>
        </div>

        {!isAdmin && !editing && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: T.al, fontSize: 12, color: T.ac }}>
            <Lock size={12} /> {t('settings.profileSection.adminOnly')}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('settings.profileSection.firstName')} required value={editing ? draft.firstName : user.firstName} onChange={(v) => set('firstName', v)} editing={editing} T={T} />
          <Field label={t('settings.profileSection.lastName')} required value={editing ? draft.lastName : user.lastName} onChange={(v) => set('lastName', v)} editing={editing} T={T} />
          <Field label={t('settings.profileSection.email')} value={user.email} locked lockMsg={t('settings.profileSection.emailLocked')} T={T} icon={<Lock size={12} />} />
          <Field label={t('settings.profileSection.phone')} value={editing ? draft.phone : user.phone} onChange={(v) => set('phone', v)} editing={editing} T={T} />
          <Field label={t('settings.profileSection.jobTitle')} value={editing ? draft.jobTitle : user.jobTitle} onChange={(v) => set('jobTitle', v)} editing={editing} T={T} />
          <Field label={t('settings.profileSection.department')} value={editing ? draft.department : user.department} onChange={(v) => set('department', v)} editing={editing} T={T} />
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.profileSection.timezone')}</label>
            {editing ? (
              <select value={draft.timezone} onChange={(e) => set('timezone', e.target.value)} className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 13, color: T.t1 }}>{user.timezone}</div>
            )}
          </div>
        </div>
      </Card>

      {/* ═══ Card 2: My Role & Permissions ═══ */}
      <Card title={t('settings.profileSection.roleAccess')} icon={<Shield size={16} style={{ color: T.ac }} />} T={T}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <InfoRow label={t('settings.profileSection.role.role')} value={role.name} T={T} />
          <InfoRow label={t('settings.profileSection.role.assignedBy')} value={user.roleAssignedBy} T={T} />
          <InfoRow label={t('settings.profileSection.role.since')} value={new Date(user.roleAssignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} T={T} />
        </div>

        {/* Module access grid */}
        <div className="mb-4">
          <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('settings.profileSection.role.moduleAccess')}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {Object.entries(moduleAccess).map(([mod, has]) => (
              <div key={mod} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: has ? '#ECFDF5' : T.sa }}>
                <span style={{ fontSize: 11 }}>{has ? '✅' : '⛔'}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: has ? '#047857' : T.t3 }}>{t(`userMgmt.moduleAccess.${mod}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Permission summary */}
        <div className="mb-3">
          <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('settings.profileSection.role.permSummary')}</div>
          <div className="flex flex-wrap gap-2">
            {PERMISSION_GROUPS.map(g => {
              const enabled = g.permissions.filter(p => effectivePerms.has(p.key)).length;
              return (
                <span key={g.key} className="px-2 py-1 rounded-lg" style={{ fontSize: 11, fontWeight: 500, background: enabled > 0 ? T.al : T.sa, color: enabled > 0 ? T.ac : T.t3 }}>
                  {t(`userMgmt.permGroup.${g.key}`)}: {enabled}/{g.permissions.length}
                </span>
              );
            })}
          </div>
        </div>

        <button onClick={() => setShowAccessReq(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.ac, fontSize: 12, fontWeight: 500 }}>
          <Send size={12} /> {t('settings.profileSection.role.requestAccess')}
        </button>

        {showAccessReq && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
            <textarea value={accessMsg} onChange={(e) => setAccessMsg(e.target.value)} rows={3}
              placeholder={t('settings.profileSection.role.requestPlaceholder')}
              className="w-full px-3 py-2 rounded-lg outline-none resize-none mb-2"
              style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
            <div className="flex gap-2">
              <button onClick={() => { toast.success(t('settings.settingsToast.accessRequested')); setShowAccessReq(false); setAccessMsg(''); }}
                className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 11 }}>
                {t('settings.profileSection.role.sendRequest')}
              </button>
              <button onClick={() => setShowAccessReq(false)} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ═══ Card 3: Activity ═══ */}
      <Card title={t('settings.profileSection.prefsActivity')} icon={<Clock size={16} style={{ color: T.ac }} />} T={T}>
        <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('settings.profileSection.activity.recentTitle')}</div>
        <p style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>{t('settings.profileSection.activity.accountActivityHint')}</p>
        <div className="space-y-2 mb-5">
          {RECENT_ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: T.sa }}>
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <span className="flex-1" style={{ fontSize: 12, color: T.t1 }}>{a.action}</span>
              <span style={{ fontSize: 11, color: T.t3 }}>{relativeTime(a.ts)}</span>
            </div>
          ))}
        </div>

        <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('settings.profileSection.activity.accountInfo')}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoRow label={t('settings.profileSection.activity.memberSince')} value={new Date(user.memberSince).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} T={T} />
          <InfoRow label={t('settings.profileSection.activity.lastLogin')} value={relativeTime(user.lastLogin)} T={T} />
          <div className="px-3 py-2 rounded-lg" style={{ background: T.sa }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>{t('settings.profileSection.activity.passwordAge')}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: pwAge > 90 ? '#F59E0B' : T.t1 }}>
              {pwAge} {t('settings.profileSection.activity.daysAgo')}
              {pwAge > 90 && <span style={{ fontSize: 10, color: '#F59E0B', marginLeft: 6 }}>⚠️</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Sub-components ── */

function Card({ title, icon, action, children, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: theme.sf, border: `1px solid ${theme.bd}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${theme.bd}` }}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold" style={{ fontSize: 14, color: theme.t1 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, editing, locked, lockMsg, required, icon, T }) {
  const { T: theme } = useTheme();
  return (
    <div>
      <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: theme.t2 }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {editing && !locked ? (
        <input value={value || ''} onChange={(e) => onChange?.(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ border: `1px solid ${theme.bd}`, background: theme.sf, color: theme.t1, fontSize: 13 }} />
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: theme.sa, fontSize: 13, color: locked ? theme.t3 : theme.t1 }}>
          {icon}
          <span className="flex-1">{value || '—'}</span>
          {locked && <span style={{ fontSize: 10, color: theme.t3 }}>{lockMsg}</span>}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, T }) {
  const { T: theme } = useTheme();
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: theme.sa }}>
      <div style={{ fontSize: 10, color: theme.t3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.t1 }}>{value}</div>
    </div>
  );
}

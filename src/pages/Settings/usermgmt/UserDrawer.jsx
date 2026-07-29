/**
 * UserDrawer — 420px right-slide detail panel for a user.
 *
 * Sections:
 * 1. Module Access Card — visual grid of accessible pages
 * 2. User Info — contact, timezone, password age
 * 3. Permissions Summary — read/edit mode with PermissionGrid
 * 4. Login History — last 10 login events
 * 5. Recent Activity — last 10 user actions
 * 6. Actions — status, security, ownership actions
 *
 * API dependencies:
 * - GET /api/v1/users/:id/login-history
 * - GET /api/v1/users/:id/activity
 * - PATCH /api/v1/users/:id
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Edit3, ChevronDown, Phone, Mail, Globe, Clock, Shield,
  ShieldCheck, ShieldAlert, Lock, LogOut, Ban, XCircle,
  RotateCcw, Crown, Key, AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import ModuleAccessCard from './ModuleAccessCard';
import PermissionGrid from './PermissionGrid';
import {
  ROLES_BY_KEY, USER_STATUS_CONFIG,
  getUserInitials, getUserFullName, getUserAvatarColor,
  getEffectivePermissions, LOGIN_HISTORY, USER_ACTIVITY,
  getInviteStatus,
} from '../../../mocks/userMgmtData';

const SECTION_IDS = ['moduleAccess', 'userInfo', 'permissions', 'loginHistory', 'activity', 'actions'];

export default function UserDrawer({ user, open, onClose, onUpdate, onSuspend, onReactivate, onDeactivate, onDelete }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [editingPerms, setEditingPerms] = useState(false);
  const [editedPerms, setEditedPerms] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(new Set());
  const [collapsed, setCollapsed] = useState({});

  // Keep last non-null user for animation
  const lastUserRef = useRef(null);
  useEffect(() => { if (user) lastUserRef.current = user; }, [user]);
  const u = user || lastUserRef.current;

  // Reset edit state when user changes
  useEffect(() => { setEditingPerms(false); setEditedPerms(null); setAutoEnabled(new Set()); }, [user?.id]);

  if (!u) return null;

  const role = ROLES_BY_KEY[u.role];
  const sc = USER_STATUS_CONFIG[u.status] || USER_STATUS_CONFIG.active;
  const effectivePerms = getEffectivePermissions(u);
  const isFullAdmin = effectivePerms === null;
  const inviteInfo = getInviteStatus(u);
  const loginHistory = LOGIN_HISTORY[u.id] || [];
  const activity = USER_ACTIVITY[u.id] || [];

  const toggleSection = (s) => setCollapsed(prev => ({ ...prev, [s]: !prev[s] }));

  // Password age warning
  const passwordAgeDays = u.lastPasswordChange
    ? Math.floor((Date.now() - new Date(u.lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSavePerms = () => {
    if (editedPerms && onUpdate) {
      onUpdate({ ...u, customPerms: editedPerms });
      toast.success(t('userMgmt.toast.permissionsSaved'));
    }
    setEditingPerms(false);
    setEditedPerms(null);
    setAutoEnabled(new Set());
  };

  const handleResetToDefaults = () => {
    if (onUpdate) {
      onUpdate({ ...u, customPerms: null });
      toast.success(t('userMgmt.toast.resetToDefaults'));
    }
    setEditingPerms(false);
    setEditedPerms(null);
    setAutoEnabled(new Set());
  };

  const relTime = (iso) => {
    if (!iso) return t('userMgmt.table.never');
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('userMgmt.table.justNow');
    if (mins < 60) return t('userMgmt.table.minsAgo', { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('userMgmt.table.hrsAgo', { n: hrs });
    const days = Math.floor(hrs / 24);
    if (days < 7) return t('userMgmt.table.daysAgo', { n: days });
    const weeks = Math.floor(days / 7);
    return t('userMgmt.table.weeksAgo', { n: weeks });
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0" style={{ zIndex: 120, pointerEvents: open ? 'auto' : 'none' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} style={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s' }} />

      {/* Drawer panel */}
      <div
        className="absolute top-0 right-0 h-full flex flex-col shadow-2xl"
        style={{
          width: 420, maxWidth: '100vw',
          background: T.sf, borderLeft: `1px solid ${T.bd}`,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* ─── Header (sticky) ─── */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex justify-between items-start mb-3">
            <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5 }}>
              {t('userMgmt.drawer.userDetail')}
            </span>
            <button onClick={onClose} className="p-1 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}>
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ background: getUserAvatarColor(u.id) }}
            >
              {getUserInitials(u)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>{getUserFullName(u)}</span>
                {u.isOwner && <span style={{ fontSize: 14 }} title={t('userMgmt.ownership.owner')}>👑</span>}
              </div>
              <div style={{ fontSize: 12, color: T.t3 }}>{u.email}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.fg, border: `1px solid ${sc.bd}` }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc.fg }} />
                  {t(`userMgmt.status.${u.status}`)}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full"
                  style={{ fontSize: 10, fontWeight: 600, background: `${role?.color || '#9CA3AF'}18`, color: role?.color || '#9CA3AF' }}>
                  {role?.name || u.role}
                </span>
                {u.customPerms && (
                  <span className="inline-flex px-1.5 py-0.5 rounded"
                    style={{ fontSize: 9, fontWeight: 700, background: '#F59E0B18', color: '#D97706' }}>
                    {t('userMgmt.role.custom')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Scrollable body ─── */}
        <div className="flex-1 overflow-y-auto">

          {/* §1: Module Access */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <ModuleAccessCard user={u} />
          </div>

          {/* §2: User Info */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5, marginBottom: 10 }}>
              {t('userMgmt.drawer.userInfo')}
            </div>
            <div className="space-y-2.5">
              <InfoRow icon={Phone} label={t('userMgmt.drawer.phone')} value={u.phone || '—'} T={T} />
              <InfoRow icon={Mail} label={t('userMgmt.drawer.jobTitle')} value={u.jobTitle || '—'} T={T} />
              <InfoRow icon={Globe} label={t('userMgmt.drawer.timezone')} value={u.timezone || 'UTC'} T={T} />
              <InfoRow icon={Clock} label={t('userMgmt.drawer.lastActive')} value={relTime(u.lastActive)} T={T} />
              <InfoRow icon={Clock} label={t('userMgmt.drawer.created')} value={fmtDate(u.created)} T={T} />
              <InfoRow
                icon={Key}
                label={t('userMgmt.drawer.lastPasswordChange')}
                value={u.lastPasswordChange ? fmtDate(u.lastPasswordChange) : '—'}
                T={T}
                warning={passwordAgeDays > 90 ? t('userMgmt.drawer.passwordOld', { days: passwordAgeDays }) : null}
              />
              <div className="flex items-center gap-2 pt-1">
                <span style={{ fontSize: 11, fontWeight: 600, color: T.t3 }}>MFA:</span>
                {u.mfa ? (
                  <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>
                    <ShieldCheck size={13} /> {t('userMgmt.filter.mfa_enabled')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1" style={{ fontSize: 12, color: T.t3 }}>
                    <ShieldAlert size={13} /> {t('userMgmt.filter.mfa_disabled')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* §3: Permissions Summary / Edit */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5 }}>
                {t('userMgmt.drawer.permissions')}
              </span>
              {!editingPerms && u.status === 'active' && (
                <button
                  onClick={() => {
                    setEditingPerms(true);
                    setEditedPerms(effectivePerms === null ? null : [...effectivePerms]);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer border-none"
                  style={{ background: T.al, color: T.ac, fontSize: 11, fontWeight: 600 }}
                >
                  <Edit3 size={11} /> {t('userMgmt.drawer.editPermissions')}
                </button>
              )}
            </div>

            {editingPerms && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: '#F59E0B14', border: '1px solid #F59E0B30' }}>
                <AlertTriangle size={13} style={{ color: '#D97706' }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: '#92400E' }}>
                  {t('userMgmt.drawer.editingBanner')}
                </span>
              </div>
            )}

            {isFullAdmin && !editingPerms ? (
              <div className="px-3 py-3 rounded-lg" style={{ background: `${T.ac}08`, border: `1px solid ${T.ac}20` }}>
                <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, color: T.ac }}>
                  <Shield size={14} />
                  {t('userMgmt.drawer.fullAdmin')}
                </div>
                <p style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                  {t('userMgmt.drawer.fullAdminDesc')}
                </p>
              </div>
            ) : (
              <PermissionGrid
                permissions={editingPerms ? editedPerms : effectivePerms}
                editing={editingPerms}
                onChange={setEditedPerms}
                autoEnabledKeys={autoEnabled}
                onAutoEnabled={setAutoEnabled}
                defaultCollapsed={!editingPerms}
              />
            )}

            {editingPerms && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleSavePerms}
                  className="flex-1 py-2 rounded-lg cursor-pointer border-none font-semibold"
                  style={{ background: T.ac, color: '#fff', fontSize: 12 }}
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => { setEditingPerms(false); setEditedPerms(null); setAutoEnabled(new Set()); }}
                  className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
                  style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}
                >
                  {t('common.cancel')}
                </button>
                {u.customPerms && (
                  <button
                    onClick={handleResetToDefaults}
                    className="px-3 py-2 rounded-lg cursor-pointer border-none"
                    style={{ background: 'transparent', color: T.ac, fontSize: 11, fontWeight: 600 }}
                  >
                    {t('userMgmt.drawer.resetToDefaults')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* §4: Login History */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <button
              onClick={() => toggleSection('loginHistory')}
              className="flex items-center justify-between w-full mb-2 cursor-pointer border-none bg-transparent"
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5 }}>
                {t('userMgmt.drawer.loginHistory')}
              </span>
              {collapsed.loginHistory ? <ChevronDown size={13} style={{ color: T.t3 }} /> : <ChevronDown size={13} style={{ color: T.t3, transform: 'rotate(180deg)' }} />}
            </button>
            {!collapsed.loginHistory && (
              <div className="space-y-1.5">
                {loginHistory.length === 0 ? (
                  <p style={{ fontSize: 12, color: T.t3 }}>{t('userMgmt.empty.noLoginHistory')}</p>
                ) : loginHistory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-lg" style={{ background: entry.ok ? 'transparent' : '#FEF2F215', border: entry.ok ? 'none' : '1px solid #FECACA40' }}>
                    <span style={{ fontSize: 11, marginTop: 1 }}>{entry.ok ? '🟢' : '🔴'}</span>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 11, fontWeight: 500, color: entry.ok ? T.t1 : '#EF4444' }}>
                        {fmtDate(entry.ts)}
                      </div>
                      <div style={{ fontSize: 10, color: T.t3 }}>
                        {entry.device} · {entry.city} · {entry.ip}
                      </div>
                      {!entry.ok && <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>{t('userMgmt.drawer.failedLogin')}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* §5: Recent Activity */}
          <div className="p-5" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <button
              onClick={() => toggleSection('activity')}
              className="flex items-center justify-between w-full mb-2 cursor-pointer border-none bg-transparent"
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5 }}>
                {t('userMgmt.drawer.recentActivity')}
              </span>
              {collapsed.activity ? <ChevronDown size={13} style={{ color: T.t3 }} /> : <ChevronDown size={13} style={{ color: T.t3, transform: 'rotate(180deg)' }} />}
            </button>
            {!collapsed.activity && (
              <div className="space-y-1.5">
                {activity.length === 0 ? (
                  <p style={{ fontSize: 12, color: T.t3 }}>{t('userMgmt.empty.noActivity')}</p>
                ) : activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                    style={{ background: T.sa }}>
                    <span style={{ fontSize: 13, marginTop: 1 }}>{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 11, fontWeight: 500, color: T.t1 }}>{a.action}</div>
                      <div style={{ fontSize: 10, color: T.t3 }}>{relTime(a.ts)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* §6: Actions */}
          <div className="p-5">
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5, marginBottom: 10 }}>
              {t('userMgmt.drawer.actions')}
            </div>

            {/* Security actions */}
            <div className="space-y-1.5 mb-4">
              <DrawerAction icon={Lock} label={t('userMgmt.actions.resetPassword')} T={T} onClick={() => toast.success(t('userMgmt.toast.passwordResetSent'))} />
              <DrawerAction icon={u.mfa ? ShieldAlert : ShieldCheck}
                label={u.mfa ? t('userMgmt.actions.disableMfa') : t('userMgmt.actions.requireMfa')}
                T={T} onClick={() => {
                  if (onUpdate) onUpdate({ ...u, mfa: !u.mfa });
                  toast.success(u.mfa ? t('userMgmt.toast.mfaDisabled') : t('userMgmt.toast.mfaEnabled'));
                }}
              />
              <DrawerAction icon={LogOut} label={t('userMgmt.actions.forceSignout')} T={T} onClick={() => toast.success(t('userMgmt.toast.sessionRevoked', { name: getUserFullName(u) }))} />
            </div>

            {/* Status actions */}
            <div className="space-y-1.5">
              {u.status === 'active' && (
                <>
                  <DrawerAction icon={Ban} label={t('userMgmt.actions.suspend')} T={T} danger onClick={onSuspend} />
                  <DrawerAction icon={XCircle} label={t('userMgmt.actions.deactivate')} T={T} danger onClick={onDeactivate} />
                </>
              )}
              {u.status === 'suspended' && (
                <>
                  <DrawerAction icon={RotateCcw} label={t('userMgmt.actions.reactivate')} T={T} onClick={onReactivate} />
                  <DrawerAction icon={XCircle} label={t('userMgmt.actions.deactivate')} T={T} danger onClick={onDeactivate} />
                </>
              )}
              {u.status === 'deactivated' && (
                <>
                  <DrawerAction icon={RotateCcw} label={t('userMgmt.actions.reactivate')} T={T} onClick={onReactivate} />
                  <DrawerAction icon={X} label={t('userMgmt.actions.deletePerm')} T={T} danger onClick={onDelete} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper components ── */

function InfoRow({ icon: Icon, label, value, T, warning }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="shrink-0 mt-0.5" style={{ color: T.t3 }} />
      <div>
        <span style={{ fontSize: 11, color: T.t3 }}>{label}</span>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{value}</div>
        {warning && (
          <div className="flex items-center gap-1 mt-0.5" style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>
            <AlertTriangle size={10} /> {warning}
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerAction({ icon: Icon, label, T, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg cursor-pointer border-none text-left transition-all duration-100"
      style={{
        background: 'transparent',
        border: `1px solid ${danger ? '#EF444430' : T.bd}`,
        color: danger ? '#EF4444' : T.t1,
        fontSize: 12, fontWeight: 500,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? '#FEF2F2' : T.sa; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

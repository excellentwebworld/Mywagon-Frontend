/**
 * UsersTab — User table (PDS-937 Phase 2).
 * No MFA column/filter; no Suspend / Edit Permissions / Require MFA.
 * Edit Details → full-page /settings/users/:id
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Download, X, ChevronDown, ChevronUp,
  MoreHorizontal, Edit3,
  UserPlus, Trash2, RotateCcw, LogOut, Copy,
  Send, Check, XCircle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { useUserMgmt } from '../../../context/UserMgmtContext';
import PaginationBar from '../../../components/ui/PaginationBar';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import InviteUserModal from './modals/InviteUserModal';
import {
  USER_STATUS_CONFIG, getUserInitials, getUserFullName, getUserAvatarColor,
  getInviteStatus,
} from '../../../mocks/userMgmtData';
import { hasCustomDirectPermissions, SHIPPER_ROLES, ROLES_BY_KEY } from '../../../utils/shipperAccessPresets';
import { usersSettingsService } from '../../../api/services/usersSettingsService';
import { ApiError } from '../../../api/client';
const SORT_FIELDS = ['user', 'role', 'status', 'lastActive', 'created'];

export default function UsersTab() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { users, setUsers, addUser, updateUser, refresh, loading, error, roles } = useUserMgmt();
  const roleFilterOptions = roles.length ? roles : SHIPPER_ROLES;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const actionMenuRef = useRef(null);
  const roleFilterRef = useRef(null);
  const statusFilterRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (actionMenu && actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setActionMenu(null);
      if (showRoleFilter && roleFilterRef.current && !roleFilterRef.current.contains(e.target)) setShowRoleFilter(false);
      if (showStatusFilter && statusFilterRef.current && !statusFilterRef.current.contains(e.target)) setShowStatusFilter(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [actionMenu, showRoleFilter, showStatusFilter]);

  const filtered = useMemo(() => {
    let list = [...users];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((u) =>
        getUserFullName(u).toLowerCase().includes(q) ||
        u.email?.toLowerCase?.().includes(q) ||
        (u.phone || '').includes(q) ||
        (ROLES_BY_KEY[u.role]?.name || u.role || '').toLowerCase().includes(q),
      );
    }
    if (roleFilter.length) list = list.filter((u) => roleFilter.includes(u.role));
    if (statusFilter.length) list = list.filter((u) => statusFilter.includes(u.status));
    list.sort((a, b) => {
      let va; let vb;
      switch (sortField) {
        case 'user': va = getUserFullName(a).toLowerCase(); vb = getUserFullName(b).toLowerCase(); break;
        case 'role': va = (ROLES_BY_KEY[a.role]?.name || a.role || ''); vb = (ROLES_BY_KEY[b.role]?.name || b.role || ''); break;
        case 'status': va = a.status || ''; vb = b.status || ''; break;
        case 'lastActive': va = a.lastActive || a.last_active || ''; vb = b.lastActive || b.last_active || ''; break;
        case 'created': va = a.created || a.created_at || ''; vb = b.created || b.created_at || ''; break;
        default: va = ''; vb = '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, roleFilter, statusFilter, sortField, sortDir]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const showFrom = totalCount > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const showTo = Math.min(safePage * pageSize, totalCount);
  const pageData = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, roleFilter, statusFilter]);

  const allOnPageSelected = pageData.length > 0 && pageData.every((u) => selected.has(u.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageData.forEach((u) => next.delete(u.id));
      else pageData.forEach((u) => next.add(u.id));
      return next;
    });
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="inline-flex flex-col ml-1 opacity-30"><ChevronUp size={10} /><ChevronDown size={10} style={{ marginTop: -4 }} /></span>;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="ml-1" style={{ color: T.ac }} />
      : <ChevronDown size={12} className="ml-1" style={{ color: T.ac }} />;
  };

  const openEdit = (u) => {
    setActionMenu(null);
    navigate(`/settings/users/${u.id}`);
  };

  const handleReactivate = async (u) => {
    try {
      const updated = await usersSettingsService.reactivate(u.id);
      updateUser(updated);
      await refresh();
      toast.success(t('userMgmt.toast.reactivated', { name: getUserFullName(u) }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
    }
    setActionMenu(null);
  };
  const handleDeactivate = (u) => {
    setConfirmDialog({
      title: t('userMgmt.confirm.deactivateTitle'),
      message: t('userMgmt.confirm.deactivateMsg', { name: getUserFullName(u) }),
      onConfirm: async () => {
        try {
          const updated = await usersSettingsService.deactivate(u.id);
          updateUser(updated);
          toast.success(t('userMgmt.toast.deactivated', { name: getUserFullName(u) }));
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
        }
        setConfirmDialog(null);
      },
    });
  };
  const handleDeletePermanently = (u) => {
    setConfirmDialog({
      title: t('userMgmt.confirm.deleteTitle'),
      message: t('userMgmt.confirm.deleteMsg', { name: getUserFullName(u) }),
      variant: 'danger',
      onConfirm: () => {
        toast.info(t('userMgmt.toast.deleteNotAvailable', { defaultValue: 'Permanent delete is not available yet. Deactivate the user instead.' }));
        setConfirmDialog(null);
      },
    });
  };
  const handleCancelInvite = (u) => {
    setConfirmDialog({
      title: t('userMgmt.confirm.cancelInviteTitle'),
      message: t('userMgmt.confirm.cancelInviteMsg', { name: getUserFullName(u) }),
      onConfirm: async () => {
        try {
          const updated = await usersSettingsService.deactivate(u.id);
          updateUser(updated);
          toast.success(t('userMgmt.toast.inviteCancelled'));
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleBulkDeactivate = () => {
    setConfirmDialog({
      title: t('userMgmt.bulk.deactivate'),
      message: t('userMgmt.confirm.bulkDeactivateMsg', { count: selected.size }),
      onConfirm: async () => {
        const ids = [...selected];
        for (const id of ids) {
          const u = users.find((x) => String(x.id) === String(id));
          if (!u || u.isOwner || u.is_owner || u.status === 'deactivated') continue;
          try {
            const updated = await usersSettingsService.deactivate(id);
            updateUser(updated);
          } catch {
            /* continue */
          }
        }
        toast.success(t('userMgmt.toast.bulkDeactivated', { count: selected.size }));
        setSelected(new Set());
        setConfirmDialog(null);
      },
    });
  };

  const handleResendInvite = async (u) => {
    try {
      await usersSettingsService.resendInvite(u.id);
      toast.success(t('userMgmt.toast.inviteResent', { email: u.email }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('userMgmt.toast.saveFailed', { defaultValue: 'Action failed' }));
    }
    setActionMenu(null);
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
    return new Date(iso).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasFilters = roleFilter.length > 0 || statusFilter.length > 0 || search;

  return (
    <div className="flex flex-col min-h-0">
      {error && (
        <div className="mx-4 md:mx-6 mt-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 12 }}>
          {error}
        </div>
      )}
      {loading && users.length === 0 && (
        <div className="py-16 text-center" style={{ color: T.t3, fontSize: 13 }}>
          {t('common.loading', { defaultValue: 'Loading…' })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 px-0 md:px-0 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        <div className="relative" style={{ width: 220 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('userMgmt.searchPlaceholder')}
            className="w-full pl-8 pr-3 py-2 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
        </div>

        <div className="relative" ref={roleFilterRef}>
          <button type="button" onClick={() => { setShowRoleFilter(!showRoleFilter); setShowStatusFilter(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: roleFilter.length ? T.al : T.sa, border: `1px solid ${roleFilter.length ? T.ac : T.bd}`, color: roleFilter.length ? T.ac : T.t2, fontSize: 12, fontWeight: 500 }}>
            {t('userMgmt.filter.role')}
            {roleFilter.length > 0 && <span className="font-bold">({roleFilter.length})</span>}
            <ChevronDown size={12} />
          </button>
          {showRoleFilter && (
            <div className="absolute top-full left-0 mt-1 rounded-xl shadow-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, minWidth: 180 }}>
              {roleFilterOptions.map((r) => (
                <label key={r.key} className="flex items-center gap-2 px-3 py-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}>
                  <input type="checkbox" checked={roleFilter.includes(r.key)} onChange={() => {
                    setRoleFilter((prev) => (prev.includes(r.key) ? prev.filter((x) => x !== r.key) : [...prev, r.key]));
                  }} />
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                  {r.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={statusFilterRef}>
          <button type="button" onClick={() => { setShowStatusFilter(!showStatusFilter); setShowRoleFilter(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: statusFilter.length ? T.al : T.sa, border: `1px solid ${statusFilter.length ? T.ac : T.bd}`, color: statusFilter.length ? T.ac : T.t2, fontSize: 12, fontWeight: 500 }}>
            {t('userMgmt.filter.status')}
            {statusFilter.length > 0 && <span className="font-bold">({statusFilter.length})</span>}
            <ChevronDown size={12} />
          </button>
          {showStatusFilter && (
            <div className="absolute top-full left-0 mt-1 rounded-xl shadow-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, minWidth: 180 }}>
              {['active', 'invited', 'suspended', 'deactivated'].map((s) => {
                const sc = USER_STATUS_CONFIG[s];
                return (
                  <label key={s} className="flex items-center gap-2 px-3 py-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}>
                    <input type="checkbox" checked={statusFilter.includes(s)} onChange={() => {
                      setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
                    }} />
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: sc.fg }} />
                    {t(`userMgmt.status.${s}`)}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {hasFilters && (
          <button type="button" onClick={() => { setSearch(''); setRoleFilter([]); setStatusFilter([]); }}
            className="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer border-none bg-transparent" style={{ color: T.ac, fontSize: 11, fontWeight: 600 }}>
            <X size={12} /> {t('userMgmt.filter.clearAll')}
          </button>
        )}

        <div className="flex-1" />

        <button type="button" onClick={() => toast.info(t('userMgmt.toast.exportStarted'))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12, fontWeight: 500 }}>
          <Download size={13} /> {t('userMgmt.export')}
        </button>
        <button type="button" onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
          style={{ background: T.ac, color: '#fff', fontSize: 12, fontWeight: 600 }}>
          <UserPlus size={14} /> {t('userMgmt.inviteUser')}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 py-2.5 flex-wrap" style={{ background: T.al, borderBottom: `1px solid ${T.ac}33` }}>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: T.ac }}>
            <Check size={14} />
            {t('userMgmt.bulk.selected', { count: selected.size })}
          </div>
          <button type="button" onClick={handleBulkDeactivate} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sf, border: `1px solid ${T.bd}`, color: '#EF4444', fontSize: 11, fontWeight: 600 }}>{t('userMgmt.bulk.deactivate')}</button>
          <button type="button" onClick={() => setSelected(new Set())} className="flex items-center gap-1 cursor-pointer border-none bg-transparent" style={{ color: T.t3, fontSize: 11 }}><X size={12} /> {t('userMgmt.bulk.clear')}</button>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        {/* Avoid Tailwind `hidden` — app.css has `.hidden { display:none !important }` which blocks `md:table`. */}
        <table
          className="w-full"
          style={{ borderCollapse: 'collapse', display: 'table', width: '100%' }}
        >
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.bd}` }}>
              <th className="px-4 py-2.5 w-10">
                <input type="checkbox" checked={allOnPageSelected && pageData.length > 0} onChange={toggleAll} />
              </th>
              {SORT_FIELDS.map((f) => (
                <th key={f} onClick={() => handleSort(f)} className="px-3 py-2.5 text-left cursor-pointer select-none"
                  style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5 }}>
                  <span className="inline-flex items-center">
                    {t(`userMgmt.table.col_${f}`)}
                    <SortIcon field={f} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {pageData.map((u) => (
              <UserRow key={String(u.id)} user={u} T={T} t={t}
                selected={selected.has(u.id) || selected.has(String(u.id))}
                onToggle={() => toggleOne(u.id)}
                onClick={() => openEdit(u)}
                actionMenu={actionMenu === u.id || actionMenu === String(u.id)}
                onActionMenuToggle={(e) => {
                  e.stopPropagation();
                  setActionMenu((prev) => (prev === u.id || prev === String(u.id) ? null : u.id));
                }}
                onReactivate={() => handleReactivate(u)}
                onDeactivate={() => { handleDeactivate(u); setActionMenu(null); }}
                onDelete={() => { handleDeletePermanently(u); setActionMenu(null); }}
                onCancelInvite={() => { handleCancelInvite(u); setActionMenu(null); }}
                onResendInvite={() => { handleResendInvite(u); }}
                onCopyLink={() => { navigator.clipboard?.writeText(window.location.origin); toast.info(t('userMgmt.toast.linkCopied')); setActionMenu(null); }}
                onForceSignout={() => { toast.success(t('userMgmt.toast.sessionRevoked', { name: getUserFullName(u) })); setActionMenu(null); }}
                relTime={relTime}
                formatDate={formatDate}
                actionMenuRef={(actionMenu === u.id || actionMenu === String(u.id)) ? actionMenuRef : null}
              />
            ))}
          </tbody>
        </table>

        {pageData.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Search size={32} style={{ color: T.t3, opacity: 0.4 }} />
            <p className="mt-3" style={{ fontSize: 14, fontWeight: 500, color: T.t3 }}>{t('userMgmt.empty.noUsers')}</p>
          </div>
        )}
      </div>

      <PaginationBar
        showFrom={showFrom} showTo={showTo} totalCount={totalCount}
        pageSize={pageSize} setPageSize={setPageSize}
        safePage={safePage} totalPages={totalPages}
        setPage={setPage}
        itemLabel={t('userMgmt.table.users')}
      />

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={async (newUser) => {
          addUser(newUser);
          setInviteOpen(false);
          toast.success(t('userMgmt.toast.invited', { email: newUser.email }));
          await refresh();
        }}
      />

      <ConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmDialog?.onConfirm}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        variant={confirmDialog?.variant || 'danger'}
      />
    </div>
  );
}

function UserRow({
  user: u, T, t, selected, onToggle, onClick,
  actionMenu, onActionMenuToggle,
  onReactivate, onDeactivate, onDelete,
  onCancelInvite, onResendInvite, onCopyLink, onForceSignout,
  relTime, formatDate, actionMenuRef,
}) {
  const role = ROLES_BY_KEY[u.role] || { name: u.role, color: '#3B82F6' };
  const sc = USER_STATUS_CONFIG[u.status] || USER_STATUS_CONFIG.active;
  const inviteInfo = getInviteStatus(u);
  const displayStatus = inviteInfo?.label === 'expired' ? 'expired' : u.status;
  const statusCfg = USER_STATUS_CONFIG[displayStatus] || sc;
  const custom = hasCustomDirectPermissions(u);
  const isOwner = !!(u.isOwner || u.is_owner);

  return (
    <tr onClick={onClick} className="cursor-pointer transition-colors duration-100"
      style={{ borderBottom: `1px solid ${T.bd}` }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{ background: getUserAvatarColor(u.id), fontSize: 12 }}>
            {getUserInitials(u)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{getUserFullName(u)}</span>
              {isOwner && <span title="Owner" style={{ fontSize: 13 }}>👑</span>}
            </div>
            <div style={{ fontSize: 11, color: T.t3 }}>{u.email}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: `${role?.color || '#3B82F6'}18`, color: role?.color || '#3B82F6', border: `1px solid ${role?.color || '#3B82F6'}30` }}>
            {role?.name || u.role}
          </span>
          {custom && (
            <span className="inline-flex px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, background: '#F59E0B18', color: '#D97706', border: '1px solid #F59E0B30' }}>
              {t('userMgmt.role.customPermissions')}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: statusCfg.bg, color: statusCfg.fg, border: `1px solid ${statusCfg.bd}` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.fg }} />
          {t(`userMgmt.status.${displayStatus}`)}
        </span>
      </td>
      <td className="px-3 py-3" style={{ fontSize: 12, color: T.t3 }}>
        {u.status === 'invited' ? (
          <span style={{ color: '#F59E0B' }}>{t('userMgmt.invite.sentAgo', { time: relTime(u.inviteSentAt) })}</span>
        ) : relTime(u.lastActive || u.last_active)}
      </td>
      <td className="px-3 py-3" style={{ fontSize: 12, color: T.t3 }}>{formatDate(u.created || u.created_at)}</td>
      <td className="px-3 py-3 relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onActionMenuToggle} className="p-1.5 rounded-lg cursor-pointer border-none"
          style={{ background: actionMenu ? T.sa : 'transparent', color: T.t3 }}>
          <MoreHorizontal size={16} />
        </button>
        {actionMenu && (
          <div ref={actionMenuRef} className="absolute right-0 top-full mt-1 rounded-xl shadow-xl py-1 min-w-[180px]" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 60 }}>
            {u.status === 'active' && (
              <>
                <ActionItem icon={Edit3} label={t('userMgmt.actions.edit')} onClick={onClick} T={T} />
                <div className="my-1" style={{ borderTop: `1px solid ${T.bd}` }} />
                <ActionItem icon={LogOut} label={t('userMgmt.actions.forceSignout')} onClick={onForceSignout} T={T} />
                <ActionItem icon={XCircle} label={t('userMgmt.actions.deactivate')} onClick={onDeactivate} T={T} danger />
              </>
            )}
            {u.status === 'invited' && (
              <>
                <ActionItem icon={Send} label={t('userMgmt.actions.resendInvite')} onClick={onResendInvite} T={T} />
                <ActionItem icon={Copy} label={t('userMgmt.actions.copyLink')} onClick={onCopyLink} T={T} />
                <div className="my-1" style={{ borderTop: `1px solid ${T.bd}` }} />
                <ActionItem icon={XCircle} label={t('userMgmt.actions.cancelInvite')} onClick={onCancelInvite} T={T} danger />
              </>
            )}
            {u.status === 'suspended' && (
              <>
                <ActionItem icon={Edit3} label={t('userMgmt.actions.edit')} onClick={onClick} T={T} />
                <ActionItem icon={RotateCcw} label={t('userMgmt.actions.reactivate')} onClick={onReactivate} T={T} />
                <ActionItem icon={XCircle} label={t('userMgmt.actions.deactivate')} onClick={onDeactivate} T={T} danger />
              </>
            )}
            {u.status === 'deactivated' && (
              <>
                <ActionItem icon={RotateCcw} label={t('userMgmt.actions.reactivate')} onClick={onReactivate} T={T} />
                <ActionItem icon={Trash2} label={t('userMgmt.actions.deletePerm')} onClick={onDelete} T={T} danger />
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function ActionItem({ icon: Icon, label, onClick, T, danger }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer border-none text-left"
      style={{ background: 'transparent', color: danger ? '#EF4444' : T.t1, fontSize: 12, fontWeight: 500 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <Icon size={14} />
      {label}
    </button>
  );
}

function MobileUserCard({ user: u, T, t, onClick, relTime }) {
  const role = ROLES_BY_KEY[u.role];
  const sc = USER_STATUS_CONFIG[u.status] || USER_STATUS_CONFIG.active;
  return (
    <button type="button" onClick={onClick} className="w-full p-3 rounded-xl cursor-pointer border-none text-left"
      style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: getUserAvatarColor(u.id), fontSize: 13 }}>
          {getUserInitials(u)}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{getUserFullName(u)}</div>
          <div style={{ fontSize: 11, color: T.t3 }}>{u.email}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="inline-flex px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: `${role?.color || '#3B82F6'}18`, color: role?.color || '#3B82F6' }}>
            {role?.name || u.role}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.fg }}>
            {t(`userMgmt.status.${u.status}`)}
          </span>
        </div>
      </div>
      <div className="mt-2" style={{ fontSize: 10, color: T.t3 }}>
        {t('userMgmt.table.col_lastActive')}: {relTime(u.lastActive)}
      </div>
    </button>
  );
}

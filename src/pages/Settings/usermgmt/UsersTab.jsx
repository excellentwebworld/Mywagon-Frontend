/**
 * UsersTab — Main user table with filtering, sorting, bulk selection,
 * row action menus, and user detail drawer.
 *
 * Features:
 * - Sortable columns (User, Role, Status, Last Active, Created)
 * - Search by name, email, phone, role
 * - Filter pills: Role (multi-select), Status (multi-select), MFA (cycling)
 * - Checkbox bulk selection with action bar
 * - Row action menus per status
 * - User detail drawer on row click
 * - Invite user modal
 *
 * API dependencies:
 * - GET /api/v1/users
 * - POST /api/v1/users/invite
 * - PATCH /api/v1/users/:id
 * - POST /api/v1/users/:id/suspend
 * - POST /api/v1/users/:id/reactivate
 * - DELETE /api/v1/users/:id/cancel-invite
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, Download, Filter, X, ChevronDown, ChevronUp,
  MoreHorizontal, Edit3, ShieldCheck, ShieldAlert,
  UserPlus, Trash2, RotateCcw, LogOut, Lock, Copy, Mail,
  Send, Ban, Check, XCircle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import PaginationBar from '../../../components/ui/PaginationBar';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import UserDrawer from './UserDrawer';
import InviteUserModal from './modals/InviteUserModal';
import {
  MOCK_USERS, SHIPPER_ROLES, ROLES_BY_KEY,
  USER_STATUS_CONFIG, getUserInitials, getUserFullName, getUserAvatarColor,
  getInviteStatus,
} from '../../../mocks/userMgmtData';

const MFA_CYCLE = ['all', 'enabled', 'disabled', 'pending'];
const SORT_FIELDS = ['user', 'role', 'status', 'lastActive', 'created'];

export default function UsersTab() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  /* ── State ── */
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [mfaFilter, setMfaFilter] = useState('all');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState(new Set());
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null); // userId or null
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const actionMenuRef = useRef(null);
  const roleFilterRef = useRef(null);
  const statusFilterRef = useRef(null);

  /* ── Close dropdowns on click-outside ── */
  useEffect(() => {
    function handleClick(e) {
      if (actionMenu && actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setActionMenu(null);
      if (showRoleFilter && roleFilterRef.current && !roleFilterRef.current.contains(e.target)) setShowRoleFilter(false);
      if (showStatusFilter && statusFilterRef.current && !statusFilterRef.current.contains(e.target)) setShowStatusFilter(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [actionMenu, showRoleFilter, showStatusFilter]);

  /* ── Filter & Sort ── */
  const filtered = useMemo(() => {
    let list = [...users];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(u =>
        getUserFullName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (ROLES_BY_KEY[u.role]?.name || u.role).toLowerCase().includes(q)
      );
    }
    if (roleFilter.length) list = list.filter(u => roleFilter.includes(u.role));
    if (statusFilter.length) list = list.filter(u => statusFilter.includes(u.status));
    if (mfaFilter !== 'all') {
      if (mfaFilter === 'enabled') list = list.filter(u => u.mfa);
      else if (mfaFilter === 'disabled') list = list.filter(u => !u.mfa);
      else if (mfaFilter === 'pending') list = list.filter(u => !u.mfa && u.status === 'active');
    }
    // Sort
    list.sort((a, b) => {
      let va, vb;
      switch (sortField) {
        case 'user': va = getUserFullName(a).toLowerCase(); vb = getUserFullName(b).toLowerCase(); break;
        case 'role': va = (ROLES_BY_KEY[a.role]?.name || a.role); vb = (ROLES_BY_KEY[b.role]?.name || b.role); break;
        case 'status': va = a.status; vb = b.status; break;
        case 'lastActive': va = a.lastActive || ''; vb = b.lastActive || ''; break;
        case 'created': va = a.created; vb = b.created; break;
        default: va = ''; vb = '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, roleFilter, statusFilter, mfaFilter, sortField, sortDir]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const showFrom = totalCount > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const showTo = Math.min(safePage * pageSize, totalCount);
  const pageData = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset page on filter change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, roleFilter, statusFilter, mfaFilter]);

  /* ── Selection ── */
  const allOnPageSelected = pageData.length > 0 && pageData.every(u => selected.has(u.id));
  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) { pageData.forEach(u => next.delete(u.id)); }
      else { pageData.forEach(u => next.add(u.id)); }
      return next;
    });
  };
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Sort header click ── */
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="inline-flex flex-col ml-1 opacity-30"><ChevronUp size={10} /><ChevronDown size={10} style={{ marginTop: -4 }} /></span>;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="ml-1" style={{ color: T.ac }} />
      : <ChevronDown size={12} className="ml-1" style={{ color: T.ac }} />;
  };

  /* ── Actions ── */
  const handleOpenDrawer = (u) => { setDrawerUser(u); setDrawerOpen(true); setActionMenu(null); };
  const handleSuspend = (u) => {
    setConfirmDialog({
      title: t('userMgmt.confirm.suspendTitle'),
      message: t('userMgmt.confirm.suspendMsg', { name: getUserFullName(u) }),
      onConfirm: () => {
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'suspended' } : x));
        toast.success(t('userMgmt.toast.suspended', { name: getUserFullName(u) }));
        setConfirmDialog(null);
      },
    });
  };
  const handleReactivate = (u) => {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'active' } : x));
    toast.success(t('userMgmt.toast.reactivated', { name: getUserFullName(u) }));
    setActionMenu(null);
  };
  const handleDeactivate = (u) => {
    setConfirmDialog({
      title: t('userMgmt.confirm.deactivateTitle'),
      message: t('userMgmt.confirm.deactivateMsg', { name: getUserFullName(u) }),
      onConfirm: () => {
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'deactivated' } : x));
        toast.success(t('userMgmt.toast.deactivated', { name: getUserFullName(u) }));
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
        setUsers(prev => prev.filter(x => x.id !== u.id));
        toast.success(t('userMgmt.toast.deleted', { name: getUserFullName(u) }));
        setConfirmDialog(null);
        setDrawerOpen(false);
      },
    });
  };
  const handleCancelInvite = (u) => {
    setConfirmDialog({
      title: t('userMgmt.confirm.cancelInviteTitle'),
      message: t('userMgmt.confirm.cancelInviteMsg', { name: getUserFullName(u) }),
      onConfirm: () => {
        setUsers(prev => prev.filter(x => x.id !== u.id));
        toast.success(t('userMgmt.toast.inviteCancelled'));
        setConfirmDialog(null);
      },
    });
  };
  const handleResendInvite = (u) => {
    toast.success(t('userMgmt.toast.inviteResent', { email: u.email }));
    setActionMenu(null);
  };
  const handleCopyLink = () => {
    navigator.clipboard?.writeText('https://app.myvagon.com/invite/mock-token');
    toast.info(t('userMgmt.toast.linkCopied'));
    setActionMenu(null);
  };
  const handleForceSignout = (u) => {
    toast.success(t('userMgmt.toast.sessionRevoked', { name: getUserFullName(u) }));
    setActionMenu(null);
  };

  /* ── Bulk Actions ── */
  const handleBulkSuspend = () => {
    setConfirmDialog({
      title: t('userMgmt.bulk.suspend'),
      message: t('userMgmt.confirm.bulkSuspendMsg', { count: selected.size }),
      onConfirm: () => {
        setUsers(prev => prev.map(x => selected.has(x.id) && x.status === 'active' ? { ...x, status: 'suspended' } : x));
        toast.success(t('userMgmt.toast.bulkSuspended', { count: selected.size }));
        setSelected(new Set());
        setConfirmDialog(null);
      },
    });
  };
  const handleBulkDeactivate = () => {
    setConfirmDialog({
      title: t('userMgmt.bulk.deactivate'),
      message: t('userMgmt.confirm.bulkDeactivateMsg', { count: selected.size }),
      onConfirm: () => {
        setUsers(prev => prev.map(x => selected.has(x.id) ? { ...x, status: 'deactivated' } : x));
        toast.success(t('userMgmt.toast.bulkDeactivated', { count: selected.size }));
        setSelected(new Set());
        setConfirmDialog(null);
      },
    });
  };
  const handleExportCsv = () => {
    toast.info(t('userMgmt.toast.exportStarted'));
  };

  /* ── Update user from drawer ── */
  const handleUpdateUser = useCallback((updatedUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setDrawerUser(updatedUser);
  }, []);

  /* ── Relative time ── */
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
    if (weeks < 4) return t('userMgmt.table.weeksAgo', { n: weeks });
    return new Date(iso).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasFilters = roleFilter.length > 0 || statusFilter.length > 0 || mfaFilter !== 'all' || search;

  return (
    <div className="flex flex-col h-full">
      {/* ─── Filter Bar ─── */}
      <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        {/* Search */}
        <div className="relative" style={{ width: 220 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('userMgmt.searchPlaceholder')}
            className="w-full pl-8 pr-3 py-2 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent" style={{ color: T.t3 }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Role filter pill */}
        <div className="relative" ref={roleFilterRef}>
          <button
            onClick={() => { setShowRoleFilter(!showRoleFilter); setShowStatusFilter(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: roleFilter.length ? T.al : T.sa, border: `1px solid ${roleFilter.length ? T.ac : T.bd}`, color: roleFilter.length ? T.ac : T.t2, fontSize: 12, fontWeight: 500 }}
          >
            {t('userMgmt.filter.role')}
            {roleFilter.length > 0 && <span className="font-bold">({roleFilter.length})</span>}
            <ChevronDown size={12} />
          </button>
          {showRoleFilter && (
            <div className="absolute top-full left-0 mt-1 rounded-xl shadow-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, minWidth: 180 }}>
              {SHIPPER_ROLES.map(r => (
                <label key={r.key} className="flex items-center gap-2 px-3 py-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <input type="checkbox" checked={roleFilter.includes(r.key)} onChange={() => {
                    setRoleFilter(prev => prev.includes(r.key) ? prev.filter(x => x !== r.key) : [...prev, r.key]);
                  }} />
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                  {r.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Status filter pill */}
        <div className="relative" ref={statusFilterRef}>
          <button
            onClick={() => { setShowStatusFilter(!showStatusFilter); setShowRoleFilter(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
            style={{ background: statusFilter.length ? T.al : T.sa, border: `1px solid ${statusFilter.length ? T.ac : T.bd}`, color: statusFilter.length ? T.ac : T.t2, fontSize: 12, fontWeight: 500 }}
          >
            {t('userMgmt.filter.status')}
            {statusFilter.length > 0 && <span className="font-bold">({statusFilter.length})</span>}
            <ChevronDown size={12} />
          </button>
          {showStatusFilter && (
            <div className="absolute top-full left-0 mt-1 rounded-xl shadow-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, minWidth: 180 }}>
              {['active', 'invited', 'suspended', 'deactivated'].map(s => {
                const sc = USER_STATUS_CONFIG[s];
                return (
                  <label key={s} className="flex items-center gap-2 px-3 py-2 cursor-pointer" style={{ fontSize: 12, color: T.t1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <input type="checkbox" checked={statusFilter.includes(s)} onChange={() => {
                      setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                    }} />
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: sc.fg }} />
                    {t(`userMgmt.status.${s}`)}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* MFA cycling pill */}
        <button
          onClick={() => setMfaFilter(prev => MFA_CYCLE[(MFA_CYCLE.indexOf(prev) + 1) % MFA_CYCLE.length])}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
          style={{ background: mfaFilter !== 'all' ? T.al : T.sa, border: `1px solid ${mfaFilter !== 'all' ? T.ac : T.bd}`, color: mfaFilter !== 'all' ? T.ac : T.t2, fontSize: 12, fontWeight: 500 }}
        >
          MFA: {t(`userMgmt.filter.mfa_${mfaFilter}`)}
        </button>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setRoleFilter([]); setStatusFilter([]); setMfaFilter('all'); }}
            className="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer border-none"
            style={{ background: 'transparent', color: T.ac, fontSize: 11, fontWeight: 600 }}
          >
            <X size={12} /> {t('userMgmt.filter.clearAll')}
          </button>
        )}

        <div className="flex-1" />

        {/* Export */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12, fontWeight: 500 }}
        >
          <Download size={13} /> {t('userMgmt.export')}
        </button>

        {/* Invite */}
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none transition-opacity duration-150"
          style={{ background: T.ac, color: '#fff', fontSize: 12, fontWeight: 600 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <UserPlus size={14} /> {t('userMgmt.inviteUser')}
        </button>
      </div>

      {/* ─── Bulk Action Bar ─── */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 md:px-6 py-2.5 flex-wrap"
          style={{ background: T.al, borderBottom: `1px solid ${T.ac}33` }}
        >
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: T.ac }}>
            <Check size={14} />
            {t('userMgmt.bulk.selected', { count: selected.size })}
          </div>
          <button onClick={handleBulkSuspend} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sf, border: `1px solid ${T.bd}`, color: '#F97316', fontSize: 11, fontWeight: 600 }}>{t('userMgmt.bulk.suspend')}</button>
          <button onClick={handleBulkDeactivate} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sf, border: `1px solid ${T.bd}`, color: '#EF4444', fontSize: 11, fontWeight: 600 }}>{t('userMgmt.bulk.deactivate')}</button>
          <button onClick={handleExportCsv} className="px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11, fontWeight: 600 }}>{t('userMgmt.bulk.exportCsv')}</button>
          <button onClick={() => setSelected(new Set())} className="flex items-center gap-1 cursor-pointer border-none bg-transparent" style={{ color: T.t3, fontSize: 11 }}><X size={12} /> {t('userMgmt.bulk.clear')}</button>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="flex-1 overflow-auto">
        {/* Desktop table */}
        <table className="w-full hidden md:table" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.bd}` }}>
              <th className="px-4 py-2.5 w-10">
                <input type="checkbox" checked={allOnPageSelected && pageData.length > 0} onChange={toggleAll} />
              </th>
              {SORT_FIELDS.map(f => (
                <th key={f}
                  onClick={() => handleSort(f)}
                  className="px-3 py-2.5 text-left cursor-pointer select-none"
                  style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5 }}
                >
                  <span className="inline-flex items-center">
                    {t(`userMgmt.table.col_${f}`)}
                    <SortIcon field={f} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-left" style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.5 }}>MFA</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {pageData.map(u => (
              <UserRow key={u.id} user={u} T={T} t={t}
                selected={selected.has(u.id)}
                onToggle={() => toggleOne(u.id)}
                onClick={() => handleOpenDrawer(u)}
                actionMenu={actionMenu === u.id}
                onActionMenuToggle={(e) => { e.stopPropagation(); setActionMenu(prev => prev === u.id ? null : u.id); }}
                onSuspend={() => { handleSuspend(u); setActionMenu(null); }}
                onReactivate={() => handleReactivate(u)}
                onDeactivate={() => { handleDeactivate(u); setActionMenu(null); }}
                onDelete={() => { handleDeletePermanently(u); setActionMenu(null); }}
                onCancelInvite={() => { handleCancelInvite(u); setActionMenu(null); }}
                onResendInvite={() => handleResendInvite(u)}
                onCopyLink={() => handleCopyLink()}
                onForceSignout={() => handleForceSignout(u)}
                relTime={relTime}
                formatDate={formatDate}
                actionMenuRef={actionMenu === u.id ? actionMenuRef : null}
              />
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="md:hidden px-4 py-3 space-y-2">
          {pageData.map(u => (
            <MobileUserCard key={u.id} user={u} T={T} t={t}
              onClick={() => handleOpenDrawer(u)}
              relTime={relTime}
            />
          ))}
        </div>

        {/* Empty state */}
        {pageData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Search size={32} style={{ color: T.t3, opacity: 0.4 }} />
            <p className="mt-3" style={{ fontSize: 14, fontWeight: 500, color: T.t3 }}>
              {t('userMgmt.empty.noUsers')}
            </p>
          </div>
        )}
      </div>

      {/* ─── Pagination ─── */}
      <PaginationBar
        showFrom={showFrom} showTo={showTo} totalCount={totalCount}
        pageSize={pageSize} setPageSize={setPageSize}
        safePage={safePage} totalPages={totalPages}
        setPage={setPage}
        itemLabel={t('userMgmt.table.users')}
      />

      {/* ─── User Drawer ─── */}
      <UserDrawer
        user={drawerUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdate={handleUpdateUser}
        onSuspend={() => drawerUser && handleSuspend(drawerUser)}
        onReactivate={() => drawerUser && handleReactivate(drawerUser)}
        onDeactivate={() => drawerUser && handleDeactivate(drawerUser)}
        onDelete={() => drawerUser && handleDeletePermanently(drawerUser)}
      />

      {/* ─── Invite Modal ─── */}
      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(newUser) => {
          setUsers(prev => [...prev, newUser]);
          setInviteOpen(false);
          toast.success(t('userMgmt.toast.invited', { email: newUser.email }));
        }}
      />

      {/* ─── Confirm Dialog ─── */}
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

/* ═══════════════════════════════════════════════════════════════════════════
   USER TABLE ROW
   ═══════════════════════════════════════════════════════════════════════════ */

function UserRow({
  user: u, T, t, selected, onToggle, onClick,
  actionMenu, onActionMenuToggle,
  onSuspend, onReactivate, onDeactivate, onDelete,
  onCancelInvite, onResendInvite, onCopyLink, onForceSignout,
  relTime, formatDate, actionMenuRef,
}) {
  const role = ROLES_BY_KEY[u.role];
  const sc = USER_STATUS_CONFIG[u.status] || USER_STATUS_CONFIG.active;
  const inviteInfo = getInviteStatus(u);
  const displayStatus = inviteInfo?.label === 'expired' ? 'expired' : u.status;
  const statusCfg = USER_STATUS_CONFIG[displayStatus] || sc;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors duration-100"
      style={{ borderBottom: `1px solid ${T.bd}` }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>

      {/* User */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{ background: getUserAvatarColor(u.id), fontSize: 12 }}
          >
            {getUserInitials(u)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{getUserFullName(u)}</span>
              {u.isOwner && <span title="Owner" style={{ fontSize: 13 }}>👑</span>}
            </div>
            <div style={{ fontSize: 11, color: T.t3 }}>{u.email}</div>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: `${role?.color || '#9CA3AF'}18`, color: role?.color || '#9CA3AF', border: `1px solid ${role?.color || '#9CA3AF'}30` }}>
            {role?.name || u.role}
          </span>
          {u.customPerms && (
            <span className="inline-flex px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 700, background: '#F59E0B18', color: '#D97706', border: '1px solid #F59E0B30' }}>
              {t('userMgmt.role.custom')}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: statusCfg.bg, color: statusCfg.fg, border: `1px solid ${statusCfg.bd}` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.fg }} />
          {t(`userMgmt.status.${displayStatus}`)}
          {inviteInfo && inviteInfo.label !== 'expired' && (
            <span style={{ fontWeight: 400, opacity: 0.8 }}> · {t('userMgmt.invite.daysLeft', { n: inviteInfo.daysLeft })}</span>
          )}
        </span>
      </td>

      {/* Last Active */}
      <td className="px-3 py-3" style={{ fontSize: 12, color: T.t3 }}>
        {u.status === 'invited' ? (
          <span style={{ color: '#F59E0B' }}>{t('userMgmt.invite.sentAgo', { time: relTime(u.inviteSentAt) })}</span>
        ) : relTime(u.lastActive)}
      </td>

      {/* Created */}
      <td className="px-3 py-3" style={{ fontSize: 12, color: T.t3 }}>
        {formatDate(u.created)}
      </td>

      {/* MFA */}
      <td className="px-3 py-3">
        {u.mfa ? (
          <ShieldCheck size={15} style={{ color: '#10B981' }} />
        ) : (
          <ShieldAlert size={15} style={{ color: T.t3, opacity: 0.4 }} />
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onActionMenuToggle}
          className="p-1.5 rounded-lg cursor-pointer border-none"
          style={{ background: actionMenu ? T.sa : 'transparent', color: T.t3 }}
        >
          <MoreHorizontal size={16} />
        </button>
        {actionMenu && (
          <div ref={actionMenuRef} className="absolute right-0 top-full mt-1 rounded-xl shadow-xl py-1 min-w-[180px]" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 60 }}>
            {u.status === 'active' && (
              <>
                <ActionItem icon={Edit3} label={t('userMgmt.actions.edit')} onClick={onClick} T={T} />
                <ActionItem icon={ShieldCheck} label={t('userMgmt.actions.changeRole')} onClick={onClick} T={T} />
                <ActionItem icon={Lock} label={t('userMgmt.actions.editPerms')} onClick={onClick} T={T} />
                <div className="my-1" style={{ borderTop: `1px solid ${T.bd}` }} />
                <ActionItem icon={LogOut} label={t('userMgmt.actions.forceSignout')} onClick={onForceSignout} T={T} />
                <ActionItem icon={ShieldAlert} label={t('userMgmt.actions.requireMfa')} onClick={() => {}} T={T} />
                <div className="my-1" style={{ borderTop: `1px solid ${T.bd}` }} />
                <ActionItem icon={Ban} label={t('userMgmt.actions.suspend')} onClick={onSuspend} T={T} danger />
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
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer border-none text-left"
      style={{ background: 'transparent', color: danger ? '#EF4444' : T.t1, fontSize: 12, fontWeight: 500 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE USER CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function MobileUserCard({ user: u, T, t, onClick, relTime }) {
  const role = ROLES_BY_KEY[u.role];
  const sc = USER_STATUS_CONFIG[u.status] || USER_STATUS_CONFIG.active;

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-xl cursor-pointer border-none text-left"
      style={{ background: T.sf, border: `1px solid ${T.bd}` }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: getUserAvatarColor(u.id), fontSize: 13 }}
        >
          {getUserInitials(u)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{getUserFullName(u)}</span>
            {u.isOwner && <span style={{ fontSize: 13 }}>👑</span>}
          </div>
          <div style={{ fontSize: 11, color: T.t3 }}>{u.email}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="inline-flex px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: `${role?.color || '#9CA3AF'}18`, color: role?.color || '#9CA3AF' }}>
            {role?.name || u.role}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.fg }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: sc.fg }} />
            {t(`userMgmt.status.${u.status}`)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2" style={{ fontSize: 10, color: T.t3 }}>
        <span>{t('userMgmt.table.col_lastActive')}: {relTime(u.lastActive)}</span>
        {u.mfa && <ShieldCheck size={12} style={{ color: '#10B981' }} />}
      </div>
    </button>
  );
}

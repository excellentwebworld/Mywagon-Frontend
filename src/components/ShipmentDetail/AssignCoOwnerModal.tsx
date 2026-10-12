import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Users, Check, Loader2, UserCheck, AlertCircle, ShieldAlert } from 'lucide-react';
import { shipmentsService } from '../../api/services/shipmentsService';
import type { ApiShipmentCoOwner } from '../../api/types/shipments';
import { MvButton } from '../ui/mv';

interface AssignCoOwnerModalProps {
  open: boolean;
  shipmentId: string | number;
  shipmentDisplayId?: string;
  onClose: () => void;
  onSuccess: (updatedCoOwners: ApiShipmentCoOwner[]) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: (key: string, fallback?: string) => string;
}

const formatRoleLabel = (
  user: ApiShipmentCoOwner,
  t: (key: string, fallback?: string) => string,
): string => {
  const roleKey = String(user.role || '')
    .replace(/^custom_\d+_/, '')
    .toLowerCase()
    .trim();
  if (roleKey === 'admin') return t('roles.admin', 'Admin');
  if (roleKey === 'dispatcher') return t('roles.dispatcher', 'Dispatcher');

  const raw = user.role_label || user.role || '';
  if (!raw) return '';
  // Clean raw Spatie key if present e.g. custom_365_team_lead -> Team Lead
  const clean = raw.replace(/^custom_\d+_/, '');
  const key = clean.toLowerCase();
  if (key === 'admin') return t('roles.admin', 'Admin');
  if (key === 'dispatcher') return t('roles.dispatcher', 'Dispatcher');
  return clean
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const AssignCoOwnerModal: React.FC<AssignCoOwnerModalProps> = ({
  open,
  shipmentId,
  shipmentDisplayId,
  onClose,
  onSuccess,
  onToast,
  t,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<ApiShipmentCoOwner[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open || !shipmentId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setSearchQuery('');

    shipmentsService
      .getCoOwners(shipmentId)
      .then((data) => {
        if (!mounted) return;
        setAvailableUsers(data.available_users || []);
        const assignedSet = new Set<number>((data.assigned_ids || []).map(Number));
        setSelectedUserIds(assignedSet);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to load co-owners:', err);
        setError(t('failedToLoadCoOwners', 'Failed to load organization dispatchers.'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, shipmentId, t]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableUsers;
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
    );
  }, [availableUsers, searchQuery]);

  if (!open) return null;

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === availableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(availableUsers.map((u) => u.id)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const idsArray = Array.from(selectedUserIds);
      const res = await shipmentsService.assignCoOwners(shipmentId, idsArray);
      onToast(
        t('coOwnersUpdatedSuccess', 'Shipment co-owners updated successfully.'),
        'success'
      );
      onSuccess(res.co_owners || []);
      onClose();
    } catch (err: any) {
      console.error('Failed to save co-owners:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t('failedToSaveCoOwners', 'Failed to update shipment co-owners.');
      setError(msg);
      onToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-co-owner-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              <Users size={20} />
            </div>
            <div>
              <h3
                id="assign-co-owner-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {t('assignCoOwner', 'Assign Co-Owner')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {shipmentDisplayId ? `#${shipmentDisplayId} · ` : ''}
                {t(
                  'assignCoOwnerSubtitle',
                  'Select dispatcher team members to grant co-ownership of this load'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label={t('close', 'Close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
              <Loader2 size={28} className="animate-spin text-purple-600" />
              <p className="text-xs font-medium">
                {t('loadingDispatchers', 'Loading dispatchers...')}
              </p>
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Users size={22} />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('noSubUsersFound', 'No dispatcher users found')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                {t(
                  'noSubUsersDesc',
                  'To assign co-owners, invite sub-users (dispatchers) under Settings → Users & Roles.'
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Search & Select all bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchDispatchers', 'Search by name or email...')}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                      aria-label={t('clearSearch', 'Clear search')}
                      title={t('clearSearch', 'Clear search')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                {availableUsers.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                  >
                    {selectedUserIds.size === availableUsers.length
                      ? t('deselectAll', 'Deselect All')
                      : t('selectAll', 'Select All')}
                  </button>
                )}
              </div>

              {/* User List */}
              <div className="space-y-2 mt-3">
                {filteredUsers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    {t('noMatchesFound', 'No dispatchers match your search.')}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.has(user.id);
                    const roleLabel = formatRoleLabel(user, t);
                    const initials = (user.name || 'User')
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {user.name}
                              </span>
                              {roleLabel && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {roleLabel}
                                </span>
                              )}
                            </div>
                            {user.email && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-3 ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check size={13} className="stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedUserIds.size > 0 ? (
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {selectedUserIds.size} {t('selected', 'selected')}
              </span>
            ) : (
              <span>{t('noCoOwnersAssigned', 'No co-owners selected')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MvButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              {t('cancel', 'Cancel')}
            </MvButton>
            <MvButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={loading || saving}
              icon={saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            >
              {saving ? t('saving', 'Saving...') : t('saveCoOwners', 'Save Co-Owners')}
            </MvButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

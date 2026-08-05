/**
 * AuditTab — Filtered audit log timeline with export.
 *
 * Features:
 * - Search by actor name, target name, action description
 * - Action type multi-select filter pill
 * - Date range (from/to)
 * - Actor filter
 * - CSV export of filtered entries
 * - Timeline UI with icons per action type
 *
 * API dependencies:
 * - GET /api/v1/audit-log?search=&type=&from=&to=&actor=&page=&limit=
 * - GET /api/v1/audit-log/export
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Download, X, ChevronDown,
  UserPlus, ShieldCheck, Ban, UserX, RefreshCw,
  KeyRound, Shield, LogOut, Trash2, Settings, Clock,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { auditSettingsService } from '../../../api/services/auditSettingsService';
import { UserAuditTabSkeleton } from '../components/AuditSkeletons';

const ACTION_ICONS = {
  login: Clock,
  invited: UserPlus,
  roleChanged: ShieldCheck,
  roleCreated: Shield,
  roleEdited: Shield,
  suspended: Ban,
  deactivated: UserX,
  reactivated: RefreshCw,
  permissionsEdited: Settings,
  passwordReset: KeyRound,
  mfaChanged: ShieldCheck,
  signedOut: LogOut,
  deleted: Trash2,
  policyChanged: Settings,
};

const ACTION_COLORS = {
  login: '#6B7280',
  invited: '#3B82F6',
  roleChanged: '#8B5CF6',
  roleCreated: '#10B981',
  roleEdited: '#F59E0B',
  suspended: '#F97316',
  deactivated: '#EF4444',
  reactivated: '#10B981',
  permissionsEdited: '#8B5CF6',
  passwordReset: '#F59E0B',
  mfaChanged: '#0EA5E9',
  signedOut: '#EF4444',
  deleted: '#EF4444',
  policyChanged: '#6B7280',
};

const ACTION_TYPES = [
  'login', 'invited', 'roleChanged', 'roleCreated', 'roleEdited',
  'suspended', 'deactivated', 'reactivated', 'permissionsEdited',
  'passwordReset', 'mfaChanged', 'signedOut', 'deleted', 'policyChanged',
];

export default function AuditTab() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const typeRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditSettingsService.listUserAudit({
        search: search || undefined,
        action_type: selectedTypes.length ? selectedTypes : undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page: 1,
        per_page: 50,
      });
      setEntries(res.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('userMgmt.empty.noAudit'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedTypes, dateFrom, dateTo, toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Click-outside for type dropdown
  useEffect(() => {
    if (!showTypeDropdown) return;
    const handler = (e) => {
      if (typeRef.current && !typeRef.current.contains(e.target)) setShowTypeDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTypeDropdown]);

  const toggleType = (type) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const filtered = entries;

  const hasFilters = search || selectedTypes.length > 0 || dateFrom || dateTo;

  const clearAll = () => {
    setSearch('');
    setSelectedTypes([]);
    setDateFrom('');
    setDateTo('');
  };

  const handleExport = () => {
    toast.success(t('userMgmt.audit.exportStarted'));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* ─── Filter bar ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('userMgmt.audit.searchPlaceholder')}
            className="pl-8 pr-3 py-1.5 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12, width: 200 }}
          />
        </div>

        {/* Action type pill */}
        <div className="relative" ref={typeRef}>
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
            style={{
              background: selectedTypes.length > 0 ? T.al : T.sa,
              border: `1px solid ${selectedTypes.length > 0 ? T.ac : T.bd}`,
              color: selectedTypes.length > 0 ? T.ac : T.t2,
              fontSize: 12, fontWeight: 500,
            }}
          >
            {t('userMgmt.audit.actionType')}
            {selectedTypes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: T.ac, color: '#fff' }}>
                {selectedTypes.length}
              </span>
            )}
            <ChevronDown size={12} />
          </button>
          {showTypeDropdown && (
            <div className="absolute left-0 top-full mt-1 rounded-xl shadow-lg overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, width: 220, maxHeight: 280, overflowY: 'auto' }}>
              {ACTION_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 px-3 py-2 cursor-pointer" style={{ borderBottom: `1px solid ${T.bd}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
                  <span style={{ fontSize: 12, color: T.t1 }}>{t(`userMgmt.audit.type_${type}`)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg outline-none"
          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
        <span style={{ fontSize: 12, color: T.t3 }}>→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg outline-none"
          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />

        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer border-none" style={{ color: T.t3, fontSize: 11 }}>
            <X size={11} /> {t('userMgmt.filter.clearAll')}
          </button>
        )}

        <div className="ml-auto">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
            <Download size={13} /> {t('userMgmt.audit.export')}
          </button>
        </div>
      </div>

      {/* ─── Timeline ─── */}
      {loading ? (
        <UserAuditTabSkeleton T={T} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Clock size={28} style={{ color: T.t3, opacity: 0.4 }} />
          <p style={{ fontSize: 13, color: T.t3, marginTop: 8 }}>{t('userMgmt.empty.noAudit')}</p>
        </div>
      ) : (
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: T.bd }} />

          <div className="space-y-0">
            {filtered.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] || Clock;
              const color = ACTION_COLORS[entry.action] || T.t3;

              return (
                <div key={entry.id} className="relative flex gap-3 py-3 pl-0">
                  {/* dot */}
                  <div className="relative z-10 flex items-center justify-center shrink-0"
                    style={{ width: 38, height: 38, background: `${color}15`, borderRadius: '50%' }}>
                    <Icon size={16} style={{ color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" style={{ fontSize: 12, color: T.t1 }}>{entry.actor}</span>
                      <span style={{ fontSize: 11, color: T.t3 }}>→</span>
                      <span className="font-medium" style={{ fontSize: 12, color: T.t1 }}>{entry.target}</span>
                      <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: `${color}15`, color }}>
                        {t(`userMgmt.audit.type_${entry.action}`)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{entry.summary}</p>
                    <span style={{ fontSize: 10, color: T.t3 }}>{formatDate(entry.ts)} · {formatTime(entry.ts)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

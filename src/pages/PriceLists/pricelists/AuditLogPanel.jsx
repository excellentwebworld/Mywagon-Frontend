/**
 * AuditLogPanel — Global audit log slide-in panel.
 *
 * Used by: Shipper, Forwarder, Carrier.
 *
 * Phase 1: session in-memory entries + Settings-like filters (search, action, date range).
 * TODO(Phase 2): swap to GET /api/v1/price-lists/audit-log when backend ships.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, History, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { DatePicker } from '../../../components/ui/DatePicker';
import { formatIsoDisplayDateTime } from '../../../utils/dateDisplay';

const PAGE_SIZE = 50;

const DOT_COLORS = {
  created: '#10B981',
  updated: '#3B82F6',
  activated: '#10B981',
  deactivated: '#F59E0B',
  archived: '#9CA3AF',
  deleted: '#EF4444',
  duplicated: '#8B5CF6',
  imported: '#06B6D4',
};

const ACTION_TYPES = [
  'created',
  'updated',
  'activated',
  'deactivated',
  'archived',
  'deleted',
  'duplicated',
  'imported',
];

function entryDayKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AuditLogPanel({ open, onClose, auditLog }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const typeRef = useRef(null);

  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (typeRef.current && !typeRef.current.contains(e.target)) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedTypes, dateFrom, dateTo]);

  const actionLabels = useMemo(() => ({
    created: t('priceLists.audit.created', 'Created'),
    updated: t('priceLists.audit.updated', 'Updated'),
    activated: t('priceLists.audit.activated', 'Activated'),
    deactivated: t('priceLists.audit.deactivated', 'Deactivated'),
    archived: t('priceLists.audit.archived', 'Archived'),
    deleted: t('priceLists.audit.deleted', 'Deleted'),
    duplicated: t('priceLists.audit.duplicated', 'Duplicated'),
    imported: t('priceLists.audit.imported', 'Imported'),
  }), [t]);

  const filtered = useMemo(() => {
    const list = Array.isArray(auditLog) ? auditLog : [];
    const q = search.trim().toLowerCase();
    return list.filter((e) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(e.action)) return false;
      if (dateFrom || dateTo) {
        const day = entryDayKey(e.timestamp);
        if (!day) return false;
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
      }
      if (q) {
        const hay = `${e.details || ''} ${e.laneId || ''} ${e.user || ''} ${e.action || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auditLog, search, selectedTypes, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const source = filtered;
    return {
      created: source.filter((e) => e.action === 'created' || e.action === 'imported' || e.action === 'duplicated').length,
      updated: source.filter((e) => e.action === 'updated').length,
      status: source.filter((e) => e.action === 'activated' || e.action === 'deactivated' || e.action === 'archived').length,
      deleted: source.filter((e) => e.action === 'deleted').length,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length);

  const hasFilters = Boolean(search.trim() || selectedTypes.length > 0 || dateFrom || dateTo);

  const clearAll = () => {
    setSearch('');
    setSelectedTypes([]);
    setDateFrom('');
    setDateTo('');
    setShowTypeDropdown(false);
    setPage(1);
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) => (
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]
    ));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex: 190 }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute right-0 top-0 bottom-0 flex flex-col shadow-2xl"
        style={{ width: 440, background: T.sf, borderLeft: `1px solid ${T.bd}`, animation: 'slideIn 0.3s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <History size={18} style={{ color: T.ac }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: 0 }}>
              {t('priceLists.audit.title', 'Audit Log')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded cursor-pointer border-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ background: 'transparent', color: T.t3 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          {[
            { key: 'created', label: t('priceLists.audit.createdLabel', 'Created'), color: '#10B981' },
            { key: 'updated', label: t('priceLists.audit.updatedLabel', 'Updated'), color: '#3B82F6' },
            { key: 'status', label: t('priceLists.audit.statusLabel', 'Status'), color: '#F59E0B' },
            { key: 'deleted', label: t('priceLists.audit.deletedLabel', 'Deleted'), color: '#EF4444' },
          ].map((c) => (
            <div key={c.key} className="flex flex-col items-center justify-center px-1 py-2.5 rounded-lg min-h-[58px]" style={{ background: T.bg }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.color, lineHeight: 1.1 }}>{stats[c.key]}</div>
              <div className="truncate w-full text-center mt-1" style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="px-5 py-3 shrink-0 space-y-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('priceLists.audit.searchPlaceholder', 'Search details or lane ID…')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg outline-none"
              style={{ border: `1px solid ${T.bd}`, background: T.bg, color: T.t1, fontSize: 12 }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={typeRef}>
              <button
                type="button"
                onClick={() => setShowTypeDropdown((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                style={{
                  background: selectedTypes.length > 0 ? T.al : T.sa,
                  border: `1px solid ${selectedTypes.length > 0 ? T.ac : T.bd}`,
                  color: selectedTypes.length > 0 ? T.ac : T.t2,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {t('priceLists.audit.actionType', 'Action')}
                {selectedTypes.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: T.ac, color: '#fff' }}>
                    {selectedTypes.length}
                  </span>
                )}
                <ChevronDown size={12} />
              </button>
              {showTypeDropdown && (
                <div
                  className="absolute left-0 top-full mt-1 rounded-xl shadow-lg overflow-hidden"
                  style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, width: 200, maxHeight: 280, overflowY: 'auto' }}
                >
                  {ACTION_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                      style={{ borderBottom: `1px solid ${T.bd}` }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleType(type)}
                      />
                      <span style={{ fontSize: 12, color: T.t1 }}>{actionLabels[type] || type}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: 128 }}>
              <DatePicker
                value={dateFrom}
                onChange={setDateFrom}
                max={dateTo || undefined}
                direction="auto"
                placeholder="dd/MM/yyyy"
              />
            </div>
            <span style={{ fontSize: 12, color: T.t3 }}>→</span>
            <div style={{ width: 128 }}>
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                min={dateFrom || undefined}
                direction="auto"
                placeholder="dd/MM/yyyy"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer border-none"
                style={{ color: T.t3, fontSize: 11, background: 'transparent' }}
              >
                <X size={11} /> {t('priceLists.audit.clearFilters', 'Clear')}
              </button>
            )}
          </div>

          <div style={{ fontSize: 11, color: T.t3 }}>
            {t('priceLists.audit.filteredCount', {
              defaultValue: '{{count}} entries',
              count: filtered.length,
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10" style={{ color: T.t3, fontSize: 13 }}>
              {t('priceLists.audit.noEntries', 'No audit entries')}
            </div>
          ) : (
            <div className="space-y-1">
              {pageSlice.map((entry, i) => (
                <div
                  key={entry.id || i}
                  className="rounded-lg px-3 py-2.5"
                  style={{ background: T.bg, borderLeft: `3px solid ${DOT_COLORS[entry.action] || '#9CA3AF'}` }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12, fontWeight: 600, color: DOT_COLORS[entry.action] || T.t2 }}>
                      {actionLabels[entry.action] || entry.action}
                    </span>
                    <span style={{ fontSize: 10, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>
                      {entry.laneId}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: T.t1, marginTop: 2 }}>{entry.details}</div>
                  <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>
                    {entry.user} · {formatIsoDisplayDateTime(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderTop: `1px solid ${T.bd}` }}
          >
            <span style={{ fontSize: 11, color: T.t3 }}>
              {t('priceLists.audit.showing', {
                defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
                from: showingFrom,
                to: showingTo,
                total: filtered.length,
              })}
            </span>
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded cursor-pointer border-none disabled:opacity-40"
                  style={{ background: T.sa, color: T.t2 }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 11, color: T.t3, minWidth: 40, textAlign: 'center' }}>
                  {safePage}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded cursor-pointer border-none disabled:opacity-40"
                  style={{ background: T.sa, color: T.t2 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

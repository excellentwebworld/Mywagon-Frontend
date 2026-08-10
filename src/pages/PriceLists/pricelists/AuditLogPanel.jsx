/**
 * AuditLogPanel — Global audit log slide-in panel (API-backed).
 *
 * GET /price-lists/audit-log + export.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, History, Search, ChevronDown, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { DatePicker } from '../../../components/ui/DatePicker';
import { formatIsoDisplayDateTime } from '../../../utils/dateDisplay';
import { priceListsService } from '../../../api/services/priceListsService';
import { AuditLogPanelSkeleton } from './PriceListsSkeleton';

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

export default function AuditLogPanel({ open, onClose }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const typeRef = useRef(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    per_page: PAGE_SIZE,
    total: 0,
    last_page: 1,
    action_counts: { created: 0, updated: 0, status: 0, deleted: 0 },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

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
  }, [debouncedSearch, selectedTypes, dateFrom, dateTo]);

  const filterParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    action_type: selectedTypes.length > 0 ? selectedTypes : undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  }), [debouncedSearch, selectedTypes, dateFrom, dateTo]);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const result = await priceListsService.listAuditLog({
        ...filterParams,
        page,
        per_page: PAGE_SIZE,
      });
      setEntries(result.items);
      setMeta({
        current_page: result.meta.current_page,
        per_page: result.meta.per_page,
        total: result.meta.total,
        last_page: result.meta.last_page,
        action_counts: result.meta.action_counts || { created: 0, updated: 0, status: 0, deleted: 0 },
      });
    } catch (_e) {
      setEntries([]);
      toast.error(t('priceLists.audit.loadError', 'Could not load audit log.'));
    } finally {
      setLoading(false);
    }
  }, [open, filterParams, page, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const stats = meta.action_counts || { created: 0, updated: 0, status: 0, deleted: 0 };
  const total = meta.total || 0;
  const totalPages = Math.max(1, meta.last_page || 1);
  const safePage = Math.min(page, totalPages);
  const showingFrom = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, total);
  const hasFilters = Boolean(search.trim() || selectedTypes.length > 0 || dateFrom || dateTo);

  const clearAll = () => {
    setSearch('');
    setDebouncedSearch('');
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const { truncated } = await priceListsService.exportAuditLog(filterParams);
      toast.success(t('priceLists.audit.exportStarted', 'Export started'));
      if (truncated) {
        toast.info(t('priceLists.audit.exportTruncated', 'Export limited to 10,000 most recent entries.'));
      }
    } catch (_e) {
      toast.error(t('priceLists.audit.exportError', 'Failed to export audit log'));
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex: 190 }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute right-0 top-0 bottom-0 flex flex-col shadow-2xl"
        style={{ width: 440, background: T.sf, borderLeft: `1px solid ${T.bd}`, animation: 'slideIn 0.3s ease' }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <History size={18} style={{ color: T.ac }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: 0 }}>
              {t('priceLists.audit.title', 'Audit Log')}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer border-none disabled:opacity-60"
              style={{ background: T.sa, color: T.t2, fontSize: 11, fontWeight: 600 }}
            >
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {t('priceLists.audit.export', 'Export')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded cursor-pointer border-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ background: 'transparent', color: T.t3 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          {[
            { key: 'created', label: t('priceLists.audit.createdLabel', 'Created'), color: '#10B981' },
            { key: 'updated', label: t('priceLists.audit.updatedLabel', 'Updated'), color: '#3B82F6' },
            { key: 'status', label: t('priceLists.audit.statusLabel', 'Status'), color: '#F59E0B' },
            { key: 'deleted', label: t('priceLists.audit.deletedLabel', 'Deleted'), color: '#EF4444' },
          ].map((c) => (
            <div key={c.key} className="flex flex-col items-center justify-center px-1 py-2.5 rounded-lg min-h-[58px]" style={{ background: T.bg }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.color, lineHeight: 1.1 }}>{stats[c.key] || 0}</div>
              <div className="truncate w-full text-center mt-1" style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 shrink-0 space-y-2 overflow-visible" style={{ borderBottom: `1px solid ${T.bd}` }}>
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

          <div className="flex flex-wrap items-center gap-2 overflow-visible">
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
                align="auto"
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
              count: total,
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <AuditLogPanelSkeleton rows={6} />
          ) : entries.length === 0 ? (
            <div className="text-center py-10" style={{ color: T.t3, fontSize: 13 }}>
              {t('priceLists.audit.noEntries', 'No audit entries')}
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry, i) => (
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
                      {entry.laneId || '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: T.t1, marginTop: 2 }}>{entry.details}</div>
                  {Array.isArray(entry.changes) && entry.changes.length > 0 && (
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>
                      {entry.changes.map((c) => `${c.field}: ${c.from || '—'} → ${c.to || '—'}`).join(' · ')}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>
                    {entry.actor} · {formatIsoDisplayDateTime(entry.ts)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {total > 0 && !loading && (
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderTop: `1px solid ${T.bd}` }}
          >
            <span style={{ fontSize: 11, color: T.t3 }}>
              {t('priceLists.audit.showing', {
                defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
                from: showingFrom,
                to: showingTo,
                total,
              })}
            </span>
            {total > PAGE_SIZE && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1 || loading}
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
                  disabled={safePage >= totalPages || loading}
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

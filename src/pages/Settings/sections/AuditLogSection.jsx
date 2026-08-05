/**
 * AuditLogSection — Full audit log with filters, expandable detail, date grouping, export.
 *
 * Features:
 * - Search by actor, target, details
 * - Category multi-select filter
 * - Severity cycling pill (All → Info → Warning → Critical)
 * - Date range (from/to)
 * - Date-grouped entries (Today, Yesterday, X days ago, actual dates)
 * - Expandable detail rows with changes table
 * - CSV export
 * - Pagination (20 per page)
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Download, ChevronDown, ChevronRight, X, Clock,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { AUDIT_CATEGORIES, SEVERITY_CONFIG } from '../../../mocks/auditLogData';
import { auditSettingsService } from '../../../api/services/auditSettingsService';
import { PlatformAuditLogSkeleton } from '../components/AuditSkeletons';

const SEVERITY_CYCLE = ['all', 'info', 'warning', 'critical'];
const PAGE_SIZE = 20;

export default function AuditLogSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState([]);
  const [severity, setSeverity] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const catRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditSettingsService.listPlatformAudit({
        search: search || undefined,
        category: catFilter.length ? catFilter : undefined,
        severity: severity !== 'all' ? severity : undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        per_page: PAGE_SIZE,
      });
      setEntries(res.items);
      setTotal(res.meta.total);
      setTotalPages(res.meta.last_page || 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('compliance.audit.loadError', { defaultValue: 'Failed to load audit log' }));
      setEntries([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, severity, dateFrom, dateTo, page, toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showCatDrop) return;
    const h = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setShowCatDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showCatDrop]);

  const toggleCat = (key) => {
    setCatFilter((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
    setPage(1);
  };

  const paged = entries;
  const hasFilters = search || catFilter.length > 0 || severity !== 'all' || dateFrom || dateTo;

  const clearAll = () => { setSearch(''); setCatFilter([]); setSeverity('all'); setDateFrom(''); setDateTo(''); setPage(1); };

  // Date grouping
  const getDateLabel = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return t('compliance.audit.dates.today');
    if (diffDays === 1) return t('compliance.audit.dates.yesterday');
    if (diffDays < 7) return t('compliance.audit.dates.daysAgo', { n: diffDays });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Group entries by date
  const grouped = useMemo(() => {
    const groups = [];
    let currentLabel = null;
    paged.forEach(entry => {
      const label = getDateLabel(entry.ts);
      if (label !== currentLabel) {
        groups.push({ label, entries: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].entries.push(entry);
    });
    return groups;
  }, [paged]);

  const catIcon = (key) => AUDIT_CATEGORIES.find(c => c.key === key)?.icon || '📌';

  return (
    <div>
      <h2 className="font-bold mb-1" style={{ fontSize: 18, color: T.t1 }}>{t('compliance.audit.title')}</h2>
      <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>{t('compliance.audit.subtitle')}</p>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('compliance.audit.searchPlaceholder')}
            className="pl-8 pr-3 py-1.5 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12, width: 200 }} />
        </div>

        {/* Category filter */}
        <div className="relative" ref={catRef}>
          <button onClick={() => setShowCatDrop(!showCatDrop)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
            style={{ background: catFilter.length > 0 ? T.al : T.sa, border: `1px solid ${catFilter.length > 0 ? T.ac : T.bd}`, color: catFilter.length > 0 ? T.ac : T.t2, fontSize: 12, fontWeight: 500 }}>
            {t('compliance.audit.category')}
            {catFilter.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: T.ac, color: '#fff' }}>{catFilter.length}</span>}
            <ChevronDown size={12} />
          </button>
          {showCatDrop && (
            <div className="absolute left-0 top-full mt-1 rounded-xl shadow-lg overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, width: 220, maxHeight: 300, overflowY: 'auto' }}>
              {AUDIT_CATEGORIES.map(cat => (
                <label key={cat.key} className="flex items-center gap-2 px-3 py-2 cursor-pointer" style={{ borderBottom: `1px solid ${T.bd}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.sa; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <input type="checkbox" checked={catFilter.includes(cat.key)} onChange={() => toggleCat(cat.key)} />
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span style={{ fontSize: 12, color: T.t1 }}>{t(cat.labelKey)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Severity pill */}
        <button onClick={() => { setSeverity(prev => SEVERITY_CYCLE[(SEVERITY_CYCLE.indexOf(prev) + 1) % SEVERITY_CYCLE.length]); setPage(1); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
          style={{ background: severity !== 'all' ? (SEVERITY_CONFIG[severity]?.bg || T.sa) : T.sa, border: `1px solid ${severity !== 'all' ? (SEVERITY_CONFIG[severity]?.color || T.bd) + '40' : T.bd}`, color: severity !== 'all' ? SEVERITY_CONFIG[severity]?.color : T.t2, fontSize: 12, fontWeight: 500 }}>
          {t('compliance.audit.severity')}: {severity === 'all' ? t('compliance.audit.all') : SEVERITY_CONFIG[severity]?.label}
        </button>

        {/* Date range */}
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="px-2 py-1.5 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />
        <span style={{ fontSize: 12, color: T.t3 }}>→</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="px-2 py-1.5 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }} />

        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer border-none" style={{ color: T.t3, fontSize: 11 }}>
            <X size={11} /> {t('compliance.audit.clear')}
          </button>
        )}

        <div className="ml-auto">
          <button onClick={() => toast.success(t('compliance.audit.exportStarted'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
            <Download size={13} /> {t('compliance.audit.exportCsv')}
          </button>
        </div>
      </div>

      {/* ─── Timeline ─── */}
      {loading ? (
        <PlatformAuditLogSkeleton T={T} />
      ) : paged.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Clock size={28} style={{ color: T.t3, opacity: 0.4 }} />
          <p style={{ fontSize: 13, color: T.t3, marginTop: 8 }}>{t('compliance.audit.noEntries')}</p>
        </div>
      ) : (
        <div>
          {grouped.map((group, gi) => (
            <div key={gi}>
              {/* Date header */}
              <div className="sticky top-0 px-2 py-1.5 mb-1 mt-3" style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, background: T.sa, borderRadius: 6 }}>
                {group.label}
              </div>

              {group.entries.map(entry => {
                const sev = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info;
                const isExpanded = expandedId === entry.id;
                const time = new Date(entry.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={entry.id} className="rounded-lg mb-1.5 overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
                    {/* Collapsed row */}
                    <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 cursor-pointer border-none text-left"
                      style={{ background: 'transparent' }}>
                      {isExpanded ? <ChevronDown size={12} style={{ color: T.t3 }} /> : <ChevronRight size={12} style={{ color: T.t3 }} />}
                      <span style={{ fontSize: 16 }}>{catIcon(entry.category)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate" style={{ fontSize: 12, color: T.t1 }}>{entry.action}</span>
                          <span className="px-1.5 py-0.5 rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, background: sev.bg, color: sev.color }}>{sev.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>
                          {entry.actor?.name || '—'} · {entry.target}
                        </div>
                      </div>
                      <span className="shrink-0" style={{ fontSize: 11, color: T.t3 }}>{time}</span>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2" style={{ borderTop: `1px solid ${T.bd}` }}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                          <DetailItem label={t('compliance.audit.detail.actor')} value={`${entry.actor?.name || '—'} (${entry.actor?.email || '—'})`} T={T} />
                          <DetailItem label={t('compliance.audit.detail.role')} value={entry.actor?.role || '—'} T={T} />
                          <DetailItem label={t('compliance.audit.detail.ip')} value={entry.actor?.ip || '—'} T={T} />
                          <DetailItem label={t('compliance.audit.detail.device')} value={entry.actor?.device || '—'} T={T} />
                          <DetailItem label={t('compliance.audit.detail.location')} value={[entry.actor?.city, entry.actor?.country].filter(Boolean).join(', ') || '—'} T={T} />
                          <DetailItem label={t('compliance.audit.detail.timestamp')} value={new Date(entry.ts).toLocaleString('en-GB')} T={T} />
                        </div>

                        <div className="px-3 py-2 rounded-lg mb-3" style={{ background: T.sa }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: T.t3 }}>{t('compliance.audit.detail.details')}</div>
                          <div style={{ fontSize: 12, color: T.t1, marginTop: 2 }}>{entry.details}</div>
                        </div>

                        {/* Changes table */}
                        {entry.changes && entry.changes.length > 0 && (
                          <div>
                            <div className="font-semibold mb-2" style={{ fontSize: 11, color: T.t2 }}>{t('compliance.audit.detail.changes')}</div>
                            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
                              <div className="flex px-3 py-1.5" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
                                <span className="flex-1" style={{ fontSize: 10, fontWeight: 700, color: T.t3 }}>{t('compliance.audit.detail.field')}</span>
                                <span className="flex-1" style={{ fontSize: 10, fontWeight: 700, color: T.t3 }}>{t('compliance.audit.detail.before')}</span>
                                <span className="flex-1" style={{ fontSize: 10, fontWeight: 700, color: T.t3 }}>{t('compliance.audit.detail.after')}</span>
                              </div>
                              {entry.changes.map((c, ci) => (
                                <div key={ci} className="flex px-3 py-1.5" style={{ borderBottom: ci < entry.changes.length - 1 ? `1px solid ${T.bd}` : 'none' }}>
                                  <span className="flex-1" style={{ fontSize: 12, color: T.t1 }}>{c.field}</span>
                                  <span className="flex-1" style={{ fontSize: 12, color: '#EF4444' }}>{c.from}</span>
                                  <span className="flex-1" style={{ fontSize: 12, color: '#10B981' }}>{c.to}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-2">
            <span style={{ fontSize: 12, color: T.t3 }}>
              {t('compliance.audit.showing', { from: total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0, to: Math.min(page * PAGE_SIZE, total), total })}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className="w-7 h-7 rounded-lg cursor-pointer border-none font-semibold"
                  style={{ background: page === i + 1 ? T.ac : T.sa, color: page === i + 1 ? '#fff' : T.t2, fontSize: 11 }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, T }) {
  const { T: theme } = useTheme();
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.t3 }}>{label}</div>
      <div style={{ fontSize: 12, color: theme.t1, marginTop: 1 }}>{value}</div>
    </div>
  );
}

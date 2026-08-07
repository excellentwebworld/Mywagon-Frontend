/**
 * AuditLogPanel — Global audit log slide-in panel.
 *
 * Used by: Shipper, Forwarder, Carrier.
 *
 * Shows:
 * - Summary cards: Created, Updated, Status Changes, Deleted
 * - Timeline list with dot colors by action type
 * - Lane ID, route, user, timestamp, detail
 *
 * @API: GET /api/v1/price-lists/audit-log
 */

import { useMemo } from 'react';
import { X, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';

const DOT_COLORS = {
  created: '#10B981',
  updated: '#3B82F6',
  deactivated: '#F59E0B',
  archived: '#9CA3AF',
  deleted: '#EF4444',
  duplicated: '#8B5CF6',
  imported: '#06B6D4',
};

function fmtTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogPanel({ open, onClose, auditLog }) {
  const { t } = useTranslation();
  const { T } = useTheme();

  const stats = useMemo(() => {
    if (!auditLog) return { created: 0, updated: 0, status: 0, deleted: 0 };
    return {
      created: auditLog.filter(e => e.action === 'created' || e.action === 'imported').length,
      updated: auditLog.filter(e => e.action === 'updated').length,
      status: auditLog.filter(e => e.action === 'deactivated' || e.action === 'archived').length,
      deleted: auditLog.filter(e => e.action === 'deleted').length,
    };
  }, [auditLog]);

  const actionLabels = {
    created: t('priceLists.audit.created', 'Created'),
    updated: t('priceLists.audit.updated', 'Updated'),
    deactivated: t('priceLists.audit.deactivated', 'Deactivated'),
    archived: t('priceLists.audit.archived', 'Archived'),
    deleted: t('priceLists.audit.deleted', 'Deleted'),
    duplicated: t('priceLists.audit.duplicated', 'Duplicated'),
    imported: t('priceLists.audit.imported', 'Imported'),
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex: 190 }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 flex flex-col shadow-2xl"
        style={{ width: 420, background: T.sf, borderLeft: `1px solid ${T.bd}`, animation: 'slideIn 0.3s ease' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <History size={18} style={{ color: T.ac }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: 0 }}>
              {t('priceLists.audit.title', 'Audit Log')}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded cursor-pointer border-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ background: 'transparent', color: T.t3 }}><X size={16} /></button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
          {[
            { key: 'created', label: t('priceLists.audit.createdLabel', 'Created'), color: '#10B981' },
            { key: 'updated', label: t('priceLists.audit.updatedLabel', 'Updated'), color: '#3B82F6' },
            { key: 'status', label: t('priceLists.audit.statusLabel', 'Status'), color: '#F59E0B' },
            { key: 'deleted', label: t('priceLists.audit.deletedLabel', 'Deleted'), color: '#EF4444' },
          ].map(c => (
            <div key={c.key} className="flex flex-col items-center justify-center px-1 py-2.5 rounded-lg min-h-[58px]" style={{ background: T.bg }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.color, lineHeight: 1.1 }}>{stats[c.key]}</div>
              <div className="truncate w-full text-center mt-1" style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {(!auditLog || auditLog.length === 0) ? (
            <div className="text-center py-10" style={{ color: T.t3, fontSize: 13 }}>
              {t('priceLists.audit.noEntries', 'No audit entries')}
            </div>
          ) : (
            <div className="space-y-1">
              {auditLog.slice(0, 150).map((entry, i) => (
                <div key={entry.id || i} className="rounded-lg px-3 py-2.5"
                  style={{ background: T.bg, borderLeft: `3px solid ${DOT_COLORS[entry.action] || '#9CA3AF'}` }}>
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
                    {entry.user} · {fmtTs(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

/**
 * SecurityTab — org-wide login history (read-only).
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Clock, Shield } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { auditSettingsService } from '../../../api/services/auditSettingsService';

export default function SecurityTab() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditSettingsService.listLoginHistory({ per_page: 50 });
      setEntries(res.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('userMgmt.security.loadError', { defaultValue: 'Failed to load login history' }));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatWhen = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Shield size={16} style={{ color: T.ac }} />
        <h3 className="font-semibold" style={{ fontSize: 14, color: T.t1 }}>
          {t('userMgmt.security.loginHistoryAllTitle')}
        </h3>
      </div>
      <p style={{ fontSize: 12, color: T.t3, marginBottom: 16 }}>
        {t('userMgmt.security.loginHistoryAllDesc')}
      </p>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton height={48} borderRadius={8} baseColor={T.sa} highlightColor={T.bd} />
          <Skeleton height={48} borderRadius={8} baseColor={T.sa} highlightColor={T.bd} />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Clock size={28} style={{ color: T.t3, opacity: 0.4 }} />
          <p style={{ fontSize: 13, color: T.t3, marginTop: 8 }}>{t('userMgmt.security.noLoginHistory', { defaultValue: 'No login history yet' })}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
          {entries.map((row, i) => (
            <div
              key={`${row.ts}-${row.userId}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: T.sf, borderBottom: i < entries.length - 1 ? `1px solid ${T.bd}` : 'none' }}
            >
              <div className="min-w-0">
                <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                  {row.userName || t('userMgmt.security.unknownUser', { defaultValue: 'User' })}
                </div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>
                  {[row.device, row.city].filter(Boolean).join(' · ') || '—'}
                  {row.ip ? ` · ${row.ip}` : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className="inline-block px-2 py-0.5 rounded-full mb-1"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    background: row.ok ? '#10B98120' : '#EF444420',
                    color: row.ok ? '#10B981' : '#EF4444',
                  }}
                >
                  {row.ok ? t('userMgmt.security.success', { defaultValue: 'Success' }) : t('userMgmt.security.failed', { defaultValue: 'Failed' })}
                </span>
                <div style={{ fontSize: 10, color: T.t3 }}>{formatWhen(row.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

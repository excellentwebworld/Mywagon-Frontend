/**
 * ServiceCard — single service status card.
 *
 * Shows service name, status dot + label, key metric, and a 24-hour
 * mini sparkline bar (24 tiny bars, one per hour).
 *
 * Used by: PlatformStatus
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import {
  Server, Globe, Database, HardDrive, KeyRound, Sparkles,
} from 'lucide-react';

const ICONS = { api: Server, web: Globe, database: Database, storage: HardDrive, auth: KeyRound, ai: Sparkles };

const STATUS_DOT = {
  operational: '#10B981',
  degraded:    '#F59E0B',
  outage:      '#EF4444',
  maintenance: '#3B82F6',
};

export default function ServiceCard({ service, lang }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const Icon = ICONS[service.id] || Server;
  const dot = STATUS_DOT[service.status];
  const statusKey = `trust.status.${service.status}`;

  return (
    <div
      className="rounded-xl p-4 transition-all duration-200"
      style={{ background: T.sf, border: `1px solid ${T.bd}` }}
    >
      {/* Header: icon + name + dot */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center justify-center rounded-lg"
          style={{ width: 34, height: 34, background: `${dot}14` }}>
          <Icon size={17} style={{ color: dot }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate" style={{ fontSize: 13, color: T.t1 }}>
            {service.name[lang] || service.name.en}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: dot }}>{t(statusKey)}</span>
        </div>
      </div>

      {/* Metric */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span style={{ fontSize: 11, color: T.t3 }}>
          {service.metricLabel[lang] || service.metricLabel.en}:
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>
          {service.metric}
        </span>
      </div>

      {/* 24h sparkline */}
      <div className="flex items-end gap-px" style={{ height: 18 }}>
        {(service.sparkline || []).map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: s === 'up' ? 14 : 10,
              borderRadius: 1.5,
              background: s === 'up' ? '#10B981' : '#F59E0B',
              opacity: s === 'up' ? 0.6 : 1,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1" style={{ fontSize: 9, color: T.t3 }}>
        <span>24h</span>
        <span>{t('trust.status.now')}</span>
      </div>
    </div>
  );
}

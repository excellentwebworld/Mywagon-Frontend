/**
 * UptimeBar — 90-day uptime timeline.
 *
 * Renders 90 thin vertical bars (4px wide, 32px tall, 2px gap).
 * Green = 100%, Amber = degraded, Red = outage.
 * Hover → tooltip with date + uptime % + note.
 *
 * THE signature visual of the Trust Center page.
 *
 * Used by: PlatformStatus
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';

function barColor(uptime) {
  if (uptime >= 100) return '#10B981';
  if (uptime >= 99.9) return '#F59E0B';
  return '#EF4444';
}

export default function UptimeBar({ history, overallUptime, lang }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ position: 'relative' }}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 12, fontWeight: 600, color: T.t2, letterSpacing: 0.3 }}>
          {t('trust.status.uptimeLast90')}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>
          {overallUptime}%
        </span>
      </div>

      {/* Bar container */}
      <div
        className="flex items-end"
        style={{ gap: 2, height: 32, position: 'relative' }}
      >
        {(history || []).map((day, i) => {
          const bg = barColor(day.uptime);
          return (
            <div
              key={i}
              style={{
                width: 4,
                flex: '1 0 0',
                minWidth: 2,
                height: 32,
                borderRadius: 2,
                background: bg,
                opacity: day.uptime >= 100 ? 0.55 : 1,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                ...(hovered === i ? { opacity: 1, boxShadow: `0 0 6px ${bg}88` } : {}),
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-1" style={{ fontSize: 10, color: T.t3 }}>
        <span>{t('trust.status.daysAgo', { n: 90 })}</span>
        <span>{t('trust.status.today')}</span>
      </div>

      {/* Tooltip */}
      {hovered !== null && history[hovered] && (
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            left: `calc(${(hovered / 89) * 100}% - 80px)`,
            width: 180,
            background: T.sf,
            border: `1px solid ${T.bd}`,
            borderRadius: 8,
            padding: '8px 10px',
            boxShadow: `0 4px 16px rgba(0,0,0,0.15)`,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: T.t1, marginBottom: 2 }}>
            {new Date(history[hovered].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: barColor(history[hovered].uptime), fontVariantNumeric: 'tabular-nums' }}>
            {history[hovered].uptime}%
          </div>
          {history[hovered].note && (
            <div style={{ fontSize: 10, color: T.t3, marginTop: 3 }}>
              {history[hovered].note[lang] || history[hovered].note.en}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

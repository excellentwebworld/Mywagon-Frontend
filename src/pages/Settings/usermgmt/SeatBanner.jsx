/**
 * SeatBanner — Displays seat usage progress bar and plan info.
 *
 * Shows: "8 of 10 seats used · Business Plan"
 * Progress bar fills based on usage percentage.
 * Warning color when ≥80% full, error when 100%.
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { Crown, ArrowUpRight } from 'lucide-react';
import { SEAT_CONFIG } from '../../../mocks/userMgmtData';

export default function SeatBanner() {
  const { t } = useTranslation();
  const { T } = useTheme();

  const { usedSeats, totalSeats, plan } = SEAT_CONFIG;
  const pct = Math.round((usedSeats / totalSeats) * 100);
  const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : T.ac;

  return (
    <div
      className="rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ background: T.sa, border: `1px solid ${T.bd}` }}
    >
      {/* Left: info */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 36, height: 36, background: T.al }}
        >
          <Crown size={18} style={{ color: T.ac }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>
              {usedSeats} / {totalSeats}
            </span>
            <span style={{ fontSize: 12, color: T.t3 }}>
              {t('userMgmt.seats.used')}
            </span>
          </div>
          <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>
            {t('userMgmt.seats.plan', { plan })}
          </div>
        </div>
      </div>

      {/* Center: progress bar */}
      <div className="flex-1 min-w-[120px] max-w-xs">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 6, background: T.bd }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>

      {/* Right: upgrade */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none shrink-0 transition-opacity duration-150"
        style={{ background: T.ac, color: '#fff', fontSize: 12, fontWeight: 600 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        {t('userMgmt.seats.upgrade')}
        <ArrowUpRight size={13} />
      </button>
    </div>
  );
}

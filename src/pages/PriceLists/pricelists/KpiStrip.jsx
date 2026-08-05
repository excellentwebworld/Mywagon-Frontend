/**
 * KpiStrip — Price Lists KPI tiles.
 *
 * 6 tiles: Active, Expiring, FTL, Per Pallet, Per Km, Inactive.
 * Clicking a tile filters the list view.
 */
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { toUpperGreek } from '../../../utils/greekUppercase';

const DOT_COLORS = {
  active: '#10B981',
  expiring: '#F59E0B',
  inactive: '#9CA3AF',
};

export default function KpiStrip({ tiles, activeKpi, onKpiClick }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const isGreek = i18n.language === 'el';

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 mb-3">
      {tiles.map((tile) => {
        const active = activeKpi === tile.key;
        const dot = DOT_COLORS[tile.key];
        const label = isGreek ? toUpperGreek(t(tile.labelKey)) : t(tile.labelKey);
        return (
          <button
            key={tile.key}
            onClick={() => onKpiClick(tile.key)}
            className="flex-1 min-w-[120px] p-3 rounded-xl cursor-pointer border-none text-left transition-all"
            style={{
              background: T.sf,
              border: active ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
              boxShadow: active ? `0 0 0 3px ${T.al}` : 'none',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              {dot && (
                <span
                  className="shrink-0 rounded-full"
                  style={{ width: 8, height: 8, background: dot }}
                />
              )}
              <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: "'JetBrains Mono', monospace" }}>
              {tile.value}
            </div>
          </button>
        );
      })}
    </div>
  );
}

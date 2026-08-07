/**
 * FilterBar — Search bar for Price Lists.
 *
 * The legacy horizontal pill filters were removed in Phase 5.
 */
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';

export default function FilterBar({
  search, onSearchChange,
  onClear,
  hasActiveFilters,
}) {
  const { t } = useTranslation();
  const { T } = useTheme();

  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      {/* Search */}
      <div className="relative" style={{ minWidth: 200 }}>
        <Search
          size={14}
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.t3 }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('priceLists.filter.searchPlaceholder', 'Search route, ID, status, metric…')}
          className="w-full rounded-lg outline-none"
          style={{
            padding: '7px 10px 7px 30px',
            fontSize: 12,
            border: `1px solid ${T.bd}`,
            background: T.sf,
            color: T.t1,
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute border-none cursor-pointer bg-transparent"
            style={{ right: 8, top: '50%', transform: 'translateY(-50%)', color: T.t3 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="border-none cursor-pointer bg-transparent"
          style={{ fontSize: 12, color: T.ac, fontWeight: 600 }}
        >
          {t('priceLists.filter.clearAll', 'Clear all')}
        </button>
      )}
    </div>
  );
}

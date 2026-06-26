import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { ActiveFilters } from '../../pages/Partners/types';
import { useOutsideClick } from '../../hooks/useOutsideClick';

type Props = Pick<
  PartnersState,
  | 't'
  | 'searchQuery'
  | 'setSearchQuery'
  | 'activeFilters'
  | 'applyFilters'
  | 'clearAllFilters'
  | 'openFilterDropdown'
  | 'toggleFilterDropdown'
  | 'closeFilterDropdown'
  | 'truckCategories'
  | 'closeDetailPanel'
  | 'subscriptionBlocked'
>;

export const PartnersFilterBar: React.FC<Props> = ({
  t,
  searchQuery,
  setSearchQuery,
  activeFilters,
  applyFilters,
  clearAllFilters,
  openFilterDropdown,
  toggleFilterDropdown,
  closeFilterDropdown,
  truckCategories,
  closeDetailPanel,
  subscriptionBlocked,
}) => {
  const [tempFilters, setTempFilters] = React.useState<ActiveFilters>(activeFilters);

  React.useEffect(() => {
    if (openFilterDropdown) {
      setTempFilters(activeFilters);
    }
  }, [openFilterDropdown, activeFilters]);

  const toggleTempFilter = <K extends keyof ActiveFilters>(
    category: K,
    value: ActiveFilters[K][number]
  ) => {
    setTempFilters((prev) => {
      const arr = prev[category] as unknown[];
      const idx = arr.indexOf(value);
      const next = idx >= 0 ? arr.filter((_, i) => i !== idx) : [...arr, value];
      return { ...prev, [category]: next as any };
    });
  };

  const hasFilters =
    searchQuery.length > 0 ||
    activeFilters.status.length > 0 ||
    activeFilters.capability.length > 0;

  const barRef = useOutsideClick<HTMLDivElement>(
    closeFilterDropdown,
    Boolean(openFilterDropdown)
  );

  const statusOptions: Array<{ value: ActiveFilters['status'][number]; label: string }> = [
    { value: 'active', label: t('activePartners') },
    { value: 'invited', label: t('invitationSent') },
    { value: 'pending', label: t('invitationReceived') },
    { value: 'suspended', label: t('suspendedPartners') },
  ];

  const handleClearAll = () => {
    clearAllFilters();
    closeFilterDropdown();
  };

  return (
    <div className="ptn-fbar anim" ref={barRef}>
      <div className="ptn-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          id="partner-search"
          placeholder={t('partnerSearchPlaceholder')}
          value={searchQuery}
          disabled={subscriptionBlocked}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            closeDetailPanel();
          }}
        />
      </div>

      <div className="ptn-fpill-wrap">
        <button
          type="button"
          className={`ptn-fpill${activeFilters.status.length ? ' has' : ''}`}
          onClick={() => toggleFilterDropdown('status')}
          id="filter-status"
        >
          📋 {t('statusFilter')}
        </button>
        <div className={`ptn-fdd${openFilterDropdown === 'status' ? ' show' : ''}`}>
          <div className="ptn-fdd-list">
            {statusOptions.map(({ value, label }) => (
              <div
                key={value}
                className={`ptn-fdd-item${tempFilters.status.includes(value) ? ' selected' : ''}`}
                onClick={() => toggleTempFilter('status', value)}
              >
                <span className="ptn-fdd-check">{tempFilters.status.includes(value) ? '✓' : ''}</span>
                {label}
              </div>
            ))}
          </div>
          <div className="ptn-fdd-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeFilterDropdown}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                applyFilters(tempFilters);
                closeFilterDropdown();
              }}
            >
              {t('apply')}
            </button>
          </div>
        </div>
      </div>

      <div className="ptn-fpill-wrap">
        <button
          type="button"
          className={`ptn-fpill${activeFilters.capability.length ? ' has' : ''}`}
          onClick={() => toggleFilterDropdown('capability')}
          id="filter-capability"
        >
          🚛 {t('capabilityFilter')}
        </button>
        <div className={`ptn-fdd${openFilterDropdown === 'capability' ? ' show' : ''}`} style={{ width: 240 }}>
          <div className="ptn-fdd-list">
            {truckCategories.map((cat) => (
              <div
                key={cat.id}
                className={`ptn-fdd-item${tempFilters.capability.includes(cat.id) ? ' selected' : ''}`}
                onClick={() => toggleTempFilter('capability', cat.id)}
              >
                <span className="ptn-fdd-check">
                  {tempFilters.capability.includes(cat.id) ? '✓' : ''}
                </span>
                {cat.name}
              </div>
            ))}
          </div>
          <div className="ptn-fdd-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeFilterDropdown}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                applyFilters(tempFilters);
                closeFilterDropdown();
              }}
            >
              {t('apply')}
            </button>
          </div>
        </div>
      </div>

      {hasFilters && (
        <button type="button" className="ptn-fclear" onClick={handleClearAll}>
          {t('clearAll') || 'Clear all'}
        </button>
      )}
    </div>
  );
};

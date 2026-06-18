import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import { REGION_KEYS } from '../../pages/Partners/constants';
import type { FacetFilter } from '../../pages/Partners/types';

type Props = Pick<PartnersState, 't' | 'facetFilter' | 'selectFacet' | 'facetCounts' | 'rName'>;

interface FacetCatItem {
  filter: FacetFilter;
  icon: string;
  labelKey: string;
}

const TYPE_ITEMS: FacetCatItem[] = [
  { filter: 'carrier_company',  icon: '🏢',       labelKey: 'carriersType' },
  { filter: 'freelancer_driver',icon: '🧑‍✈️',     labelKey: 'freelancersType' },
  { filter: 'customer',         icon: '🏪',       labelKey: 'customersType' },
];

const STATUS_ITEMS: FacetCatItem[] = [
  { filter: 'st_active',    icon: '✅', labelKey: 'activePartners' },
  { filter: 'st_invited',   icon: '📩', labelKey: 'invitedPartners' },
  { filter: 'st_pending',   icon: '⏳', labelKey: 'pending' },
  { filter: 'st_suspended', icon: '🚫', labelKey: 'suspendedPartners' },
];

export const PartnersFacetPane: React.FC<Props> = ({ t, facetFilter, selectFacet, facetCounts, rName }) => {
  const getCount = (filter: FacetFilter) => facetCounts[filter as string] ?? 0;

  const regionItems = REGION_KEYS.map((_, idx) => ({
    filter: `reg_${idx}` as FacetFilter,
    label: rName(idx),
    count: getCount(`reg_${idx}` as FacetFilter),
  })).filter((r) => r.count > 0);

  return (
    <div className="ptn-facet-pane">
      <div className="ptn-facet-head">{t('partnersNetwork')}</div>

      {/* All */}
      <div
        className={`ptn-cat-node${facetFilter === 'all' ? ' active' : ''}`}
        onClick={() => selectFacet('all')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && selectFacet('all')}
        id="facet-all"
      >
        <span style={{ fontSize: 14 }}>👥</span>
        {t('allPartners')}
        <span className="cnt">{getCount('all')}</span>
      </div>

      <div className="ptn-facet-sep" />

      {/* By Type */}
      <div className="ptn-facet-section-lbl">{t('byType')}</div>
      {TYPE_ITEMS.map(({ filter, icon, labelKey }) => (
        <div
          key={filter}
          className={`ptn-cat-node${facetFilter === filter ? ' active' : ''}`}
          onClick={() => selectFacet(filter)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && selectFacet(filter)}
          id={`facet-${filter}`}
        >
          <span style={{ fontSize: 14 }}>{icon}</span>
          {t(labelKey)}
          <span className="cnt">{getCount(filter)}</span>
        </div>
      ))}

      <div className="ptn-facet-sep" />

      {/* By Status */}
      <div className="ptn-facet-section-lbl">{t('byStatus')}</div>
      {STATUS_ITEMS.map(({ filter, icon, labelKey }) => (
        <div
          key={filter}
          className={`ptn-cat-node${facetFilter === filter ? ' active' : ''}${filter === 'st_suspended' ? '' : ''}`}
          style={filter === 'st_suspended' ? { color: facetFilter === filter ? undefined : 'var(--danger)' } : undefined}
          onClick={() => selectFacet(filter)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && selectFacet(filter)}
          id={`facet-${filter}`}
        >
          <span style={{ fontSize: 14 }}>{icon}</span>
          {t(labelKey)}
          <span className="cnt">{getCount(filter)}</span>
        </div>
      ))}

      {regionItems.length > 0 && (
        <>
          <div className="ptn-facet-sep" />
          <div className="ptn-facet-section-lbl">{t('byRegion')}</div>
          {regionItems.map(({ filter, label, count }) => (
            <div
              key={filter}
              className={`ptn-type-node${facetFilter === filter ? ' active' : ''}`}
              onClick={() => selectFacet(filter)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && selectFacet(filter)}
              id={`facet-${filter}`}
            >
              📍 {label}
              <span className="cnt">{count}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

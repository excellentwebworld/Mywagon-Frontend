import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { FacetFilter } from '../../pages/Partners/types';

type Props = Pick<PartnersState, 't' | 'facetFilter' | 'selectFacet' | 'facetCounts'>;

interface FacetCatItem {
  filter: FacetFilter;
  icon: string;
  labelKey: string;
}

const TYPE_ITEMS: FacetCatItem[] = [
  { filter: 'carrier_company', icon: '🏢', labelKey: 'carriersType' },
  { filter: 'freelancer_driver', icon: '🧑‍✈️', labelKey: 'freelancersType' },
  { filter: 'supplier', icon: '🏪', labelKey: 'suppliersType' },
];

const STATUS_ITEMS: FacetCatItem[] = [
  { filter: 'st_active', icon: '✅', labelKey: 'activePartners' },
  { filter: 'st_invited', icon: '📩', labelKey: 'invitationSent' },
  { filter: 'st_inv_recv', icon: '⏳', labelKey: 'invitationReceived' },
  { filter: 'st_suspended', icon: '🚫', labelKey: 'suspendedPartners' },
];

export const PartnersFacetPane: React.FC<Props> = ({ t, facetFilter, selectFacet, facetCounts }) => {
  const getCount = (filter: FacetFilter) => facetCounts[filter as string] ?? 0;

  return (
    <div className="ptn-facet-pane">
      <div className="ptn-facet-head">{t('partnersNetwork')}</div>

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

      <div className="ptn-facet-section-lbl">{t('byStatus')}</div>
      {STATUS_ITEMS.map(({ filter, icon, labelKey }) => (
        <div
          key={filter}
          className={`ptn-cat-node${facetFilter === filter ? ' active' : ''}`}
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
    </div>
  );
};

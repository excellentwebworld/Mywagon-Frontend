import React from 'react';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 't'
  | 'kpiFilter'
  | 'handleKpiClick'
  | 'totalSkusCount'
  | 'erpSyncedCount'
  | 'manualCount'
  | 'syncIssuesCount'
  | 'unmappedCount'
  | 'inactiveCount'
>;

export const KpiStrip: React.FC<Props> = ({
  t,
  kpiFilter,
  handleKpiClick,
  totalSkusCount,
  erpSyncedCount,
  manualCount,
  syncIssuesCount,
  unmappedCount,
  inactiveCount,
}) => {
  const items = [
    { k: 'total', v: totalSkusCount, l: t('totalSkus'), color: undefined },
    { k: 'erp', v: erpSyncedCount, l: t('erpSynced'), color: 'var(--pk)' },
    { k: 'manual', v: manualCount, l: t('manual'), color: undefined },
    { k: 'errors', v: syncIssuesCount, l: t('syncIssues'), color: 'var(--er)' },
    { k: 'unmapped', v: unmappedCount, l: t('unmapped'), color: 'var(--wr)' },
    { k: 'inactive', v: inactiveCount, l: t('inactive'), color: undefined },
  ];

  return (
    <div className="kpi-strip anim">
      {items.map((x) => (
        <div
          key={x.k}
          className={`kpi${kpiFilter === x.k ? ' act' : ''}`}
          onClick={() => handleKpiClick(x.k)}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-v" style={x.color ? { color: x.color } : undefined}>
            {x.v}
          </div>
          <div className="kpi-l">{x.l}</div>
        </div>
      ))}
    </div>
  );
};

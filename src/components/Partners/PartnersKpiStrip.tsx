import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { KpiFilter } from '../../pages/Partners/types';

type Props = Pick<PartnersState, 't' | 'kpiCounts' | 'kpiFilter' | 'selectKpi'>;

interface KpiConfig {
  key: KpiFilter;
  labelKey: string;
  colorFn: (v: number) => string | undefined;
}

const KPIS: KpiConfig[] = [
  { key: 'all', labelKey: 'totalPartners', colorFn: () => undefined },
  { key: 'active', labelKey: 'activePartners', colorFn: () => 'var(--success)' },
  { key: 'carriers', labelKey: 'carrierPartners', colorFn: () => '#2563EB' },
  { key: 'freelancers', labelKey: 'freelancerPartners', colorFn: () => 'var(--accent)' },
  { key: 'invited', labelKey: 'invitedPartners', colorFn: () => 'var(--info, #0EA5E9)' },
  { key: 'suspended', labelKey: 'suspendedPartners', colorFn: (v) => (v > 0 ? 'var(--warning)' : 'var(--text-tertiary)') },
];

const COUNT_KEY_MAP: Record<string, keyof Props['kpiCounts']> = {
  all: 'total',
  active: 'active',
  carriers: 'carriers',
  freelancers: 'freelancers',
  invited: 'invited',
  suspended: 'suspended',
};

export const PartnersKpiStrip: React.FC<Props> = ({ t, kpiCounts, kpiFilter, selectKpi }) => (
  <div className="ptn-kpi-strip anim">
    {KPIS.map(({ key, labelKey, colorFn }) => {
      const countKey = COUNT_KEY_MAP[key] ?? 'total';
      const val = kpiCounts[countKey] ?? 0;
      const color = colorFn(val);
      const isActive = kpiFilter === key;
      return (
        <div
          key={key}
          className={`ptn-kpi${isActive ? ' active' : ''}`}
          onClick={() => selectKpi(key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && selectKpi(key)}
          id={`kpi-${key}`}
        >
          {color && val > 0 && <span className="ptn-kpi-dot" style={{ background: color }} />}
          <div className="ptn-kpi-val" style={{ color: color && val > 0 ? color : undefined }}>
            {val}
          </div>
          <div className="ptn-kpi-lbl">{t(labelKey)}</div>
        </div>
      );
    })}
  </div>
);

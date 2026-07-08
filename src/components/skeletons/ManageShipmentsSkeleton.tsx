import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
};

export const KpiStripSkeleton: React.FC = () => (
  <div className="mgmt-kpi-s" aria-hidden="true">
    {Array.from({ length: 8 }).map((_, idx) => (
      <div key={idx} className="mgmt-kpi" style={{ pointerEvents: 'none' }}>
        <div className="mgmt-kpi-v">
          <Skeleton width={32} height={22} baseColor={T.sa} highlightColor={T.sf} />
        </div>
        <div className="mgmt-kpi-l">
          <Skeleton width={90} height={11} baseColor={T.sa} highlightColor={T.sf} />
        </div>
      </div>
    ))}
  </div>
);

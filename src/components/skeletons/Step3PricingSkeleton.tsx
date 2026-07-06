import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  bd: 'var(--border)',
};

export const Step3PricingSkeleton: React.FC = () => (
  <div className="pb-24">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ background: T.sf, border: `1px solid ${T.bd}` }}
          >
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <Skeleton width={160} height={16} baseColor={T.sa} highlightColor={T.sf} />
            </div>
            <div className="p-5 space-y-3">
              <Skeleton height={48} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
              <Skeleton height={48} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
              <Skeleton height={120} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
          <Skeleton height={180} baseColor={T.sa} highlightColor={T.sf} />
          <div className="p-4 space-y-3">
            <Skeleton width="60%" height={14} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton width="80%" height={14} baseColor={T.sa} highlightColor={T.sf} />
            <div className="grid grid-cols-2 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} height={48} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <Skeleton width={80} height={16} baseColor={T.sa} highlightColor={T.sf} />
          </div>
          <div className="p-4 space-y-3">
            <Skeleton height={40} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton height={72} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

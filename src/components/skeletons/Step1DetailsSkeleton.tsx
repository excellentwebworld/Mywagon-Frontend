import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { ListSkeleton } from './ListSkeleton';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  bd: 'var(--border)',
};

const StopNodeSkeleton: React.FC<{ expanded?: boolean }> = ({ expanded = false }) => (
  <Skeleton
    circle
    width={40}
    height={40}
    baseColor={T.sa}
    highlightColor={T.sf}
    style={{
      border: `2px solid ${expanded ? 'var(--accent)' : T.bd}`,
    }}
  />
);

const ExpandedStopSkeleton: React.FC = () => (
  <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
    <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${T.bd}` }}>
      <Skeleton width={14} height={14} baseColor={T.sa} highlightColor={T.sf} />
      <Skeleton width={56} height={16} baseColor={T.sa} highlightColor={T.sf} />
      <Skeleton width={48} height={18} borderRadius={4} baseColor={T.sa} highlightColor={T.sf} />
    </div>

    <div className="p-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
      <Skeleton width={64} height={10} baseColor={T.sa} highlightColor={T.sf} style={{ marginBottom: 8 }} />
      <Skeleton height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} style={{ marginBottom: 16 }} />

      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <Skeleton width={32} height={10} baseColor={T.sa} highlightColor={T.sf} style={{ marginBottom: 8 }} />
          <div className="flex gap-1">
            <Skeleton width={125} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton width={90} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
          </div>
        </div>
        <div>
          <Skeleton width={72} height={10} baseColor={T.sa} highlightColor={T.sf} style={{ marginBottom: 8 }} />
          <div className="flex gap-1">
            <Skeleton width={125} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton width={90} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
          </div>
        </div>
      </div>
    </div>

    <div className="p-4 pt-3">
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[72, 64, 80, 48, 32, 40, 48, 40, 24].map((w, idx) => (
                  <th key={idx} style={{ padding: '5px 3px', borderBottom: `1px solid ${T.bd}` }}>
                    <Skeleton width={w} height={10} baseColor={T.sa} highlightColor={T.sf} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ListSkeleton type="table" rowCount={2} columnCount={9} />
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2" style={{ borderTop: `1px solid ${T.bd}` }}>
          <Skeleton width={88} height={14} baseColor={T.sa} highlightColor={T.sf} />
        </div>
      </div>
    </div>

    <div className="flex justify-end items-center gap-2 px-4 pb-3">
      <Skeleton width={72} height={32} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
      <Skeleton width={32} height={32} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
    </div>
  </div>
);

const CollapsedStopSkeleton: React.FC = () => (
  <div
    className="rounded-xl flex items-center gap-2 px-4 py-3"
    style={{ background: T.sf, border: `1px solid ${T.bd}` }}
  >
    <Skeleton width={14} height={14} baseColor={T.sa} highlightColor={T.sf} />
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <Skeleton width={120} height={16} baseColor={T.sa} highlightColor={T.sf} />
      <Skeleton width={64} height={18} borderRadius={4} baseColor={T.sa} highlightColor={T.sf} />
      <Skeleton width={140} height={12} baseColor={T.sa} highlightColor={T.sf} />
    </div>
    <Skeleton width={16} height={16} baseColor={T.sa} highlightColor={T.sf} />
  </div>
);

export const Step1DetailsSkeleton: React.FC = () => (
  <div className="pb-24 wizard-step1-skeleton" aria-busy="true" aria-label="Loading create load details">
    <div className="rounded-xl overflow-hidden mb-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Skeleton width={96} height={16} baseColor={T.sa} highlightColor={T.sf} />
        <div className="flex-1 mx-1">
          <Skeleton height={8} borderRadius={4} baseColor={T.sa} highlightColor={T.sf} />
        </div>
        <Skeleton width={88} height={22} borderRadius={4} baseColor={T.sa} highlightColor={T.sf} />
        <Skeleton width={88} height={22} borderRadius={4} baseColor={T.sa} highlightColor={T.sf} />
      </div>
    </div>

    <div className="relative" style={{ paddingLeft: 18 }}>
      <div
        className="absolute top-0 bottom-0"
        style={{ left: 37, width: 2, background: T.bd, borderRadius: 1, zIndex: 0 }}
      />

      <div className="relative mb-3">
        <div className="flex gap-3 items-start">
          <div className="shrink-0" style={{ position: 'relative', zIndex: 1 }}>
            <StopNodeSkeleton expanded />
          </div>
          <div className="flex-1 min-w-0">
            <ExpandedStopSkeleton />
          </div>
        </div>
      </div>

      <div className="relative mb-3">
        <div className="flex gap-3 items-start">
          <div className="shrink-0" style={{ position: 'relative', zIndex: 1 }}>
            <StopNodeSkeleton />
          </div>
          <div className="flex-1 min-w-0">
            <CollapsedStopSkeleton />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 py-2 relative" style={{ zIndex: 1 }}>
        <Skeleton circle width={40} height={40} baseColor={T.sa} highlightColor={T.sf} />
        <Skeleton width={64} height={14} baseColor={T.sa} highlightColor={T.sf} />
      </div>
    </div>

    <footer
      className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
      style={{ left: 'var(--sidebar-w, 240px)', background: T.sf, borderTop: `1px solid ${T.bd}` }}
    >
      <Skeleton width={120} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
      <Skeleton width={132} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
    </footer>
  </div>
);

export default Step1DetailsSkeleton;

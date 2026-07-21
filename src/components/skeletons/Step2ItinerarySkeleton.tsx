import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  bd: 'var(--border)',
};

export const Step2ItinerarySkeleton: React.FC = () => (
  <div className="pb-24 wizard-step2-skeleton animate-fade-in mt-4" aria-busy="true">
    <div className="flex gap-4 items-start flex-col lg:flex-row">
      <div className="flex-1 w-full min-w-0">
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <Skeleton width={120} height={16} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton width={180} height={28} baseColor={T.sa} highlightColor={T.sf} />
          </div>
          <div className="px-4 py-3 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton circle width={28} height={28} baseColor={T.sa} highlightColor={T.sf} />
                <div className="flex-1">
                  <Skeleton width="60%" height={14} baseColor={T.sa} highlightColor={T.sf} />
                  <Skeleton width="90%" height={12} baseColor={T.sa} highlightColor={T.sf} style={{ marginTop: 6 }} />
                  <Skeleton width="40%" height={12} baseColor={T.sa} highlightColor={T.sf} style={{ marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full lg:w-[360px] shrink-0 space-y-3">
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <Skeleton width={100} height={14} baseColor={T.sa} highlightColor={T.sf} />
          </div>
          <Skeleton height={200} baseColor={T.sa} highlightColor={T.sf} />
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
          <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <Skeleton width={90} height={16} baseColor={T.sa} highlightColor={T.sf} />
          </div>
          <div className="grid grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3" style={{ borderBottom: i < 4 ? `1px solid ${T.bd}` : undefined }}>
                <Skeleton width={60} height={10} baseColor={T.sa} highlightColor={T.sf} />
                <Skeleton width={80} height={16} baseColor={T.sa} highlightColor={T.sf} style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <footer
      className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
      style={{ background: T.sf, borderTop: `1px solid ${T.bd}` }}
    >
      <Skeleton width={100} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
      <Skeleton width={120} height={36} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
    </footer>
  </div>
);

export default Step2ItinerarySkeleton;

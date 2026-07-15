import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
};

export const KpiStripSkeleton: React.FC = () => (
  <div className="mgmt-kpi-s" aria-hidden="true">
    {Array.from({ length: 5 }).map((_, idx) => (
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

interface RowExpansionSkeletonProps {
  variant?: 'pending' | 'status';
}

/** Skeleton matching Manage Shipments row expansion while detail API loads. */
export const RowExpansionSkeleton: React.FC<RowExpansionSkeletonProps> = ({
  variant = 'pending',
}) => (
  <div
    className={`exp-inner${variant === 'status' ? ' exp-status-only' : ''}`}
    aria-busy="true"
    aria-hidden="true"
  >
    <div>
      <div className="exp-section">
        <h4>
          <Skeleton width={72} height={12} baseColor={T.sa} highlightColor={T.sf} />
        </h4>
        <div className="tl tl-big" style={{ gap: 12, marginBottom: 16 }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="tl-s" style={{ alignItems: 'center', minWidth: 70 }}>
              <Skeleton circle width={14} height={14} baseColor={T.sa} highlightColor={T.sf} />
              <Skeleton
                width={64}
                height={11}
                style={{ marginTop: 6 }}
                baseColor={T.sa}
                highlightColor={T.sf}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="exp-section">
        <h4>
          <Skeleton width={64} height={12} baseColor={T.sa} highlightColor={T.sf} />
        </h4>
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} style={{ marginBottom: 10 }}>
            <Skeleton width={120} height={22} borderRadius={99} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton
              width="80%"
              height={12}
              style={{ marginTop: 6 }}
              baseColor={T.sa}
              highlightColor={T.sf}
            />
          </div>
        ))}
      </div>

      <div className="exp-section">
        <h4>
          <Skeleton width={80} height={12} baseColor={T.sa} highlightColor={T.sf} />
        </h4>
        <Skeleton height={28} style={{ marginBottom: 6 }} baseColor={T.sa} highlightColor={T.sf} />
        <Skeleton height={28} style={{ marginBottom: 8 }} baseColor={T.sa} highlightColor={T.sf} />
        <Skeleton width={120} height={12} baseColor={T.sa} highlightColor={T.sf} />
      </div>

      <div className="exp-stats-grid" style={{ marginTop: 12 }}>
        {Array.from({ length: variant === 'status' ? 5 : 3 }).map((_, idx) => (
          <div key={idx} className="exp-stat" style={{ padding: '8px 0' }}>
            <Skeleton width={40} height={18} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton
              width={56}
              height={10}
              style={{ marginTop: 4 }}
              baseColor={T.sa}
              highlightColor={T.sf}
            />
          </div>
        ))}
      </div>
    </div>

    {variant === 'pending' && (
      <div>
        <div className="exp-section">
          <h4>
            <Skeleton width={100} height={12} baseColor={T.sa} highlightColor={T.sf} />
          </h4>
          <Skeleton width="90%" height={14} baseColor={T.sa} highlightColor={T.sf} />
          <Skeleton
            width="70%"
            height={14}
            style={{ marginTop: 8 }}
            baseColor={T.sa}
            highlightColor={T.sf}
          />
        </div>
      </div>
    )}

    <div>
      {variant === 'pending' && (
        <div className="exp-section">
          <h4>
            <Skeleton width={140} height={12} baseColor={T.sa} highlightColor={T.sf} />
          </h4>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
            >
              <Skeleton circle width={28} height={28} baseColor={T.sa} highlightColor={T.sf} />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height={12} baseColor={T.sa} highlightColor={T.sf} />
                <Skeleton
                  width="40%"
                  height={10}
                  style={{ marginTop: 4 }}
                  baseColor={T.sa}
                  highlightColor={T.sf}
                />
              </div>
              <Skeleton width={52} height={24} borderRadius={6} baseColor={T.sa} highlightColor={T.sf} />
            </div>
          ))}
          <Skeleton
            width={160}
            height={30}
            borderRadius={8}
            style={{ marginTop: 8 }}
            baseColor={T.sa}
            highlightColor={T.sf}
          />
        </div>
      )}

      <div className="exp-section" style={{ marginTop: variant === 'pending' ? 16 : 0 }}>
        <h4>
          <Skeleton width={110} height={12} baseColor={T.sa} highlightColor={T.sf} />
        </h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Skeleton width={64} height={30} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
          <Skeleton width={64} height={30} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
          <Skeleton width={64} height={30} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
        </div>
      </div>
    </div>
  </div>
);

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

/** Skeleton matching Manage Shipments PDS row expansion while detail API loads. */
export const RowExpansionSkeleton: React.FC<RowExpansionSkeletonProps> = ({
  variant = 'pending',
}) => (
  <div
    className={`exp-inner${variant === 'status' ? ' exp-status-only' : ''}`}
    aria-busy="true"
    aria-hidden="true"
  >
    <div className="exp-section">
      <h4>
        <Skeleton width={72} height={12} baseColor={T.sa} highlightColor={T.sf} />
      </h4>
      <div className={variant === 'status' ? 'tl-big' : undefined} style={{ marginBottom: 12 }}>
        <div className="tl" style={{ gap: 0 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <React.Fragment key={idx}>
              <div className="tl-step">
                <Skeleton circle width={14} height={14} baseColor={T.sa} highlightColor={T.sf} />
              </div>
              {idx < 3 && <div className="tl-line" style={{ opacity: 0.4 }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {variant === 'status' && (
        <div className="status-detail" style={{ marginTop: 8 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="sd-item">
              <Skeleton width={48} height={10} baseColor={T.sa} highlightColor={T.sf} />
              <Skeleton
                width={80}
                height={14}
                style={{ marginTop: 6 }}
                baseColor={T.sa}
                highlightColor={T.sf}
              />
            </div>
          ))}
        </div>
      )}

      <h4 style={{ marginTop: 12 }}>
        <Skeleton width={100} height={12} baseColor={T.sa} highlightColor={T.sf} />
      </h4>
      {Array.from({ length: 2 }).map((_, idx) => (
        <div key={idx} style={{ marginBottom: 8 }}>
          <Skeleton
            width="100%"
            height={28}
            borderRadius={6}
            baseColor={T.sa}
            highlightColor={T.sf}
          />
        </div>
      ))}
      {variant === 'pending' && (
        <Skeleton
          width={180}
          height={12}
          style={{ marginTop: 4 }}
          baseColor={T.sa}
          highlightColor={T.sf}
        />
      )}
    </div>

    {variant === 'pending' && (
      <div className="exp-section">
        <h4>
          <Skeleton width={110} height={12} baseColor={T.sa} highlightColor={T.sf} />
        </h4>
        <Skeleton height={72} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
      </div>
    )}

    <div className="exp-section">
      {variant === 'pending' && (
        <>
          <h4>
            <Skeleton width={140} height={12} baseColor={T.sa} highlightColor={T.sf} />
          </h4>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
            >
              <Skeleton circle width={24} height={24} baseColor={T.sa} highlightColor={T.sf} />
              <Skeleton width="55%" height={12} baseColor={T.sa} highlightColor={T.sf} />
              <Skeleton width={52} height={22} borderRadius={6} baseColor={T.sa} highlightColor={T.sf} />
            </div>
          ))}
        </>
      )}
      <h4 style={{ marginTop: variant === 'pending' ? 16 : 0 }}>
        <Skeleton width={100} height={12} baseColor={T.sa} highlightColor={T.sf} />
      </h4>
      <div className="qa-row">
        <Skeleton height={30} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
        <Skeleton height={30} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
        <Skeleton height={30} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
      </div>
    </div>
  </div>
);

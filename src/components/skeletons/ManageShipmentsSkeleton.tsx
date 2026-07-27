import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
};

const sk = { baseColor: T.sa, highlightColor: T.sf };

export const KpiStripSkeleton: React.FC = () => (
  <div className="mgmt-kpi-s mgmt-kpi-s--inline" aria-hidden="true">
    {Array.from({ length: 5 }).map((_, idx) => (
      <div key={idx} className="mgmt-kpi mgmt-kpi--compact" style={{ pointerEvents: 'none' }}>
        <div className="mgmt-kpi-v">
          <Skeleton width={28} height={18} {...sk} />
        </div>
        <div className="mgmt-kpi-l">
          <Skeleton width={72} height={10} {...sk} />
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton for inline Negotiation History expand panel. */
export const NegotiationHistorySkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <ul className="neg-hist-timeline neg-hist-timeline--skeleton" aria-busy="true" aria-hidden="true">
    {Array.from({ length: rows }).map((_, idx) => (
      <li key={idx} className="neg-hist-item">
        <Skeleton circle width={32} height={32} {...sk} />
        <div className="neg-hist-main">
          <div className="neg-hist-row">
            <Skeleton width="58%" height={12} {...sk} />
            <Skeleton width={96} height={10} {...sk} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Skeleton width={72} height={18} {...sk} />
          </div>
          {idx === 1 ? (
            <div style={{ marginTop: 6 }}>
              <Skeleton width="72%" height={10} {...sk} />
            </div>
          ) : null}
        </div>
      </li>
    ))}
  </ul>
);

function BidCardSkeleton() {
  return (
    <div className="bid-row exp-bid-sk" aria-hidden="true">
      <div className="bid-top">
        <div className="bid-name">
          <Skeleton circle width={28} height={28} {...sk} />
          <div className="bid-name-block" style={{ flex: 1, minWidth: 0 }}>
            <div className="bid-name-line" style={{ gap: 8 }}>
              <Skeleton width="42%" height={12} {...sk} />
              <Skeleton width={56} height={16} borderRadius={99} {...sk} />
            </div>
            <div className="bid-subline" style={{ marginTop: 6 }}>
              <Skeleton width="36%" height={10} {...sk} />
              <Skeleton width={70} height={10} {...sk} />
            </div>
          </div>
        </div>
        <Skeleton width={64} height={18} {...sk} />
      </div>
      <div className="bid-acts" style={{ marginTop: 10 }}>
        <Skeleton width={72} height={28} borderRadius={8} {...sk} />
        <Skeleton width={64} height={28} borderRadius={8} {...sk} />
      </div>
    </div>
  );
}

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
    <div className="exp-section">
      <div className="exp-section-head">
        <h4>
          <Skeleton width={72} height={12} {...sk} />
        </h4>
      </div>
      <div className={variant === 'status' ? 'tl-big' : undefined} style={{ marginBottom: 12 }}>
        <div className="tl" style={{ gap: 0 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <React.Fragment key={idx}>
              <div className="tl-step">
                <Skeleton circle width={14} height={14} {...sk} />
              </div>
              {idx < 3 && <div className="tl-line" style={{ opacity: 0.35 }} />}
            </React.Fragment>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 10,
            padding: '0 4px',
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} width={`${18 + (idx % 2) * 8}%`} height={10} {...sk} />
          ))}
        </div>
      </div>

      {variant === 'status' && (
        <div className="status-detail" style={{ marginTop: 8 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="sd-item">
              <Skeleton width={48} height={10} {...sk} />
              <Skeleton width={80} height={14} style={{ marginTop: 6 }} {...sk} />
            </div>
          ))}
        </div>
      )}

      <h4 style={{ marginTop: 8 }}>
        <Skeleton width={88} height={12} {...sk} />
      </h4>
      <div className="bid-row" style={{ marginTop: 8 }}>
        <div className="bid-top">
          <div className="bid-name" style={{ flex: 1 }}>
            <Skeleton width="34%" height={12} {...sk} />
          </div>
          <Skeleton width={64} height={12} {...sk} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Skeleton width="55%" height={11} {...sk} />
        </div>
      </div>

      <h4 style={{ marginTop: 14 }}>
        <Skeleton width={72} height={12} {...sk} />
      </h4>
      <div className="exp-itin-sk" style={{ marginTop: 8 }}>
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="exp-itin-sk-row">
            <Skeleton circle width={22} height={22} {...sk} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton width={70} height={10} {...sk} />
              <Skeleton width="62%" height={12} style={{ marginTop: 6 }} {...sk} />
              <Skeleton width="48%" height={10} style={{ marginTop: 6 }} {...sk} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {variant === 'pending' && (
      <div className="exp-section">
        <div className="bids-section-head">
          <h4>
            <Skeleton width={150} height={12} {...sk} />
          </h4>
          <Skeleton width={110} height={12} {...sk} />
        </div>
        <div className="bids-card-list">
          <BidCardSkeleton />
        </div>

        <div className="bids-section-head bids-section-head--spaced">
          <h4>
            <Skeleton width={220} height={12} {...sk} />
          </h4>
          <Skeleton width={120} height={12} {...sk} />
        </div>
        <div className="bids-card-list">
          <BidCardSkeleton />
          <BidCardSkeleton />
        </div>
      </div>
    )}

    <div className="exp-section">
      {variant === 'pending' && (
        <>
          <h4>
            <Skeleton width={150} height={12} {...sk} />
          </h4>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
            >
              <Skeleton circle width={20} height={20} {...sk} />
              <Skeleton width="42%" height={12} {...sk} />
              <Skeleton width={64} height={22} borderRadius={6} {...sk} />
            </div>
          ))}
        </>
      )}
      <h4 style={{ marginTop: variant === 'pending' ? 12 : 0 }}>
        <Skeleton width={100} height={12} {...sk} />
      </h4>
      <div className="qa-row">
        <Skeleton height={30} borderRadius={8} {...sk} />
        <Skeleton height={30} borderRadius={8} {...sk} />
        <Skeleton height={30} borderRadius={8} {...sk} />
      </div>
    </div>
  </div>
);

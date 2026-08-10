import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export const TransporterProfileSkeleton: React.FC = () => {
  const sk = {
    baseColor: '#f1f5f9',
    highlightColor: '#e8edf3',
  };

  return (
    <div className="tp-content" aria-busy="true" aria-label="Loading transporter profile">
      <div className="tp-header-card">
        <Skeleton circle width={64} height={64} {...sk} />
        <div className="tp-header-text flex-1 min-w-0 space-y-2">
          <Skeleton width="55%" height={20} borderRadius={6} {...sk} />
          <div className="flex items-center gap-2">
            <Skeleton width={88} height={14} borderRadius={4} {...sk} />
            <Skeleton width={36} height={14} borderRadius={4} {...sk} />
            <Skeleton width={72} height={14} borderRadius={4} {...sk} />
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            <Skeleton width={96} height={12} borderRadius={4} {...sk} />
            <Skeleton width={88} height={12} borderRadius={4} {...sk} />
            <Skeleton width={110} height={12} borderRadius={4} {...sk} />
          </div>
        </div>
      </div>

      <Skeleton width={80} height={14} borderRadius={4} {...sk} />

      <div className="tp-distribution" style={{ marginTop: 12 }}>
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="tp-dist-row">
            <Skeleton width={12} height={12} borderRadius={2} {...sk} />
            <Skeleton width="100%" height={8} borderRadius={999} {...sk} />
            <Skeleton width={28} height={12} borderRadius={4} {...sk} />
          </div>
        ))}
      </div>

      <ul className="tp-reviews">
        {[0, 1, 2].map((i) => (
          <li key={i} className="tp-review">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton width={72} height={12} borderRadius={4} {...sk} />
              <Skeleton width={88} height={12} borderRadius={4} {...sk} />
              <Skeleton width={64} height={12} borderRadius={4} containerClassName="ml-auto" {...sk} />
            </div>
            <Skeleton width={`${78 - i * 8}%`} height={12} borderRadius={4} {...sk} />
          </li>
        ))}
      </ul>
    </div>
  );
};

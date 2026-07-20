import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface CatalogSkeletonProps {
  rowCount?: number;
}

const LABEL_WIDTHS = ['55%', '68%', '48%', '72%', '42%', '60%', '50%', '65%'];

export const CatalogSkeleton: React.FC<CatalogSkeletonProps> = ({ rowCount = 8 }) => (
  <div aria-busy="true" aria-label="Loading catalog">
    {Array.from({ length: rowCount }).map((_, idx) => (
      <div
        key={idx}
        className="cat-node"
        style={{ cursor: 'default', pointerEvents: 'none', borderLeftColor: 'transparent' }}
      >
        <Skeleton width={14} height={14} borderRadius={4} />
        <span className="lbl">
          <Skeleton width={LABEL_WIDTHS[idx % LABEL_WIDTHS.length]} height={12} />
        </span>
        <span className="cnt" style={{ background: 'transparent', padding: 0 }}>
          <Skeleton width={22} height={14} borderRadius={10} />
        </span>
      </div>
    ))}
  </div>
);

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface CancelReasonsSkeletonProps {
  rowCount?: number;
}

const LABEL_WIDTHS = ['62%', '88%', '48%', '28%'];

export const CancelReasonsSkeleton: React.FC<CancelReasonsSkeletonProps> = ({ rowCount = 4 }) => (
  <div aria-busy="true" aria-label="Loading cancellation reasons">
    <Skeleton width={120} height={12} style={{ marginBottom: 10 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rowCount }).map((_, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton circle width={14} height={14} />
          <Skeleton width={LABEL_WIDTHS[idx % LABEL_WIDTHS.length]} height={13} />
        </div>
      ))}
    </div>
  </div>
);

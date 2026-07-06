import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  bd: 'var(--border)',
};

const skeletonProps = {
  baseColor: T.sa,
  highlightColor: T.sf,
};

export const CarrierRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3" aria-hidden="true">
    <Skeleton width={16} height={16} borderRadius={4} {...skeletonProps} />
    <Skeleton circle width={32} height={32} {...skeletonProps} />
    <div className="flex-1 min-w-0 space-y-1.5">
      <div className="flex items-center gap-2">
        <Skeleton width="42%" height={12} {...skeletonProps} />
        <Skeleton width={44} height={14} borderRadius={4} {...skeletonProps} />
      </div>
      <Skeleton width="58%" height={10} {...skeletonProps} />
      <div className="flex gap-1 pt-0.5">
        <Skeleton width={72} height={14} borderRadius={4} {...skeletonProps} />
        <Skeleton width={56} height={14} borderRadius={4} {...skeletonProps} />
      </div>
    </div>
  </div>
);

interface CarrierListSkeletonProps {
  rows?: number;
}

export const CarrierListSkeleton: React.FC<CarrierListSkeletonProps> = ({ rows = 4 }) => (
  <div className="divide-y" style={{ borderColor: T.bd }} aria-busy="true" aria-label="Loading carriers">
    {Array.from({ length: rows }, (_, i) => (
      <CarrierRowSkeleton key={i} />
    ))}
  </div>
);

interface CarrierAccordionsSkeletonProps {
  companyRows?: number;
  freelancerRows?: number;
}

export const CarrierAccordionsSkeleton: React.FC<CarrierAccordionsSkeletonProps> = ({
  companyRows = 4,
  freelancerRows = 2,
}) => (
  <>
    <div className="border rounded-lg overflow-hidden mb-2" style={{ borderColor: T.bd }}>
      <div className="px-3 py-2 bg-slate-50">
        <Skeleton width={140} height={12} {...skeletonProps} />
      </div>
      <CarrierListSkeleton rows={companyRows} />
    </div>
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: T.bd }}>
      <div className="px-3 py-2 bg-slate-50">
        <Skeleton width={130} height={12} {...skeletonProps} />
      </div>
      <CarrierListSkeleton rows={freelancerRows} />
    </div>
  </>
);

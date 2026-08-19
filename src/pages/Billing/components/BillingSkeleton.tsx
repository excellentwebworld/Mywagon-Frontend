import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const sk = { baseColor: '#f0f0f3', highlightColor: '#fafafe' };

export const BillingKpiSkeleton: React.FC = () => (
  <div className="kpi-strip billing-skeleton-block" aria-hidden>
    {Array.from({ length: 5 }).map((_, idx) => (
      <div key={idx} className="kpi-card" style={{ pointerEvents: 'none' }}>
        <div className="kpi-top">
          <Skeleton width={90} height={10} borderRadius={4} {...sk} />
          <Skeleton circle width={16} height={16} {...sk} />
        </div>
        <div className="kpi-val billing-mono" style={{ marginTop: 8 }}>
          <Skeleton width={72} height={22} borderRadius={4} {...sk} />
        </div>
        <div className="kpi-sub" style={{ marginTop: 6 }}>
          <Skeleton width={56} height={10} borderRadius={4} {...sk} />
        </div>
      </div>
    ))}
  </div>
);

export const BillingTableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 8,
  columns = 10,
}) => (
  <tbody className="billing-skeleton-block" aria-hidden>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx}>
        {Array.from({ length: columns }).map((_, cIdx) => (
          <td key={cIdx}>
            <Skeleton
              width={
                cIdx === 0 ? 88 : cIdx === 1 ? 72 : cIdx === 2 ? 56 : cIdx === 9 ? 96 : 64
              }
              height={cIdx === 0 ? 28 : 14}
              borderRadius={4}
              {...sk}
            />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

export const BillingCreditsSkeleton: React.FC = () => (
  <div className="billing-skeleton-block" aria-hidden>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 px-6 pt-4">
      <div className="credit-card">
        <Skeleton width={140} height={10} borderRadius={4} {...sk} />
        <div style={{ marginTop: 12 }}>
          <Skeleton width={100} height={28} borderRadius={4} {...sk} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Skeleton width="80%" height={10} borderRadius={4} {...sk} />
        </div>
      </div>
      <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <Skeleton width={110} height={14} borderRadius={4} {...sk} />
        <div className="flex gap-2 flex-wrap mt-4">
          <Skeleton width={130} height={34} borderRadius={8} {...sk} />
          <Skeleton width={150} height={34} borderRadius={8} {...sk} />
        </div>
      </div>
    </div>

    <div className="billing-tbl-card mt-4 mx-6">
      <div className="billing-tbl-head">
        <Skeleton width={120} height={14} borderRadius={4} {...sk} />
      </div>
      <div className="overflow-x-auto">
        <table className="billing-t">
          <thead>
            <tr>
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i}>
                  <Skeleton width={70} height={10} borderRadius={4} {...sk} />
                </th>
              ))}
            </tr>
          </thead>
          <BillingTableSkeleton rows={6} columns={6} />
        </table>
      </div>
    </div>
  </div>
);

export const BillingStatementsSkeleton: React.FC = () => (
  <div className="billing-skeleton-block" aria-hidden>
    <div className="exp-grid">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="exp-card">
          <div className="flex justify-between items-start">
            <Skeleton width={44} height={44} borderRadius={10} {...sk} />
            <Skeleton width={36} height={12} borderRadius={4} {...sk} />
          </div>
          <div style={{ marginTop: 14 }}>
            <Skeleton width="70%" height={16} borderRadius={4} {...sk} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Skeleton width="90%" height={12} borderRadius={4} {...sk} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Skeleton width={140} height={32} borderRadius={8} {...sk} />
          </div>
        </div>
      ))}
    </div>

    <div className="billing-tbl-card p-6 mt-4">
      <Skeleton width={120} height={14} borderRadius={4} {...sk} />
      <div className="aging-grid mt-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="aging-item" style={{ borderLeftColor: '#e4e4e8' }}>
            <Skeleton width="80%" height={10} borderRadius={4} {...sk} />
            <div style={{ marginTop: 10 }}>
              <Skeleton width={72} height={20} borderRadius={4} {...sk} />
            </div>
            <div style={{ marginTop: 6 }}>
              <Skeleton width={48} height={10} borderRadius={4} {...sk} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const BillingDrawerSkeleton: React.FC = () => (
  <div className="billing-skeleton-block dr-body p-4" aria-hidden>
    <table className="billing-t">
      <thead>
        <tr>
          {Array.from({ length: 6 }).map((_, i) => (
            <th key={i}>
              <Skeleton width={60} height={10} borderRadius={4} {...sk} />
            </th>
          ))}
        </tr>
      </thead>
      <BillingTableSkeleton rows={5} columns={6} />
    </table>
  </div>
);

export const ApplyCreditModalSkeleton: React.FC = () => (
  <div className="billing-skeleton-block py-2" aria-hidden>
    <div className="billing-mf">
      <Skeleton width={110} height={12} borderRadius={4} {...sk} />
      <div style={{ marginTop: 8 }}>
        <Skeleton width="100%" height={38} borderRadius={8} {...sk} />
      </div>
    </div>
    <div style={{ marginTop: 16 }}>
      <Skeleton width={220} height={12} borderRadius={4} {...sk} />
    </div>
    <div style={{ marginTop: 10 }}>
      <Skeleton width={160} height={12} borderRadius={4} {...sk} />
    </div>
  </div>
);

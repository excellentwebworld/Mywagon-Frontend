import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const sk = { baseColor: '#f0f0f3', highlightColor: '#fafafe' };

function SummaryCardSkeleton() {
  return (
    <div className="ps-card">
      <Skeleton width={88} height={10} borderRadius={4} {...sk} />
      <div style={{ marginTop: 10 }}>
        <Skeleton width={120} height={20} borderRadius={4} {...sk} />
      </div>
      <div style={{ marginTop: 8 }}>
        <Skeleton width={96} height={11} borderRadius={4} {...sk} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Skeleton width={72} height={18} borderRadius={100} {...sk} />
      </div>
    </div>
  );
}

function UsageCardSkeleton() {
  return (
    <div className="usage-card">
      <div className="uc-top">
        <Skeleton width={90} height={12} borderRadius={4} {...sk} />
        <Skeleton width={48} height={12} borderRadius={4} {...sk} />
      </div>
      <Skeleton height={6} borderRadius={3} {...sk} />
    </div>
  );
}

function PlanCardSkeleton() {
  return (
    <div className="pcard" style={{ pointerEvents: 'none' }}>
      <div className="pcard-top">
        <Skeleton width={110} height={16} borderRadius={4} {...sk} />
        <div style={{ marginTop: 16 }}>
          <Skeleton width={92} height={32} borderRadius={4} {...sk} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Skeleton width={70} height={11} borderRadius={4} {...sk} />
        </div>
      </div>
      <div className="pcard-cta">
        <Skeleton height={40} borderRadius={10} {...sk} />
      </div>
      <div className="pcard-features">
        <Skeleton width={64} height={11} borderRadius={4} {...sk} />
        <ul className="fl" style={{ marginTop: 12 }}>
          {Array.from({ length: 7 }).map((_, idx) => (
            <li key={idx} className="fi" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Skeleton circle width={14} height={14} {...sk} />
              <Skeleton width={idx % 2 === 0 ? '78%' : '62%'} height={12} borderRadius={4} {...sk} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AddonCardSkeleton() {
  return (
    <div className="ao-card">
      <div className="ao-top">
        <Skeleton width={140} height={15} borderRadius={4} {...sk} />
        <Skeleton width={64} height={18} borderRadius={4} {...sk} />
      </div>
      <div style={{ marginTop: 8 }}>
        <Skeleton width="88%" height={11} borderRadius={4} {...sk} />
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Skeleton width={96} height={34} borderRadius={8} {...sk} />
      </div>
    </div>
  );
}

type ModalSkeletonVariant = 'quote' | 'confirm' | 'form';

/** Placeholder shown inside subscription dialogs while quote/checkout/cancel runs. */
export const SubscriptionModalSkeleton: React.FC<{ variant?: ModalSkeletonVariant }> = ({
  variant = 'quote',
}) => {
  if (variant === 'form') {
    return (
      <div className="sub-modal-skeleton" aria-busy="true" aria-live="polite">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="sub-modal-skeleton-field">
            <Skeleton width={idx === 3 ? 160 : 90} height={11} borderRadius={4} {...sk} />
            <div style={{ marginTop: 8 }}>
              <Skeleton height={idx === 3 ? 88 : 40} borderRadius={8} {...sk} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'confirm') {
    return (
      <div className="sub-modal-skeleton" aria-busy="true" aria-live="polite">
        <Skeleton width="92%" height={14} borderRadius={4} {...sk} />
        <div style={{ marginTop: 10 }}>
          <Skeleton width="78%" height={14} borderRadius={4} {...sk} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Skeleton width="64%" height={14} borderRadius={4} {...sk} />
        </div>
        <div style={{ marginTop: 18 }}>
          <Skeleton height={56} borderRadius={10} {...sk} />
        </div>
      </div>
    );
  }

  return (
    <div className="sub-modal-skeleton" aria-busy="true" aria-live="polite">
      <div className="m-highlight" style={{ border: 'none', background: 'transparent', padding: 0 }}>
        <Skeleton width={88} height={11} borderRadius={4} {...sk} />
        <div style={{ marginTop: 10 }}>
          <Skeleton width={140} height={28} borderRadius={6} {...sk} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Skeleton width={200} height={12} borderRadius={4} {...sk} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Skeleton width="100%" height={48} borderRadius={10} {...sk} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Skeleton width="88%" height={13} borderRadius={4} {...sk} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton width={18} height={18} borderRadius={4} {...sk} />
        <Skeleton width={210} height={13} borderRadius={4} {...sk} />
      </div>
    </div>
  );
};

export const SubscriptionSkeleton: React.FC = () => (
  <div className="subscription-page sub-skeleton" aria-busy="true" aria-live="polite">
    <header className="sub-head">
      <div>
        <div className="pg-t">
          <Skeleton width={180} height={24} borderRadius={4} {...sk} />
        </div>
        <div className="pg-s">
          <Skeleton width={260} height={13} borderRadius={4} {...sk} />
        </div>
      </div>
      <div className="pg-head-r">
        <Skeleton width={118} height={36} borderRadius={8} {...sk} />
      </div>
    </header>

    <div className="plan-summary">
      {Array.from({ length: 4 }).map((_, idx) => (
        <SummaryCardSkeleton key={idx} />
      ))}
    </div>

    <div className="usage-section">
      <div className="usage-title">
        <Skeleton width={150} height={14} borderRadius={4} {...sk} />
        <Skeleton width={110} height={11} borderRadius={4} {...sk} />
      </div>
      <div className="usage-grid">
        {Array.from({ length: 6 }).map((_, idx) => (
          <UsageCardSkeleton key={idx} />
        ))}
      </div>
    </div>

    <div style={{ marginBottom: 24 }}>
      <div className="plans-header">
        <Skeleton width={170} height={16} borderRadius={4} {...sk} />
        <Skeleton width={200} height={36} borderRadius={100} {...sk} />
      </div>
      <div className="plans-grid">
        {Array.from({ length: 3 }).map((_, idx) => (
          <PlanCardSkeleton key={idx} />
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
        <Skeleton width={220} height={16} borderRadius={4} {...sk} />
      </div>
    </div>

    <div className="addons-section">
      <div className="section-title">
        <Skeleton width={28} height={28} borderRadius={8} {...sk} />
        <Skeleton width={180} height={16} borderRadius={4} {...sk} />
      </div>
      <div className="addons-tabs">
        <Skeleton width={150} height={36} borderRadius={100} {...sk} />
        <Skeleton width={170} height={36} borderRadius={100} {...sk} />
      </div>
      <div className="ao-grid">
        {Array.from({ length: 4 }).map((_, idx) => (
          <AddonCardSkeleton key={idx} />
        ))}
      </div>
    </div>

    <div className="billing-section">
      <h3>
        <Skeleton width={140} height={14} borderRadius={4} {...sk} />
      </h3>
      <div className="billing-grid">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="b-field">
            <Skeleton width={90} height={10} borderRadius={4} {...sk} />
            <div style={{ marginTop: 8 }}>
              <Skeleton width={idx % 2 === 0 ? '70%' : '55%'} height={13} borderRadius={4} {...sk} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

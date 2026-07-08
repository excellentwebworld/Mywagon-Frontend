import React from 'react';
import { Link } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
};

interface ShipmentDetailSkeletonProps {
  t: (key: string) => string;
}

const CardSkeleton: React.FC<{ lines?: number; tall?: boolean }> = ({ lines = 3, tall = false }) => (
  <div className="ld-card" aria-hidden="true">
    <div className="ld-card-h">
      <h3>
        <Skeleton width={140} height={16} baseColor={T.sa} highlightColor={T.sf} />
      </h3>
      <span className="chev">▾</span>
    </div>
    <div className="ld-card-body">
      {tall ? (
        <Skeleton height={180} borderRadius={8} baseColor={T.sa} highlightColor={T.sf} />
      ) : (
        Array.from({ length: lines }).map((_, idx) => (
          <div key={idx} style={{ marginBottom: idx < lines - 1 ? 12 : 0 }}>
            <Skeleton width={`${65 + (idx % 3) * 10}%`} height={14} baseColor={T.sa} highlightColor={T.sf} />
          </div>
        ))
      )}
    </div>
  </div>
);

export const ShipmentDetailSkeleton: React.FC<ShipmentDetailSkeletonProps> = ({ t }) => (
  <div className="ld-wrap" aria-busy="true" aria-label={t('loading')}>
    <div className="ld-bc">
      <Link to="/shipments">{t('manageShipments')}</Link> <span>›</span> <span>{t('loadDetails')}</span>
    </div>

    <div className="ld-cmd" aria-hidden="true">
      <div className="ld-cmd-top">
        <div className="ld-cmd-left">
          <div className="ld-cmd-sid">
            <Skeleton width={180} height={32} baseColor={T.sa} highlightColor={T.sf} />
          </div>
          <div className="ld-cmd-lane" style={{ marginTop: 8 }}>
            <Skeleton width="55%" height={18} baseColor={T.sa} highlightColor={T.sf} />
          </div>
          <div className="ld-cmd-badges" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <Skeleton width={90} height={24} borderRadius={12} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton width={80} height={24} borderRadius={12} baseColor={T.sa} highlightColor={T.sf} />
            <Skeleton width={100} height={24} borderRadius={12} baseColor={T.sa} highlightColor={T.sf} />
          </div>
        </div>
        <div className="ld-cmd-mid">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton
              key={idx}
              width={110}
              height={52}
              borderRadius={8}
              baseColor={T.sa}
              highlightColor={T.sf}
            />
          ))}
        </div>
        <div className="ld-cmd-right">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton
              key={idx}
              width={idx === 0 ? 120 : 36}
              height={36}
              borderRadius={6}
              baseColor={T.sa}
              highlightColor={T.sf}
            />
          ))}
        </div>
      </div>
    </div>

    <div className="ld-jnav" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, idx) => (
        <Skeleton
          key={idx}
          width={72 + (idx % 3) * 24}
          height={36}
          borderRadius={0}
          baseColor={T.sa}
          highlightColor={T.sf}
          style={{ flexShrink: 0 }}
        />
      ))}
    </div>

    <div className="ld-ms-bar" aria-hidden="true">
      <div className="ld-ms-row" style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="ld-ms-step" style={{ flex: 1, textAlign: 'center' }}>
            <Skeleton
              circle
              width={28}
              height={28}
              baseColor={T.sa}
              highlightColor={T.sf}
              style={{ margin: '0 auto 8px' }}
            />
            <Skeleton width={60} height={12} baseColor={T.sa} highlightColor={T.sf} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </div>

    <div className="ld-pg">
      <div className="ld-grid">
        <div className="ld-col">
          <CardSkeleton lines={4} tall />
          <CardSkeleton lines={5} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={3} />
        </div>
        <div className="ld-col">
          <CardSkeleton tall />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={4} />
        </div>
      </div>
      <CardSkeleton lines={5} />
    </div>
  </div>
);

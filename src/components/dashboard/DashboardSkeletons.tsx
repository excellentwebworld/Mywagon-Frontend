import React from 'react';

type BoneProps = {
  w?: number | string;
  h?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

export const DashBone: React.FC<BoneProps> = ({ w = '100%', h = 12, className = '', style }) => (
  <div
    className={`skeleton dash-skel-bone ${className}`.trim()}
    style={{ width: w, height: h, ...style }}
    aria-hidden
  />
);

export const DashKpiSkeleton: React.FC = () => (
  <div className="kpi-section" style={{ display: 'block', marginBottom: '20px' }} aria-busy="true" aria-hidden>
    <div className="kpi-strip">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="kpi" style={{ pointerEvents: 'none' }}>
          <div className="kpi-top">
            <DashBone w={48} h={28} />
          </div>
          <div className="kpi-bottom" style={{ marginTop: 10 }}>
            <DashBone w={72 + (i % 3) * 8} h={12} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DashScheduleSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="dash-skel-sched" aria-busy="true" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="dash-skel-sched-row">
        <DashBone w={44} h={28} />
        <div className="dash-skel-sched-main">
          <DashBone w="55%" h={12} />
          <DashBone w="38%" h={10} style={{ marginTop: 8 }} />
        </div>
        <div className="dash-skel-sched-right">
          <DashBone w={56} h={14} />
          <DashBone w={64} h={22} style={{ marginTop: 6, borderRadius: 99 }} />
        </div>
      </div>
    ))}
  </div>
);

export const DashMapSkeleton: React.FC = () => (
  <div className="dash-skel-map" aria-busy="true" aria-hidden>
    <DashBone w="100%" h="100%" className="dash-skel-map-fill" style={{ borderRadius: 0 }} />
  </div>
);

export const DashBoardSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="dash-skel-board-row" aria-hidden>
        <td>
          <DashBone w={72} h={12} />
        </td>
        <td>
          <DashBone w="80%" h={12} />
        </td>
        <td>
          <DashBone w={70} h={20} style={{ borderRadius: 99 }} />
        </td>
        <td>
          <DashBone w={52} h={12} />
        </td>
        <td>
          <DashBone w={18} h={18} />
        </td>
      </tr>
    ))}
  </>
);

export const DashPerfSkeleton: React.FC = () => (
  <div className="perf-grid" aria-busy="true" aria-hidden>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="perf-cell">
        <DashBone w={88} h={10} style={{ marginBottom: 10 }} />
        <DashBone w={64 + (i % 3) * 10} h={20} />
      </div>
    ))}
  </div>
);

export const DashTrucksSkeleton: React.FC = () => (
  <div aria-busy="true" aria-hidden>
    <div className="dash-truck-counts">
      <div className="dash-truck-count">
        <DashBone w={40} h={22} style={{ margin: '0 auto' }} />
        <DashBone w={56} h={10} style={{ margin: '8px auto 0' }} />
      </div>
      <div className="dash-truck-count">
        <DashBone w={40} h={22} style={{ margin: '0 auto' }} />
        <DashBone w={56} h={10} style={{ margin: '8px auto 0' }} />
      </div>
    </div>
    <div className="dash-skel-truck-map">
      <DashBone w="100%" h={160} style={{ borderRadius: 0 }} />
    </div>
  </div>
);

export const DashNotifSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div aria-busy="true" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="notif-item dash-skel-notif-row">
        <DashBone w={32} h={32} style={{ borderRadius: 10, flexShrink: 0 }} />
        <div className="notif-body" style={{ flex: 1 }}>
          <DashBone w="78%" h={12} />
          <DashBone w="42%" h={10} style={{ marginTop: 8 }} />
        </div>
      </div>
    ))}
  </div>
);

export const DashMessagesSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div aria-busy="true" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="dash-msg-row" style={{ pointerEvents: 'none' }}>
        <DashBone w={32} h={32} style={{ borderRadius: '50%', flexShrink: 0 }} />
        <div className="dash-msg-body">
          <div className="dash-msg-top">
            <DashBone w="45%" h={12} />
            <DashBone w={36} h={10} />
          </div>
          <DashBone w="70%" h={10} style={{ marginTop: 8 }} />
        </div>
      </div>
    ))}
  </div>
);

export const DashExpandSkeleton: React.FC = () => (
  <div className="expand-content" aria-busy="true" aria-hidden>
    <div className="expand-section">
      <DashBone w={120} h={11} style={{ marginBottom: 12 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <DashBone w={80} h={11} />
          <DashBone w="55%" h={11} />
        </div>
      ))}
    </div>
    <div className="expand-section" style={{ marginTop: 16 }}>
      <DashBone w={100} h={11} style={{ marginBottom: 12 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <DashBone w={70} h={11} />
          <DashBone w="40%" h={11} />
        </div>
      ))}
    </div>
  </div>
);

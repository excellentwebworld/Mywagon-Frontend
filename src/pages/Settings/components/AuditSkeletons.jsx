import Skeleton from 'react-loading-skeleton';

function sk(T) {
  return { baseColor: T.sa, highlightColor: T.bd };
}

/** Admin platform audit log — date groups + expandable rows */
export function PlatformAuditLogSkeleton({ T, rows = 10 }) {
  const s = sk(T);

  return (
    <div aria-busy="true" style={{ minHeight: 'calc(100vh - 280px)' }}>
      {Array.from({ length: Math.ceil(rows / 4) }, (_, gi) => (
        <div key={gi}>
          <div className="px-2 py-1.5 mb-1 mt-3">
            <Skeleton width={gi === 0 ? 48 : 88} height={12} borderRadius={4} {...s} />
          </div>
          {Array.from({ length: Math.min(4, rows - gi * 4) }, (_, ri) => (
            <div
              key={ri}
              className="flex items-center gap-2.5 px-3 py-2.5 mb-1.5 rounded-lg"
              style={{ background: T.sf, border: `1px solid ${T.bd}` }}
            >
              <Skeleton width={12} height={12} borderRadius={2} {...s} />
              <Skeleton circle width={18} height={18} {...s} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton width={`${55 + ((gi + ri) % 3) * 12}%`} height={12} borderRadius={4} {...s} />
                  <Skeleton width={52} height={16} borderRadius={999} {...s} />
                </div>
                <Skeleton width={`${38 + ((gi + ri) % 4) * 10}%`} height={10} borderRadius={4} {...s} />
              </div>
              <Skeleton width={36} height={10} borderRadius={4} {...s} />
            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center justify-between mt-4 px-2">
        <Skeleton width={140} height={12} borderRadius={4} {...s} />
        <div className="flex gap-1">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} width={28} height={28} borderRadius={8} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Users & roles audit tab — vertical timeline */
export function UserAuditTabSkeleton({ T, rows = 10 }) {
  const s = sk(T);

  return (
    <div className="relative" aria-busy="true" style={{ minHeight: 'calc(100vh - 320px)' }}>
      <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: T.bd }} />

      <div className="space-y-0">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="relative flex gap-3 py-3 pl-0">
            <Skeleton circle width={38} height={38} containerClassName="shrink-0" {...s} />
            <div className="flex-1 min-w-0 space-y-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton width={100 + (i % 3) * 24} height={12} borderRadius={4} {...s} />
                <Skeleton width={8} height={8} borderRadius={2} {...s} />
                <Skeleton width={80 + (i % 2) * 20} height={12} borderRadius={4} {...s} />
                <Skeleton width={72} height={18} borderRadius={999} {...s} />
              </div>
              <Skeleton width={`${70 + (i % 4) * 8}%`} height={10} borderRadius={4} {...s} />
              <Skeleton width={120} height={10} borderRadius={4} {...s} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

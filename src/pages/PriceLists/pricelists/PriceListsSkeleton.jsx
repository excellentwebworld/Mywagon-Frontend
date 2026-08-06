import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../../hooks/useTheme';

function DirectorySkeleton() {
  const { T } = useTheme();

  return (
    <div className="p-3 space-y-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-2 py-2 rounded-lg"
          style={{ paddingLeft: i > 6 ? 20 : 8 }}
        >
          <Skeleton width={i === 0 ? 90 : 120 - (i % 3) * 10} height={14} baseColor={T.bg} highlightColor={T.sf} />
          <Skeleton width={24} height={14} baseColor={T.bg} highlightColor={T.sf} />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ role }) {
  const { T } = useTheme();
  const columnCount = role === 'carrier' ? 12 : 11;

  const thStyle = {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: T.t3,
    textAlign: 'left',
    borderBottom: `1px solid ${T.bd}`,
    background: T.bg,
    whiteSpace: 'nowrap',
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse" style={{ minWidth: 800 }}>
        <thead>
          <tr>
            {Array.from({ length: columnCount }).map((_, i) => (
              <th key={i} style={thStyle}>
                <Skeleton width={i === 1 ? 72 : 56} height={12} baseColor={T.bg} highlightColor={T.sf} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columnCount }).map((_, colIdx) => (
                <td key={colIdx} style={{ padding: '12px', borderBottom: `1px solid ${T.bd}` }}>
                  <Skeleton
                    width={
                      colIdx === 0 ? 18
                        : colIdx === 1 ? 180
                          : colIdx === 4 ? 64
                            : colIdx === 5 ? 88
                              : 52
                    }
                    height={colIdx === 1 ? 32 : 14}
                    baseColor={T.bg}
                    highlightColor={T.sf}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PriceListsSkeleton({ role = 'shipper' }) {
  const { T } = useTheme();

  return (
    <div className="flex flex-1 min-h-0 gap-3">
      <div
        className="shrink-0 rounded-xl overflow-hidden"
        style={{ width: 230, background: T.sf, border: `1px solid ${T.bd}` }}
      >
        <DirectorySkeleton />
      </div>

      <div
        className="flex-1 min-w-0 rounded-xl overflow-hidden flex flex-col"
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}
      >
        <TableSkeleton role={role} />
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderTop: `1px solid ${T.bd}` }}
        >
          <Skeleton width={120} height={14} baseColor={T.bg} highlightColor={T.sf} />
          <Skeleton width={180} height={14} baseColor={T.bg} highlightColor={T.sf} />
        </div>
      </div>
    </div>
  );
}

export { DirectorySkeleton, TableSkeleton };

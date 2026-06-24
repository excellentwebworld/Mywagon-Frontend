import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface ListSkeletonProps {
  type: 'table' | 'grid';
  rowCount?: number;
  columnCount?: number;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  type,
  rowCount = 8,
  columnCount = 8,
}) => {
  if (type === 'grid') {
    return (
      <>
        {Array.from({ length: rowCount }).map((_, rIdx) => (
          <div key={rIdx} className="type-card" style={{ cursor: 'default', pointerEvents: 'none' }}>
            <div className="tc-cat">
              <Skeleton width={80} />
            </div>
            <div className="tc-name" style={{ marginTop: 6, marginBottom: 12 }}>
              <Skeleton height={20} width="60%" />
            </div>
            <div className="tc-stats">
              {Array.from({ length: 4 }).map((_, sIdx) => (
                <div key={sIdx} className="tc-stat">
                  <strong>
                    <Skeleton width={20} />
                  </strong>
                  <Skeleton width={35} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  // Else render 'table'
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rIdx) => (
        <tr key={rIdx}>
          {Array.from({ length: columnCount }).map((_, cIdx) => (
            <td key={cIdx}>
              {/* Vary the width slightly to make it look realistic */}
              <Skeleton width={cIdx === 0 ? 120 : cIdx === 1 ? 80 : 60} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

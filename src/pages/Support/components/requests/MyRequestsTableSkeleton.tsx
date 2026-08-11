import React from 'react';

const ROW_COUNT = 5;

export function MyRequestsTableSkeleton() {
  return (
    <div className="requests-table-wrap support-skeleton" aria-busy="true" aria-label="Loading requests">
      <div className="requests-table-scroll">
        <table className="req-table support-skeleton-table">
          <thead>
            <tr>
              {Array.from({ length: 6 }, (_, i) => (
                <th key={i}>
                  <div className="support-skeleton-block support-skeleton-th" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROW_COUNT }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: 6 }, (_, col) => (
                  <td key={col}>
                    <div
                      className={`support-skeleton-block support-skeleton-td${
                        col === 2 ? ' support-skeleton-td--wide' : ''
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

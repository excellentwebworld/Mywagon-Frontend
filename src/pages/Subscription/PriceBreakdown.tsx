import React from 'react';

export type PriceBreakdownRow = {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Top border before this row */
  divider?: boolean;
  /** Emphasize label + value (e.g. Grand Total) */
  strong?: boolean;
};

type PriceBreakdownProps = {
  descriptionLabel: string;
  rows: PriceBreakdownRow[];
  footer?: React.ReactNode;
};

/** Table-style price summary matching the legacy subscription purchase popup. */
export function PriceBreakdown({ descriptionLabel, rows, footer }: PriceBreakdownProps) {
  return (
    <div className="price-breakdown">
      <div className="pb-head">
        <span>{descriptionLabel}</span>
        <span aria-hidden="true" />
      </div>
      <div className="pb-body">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`pb-row${row.divider ? ' pb-row-divider' : ''}${row.strong ? ' pb-row-strong' : ''}`}
          >
            <span className="pb-label">{row.label}</span>
            <span className="pb-value">{row.value}</span>
          </div>
        ))}
      </div>
      {footer ? <div className="pb-footer">{footer}</div> : null}
    </div>
  );
}

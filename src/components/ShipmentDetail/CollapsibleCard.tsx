import React from 'react';

interface CollapsibleCardProps {
  id?: string;
  title: React.ReactNode;
  count?: number | string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  id,
  title,
  count,
  expanded,
  onToggle,
  children,
  headerExtra,
}) => (
  <div className="ld-card" id={id}>
    <div className="ld-card-h" onClick={onToggle} role="button" tabIndex={0}>
      <h3>
        {title}
        {count != null && <span className="cnt">{count}</span>}
      </h3>
      <span className={`chev ${expanded ? '' : 'collapsed'}`}>▾</span>
    </div>
    {!expanded ? null : (
      <div className="ld-card-body">
        {headerExtra}
        {children}
      </div>
    )}
  </div>
);

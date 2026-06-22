import React from 'react';

type Props = {
  active: boolean;
  message: string;
};

export const TableLoadingOverlay: React.FC<Props> = ({ active, message }) => (
  <div className={`dt-loading-overlay${active ? ' active' : ''}`} aria-hidden={!active}>
    <div className="dt-spinner-wrapper">
      <div className="dt-spinner" />
      <div className="dt-loading-text">{message}</div>
    </div>
  </div>
);

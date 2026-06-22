import React from 'react';
import { MyVagonLoaderContent } from './MyVagonLoader';

type Props = {
  active: boolean;
  message?: string;
};

/** Blade `showTableLoader()` — pane overlay with branded spinner + logo + message. */
export const TableLoadingOverlay: React.FC<Props> = ({ active, message }) => (
  <div className={`dt-loading-overlay${active ? ' active' : ''}`} aria-hidden={!active}>
    <div className="dt-spinner-wrapper">
      <MyVagonLoaderContent theme="light" compact />
      {message ? <div className="dt-loading-text">{message}</div> : null}
    </div>
  </div>
);

import React from 'react';
import { MyVagonLoaderContent } from './MyVagonLoader';

type Props = {
  visible: boolean;
};

/** Blade `loaderShow()` / `showLoader()` — full-page overlay. */
export const GlobalLoader: React.FC<Props> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="se-pre-icon" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
      <MyVagonLoaderContent theme="dark" />
    </div>
  );
};

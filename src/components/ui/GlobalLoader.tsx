import React from 'react';

type Props = {
  visible: boolean;
};

export const GlobalLoader: React.FC<Props> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="se-pre-icon" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
      <div className="preloader-content">
        <div className="premium-spinner" />
        <div className="preloader-logo">
          <img
            src="/gray_white.png"
            alt="MYVAGON"
            className="preloader-logo-img"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import './publicTracking.css';

export const PublicTrackingSkeleton: React.FC = () => {
  return (
    <div className="pt-page" aria-busy="true" aria-live="polite">
      <div className="pt-topbar">
        <div className="pt-topbar-inner">
          <div className="pt-skel pt-skel-logo" />
          <div className="pt-skel pt-skel-lang" />
        </div>
      </div>

      <div className="pt-cmd">
        <div className="pt-cmd-inner">
          <div className="pt-cmd-row">
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="pt-skel pt-skel-title" />
              <div className="pt-skel pt-skel-line" style={{ width: '55%', marginTop: 10 }} />
              <div className="pt-skel pt-skel-line" style={{ width: '40%', marginTop: 8 }} />
            </div>
            <div className="pt-skel pt-skel-chip" />
          </div>
        </div>
      </div>

      <div className="pt-ms-bar">
        <div className="pt-ms-row pt-skel-timeline">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="pt-ms-step" key={i}>
              <div className="pt-skel pt-skel-dot" />
              <div className="pt-skel pt-skel-line" style={{ width: 64, marginTop: 10 }} />
              <div className="pt-skel pt-skel-line" style={{ width: 48, marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-jnav">
        <div className="pt-jnav-main">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="pt-skel pt-skel-tab" key={i} />
          ))}
        </div>
        <div className="pt-jnav-actions">
          <div className="pt-skel pt-skel-action" />
          <div className="pt-skel pt-skel-action" />
        </div>
      </div>

      <div className="pt-wrap">
        <div className="pt-grid">
          <div>
            <div className="pt-card">
              <div className="pt-card-h">
                <div className="pt-skel pt-skel-line" style={{ width: 140 }} />
              </div>
              <div className="pt-card-body">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div className="pt-skel-stop" key={i}>
                    <div className="pt-skel pt-skel-badge" />
                    <div style={{ flex: 1 }}>
                      <div className="pt-skel pt-skel-line" style={{ width: '70%' }} />
                      <div className="pt-skel pt-skel-line" style={{ width: '90%', marginTop: 8 }} />
                      <div className="pt-skel pt-skel-line" style={{ width: '45%', marginTop: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="pt-card">
              <div className="pt-card-h">
                <div className="pt-skel pt-skel-line" style={{ width: 120 }} />
              </div>
              <div className="pt-card-body">
                <div className="pt-skel pt-skel-map" />
              </div>
            </div>
            <div className="pt-card">
              <div className="pt-card-h">
                <div className="pt-skel pt-skel-line" style={{ width: 110 }} />
              </div>
              <div className="pt-card-body">
                <div className="pt-skel-stop">
                  <div className="pt-skel pt-skel-avatar" />
                  <div style={{ flex: 1 }}>
                    <div className="pt-skel pt-skel-line" style={{ width: '60%' }} />
                    <div className="pt-skel pt-skel-line" style={{ width: '40%', marginTop: 8 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTrackingSkeleton;

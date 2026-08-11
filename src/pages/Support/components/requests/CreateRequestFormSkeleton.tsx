import React from 'react';

export function CreateRequestFormSkeleton() {
  return (
    <div className="ticket-form support-skeleton" aria-busy="true" aria-label="Loading form">
      <div className="support-skeleton-block support-skeleton-app-ref" />

      <div className="form-row">
        <div className="form-group">
          <div className="support-skeleton-block support-skeleton-label" />
          <div className="support-skeleton-block support-skeleton-input" />
        </div>
        <div className="form-group">
          <div className="support-skeleton-block support-skeleton-label" />
          <div className="support-skeleton-block support-skeleton-input" />
        </div>
      </div>

      <div className="form-row full">
        <div className="form-group">
          <div className="support-skeleton-block support-skeleton-label" />
          <div className="support-skeleton-block support-skeleton-input" />
        </div>
      </div>

      <div className="form-row full">
        <div className="form-group">
          <div className="support-skeleton-block support-skeleton-label" />
          <div className="support-skeleton-block support-skeleton-textarea" />
        </div>
      </div>

      <div className="form-row full">
        <div className="form-group">
          <div className="support-skeleton-block support-skeleton-label" />
          <div className="support-skeleton-block support-skeleton-dropzone" />
        </div>
      </div>

      <div className="form-row full">
        <div className="form-group">
          <div className="support-skeleton-block support-skeleton-label" />
          <div className="support-skeleton-block support-skeleton-context" />
        </div>
      </div>

      <div className="form-footer">
        <div className="support-skeleton-block support-skeleton-footer-note" />
        <div className="form-footer-actions">
          <div className="support-skeleton-block support-skeleton-btn" />
          <div className="support-skeleton-block support-skeleton-btn support-skeleton-btn--primary" />
        </div>
      </div>
    </div>
  );
}

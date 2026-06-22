import React from 'react';
import '../../styles/erp-orders.css';
import type { ViewMode } from './types';

type Props = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

/** Views 2–3 (Create Load + Itinerary) deferred to a follow-up ticket. */
export const ErpOrdersDeferredViews: React.FC<Props> = ({ setViewMode }) => (
  <div className="erp-wrap" style={{ padding: 48, textAlign: 'center' }}>
    <h2 style={{ marginBottom: 12 }}>Create Load &amp; Itinerary</h2>
    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
      This workflow is planned for a future release. View 1 (Orders master) is available now.
    </p>
    <button type="button" className="btn btn-p" onClick={() => setViewMode('orders')}>
      ← Back to ERP Orders
    </button>
  </div>
);

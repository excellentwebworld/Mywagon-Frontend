import React from 'react';
import type { Shipment } from '../../context/AppContext';
import { statusBadgeClass, TIMELINE_STEPS, timelineCurrentIndex } from '../../pages/ManageShipments/utils/listingUtils';

interface RowExpansionStatusProps {
  shipment: Shipment;
  onView: () => void;
  t: (key: string) => string;
}

export const RowExpansionStatus: React.FC<RowExpansionStatusProps> = ({ shipment, onView, t }) => {
  const cur = timelineCurrentIndex(shipment.status);

  return (
    <div className="exp-inner exp-status-only">
      <div>
        <div className="exp-section">
          <h4>
            {t('progress')} —{' '}
            <span className={`badge ${statusBadgeClass(shipment.status, shipment.at_risk)}`}>
              <span className="bdot" />
              {t(shipment.status)}
            </span>
          </h4>
          <div className="tl-big">
            <div className="tl">
              {TIMELINE_STEPS.map((lbl, idx) => (
                <React.Fragment key={lbl}>
                  <div className="tl-step">
                    <div className={`tl-dot ${idx < cur ? 'done' : idx === cur ? 'cur' : ''}`} />
                    <div className="tl-label">{lbl}</div>
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div className={`tl-line ${idx < cur ? 'done' : ''}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="status-detail">
          <div className="sd-item">
            <div className="sd-label">{t('pickup')}</div>
            <div className="sd-val">{shipment.origin}</div>
          </div>
          <div className="sd-item">
            <div className="sd-label">{t('delivery')}</div>
            <div className="sd-val">{shipment.dest}</div>
          </div>
          <div className="sd-item">
            <div className="sd-label">{t('stops')}</div>
            <div className="sd-val">{shipment.stops?.length || 2}</div>
          </div>
          <div className="sd-item">
            <div className="sd-label">{t('weight')}</div>
            <div className="sd-val">24T</div>
          </div>
        </div>

        {shipment.at_risk && (
          <span className="badge badge-danger" style={{ marginBottom: 12 }}>
            <span className="bdot" />
            {t('atRiskLate')}
          </span>
        )}

        {shipment.carrier ? (
          <div className="carrier-card">
            <div className="cc-av">{shipment.carrier_init || shipment.carrier.substring(0, 2).toUpperCase()}</div>
            <div className="cc-info">
              <div className="cc-name">{shipment.carrier}</div>
              <div className="cc-meta">★ 4.8 · Verified Carrier</div>
            </div>
            <div className="cc-price">
              <span className="price">€{shipment.price}</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              border: '1px dashed var(--border)',
              borderRadius: 8,
              padding: 16,
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 12,
            }}
          >
            {t('noCarrierAssigned')}
          </div>
        )}

        <div className="exp-section" style={{ marginTop: 16 }}>
          <h4>{t('orders')}</h4>
          {shipment.customer.map((c, idx) => (
            <div key={idx} className="exp-cust-group">
              <div className="exp-cust-head">
                <span>🏪</span>
                <span className="cust-name">{c.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="exp-section">
          <h4>{t('quickActions')}</h4>
          <div className="qa-row">
            <button type="button" className="f-pill" onClick={onView}>
              {t('viewDetails')}
            </button>
            <button type="button" className="f-pill">
              {t('message')}
            </button>
            <button type="button" className="f-pill">
              {t('shareTracking')}
            </button>
            <button type="button" className="f-pill">
              {t('exportPdf')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

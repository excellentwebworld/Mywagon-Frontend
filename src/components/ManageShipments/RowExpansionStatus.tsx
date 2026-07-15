import React from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  buildStopTimelineSteps,
  formatEuro,
  formatStatValue,
  statusBadgeClass,
  stopTimelineCurrentIndex,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ItineraryPreview } from './ItineraryPreview';

interface RowExpansionStatusProps {
  shipment: Shipment;
  detailLoading?: boolean;
  onEdit: () => void;
  onViewNewTab: () => void;
  onCancel: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const RowExpansionStatus: React.FC<RowExpansionStatusProps> = ({
  shipment,
  detailLoading = false,
  onEdit,
  onViewNewTab,
  onCancel,
  t,
}) => {
  const steps = buildStopTimelineSteps(shipment, t);
  const cur = stopTimelineCurrentIndex(shipment.status, steps.length);

  return (
    <div className="exp-inner exp-status-only">
      <div>
        <div className="exp-section">
          <h4>
            {t('progress')} —{' '}
            <span className={`badge ${statusBadgeClass(shipment.status)}`}>
              <span className="bdot" />
              {t(shipment.status)}
            </span>
          </h4>
          {detailLoading ? (
            <div className="sub">{t('loading')}</div>
          ) : (
            <div className="tl-big">
              <div className="tl">
                {steps.map((lbl, idx) => (
                  <React.Fragment key={`${lbl}-${idx}`}>
                    <div className="tl-step">
                      <div className={`tl-dot ${idx < cur ? 'done' : idx === cur ? 'cur' : ''}`} />
                      <div className="tl-label">{lbl}</div>
                    </div>
                    {idx < steps.length - 1 && <div className={`tl-line ${idx < cur ? 'done' : ''}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="status-detail exp-stats-grid">
          <div className="sd-item">
            <div className="sd-label">{t('weight')}</div>
            <div className="sd-val">{formatStatValue(shipment.totalWeight, shipment.weightUnit)}</div>
          </div>
          <div className="sd-item">
            <div className="sd-label">{t('tripLength')}</div>
            <div className="sd-val">
              {formatStatValue(shipment.journeyDistanceKm, shipment.journeyDistanceKm != null ? 'km' : null)}
            </div>
          </div>
          <div className="sd-item">
            <div className="sd-label">{t('truckTypes')}</div>
            <div className="sd-val">{shipment.truckTypes?.length ? shipment.truckTypes.join(', ') : '—'}</div>
          </div>
          <div className="sd-item">
            <div className="sd-label">{t('quantity')}</div>
            <div className="sd-val">{formatStatValue(shipment.totalQty, shipment.qtyUnit)}</div>
          </div>
          <div className="sd-item">
            <div className="sd-label">{t('cargoValue')}</div>
            <div className="sd-val">{formatEuro(shipment.cargoValue) ?? '—'}</div>
          </div>
        </div>

        <div className="exp-section" style={{ marginTop: 8 }}>
          <h4>{t('assignedTransporter')}</h4>
          {shipment.carrier ? (
            <div className="carrier-card">
              <div className="cc-av">{shipment.carrier_init || shipment.carrier.substring(0, 2).toUpperCase()}</div>
              <div className="cc-info">
                <div className="cc-name">{shipment.carrier}</div>
              </div>
              <div className="cc-price">
                <span className="price">{formatEuro(shipment.agreedPrice ?? shipment.quotedPrice) ?? '—'}</span>
              </div>
            </div>
          ) : (
            <div className="sub">—</div>
          )}
        </div>

        <div className="exp-section" style={{ marginTop: 16 }}>
          <h4>{t('orders')}</h4>
          {shipment.customer.length ? (
            shipment.customer.map((c, idx) => (
              <div key={idx} className="exp-cust-group">
                <div className="exp-cust-head">
                  <span>🏪</span>
                  <span className="cust-name">{c.name}</span>
                </div>
                {(c.orders as string[])?.length > 0 && (
                  <div className="exp-cust-body open">
                    {(c.orders as string[]).map((o) => (
                      <div key={o} className="ord">
                        <span className="ord-id">{o}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="sub">{t('noOrdersMapped')}</div>
          )}
        </div>

        <ItineraryPreview
          stops={shipment.stops}
          origin={shipment.origin}
          dest={shipment.dest}
          pickDt={shipment.pickDt}
          delDt={shipment.delDt}
          t={t}
        />
      </div>

      <div>
        <div className="exp-section">
          <h4>{t('quickActions')}</h4>
          <div className="qa-row">
            <button type="button" className="f-pill" onClick={onEdit}>
              {t('rowActionEdit')}
            </button>
            <button type="button" className="f-pill" onClick={onViewNewTab}>
              {t('rowActionView')}
            </button>
            <button type="button" className="f-pill" onClick={onCancel}>
              {t('rowActionDelete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

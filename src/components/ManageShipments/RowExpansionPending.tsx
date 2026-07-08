import React, { useState } from 'react';
import type { Shipment } from '../../context/AppContext';
import { TIMELINE_STEPS, timelineCurrentIndex } from '../../pages/ManageShipments/utils/listingUtils';

interface RowExpansionPendingProps {
  shipment: Shipment;
  onAward: (carrier: string, price: number) => void;
  onInvite: () => void;
  onView: () => void;
  t: (key: string) => string;
}

export const RowExpansionPending: React.FC<RowExpansionPendingProps> = ({
  shipment,
  onAward,
  onInvite,
  onView,
  t,
}) => {
  const [counterValue, setCounterValue] = useState('');
  const cur = timelineCurrentIndex(shipment.status);

  return (
    <div className="exp-inner">
      <div>
        <div className="exp-section">
          <h4>{t('progress')}</h4>
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
        <div className="exp-section" style={{ marginTop: 16 }}>
          <h4>{t('orders')}</h4>
          {shipment.customer.length ? (
            shipment.customer.map((c, idx) => (
              <div key={idx} className="exp-cust-group">
                <div className="exp-cust-head">
                  <span>🏪</span>
                  <span className="cust-name">{c.name}</span>
                </div>
                <div className="exp-cust-body open">
                  {(c.orders || []).map((o) => (
                    <div key={o} className="ord">
                      <span className="ord-id">{o}</span> · General Cargo
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="sub">{t('noOrdersMapped')}</div>
          )}
        </div>
      </div>

      <div>
        <div className="exp-section">
          <h4>
            {t('responses')} ({shipment.bids})
          </h4>
          {shipment.bids > 0 ? (
            <div className="bid-row">
              <div className="bid-top">
                <span className="bid-name">
                  KRP Transport S.A <span className="star">★4.8</span>
                </span>
                <span className="bid-price">€{shipment.best_bid || 820}</span>
              </div>
              <div className="bid-meta">18t · Full · ETA on time</div>
              {shipment.counter && (
                <span className="co-badge-tbl co-up">
                  ↩ {shipment.counter.pct} (€{shipment.counter.theirs})
                </span>
              )}
              <div className="bid-acts">
                <button
                  type="button"
                  className="bid-accept"
                  onClick={() => onAward('KRP Transport S.A', shipment.best_bid || 820)}
                >
                  {t('accept')}
                </button>
                <button type="button" className="bid-reject">
                  {t('reject')}
                </button>
                <button type="button" className="bid-counter">
                  {t('counter')}
                </button>
              </div>
              <div className={`counter-form ${counterValue ? 'open' : ''}`}>
                <input
                  type="number"
                  placeholder="€"
                  value={counterValue}
                  onChange={(e) => setCounterValue(e.target.value)}
                />
                <button type="button">{t('send')}</button>
              </div>
            </div>
          ) : (
            <div className="sub" style={{ padding: '8px 0' }}>
              {t('noBidsYet')}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="exp-section">
          <h4>{t('invitedCarriers')}</h4>
          <div className="inv-section open">
            <div className="inv-row">
              <span className="inv-name">KRP Transport S.A</span>
              <span className="inv-acts">
                <button type="button" className="inv-btn">
                  {t('remind')}
                </button>
              </span>
            </div>
          </div>
          <button type="button" className="f-pill" style={{ width: '100%', marginTop: 8 }} onClick={onInvite}>
            + {t('inviteMoreCarriers')}
          </button>
        </div>
        <div className="exp-section" style={{ marginTop: 16 }}>
          <h4>{t('quickActions')}</h4>
          <div className="qa-row">
            <button type="button" className="f-pill" onClick={onView}>
              {t('viewDetails')}
            </button>
            <button type="button" className="f-pill" onClick={onInvite}>
              {t('inviteCarriers')}
            </button>
            <button type="button" className="f-pill">
              {t('extendBidTime')}
            </button>
            <button type="button" className="f-pill">
              {t('cancelShipment')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

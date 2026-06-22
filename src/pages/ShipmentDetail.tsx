import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Shipment, ShipmentStop } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

export const ShipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { shipments, showToast } = useApp();
  const { t } = useTranslation();

  const [shipment, setShipment] = useState<Shipment | null>(null);

  // Modals state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Collapsed sections
  const [secCollapsed, setSecCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setSecCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (id) {
      const found = shipments.find((s) => s.id === id);
      if (found) {
        setShipment(found);
      }
    }
  }, [id, shipments]);

  if (!shipment) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Shipment Not Found</h2>
        <p style={{ margin: '12px 0', color: 'var(--text-tertiary)' }}>
          The shipment with ID <span className="mono">{id}</span> does not exist or has been deleted.
        </p>
        <Link to="/shipments" className="btn btn-primary btn-sm">
          Back to Shipments
        </Link>
      </div>
    );
  }

  // Fallback stops if none defined
  const stops: ShipmentStop[] = shipment.stops || [
    {
      id: 1,
      type: 'pickup',
      location: shipment.origin,
      address: `${shipment.origin} DC, Warehouse Area A`,
      date: '18/02/2026',
      timeStart: '08:00',
      timeEnd: '12:00',
      customers: [
        {
          name: shipment.customer[0]?.name || 'Alpha Foods Ltd',
          orders: [
            {
              id: shipment.customer[0]?.orders[0] || 'ORD-1091',
              products: 'General Cargo',
              qty: 16,
              qtyUnit: 'Eur',
              weight: 13,
              weightUnit: 'T',
            },
          ],
        },
      ],
    },
    {
      id: 2,
      type: 'delivery',
      location: shipment.dest,
      address: `${shipment.dest} Retail Store, Main entrance`,
      date: '20/02/2026',
      timeStart: '14:00',
      timeEnd: '18:00',
      customers: [
        {
          name: shipment.customer[0]?.name || 'Alpha Foods Ltd',
          orders: [
            {
              id: shipment.customer[0]?.orders[0] || 'ORD-1091',
              products: 'General Cargo',
              qty: 16,
              qtyUnit: 'Eur',
              weight: 13,
              weightUnit: 'T',
            },
          ],
        },
      ],
    },
  ];

  const handleCopyId = () => {
    navigator.clipboard.writeText(shipment.id);
    showToast(t('copiedId', { id: shipment.id }), 'success');
  };

  const handleCopyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    showToast(t('copied'), 'success');
  };

  const milestoneLabels = ['Created', 'Booked', 'Dispatched', 'Arrived', 'Pickup Completed', 'In Transit', 'Delivered'];

  return (
    <div className="animate-fade-in" style={{ padding: '0px' }}>
      {/* Breadcrumb */}
      <div className="bc" style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
        <Link to="/shipments" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>
          {t('manageShipments')}
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span>{t('loadDetails')}</span>
      </div>

      {/* Command Header */}
      <div className="cmd" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="cmd-sid" style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              #{shipment.id}
              <span style={{ cursor: 'pointer', fontSize: '14px' }} onClick={handleCopyId} title="Copy ID">
                📋
              </span>
            </div>
            <div className="cmd-lane" style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0' }}>
              {shipment.origin} {shipment.via && `(via ${shipment.via})`} → {shipment.dest}
              <span className="bg bg-gr" style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-alt)' }}>
                {stops.length} stops
              </span>
            </div>
            <div className="cmd-badges" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
              <span className={`bg ${shipment.status === 'in_progress' ? 'bg-in' : shipment.status === 'delivered' ? 'bg-ok' : 'bg-gr'}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                {t(shipment.status)}
              </span>
              <span className="cust-pill">🏪 {shipment.customer[0]?.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="sd-btn primary btn btn-primary btn-sm" onClick={() => showToast('Edit details panel')}>
              ✏️ Edit Shipment
            </button>
            <button className="sd-btn btn btn-secondary btn-sm" onClick={() => showToast('Message sent to carrier')}>
              💬 Message
            </button>
            <button className="sd-btn icon btn btn-secondary btn-sm" onClick={() => setIsShareOpen(true)} title="Share Tracking">
              🔗
            </button>
            <button className="sd-btn icon btn btn-secondary btn-sm" onClick={() => showToast('PDF downloaded')} title="Download Invoice">
              📄
            </button>
            <button className="sd-btn icon btn btn-secondary btn-sm" onClick={() => setIsLogOpen(true)} title="Audit Log">
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Milestones bar */}
      <div className="ms-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '20px' }}>
        <div className="ms-row" style={{ display: 'flex', gap: '12px', flex: 1 }}>
          {milestoneLabels.map((lbl, idx) => {
            const isDone = idx < shipment.tl_cur;
            const isCur = idx === shipment.tl_cur;
            return (
              <div key={lbl} className="ms-step" style={{ textAlign: 'center', flex: 1 }}>
                <div
                  className="ms-dot"
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isDone ? 'var(--success)' : isCur ? 'var(--accent)' : 'var(--border)',
                    margin: '0 auto 4px',
                  }}
                ></div>
                <div className="ms-label" style={{ fontSize: '11px', color: isCur ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {lbl}
                </div>
              </div>
            );
          })}
        </div>
        <span className="bg bg-er" style={{ cursor: 'pointer', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--danger-bg)', color: 'var(--danger)' }} onClick={() => showToast('POD requested')}>
          📎 POD Missing
        </span>
      </div>

      {/* Two Column Layout */}
      <div className="sd-pg" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', alignItems: 'start' }}>
        {/* Left Column: Stops & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stops List */}
          <div className="sd-card">
            <div className="card-h" onClick={() => toggleSection('stops')}>
              <h3>📍 {t('stopsAppointments')} <span className="cnt">{stops.length}</span></h3>
              <span className={`chev ${!secCollapsed.stops ? 'open' : ''}`}>▼</span>
            </div>
            {!secCollapsed.stops && (
              <div className="card-body" style={{ padding: '12px' }}>
                {stops.map((stop) => {
                  const isPickup = stop.type === 'pickup';
                  return (
                    <div key={stop.id} className="stop" style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="stop-top" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <span className={`stop-type ${isPickup ? 'pk' : 'dl'}`} style={{ fontWeight: 700, marginRight: '8px' }}>
                            {isPickup ? 'PICKUP' : 'DELIVERY'}
                          </span>
                          <span className="stop-time" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {stop.date} · {stop.timeStart}–{stop.timeEnd}
                          </span>
                          <div className="stop-name" style={{ fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
                            {stop.location}
                          </div>
                          <div className="stop-addr" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {stop.address}
                          </div>
                        </div>
                        <div style={{ color: 'var(--success)', fontWeight: 700 }}>✓</div>
                      </div>
                      <div className="stop-acts" style={{ display: 'flex', gap: '8px' }}>
                        <button className="sd-btn sm btn btn-secondary btn-xs" onClick={() => handleCopyText(stop.address)}>
                          📋 Copy Address
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Load Summary */}
          <div className="sd-card">
            <div className="card-h" onClick={() => toggleSection('load')}>
              <h3>📦 {t('loadSummary')}</h3>
              <span className={`chev ${!secCollapsed.load ? 'open' : ''}`}>▼</span>
            </div>
            {!secCollapsed.load && (
              <div className="card-body" style={{ padding: '12px' }}>
                <div className="ls-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="ls-cell">
                    <label>{t('vehicleType')}</label>
                    <div className="val">Semi-Trailer Truck</div>
                  </div>
                  <div className="ls-cell">
                    <label>Cargo Specs</label>
                    <div className="val">Curtainside</div>
                  </div>
                  <div className="ls-cell">
                    <label>Agreed Cost</label>
                    <div className="val price" style={{ fontWeight: 700 }}>
                      €{shipment.price || shipment.best_bid || '—'}
                    </div>
                  </div>
                  <div className="ls-cell">
                    <label>Shipment Type</label>
                    <div className="val">
                      <span className="badge badge-accent">{t(shipment.vis)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tracking Map, Carrier details, Incidents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Map embed */}
          <div className="sd-card">
            <div className="card-h" onClick={() => toggleSection('tracking')}>
              <h3>🛰 {t('liveTracking')}</h3>
              <span className={`chev ${!secCollapsed.tracking ? 'open' : ''}`}>▼</span>
            </div>
            {!secCollapsed.tracking && (
              <div className="card-body" style={{ padding: '12px' }}>
                <div className="tk-stat" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label>Status</label>
                    <div style={{ color: 'var(--success)', fontWeight: 600 }}>Moving</div>
                  </div>
                  <div>
                    <label>Km Remaining</label>
                    <div>87 km</div>
                  </div>
                </div>
                {/* Embedded map preview */}
                <iframe
                  title="Live map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=23.70%2C37.95%2C23.80%2C38.05&layer=mapnik"
                  style={{ width: '100%', height: '150px', borderRadius: '6px', border: 0 }}
                ></iframe>
              </div>
            )}
          </div>

          {/* Carrier & Driver Info */}
          <div className="sd-card">
            <div className="card-h" onClick={() => toggleSection('carrier')}>
              <h3>🚛 {t('carrierDriver')}</h3>
              <span className={`chev ${!secCollapsed.carrier ? 'open' : ''}`}>▼</span>
            </div>
            {!secCollapsed.carrier && (
              <div className="card-body" style={{ padding: '12px' }}>
                {shipment.carrier ? (
                  <div>
                    <div className="cr-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div className="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {shipment.carrier_init || shipment.carrier.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{shipment.carrier}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>★ 4.8 · Verified Carrier</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-xs" onClick={() => showToast('Calling carrier')}>
                        📞 Call
                      </button>
                      <button className="btn btn-secondary btn-xs" onClick={() => showToast('Messaging carrier')}>
                        💬 Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No carrier assigned yet</div>
                )}
              </div>
            )}
          </div>

          {/* Incidents logs */}
          <div className="sd-card">
            <div className="card-h" onClick={() => toggleSection('incidents')}>
              <h3>⚠️ {t('incidentsExceptions')}</h3>
              <span className={`chev ${!secCollapsed.incidents ? 'open' : ''}`}>▼</span>
            </div>
            {!secCollapsed.incidents && (
              <div className="card-body" style={{ padding: '12px' }}>
                <div className="inc-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', marginTop: '4px' }}></div>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 600 }}>On Schedule</div>
                    <div style={{ color: 'var(--text-tertiary)' }}>No incidents logged for this shipment</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SHARE TRACKING MODAL */}
      {isShareOpen && (
        <div className="modal-backdrop open">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>🔗 Share Tracking Links</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsShareOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Generate external tracking links for your customers.
              </p>
              <div className="mf">
                <label>Recipient Email</label>
                <input type="email" placeholder="customer@company.com" defaultValue="contact@alphafoods.com" />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsShareOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  showToast('Tracking link shared!', 'success');
                  setIsShareOpen(false);
                }}
              >
                Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {isLogOpen && (
        <div className="modal-backdrop open">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>📋 Audit Log / Activity Trail</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsLogOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', maxHeight: '350px', overflowY: 'auto' }}>
              <div className="sync-list">
                <div className="sync-entry" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px' }}>
                    <span>Shipment Created</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>19/02 10:53</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Created by Stamatia Malli (Acme Logistics)
                  </div>
                </div>
                <div className="sync-entry" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px' }}>
                    <span>Bids Broadcasted</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>19/02 11:00</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Invitations auto-sent to private carrier pool
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-primary" onClick={() => setIsLogOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

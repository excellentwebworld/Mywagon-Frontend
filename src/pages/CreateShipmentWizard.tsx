import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Shipment, ShipmentStop } from '../context/AppContext';

export const CreateShipmentWizard: React.FC = () => {
  const { locations, addShipment, shipments, lang, showToast } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1: Vehicle and Stops State
  const [selectedVehicle, setSelectedVehicle] = useState('semi');
  const [nestedSpecs, setNestedSpecs] = useState<string[]>(['curtainside']);
  const [stops, setStops] = useState<ShipmentStop[]>([
    {
      id: 1,
      type: 'pickup',
      location: 'LOC-001',
      address: '7ο χλμ Α.Ε. Ιωαννίνων-Αθηνών, 45500',
      date: '2026-06-18',
      timeStart: '08:00',
      timeEnd: '12:00',
      customers: [
        {
          name: 'Alpha Foods Ltd',
          orders: [
            {
              id: 'ORD-5001',
              products: 'Dry Goods',
              qty: 16,
              qtyUnit: 'EUR',
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
      location: 'LOC-003',
      address: 'Λεωφ. Ηρακλείου 340, 14122',
      date: '2026-06-19',
      timeStart: '14:00',
      timeEnd: '18:00',
      customers: [
        {
          name: 'Alpha Foods Ltd',
          orders: [
            {
              id: 'ORD-5001',
              products: 'Dry Goods',
              qty: 16,
              qtyUnit: 'EUR',
              weight: 13,
              weightUnit: 'T',
            },
          ],
        },
      ],
    },
  ]);

  // Step 3: Pricing and Broadcast State
  const [priceType, setPriceType] = useState<'spot' | 'contract' | 'bidding'>('spot');
  const [targetPrice, setTargetPrice] = useState('650');
  const [broadcastType, setBroadcastType] = useState<'private' | 'public' | 'fleet'>('public');
  const [driverNotes, setDriverNotes] = useState('');

  // Add stop modal/helper
  const handleAddStop = () => {
    const nextId = stops.length + 1;
    const newStop: ShipmentStop = {
      id: nextId,
      type: 'delivery',
      location: locations[0]?.id || '',
      address: locations[0]?.address || '',
      date: new Date().toISOString().split('T')[0],
      timeStart: '09:00',
      timeEnd: '13:00',
      customers: [
        {
          name: 'Acme customer',
          orders: [
            {
              id: `ORD-${1000 + nextId}`,
              products: 'General Cargo',
              qty: 10,
              qtyUnit: 'EUR',
              weight: 5,
              weightUnit: 'T',
            },
          ],
        },
      ],
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (id: number) => {
    if (stops.length <= 2) {
      showToast('A shipment must have at least 2 stops', 'warning');
      return;
    }
    setStops(stops.filter((s) => s.id !== id).map((s, idx) => ({ ...s, id: idx + 1 })));
  };

  const handleUpdateStopLocation = (stopId: number, locId: string) => {
    const loc = locations.find((l) => l.id === locId);
    if (!loc) return;
    setStops(
      stops.map((s) =>
        s.id === stopId ? { ...s, location: locId, address: loc.address } : s
      )
    );
  };

  const handleUpdateStopField = (stopId: number, field: keyof ShipmentStop, val: any) => {
    setStops(stops.map((s) => (s.id === stopId ? { ...s, [field]: val } : s)));
  };

  const handleToggleSpec = (spec: string) => {
    setNestedSpecs((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleConfirmWizard = () => {
    // Generate new shipment payload
    const originLoc = locations.find((l) => l.id === stops[0].location);
    const destLoc = locations.find((l) => l.id === stops[stops.length - 1].location);

    const nextId = `SHP-${5000 + shipments.length + 1}`;
    const payload: Shipment = {
      id: nextId,
      date: new Date(stops[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: 'pending',
      vis: broadcastType,
      origin: originLoc ? originLoc.city : 'Unknown',
      dest: destLoc ? destLoc.city : 'Unknown',
      via: stops.length > 2 ? stops.slice(1, -1).map((s) => locations.find((l) => l.id === s.location)?.city).join(', ') : null,
      customer: stops.map((s) => ({
        name: s.customers[0]?.name || 'Alpha Foods',
        orders: s.customers[0]?.orders.map((o) => o.id) || [],
      })),
      bids: 0,
      best_bid: null,
      bid_exp: broadcastType === 'public' ? '12h' : null,
      carrier: null,
      price: priceType === 'bidding' ? null : Number(targetPrice),
      price_type: priceType,
      updated: 'Just now',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 1, // Posted state
      stops: stops,
      driverNotes: driverNotes,
    };

    addShipment(payload);
    navigate('/shipments');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0px' }}>
      {/* Header */}
      <div className="ph" style={{ marginBottom: '16px' }}>
        <h1 className="ph-t" style={{ fontSize: '24px', fontWeight: 700 }}>
          {lang === 'el' ? 'Δημιουργία Φορτίου' : 'Create Load'}
        </h1>
        <p className="ph-s" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          {lang === 'el' ? 'Προσθέστε στάσεις και στοιχεία φορτίου' : 'Add stops and cargo details'}
        </p>
      </div>

      {/* Stepper progress */}
      <nav className="stepper" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
        {[
          { num: 1, label: lang === 'el' ? 'Στοιχεία Φορτίου' : 'Load Details' },
          { num: 2, label: lang === 'el' ? 'Δρομολόγιο' : 'Itinerary' },
          { num: 3, label: lang === 'el' ? 'Τιμή & Παρακολούθηση' : 'Pricing & Tracking' },
        ].map((s) => (
          <React.Fragment key={s.num}>
            <div className={`step ${step === s.num ? 'act' : ''} ${step > s.num ? 'done' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                className="sn"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: step >= s.num ? 'var(--accent)' : 'var(--border)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.label}</span>
            </div>
            {s.num < 3 && <div className="sl" style={{ flex: 1, height: '2px', background: step > s.num ? 'var(--accent)' : 'var(--border)' }}></div>}
          </React.Fragment>
        ))}
      </nav>

      {/* Main stepper body */}
      <div className="content">
        {step === 1 && (
          <div>
            {/* Vehicle Type Selector */}
            <article className="card" style={{ marginBottom: '20px', padding: '16px' }}>
              <div className="ch" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontWeight: 700 }}>
                <span>🚛</span>
                <span>Vehicle Type</span>
              </div>
              <div className="cb">
                <div className="vg" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { id: 'semi', label: 'Semi-Trailer', desc: 'Tilt trailer', specs: ['curtainside', 'box', 'platform'] },
                    { id: 'curtain', label: 'Truck with Trailer', desc: 'Curtainsider', specs: ['standard', 'mega'] },
                    { id: 'rigid', label: 'Rigid Truck (7-12t)', desc: 'Rigid body', specs: ['box', 'flatbed'] },
                    { id: 'van', label: 'Van', desc: 'LCV delivery', specs: ['small', 'large'] },
                  ].map((v) => {
                    const isSelected = selectedVehicle === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVehicle(v.id)}
                        className={`vc-wrap ${isSelected ? 'sel' : ''}`}
                        style={{
                          border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-light)' : 'none',
                        }}
                      >
                        <div className="vn" style={{ fontWeight: 600 }}>{v.label}</div>
                        <div className="vs" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{v.desc}</div>

                        {isSelected && (
                          <div style={{ marginTop: '10px', fontSize: '11px' }}>
                            {v.specs.map((spec) => (
                              <label key={spec} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={nestedSpecs.includes(spec)}
                                  onChange={() => handleToggleSpec(spec)}
                                />
                                <span>{spec}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>

            {/* Stops Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stops.map((stop) => {
                const isPickup = stop.type === 'pickup';
                return (
                  <div key={stop.id} className="card stop" style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className={`stop-type ${isPickup ? 'pk' : 'dl'}`} style={{ fontWeight: 700, fontSize: '14px' }}>
                        Stop #{stop.id} — {isPickup ? 'Pickup' : 'Delivery'}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveStop(stop.id)} style={{ color: 'var(--danger)' }}>
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div className="mf">
                        <label>Location</label>
                        <select
                          value={stop.location}
                          onChange={(e) => handleUpdateStopLocation(stop.id, e.target.value)}
                        >
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.city})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mf">
                        <label>Date</label>
                        <input
                          type="date"
                          value={stop.date}
                          onChange={(e) => handleUpdateStopField(stop.id, 'date', e.target.value)}
                        />
                      </div>
                      <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <div className="mf">
                          <label>From</label>
                          <input
                            type="text"
                            value={stop.timeStart}
                            onChange={(e) => handleUpdateStopField(stop.id, 'timeStart', e.target.value)}
                          />
                        </div>
                        <div className="mf">
                          <label>To</label>
                          <input
                            type="text"
                            value={stop.timeEnd}
                            onChange={(e) => handleUpdateStopField(stop.id, 'timeEnd', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button className="btn btn-secondary" onClick={handleAddStop} style={{ width: '200px' }}>
                + Add Stop
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Itinerary & Map Route Verification */}
        {step === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px' }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Route Itinerary Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stops.map((s, idx) => {
                    const loc = locations.find((l) => l.id === s.location);
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{loc ? loc.name : 'Unknown Location'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.address}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Scheduled: {s.date} @ {s.timeStart} – {s.timeEnd}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Satellite Map</h3>
                <iframe
                  title="Route Map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=20.5%2C38.0%2C24.0%2C40.0&layer=mapnik"
                  style={{ width: '100%', height: '300px', borderRadius: '8px', border: 0 }}
                ></iframe>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pricing and Dispatch */}
        {step === 3 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
              {/* Left Form Column */}
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Pricing & Broadcast Configuration</h3>

                <div className="mf" style={{ marginBottom: '16px' }}>
                  <label>Pricing Model</label>
                  <div style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
                    <button
                      className={`btn ${priceType === 'spot' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPriceType('spot')}
                    >
                      Spot Rate
                    </button>
                    <button
                      className={`btn ${priceType === 'contract' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPriceType('contract')}
                    >
                      Contract Rate
                    </button>
                    <button
                      className={`btn ${priceType === 'bidding' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPriceType('bidding')}
                    >
                      Bidding Broadcast
                    </button>
                  </div>
                </div>

                {priceType !== 'bidding' && (
                  <div className="mf" style={{ marginBottom: '16px' }}>
                    <label>Target Price (€)</label>
                    <input
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                    />
                  </div>
                )}

                <div className="mf" style={{ marginBottom: '16px' }}>
                  <label>Broadcast Scope</label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                    style={{ marginTop: '6px' }}
                  >
                    <option value="public">Public Marketplace (Open Market)</option>
                    <option value="private">Private Network (Invited Partners Only)</option>
                    <option value="fleet">Own Fleet (Internal Logistics)</option>
                  </select>
                </div>

                <div className="mf" style={{ marginBottom: '16px' }}>
                  <label>Driver notes & special instructions</label>
                  <textarea
                    rows={4}
                    placeholder="Enter gate codes, loading directions, seal requirements…"
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>
              </div>

              {/* Summary Right Sidebar */}
              <div className="card" style={{ padding: '16px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>Trip Summary</h4>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong>Origin:</strong> {locations.find((l) => l.id === stops[0].location)?.city}</div>
                  <div><strong>Destination:</strong> {locations.find((l) => l.id === stops[stops.length - 1].location)?.city}</div>
                  <div><strong>Stops Count:</strong> {stops.length}</div>
                  <div><strong>Vehicle Required:</strong> {selectedVehicle.toUpperCase()} ({nestedSpecs.join(', ')})</div>
                  <div><strong>Scope:</strong> {broadcastType.toUpperCase()}</div>
                  {priceType !== 'bidding' && (
                    <div style={{ fontSize: '16px', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                      Agreed Price: €{targetPrice}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <footer className="bbar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <button className="btn btn-secondary" onClick={() => showToast('Draft saved successfully!')}>
          Save Draft
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (step === 1) navigate('/shipments');
            else setStep((s) => s - 1);
          }}
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (step === 3) handleConfirmWizard();
            else setStep((s) => s + 1);
          }}
        >
          {step === 3 ? 'Publish Shipment' : 'Continue →'}
        </button>
      </footer>
    </div>
  );
};

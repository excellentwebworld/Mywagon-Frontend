import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import type { ShipmentStop } from '../../../context/AppContext';

interface Step3PricingProps {
  stops: ShipmentStop[];
  broadcastType: 'private' | 'public' | 'fleet';
  setBroadcastType: (v: 'private' | 'public' | 'fleet') => void;
  selectedCarriers: string[];
  setSelectedCarriers: React.Dispatch<React.SetStateAction<string[]>>;
  targetPrice: string;
  setTargetPrice: (v: string) => void;
  negotiable: boolean;
  setNegotiable: (v: boolean) => void;
  driverNotes: string;
  setDriverNotes: (v: string) => void;
  bulkMode: 'single' | 'qty' | 'dates' | 'rec';
  setBulkMode: (v: 'single' | 'qty' | 'dates' | 'rec') => void;
  bulkQty: number;
  setBulkQty: (v: number) => void;
  bulkDates: { date: string; qty: number }[];
  setBulkDates: React.Dispatch<React.SetStateAction<{ date: string; qty: number }[]>>;
  bulkRecInterval: number;
  setBulkRecInterval: (v: number) => void;
  bulkRecType: 'daily' | 'weekly' | 'monthly';
  setBulkRecType: (v: 'daily' | 'weekly' | 'monthly') => void;
  bulkRecOccurrences: number;
  setBulkRecOccurrences: (v: number) => void;
  trackingEmails: Record<string, string[]>;
  setTrackingEmails: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  totalBulkLoads: number;
}

export const Step3Pricing: React.FC<Step3PricingProps> = ({
  stops,
  broadcastType,
  setBroadcastType,
  selectedCarriers,
  setSelectedCarriers,
  targetPrice,
  setTargetPrice,
  negotiable,
  setNegotiable,
  driverNotes,
  setDriverNotes,
  bulkMode,
  setBulkMode,
  bulkQty,
  setBulkQty,
  bulkDates,
  setBulkDates,
  bulkRecInterval,
  setBulkRecInterval,
  bulkRecType,
  setBulkRecType,
  bulkRecOccurrences,
  setBulkRecOccurrences,
  trackingEmails,
  setTrackingEmails,
  totalBulkLoads,
}) => {
  const { lang, locations } = useApp();
  const [carrierSearch, setCarrierSearch] = useState('');
  const [mapTab, setMapTab] = useState<'map' | 'sat'>('map');
  const [openTrackingGroup, setOpenTrackingGroup] = useState<string | null>(null);

  // Original carriers dictionary
  const carriersData = {
    krp: {
      name: 'KRP Transport S.A',
      init: 'KR',
      city: 'Athens',
      rating: 4.8,
      type: 'Carrier Company',
      caps: ['Tilt trailer', 'Curtainsider', 'Refrigerated'],
      contract: { lane: 'Ioannina→Athens', unit: 'PER_LOAD', price: 790 },
    },
    elmet: {
      name: 'Hellenic Transport',
      init: 'EM',
      city: 'Thessaloniki',
      rating: 4.2,
      type: 'Carrier Company',
      caps: ['Box', 'Curtainsider'],
      contract: null,
    },
    transmed: {
      name: 'Transmed Logistics',
      init: 'TL',
      city: 'Patras',
      rating: 4.5,
      type: 'Carrier Company',
      caps: ['Reefer', 'Curtainsider'],
      contract: { lane: 'Ioannina→Athens', unit: 'PER_PALLET', price: 22 },
    },
    gpant: {
      name: 'Giorgos Pantazis',
      init: 'GP',
      city: 'Ioannina',
      rating: 4.1,
      type: 'Freelancer Driver',
      caps: ['Tilt trailer'],
      contract: null,
    },
    dntinos: {
      name: 'Dimitris Ntinos',
      init: 'DN',
      city: 'Athens',
      rating: 5.0,
      type: 'Freelancer Driver',
      caps: ['Curtainsider'],
      contract: null,
    },
  };

  const getStopCity = (stop: ShipmentStop) => {
    const loc = locations.find((l) => l.id === stop.location);
    return loc ? loc.city : 'Unknown';
  };

  // Determine pricing source and autofill rate
  const distanceKm = 463;
  const totalPallets = stops.reduce((sum, stop) => {
    return (
      sum +
      stop.customers.reduce((cSum, cust) => {
        return (
          cSum +
          cust.orders.reduce((oSum, ord) => {
            return oSum + (ord.qtyUnit === 'Pallets' ? ord.qty : 0);
          }, 0)
        );
      }, 0)
    );
  }, 0) || 32; // Fallback to original 32 if empty

  // Find first selected carrier with contract
  let contractCarrierName = '';
  let contractDetails = '';
  let computedContractPrice = 750; // Spot rate fallback

  const activeContractCarrier = selectedCarriers.find(
    (cid) => carriersData[cid as keyof typeof carriersData]?.contract !== null
  );

  if (activeContractCarrier) {
    const data = carriersData[activeContractCarrier as keyof typeof carriersData];
    contractCarrierName = data.name;
    const contract = data.contract!;
    if (contract.unit === 'PER_PALLET') {
      computedContractPrice = contract.price * totalPallets;
      contractDetails = `€${contract.price} × ${totalPallets} pallets = €${computedContractPrice}`;
    } else {
      computedContractPrice = contract.price;
      contractDetails = `€${computedContractPrice} per load`;
    }
  }

  // Auto-update price when selected carrier changes, unless already overridden
  useEffect(() => {
    if (activeContractCarrier) {
      setTargetPrice(String(computedContractPrice));
    } else {
      setTargetPrice('750'); // Spot rate
    }
  }, [activeContractCarrier, computedContractPrice]);

  const isOverride = Number(targetPrice) !== computedContractPrice;

  // Toggle carrier list helper
  const handleToggleCarrier = (cid: string) => {
    setSelectedCarriers((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  // Bulk Loads Actions
  const handleAddBulkDate = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + bulkDates.length + 1);
    const dateStr = nextDate.toISOString().split('T')[0];
    setBulkDates([...bulkDates, { date: dateStr, qty: 2 }]);
  };

  const handleUpdateBulkDate = (idx: number, field: 'date' | 'qty', val: any) => {
    const updated = [...bulkDates];
    updated[idx] = { ...updated[idx], [field]: val };
    setBulkDates(updated);
  };

  // Get orders list
  const allOrdersList = stops.flatMap((s, sIdx) => {
    return s.customers.flatMap((c) => {
      return c.orders.map((o) => ({
        ...o,
        customerName: c.name,
        stopIndex: sIdx + 1,
        stopType: s.type,
      }));
    });
  });

  const getStopLocationName = (stop: ShipmentStop) => {
    const loc = locations.find((l) => l.id === stop.location);
    return loc ? loc.name : 'Unknown Location';
  };

  const getStopDetailsString = (stop: ShipmentStop) => {
    if (stop.customers.length === 0) return lang === 'el' ? 'Καμία παραλαβή' : '0 cargo orders';
    return stop.customers.map((c) => c.name || (lang === 'el' ? 'προαιρετικό' : 'optional')).join(', ');
  };

  const handleAddEmail = (orderId: string) => {
    const prevEmails = trackingEmails[orderId] || [];
    setTrackingEmails({
      ...trackingEmails,
      [orderId]: [...prevEmails, ''],
    });
  };

  const handleEmailChange = (orderId: string, emailIdx: number, val: string) => {
    const prevEmails = [...(trackingEmails[orderId] || [])];
    prevEmails[emailIdx] = val;
    setTrackingEmails({
      ...trackingEmails,
      [orderId]: prevEmails,
    });
  };

  const handleRemoveEmail = (orderId: string, emailIdx: number) => {
    const prevEmails = trackingEmails[orderId] || [];
    setTrackingEmails({
      ...trackingEmails,
      [orderId]: prevEmails.filter((_, idx) => idx !== emailIdx),
    });
  };

  return (
    <div className="animate-fade-in wizard-grid">
      {/* LEFT COLUMN: Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Broadcast Type Card */}
        <article className="card" aria-label="Broadcast type selection">
          <div className="ch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>{lang === 'el' ? 'Τύπος αποστολής' : 'Broadcast Type'}</span>
          </div>
          <div className="bc-grid">
            <button
              className={`bcc ${broadcastType === 'private' ? 'sel' : ''}`}
              onClick={() => setBroadcastType('private')}
            >
              <div className="bcc-icon">👥</div>
              <div className="bcc-title">
                {lang === 'el' ? 'Ιδιωτικό Δίκτυο' : 'Private Network'}
              </div>
              <p className="bcc-desc">
                {lang === 'el' ? 'Αποστολή μόνο σε συνεργάτες' : 'Send only to partner carriers'}
              </p>
            </button>
            <button
              className={`bcc ${broadcastType === 'public' ? 'sel' : ''}`}
              onClick={() => setBroadcastType('public')}
            >
              <div className="bcc-icon">🌐</div>
              <div className="bcc-title">
                {lang === 'el' ? 'Δημόσια Αγορά' : 'Public Marketplace'}{' '}
                <span className="ptag ct">BETA</span>
              </div>
              <p className="bcc-desc">
                {lang === 'el' ? 'Δημοσίευση σε όλους' : 'Publish to all registered carriers'}
              </p>
            </button>
            <button className="bcc" disabled>
              <div className="bcc-icon">🚛</div>
              <div className="bcc-title">
                {lang === 'el' ? 'Ο Στόλος Μου' : 'My Fleet'}
              </div>
              <p className="bcc-desc">{lang === 'el' ? 'Σύντομα διαθέσιμο' : 'Coming soon'}</p>
            </button>
          </div>
        </article>

        {/* Carrier Selection Card */}
        {broadcastType === 'private' && (
          <article className="card" id="carrierPanel">
            <div className="ch">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{lang === 'el' ? 'Επιλογή μεταφορέων' : 'Select Carriers'}</span>
            </div>

            {/* Selected Carriers Summary list */}
            {selectedCarriers.length > 0 && (
              <div className="sel-carriers">
                {selectedCarriers.map((cid) => {
                  const c = carriersData[cid as keyof typeof carriersData];
                  if (!c) return null;
                  return (
                    <div key={cid} className="selc">
                      <div className="av">{c.init}</div>
                      <div className="ci">
                        <div className="cn">
                          {c.name} {c.contract && <span className="ptag ct">CONTRACT</span>}
                        </div>
                        <div className="cm">
                          {c.city} · {c.rating}★ · {c.type} · {c.caps.join(', ')}
                        </div>
                      </div>
                      <div className="rm" onClick={() => handleToggleCarrier(cid)}>
                        ✕
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="c-search-wrap">
              <input
                type="search"
                placeholder={lang === 'el' ? 'Αναζήτηση μεταφορέων…' : 'Search carriers…'}
                value={carrierSearch}
                onChange={(e) => setCarrierSearch(e.target.value)}
              />
            </div>

            <div className="carrier-list">
              {Object.entries(carriersData)
                .filter(([_, c]) => c.name.toLowerCase().includes(carrierSearch.toLowerCase()))
                .map(([cid, c]) => {
                  const isChecked = selectedCarriers.includes(cid);
                  return (
                    <div key={cid} className="crow" onClick={() => handleToggleCarrier(cid)}>
                      <div className={`cbx ${isChecked ? 'on' : ''}`}>{isChecked && '✓'}</div>
                      <div className="av">{c.init}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cn">
                          {c.name} {c.contract && <span className="ptag ct">CONTRACT</span>}
                        </div>
                        <div className="cm">
                          {c.city} · {c.rating}★ · {c.type} · {c.caps.join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </article>
        )}

        {/* Bulk Load Creation Card */}
        <article className="card">
          <div className="ch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>{lang === 'el' ? 'Μαζική δημιουργία' : 'Bulk Load Creation'}</span>
          </div>

          <div className="btabs" role="tablist">
            <button
              className={`btab ${bulkMode === 'single' ? 'act' : ''}`}
              onClick={() => setBulkMode('single')}
            >
              {lang === 'el' ? 'Μεμονωμένο' : 'Single Load'}
            </button>
            <button
              className={`btab ${bulkMode === 'qty' ? 'act' : ''}`}
              onClick={() => setBulkMode('qty')}
            >
              {lang === 'el' ? 'Πολλαπλά' : 'Multiple'}
            </button>
            <button
              className={`btab ${bulkMode === 'dates' ? 'act' : ''}`}
              onClick={() => setBulkMode('dates')}
            >
              {lang === 'el' ? 'Ημερομηνίες' : 'Dates'}
            </button>
            <button
              className={`btab ${bulkMode === 'rec' ? 'act' : ''}`}
              onClick={() => setBulkMode('rec')}
            >
              {lang === 'el' ? 'Επαναλαμβανόμενο' : 'Recurring'}
            </button>
          </div>

          {bulkMode === 'single' && (
            <div className="bpan show">
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', padding: '8px 0 4px' }}>
                {lang === 'el'
                  ? '1 φορτίο θα δημιουργηθεί. Επιλέξτε άλλη καρτέλα για μαζική δημιουργία.'
                  : '1 load will be created. Select another tab for bulk creation.'}
              </p>
            </div>
          )}

          {bulkMode === 'qty' && (
            <div className="bpan show">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {lang === 'el' ? 'Αριθμός φορτίων:' : 'Number of loads:'}
                </span>
                <div className="qs">
                  <button onClick={() => setBulkQty(Math.max(1, bulkQty - 1))}>−</button>
                  <input
                    type="number"
                    value={bulkQty}
                    onChange={(e) => setBulkQty(Math.max(1, Number(e.target.value)))}
                  />
                  <button onClick={() => setBulkQty(bulkQty + 1)}>+</button>
                </div>
              </div>
              <div className="bcount-txt">
                ✓ <strong>{bulkQty}</strong> {lang === 'el' ? 'φορτία θα δημιουργηθούν' : 'loads will be created'}
              </div>
            </div>
          )}

          {bulkMode === 'dates' && (
            <div className="bpan show">
              <div id="bdlist">
                {bulkDates.map((item, idx) => (
                  <div key={idx} className="bdr">
                    <input
                      type="date"
                      className="bdi"
                      value={item.date}
                      onChange={(e) => handleUpdateBulkDate(idx, 'date', e.target.value)}
                    />
                    <div className="qs">
                      <button onClick={() => handleUpdateBulkDate(idx, 'qty', Math.max(1, item.qty - 1))}>
                        −
                      </button>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleUpdateBulkDate(idx, 'qty', Math.max(1, Number(e.target.value)))}
                      />
                      <button onClick={() => handleUpdateBulkDate(idx, 'qty', item.qty + 1)}>+</button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {lang === 'el' ? 'φορτία' : 'loads'}
                    </span>
                  </div>
                ))}
              </div>
              <button className="add-date-btn" onClick={handleAddBulkDate}>
                + {lang === 'el' ? 'Προσθήκη ημερομηνίας' : 'Add date'}
              </button>
              <div className="bcount-txt" style={{ marginTop: '10px' }}>
                ✓ <strong>{totalBulkLoads}</strong> {lang === 'el' ? 'φορτία θα δημιουργηθούν' : 'loads will be created'}
              </div>
            </div>
          )}

          {bulkMode === 'rec' && (
            <div className="bpan show">
              <div className="rec-row">
                <span>{lang === 'el' ? 'Κάθε' : 'Every'}</span>
                <div className="qs">
                  <button onClick={() => setBulkRecInterval(Math.max(1, bulkRecInterval - 1))}>−</button>
                  <input
                    type="number"
                    value={bulkRecInterval}
                    onChange={(e) => setBulkRecInterval(Math.max(1, Number(e.target.value)))}
                  />
                  <button onClick={() => setBulkRecInterval(bulkRecInterval + 1)}>+</button>
                </div>
                <select
                  value={bulkRecType}
                  className="inp-sm"
                  onChange={(e) => setBulkRecType(e.target.value as any)}
                >
                  <option value="weekly">{lang === 'el' ? 'εβδομάδες' : 'weeks'}</option>
                  <option value="daily">{lang === 'el' ? 'μέρες' : 'days'}</option>
                  <option value="monthly">{lang === 'el' ? 'μήνες' : 'months'}</option>
                </select>
              </div>
              <div className="rec-row">
                <span>{lang === 'el' ? 'Για' : 'For'}</span>
                <div className="qs">
                  <button onClick={() => setBulkRecOccurrences(Math.max(1, bulkRecOccurrences - 1))}>
                    −
                  </button>
                  <input
                    type="number"
                    value={bulkRecOccurrences}
                    onChange={(e) => setBulkRecOccurrences(Math.max(1, Number(e.target.value)))}
                  />
                  <button onClick={() => setBulkRecOccurrences(bulkRecOccurrences + 1)}>+</button>
                </div>
                <span>{lang === 'el' ? 'επαναλήψεις' : 'occurrences'}</span>
              </div>
              <div className="bcount-txt">
                ✓ <strong>{totalBulkLoads}</strong> {lang === 'el' ? 'φορτία θα δημιουργηθούν' : 'loads will be created'}
              </div>
            </div>
          )}
        </article>

        {/* Driver Notes textarea */}
        <article className="card">
          <div className="ch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>{lang === 'el' ? 'Σημειώσεις οδηγού' : 'Driver Notes'}</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <textarea
              style={{
                width: '100%',
                minHeight: '88px',
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none',
                color: 'var(--text-primary)',
                background: 'var(--surface)',
              }}
              maxLength={500}
              placeholder={lang === 'el' ? 'Σημειώσεις για τον οδηγό…' : 'Notes for the driver…'}
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {driverNotes.length} / 500
            </div>
          </div>
        </article>

        {/* Tracking Links Card */}
        <article className="card">
          <div className="ch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>{lang === 'el' ? 'Σύνδεσμοι παρακολούθησης' : 'Tracking Links'}</span>
          </div>

          <div className="tracking-wrap">
            {allOrdersList.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', padding: '12px' }}>
                {lang === 'el' ? 'Δεν υπάρχουν παραγγελίες' : 'No orders in shipment'}
              </p>
            ) : (
              allOrdersList.map((o, idx) => {
                const emails = trackingEmails[o.id] || [''];
                const isOpen = openTrackingGroup === o.id;

                return (
                  <div key={idx} className="tko-cust-group">
                    <div className="tko-cust-head" onClick={() => setOpenTrackingGroup(isOpen ? null : o.id)}>
                      <span className={`cust-chev ${isOpen ? 'open' : ''}`}>▶</span>
                      <span className="ci-e" style={{ fontSize: '13px', marginRight: '6px' }}>🏪</span>
                      <span className="cust-name">{o.customerName || (lang === 'el' ? 'Ιδιώτης' : 'Direct Customer')}</span>
                      <span className="cust-count">{o.id}</span>
                    </div>

                    <div className={`tko-cust-body ${isOpen ? 'open' : ''}`}>
                      <div className="tko">
                        <div className="tko-h">
                          <div className="tko-id">{o.id}</div>
                          <div className="tko-r">{o.products}</div>
                        </div>

                        {emails.map((email, emailIdx) => (
                          <div key={emailIdx} className="er">
                            <input
                              type="email"
                              className="ei"
                              placeholder="email@example.com"
                              value={email}
                              onChange={(e) => handleEmailChange(o.id, emailIdx, e.target.value)}
                            />
                            {emails.length > 1 && (
                              <button className="erm" onClick={() => handleRemoveEmail(o.id, emailIdx)}>
                                ✕
                              </button>
                            )}
                          </div>
                        ))}

                        <button className="arb" style={{ marginTop: '8px' }} onClick={() => handleAddEmail(o.id)}>
                          + {lang === 'el' ? 'Προσθήκη email' : 'Add email'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>

      {/* RIGHT PANEL: Map & Live Pricing calculations */}
      <aside className="right-panel">
        {/* Map */}
        <section className="card">
          <div className="map-tabs" role="tablist">
            <button
              className={`map-tab ${mapTab === 'map' ? 'act' : ''}`}
              onClick={() => setMapTab('map')}
            >
              {lang === 'el' ? 'Χάρτης' : 'Map'}
            </button>
            <button
              className={`map-tab ${mapTab === 'sat' ? 'act' : ''}`}
              onClick={() => setMapTab('sat')}
            >
              {lang === 'el' ? 'Δορυφόρος' : 'Satellite'}
            </button>
          </div>
          <iframe
            title="Wizard Stop Map"
            src={
              mapTab === 'sat'
                ? 'https://www.openstreetmap.org/export/embed.html?bbox=20.4%2C37.9%2C24.1%2C40.1&layer=cyclemap'
                : 'https://www.openstreetmap.org/export/embed.html?bbox=20.5%2C38.0%2C24.0%2C40.0&layer=mapnik'
            }
            style={{ width: '100%', height: '300px', border: 0 }}
          ></iframe>
        </section>

        {/* Route stops list */}
        <section className="card">
          <div className="ch ch-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{lang === 'el' ? 'Στάσεις δρομολογίου' : 'Route Stops'}</span>
          </div>
          <div>
            {stops.map((stop, i) => {
              const isLast = i === stops.length - 1;
              const dotCls = i === 0 ? 'pk' : 'dv';
              return (
                <div key={stop.id} className="rs">
                  <div className={`rd ${dotCls}`}></div>
                  {!isLast && <div className="rln"></div>}
                  <div className="ri">
                    <div className="ri-top">
                      <span className="ri-name">{getStopLocationName(stop)}</span>
                      <span className="ri-d">{getStopDetailsString(stop)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trip Stats */}
        <section className="card">
          <div className="ch ch-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>{lang === 'el' ? 'Σύνοψη ταξιδιού' : 'Trip Summary'}</span>
          </div>
          <div className="sc-grid">
            <div className="sc">
              <div className="sc-l">{lang === 'el' ? 'ΑΠΟΣΤΑΣΗ' : 'DISTANCE'}</div>
              <div className="sc-v">
                463 <span className="u">km</span>
              </div>
            </div>
            <div className="sc">
              <div className="sc-l">{lang === 'el' ? 'ΧΡΟΝΟΣ' : 'TIME'}</div>
              <div className="sc-v">
                4<span className="u">{lang === 'el' ? 'ω' : 'h'}</span> 57
                <span className="u">{lang === 'el' ? 'λ' : 'm'}</span>
              </div>
            </div>
            <div className="sc">
              <div className="sc-l">{lang === 'el' ? 'ΣΤΑΣΕΙΣ' : 'STOPS'}</div>
              <div className="sc-v">{stops.length}</div>
            </div>
            <div className="sc">
              <div className="sc-l">{lang === 'el' ? 'ΠΑΛΕΤΕΣ' : 'PALLETS'}</div>
              <div className="sc-v">{totalPallets}</div>
            </div>
          </div>
        </section>

        {/* Live pricing calculator */}
        <section className="card">
          <div className="ch ch-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <span>{lang === 'el' ? 'Τιμολόγηση' : 'Pricing'}</span>
          </div>

          <div className={`psrc ${activeContractCarrier ? 'ct' : 'sp'}`}>
            <span>
              {activeContractCarrier
                ? `${lang === 'el' ? 'Τιμή συμβολαίου' : 'Contract price'} · ${contractCarrierName}`
                : `${lang === 'el' ? 'Τιμή spot' : 'Spot price'} · Price List`}
            </span>
          </div>

          <div className="auto-banner">
            ℹ️{' '}
            {activeContractCarrier ? (
              <span>
                {lang === 'el' ? 'Τιμή συμβολαίου:' : 'Contract rate:'}{' '}
                <strong>{contractDetails}</strong> · Ioannina→Athens
              </span>
            ) : (
              <span>
                {lang === 'el' ? 'Τιμή spot από τιμοκατάλογο:' : 'Spot rate from price list:'}{' '}
                <strong>€750 per load</strong> · Ioannina→Athens
              </span>
            )}
          </div>

          <div className="price-box-wrap" style={{ paddingTop: '10px' }}>
            <div className="price-box">
              <span className="price-sym">€</span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                aria-label="Price"
              />
            </div>
          </div>

          <div className="price-meta">
            <span className="mono">
              <strong>€{(Number(targetPrice || 0) / distanceKm).toFixed(2)}</strong> / km
            </span>
            <span className="sep">·</span>
            <span>
              <strong>€{(Number(targetPrice || 0) / totalPallets).toFixed(2)}</strong> / pallet{' '}
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                ({totalPallets} pallets)
              </span>
            </span>
          </div>

          {isOverride && (
            <div className="override-warn">
              ⚠{' '}
              {lang === 'el'
                ? 'Η τιμή διαφέρει από το συμβόλαιο.'
                : 'Price differs from contract rate.'}
              <button onClick={() => setTargetPrice(String(computedContractPrice))}>
                {lang === 'el' ? 'Επαναφορά' : 'Reset'}
              </button>
            </div>
          )}

          <div className="neg-row">
            <div>
              <div className="neg-title">
                {lang === 'el' ? 'Διαπραγματεύσιμη τιμή' : 'Negotiable price'}
              </div>
              <div className="neg-sub">
                {lang === 'el' ? 'Οι μεταφορείς μπορούν να αντιπροτείνουν' : 'Carriers can counteroffer'}
              </div>
            </div>
            <button
              className={`tog ${negotiable ? 'on' : ''}`}
              onClick={() => setNegotiable(!negotiable)}
              aria-label="Toggle negotiable price"
            />
          </div>
        </section>
      </aside>
    </div>
  );
};

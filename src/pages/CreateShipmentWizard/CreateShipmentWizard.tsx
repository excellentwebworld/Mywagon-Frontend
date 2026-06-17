import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { Shipment, ShipmentStop } from '../../context/AppContext';
import { Step1Details } from './components/Step1Details';
import { Step2Itinerary } from './components/Step2Itinerary';
import { Step3Pricing } from './components/Step3Pricing';
import './CreateShipmentWizard.css';

export const CreateShipmentWizard: React.FC = () => {
  const { lang, locations, addShipment, shipments, showToast } = useApp();
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
              products: 'Water',
              qty: 16,
              qtyUnit: 'Pallets',
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
              products: 'Water',
              qty: 16,
              qtyUnit: 'Pallets',
              weight: 13,
              weightUnit: 'T',
            },
          ],
        },
      ],
    },
  ]);

  // Step 3: Pricing, Broadcast, and Bulk State
  const [broadcastType, setBroadcastType] = useState<'private' | 'public' | 'fleet'>('private');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(['krp', 'dntinos']);
  const [targetPrice, setTargetPrice] = useState('790');
  const [negotiable, setNegotiable] = useState(true);
  const [driverNotes, setDriverNotes] = useState('Driver must wear safety equipment on arrival.');

  const [bulkMode, setBulkMode] = useState<'single' | 'qty' | 'dates' | 'rec'>('single');
  const [bulkQty, setBulkQty] = useState(2);
  const [bulkDates, setBulkDates] = useState<{ date: string; qty: number }[]>([
    { date: '2026-06-20', qty: 2 },
  ]);
  const [bulkRecInterval, setBulkRecInterval] = useState(1);
  const [bulkRecType, setBulkRecType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [bulkRecOccurrences, setBulkRecOccurrences] = useState(4);

  // Tracking link emails
  const [trackingEmails, setTrackingEmails] = useState<Record<string, string[]>>({
    'ORD-5001': ['contact@alphafoods.com'],
  });

  // Calculate total bulk loads count matching step3.js
  let totalBulkLoads = 1;
  if (bulkMode === 'qty') {
    totalBulkLoads = bulkQty;
  } else if (bulkMode === 'dates') {
    totalBulkLoads = bulkDates.reduce((sum, d) => sum + d.qty, 0);
  } else if (bulkMode === 'rec') {
    totalBulkLoads = bulkQty * bulkRecOccurrences; // or recOccurrences count
  }

  const handleConfirmWizard = () => {
    const originLoc = locations.find((l) => l.id === stops[0].location);
    const destLoc = locations.find((l) => l.id === stops[stops.length - 1].location);

    const customersMap = stops.flatMap((s) =>
      s.customers.map((c) => ({
        name: c.name || 'Direct Customer',
        orders: c.orders.map((o) => o.id || 'ORD-UNKNOWN'),
      }))
    );

    // Filter unique customer records
    const finalCustomers: { name: string; orders: string[] }[] = [];
    customersMap.forEach((c) => {
      const existing = finalCustomers.find((fc) => fc.name === c.name);
      if (existing) {
        c.orders.forEach((o) => {
          if (!existing.orders.includes(o)) existing.orders.push(o);
        });
      } else {
        finalCustomers.push({ name: c.name, orders: [...c.orders] });
      }
    });

    const nextId = `SHP-${5000 + shipments.length + 1}`;
    const payload: Shipment = {
      id: nextId,
      date: new Date(stops[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: 'pending',
      vis: broadcastType,
      origin: originLoc ? originLoc.city : 'Unknown',
      dest: destLoc ? destLoc.city : 'Unknown',
      via:
        stops.length > 2
          ? stops
              .slice(1, -1)
              .map((s) => locations.find((l) => l.id === s.location)?.city)
              .filter(Boolean)
              .join(', ')
          : null,
      customer: finalCustomers,
      bids: 0,
      best_bid: null,
      bid_exp: broadcastType === 'public' ? '12h' : null,
      carrier: selectedCarriers.length > 0 ? selectedCarriers[0] : null,
      price: Number(targetPrice),
      price_type: broadcastType === 'public' ? 'spot' : 'contract',
      updated: 'Just now',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 1, // Posted state
      stops: stops,
      driverNotes: driverNotes,
      negotiable: negotiable,
    };

    addShipment(payload);
    
    const label =
      totalBulkLoads > 1
        ? (lang === 'el'
            ? `Μαζική δημιουργία ${totalBulkLoads} φορτίων ολοκληρώθηκε!`
            : `Bulk creation of ${totalBulkLoads} shipments complete!`)
        : (lang === 'el' ? 'Το φορτίο δημιουργήθηκε επιτυχώς!' : 'Shipment created successfully!');
    
    showToast(label, 'success');
    navigate('/shipments');
  };

  const handleSaveDraft = () => {
    showToast(lang === 'el' ? 'Το πρόχειρο αποθηκεύτηκε επιτυχώς!' : 'Draft saved successfully!', 'success');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0px' }}>
      {/* Page Header */}
      <div className="ph" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column' }}>
        <h1 className="ph-t" style={{ fontSize: '24px', fontWeight: 700 }}>
          {step === 1 && (lang === 'el' ? 'Δημιουργία Φορτίου' : 'Create Load')}
          {step === 2 && (lang === 'el' ? 'Επιβεβαίωση Δρομολογίου' : 'Itinerary Confirmation')}
          {step === 3 && (lang === 'el' ? 'Όχημα & Τιμή' : 'Vehicle & Pricing')}
        </h1>
        <p className="ph-s" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          {step === 1 && (lang === 'el' ? 'Προσθέστε στάσεις και στοιχεία φορτίου' : 'Add stops and cargo details')}
          {step === 2 && (lang === 'el' ? 'Ελέγξτε τις στάσεις και τα δρομολόγια πριν συνεχίσετε' : 'Review your stops and itinerary before proceeding.')}
          {step === 3 && (lang === 'el' ? 'Επιλέξτε μεταφορείς και ορίστε την τιμή αποστολής' : 'Select carriers and set your shipment price.')}
        </p>
      </div>

      {/* Stepper Progress */}
      <nav className="stepper" aria-label="Progress steps">
        <div className={`step ${step === 1 ? 'act' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => setStep(1)}>
          <div className="sn">{step > 1 ? '✓' : '1'}</div>
          <span>{lang === 'el' ? 'Στοιχεία Φορτίου' : 'Details'}</span>
        </div>
        <div className={`sl ${step > 1 ? 'done' : ''}`} />
        
        <div className={`step ${step === 2 ? 'act' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => setStep(2)}>
          <div className="sn">{step > 2 ? '✓' : '2'}</div>
          <span>{lang === 'el' ? 'Δρομολόγιο' : 'Itinerary'}</span>
        </div>
        <div className={`sl ${step > 2 ? 'done' : ''}`} />
        
        <div className={`step ${step === 3 ? 'act' : ''}`} onClick={() => setStep(3)}>
          <div className="sn">3</div>
          <span>{lang === 'el' ? 'Όχημα & Τιμή' : 'Vehicle & Pricing'}</span>
        </div>
      </nav>

      {/* Stepper Content */}
      <div className="content" style={{ paddingBottom: '120px' }}>
        {step === 1 && (
          <Step1Details
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            nestedSpecs={nestedSpecs}
            setNestedSpecs={setNestedSpecs}
            stops={stops}
            setStops={setStops}
          />
        )}

        {step === 2 && (
          <Step2Itinerary
            stops={stops}
            onEditStep={(sNum) => setStep(sNum)}
          />
        )}

        {step === 3 && (
          <Step3Pricing
            stops={stops}
            broadcastType={broadcastType}
            setBroadcastType={setBroadcastType}
            selectedCarriers={selectedCarriers}
            setSelectedCarriers={setSelectedCarriers}
            targetPrice={targetPrice}
            setTargetPrice={setTargetPrice}
            negotiable={negotiable}
            setNegotiable={setNegotiable}
            driverNotes={driverNotes}
            setDriverNotes={setDriverNotes}
            bulkMode={bulkMode}
            setBulkMode={setBulkMode}
            bulkQty={bulkQty}
            setBulkQty={setBulkQty}
            bulkDates={bulkDates}
            setBulkDates={setBulkDates}
            bulkRecInterval={bulkRecInterval}
            setBulkRecInterval={setBulkRecInterval}
            bulkRecType={bulkRecType}
            setBulkRecType={setBulkRecType}
            bulkRecOccurrences={bulkRecOccurrences}
            setBulkRecOccurrences={setBulkRecOccurrences}
            trackingEmails={trackingEmails}
            setTrackingEmails={setTrackingEmails}
            totalBulkLoads={totalBulkLoads}
          />
        )}
      </div>

      {/* Stepper Footer Controls */}
      <footer className="bbar">
        <div className="bb-l" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '18px', height: '18px' }}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
          </svg>
          {step === 3 ? (
            <div className="bb-total-wrap">
              <span className="bb-price">€{Number(targetPrice || 0).toLocaleString()}</span>
              {totalBulkLoads > 1 && (
                <span id="botBulk" style={{ display: 'inline' }}>
                  × <span>{totalBulkLoads}</span> loads ={' '}
                  <span>€{(Number(targetPrice || 0) * totalBulkLoads).toLocaleString()}</span>
                </span>
              )}
            </div>
          ) : (
            <span>{lang === 'el' ? 'Αυτόματη αποθήκευση ενεργή' : 'Auto-save active'}</span>
          )}
        </div>

        <div className="bb-r" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn"
            onClick={() => {
              if (step === 1) navigate('/shipments');
              else setStep((s) => s - 1);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '14px', height: '14px' }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{lang === 'el' ? 'Πίσω' : 'Back'}</span>
          </button>

          <button className="btn" onClick={handleSaveDraft}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '14px', height: '14px' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            </svg>
            <span>{lang === 'el' ? 'Αποθήκευση πρόχειρου' : 'Save Draft'}</span>
          </button>

          <button
            className="btn btn-p"
            onClick={() => {
              if (step === 3) handleConfirmWizard();
              else setStep((s) => s + 1);
            }}
          >
            {step === 3 ? (
              <span>
                {totalBulkLoads > 1
                  ? (lang === 'el' ? `Δημιουργία ${totalBulkLoads} φορτίων` : `Create ${totalBulkLoads} Shipments`)
                  : (lang === 'el' ? 'Δημιουργία φορτίου' : 'Create Shipment')}
              </span>
            ) : (
              <span>{lang === 'el' ? 'Επιβεβαίωση & Συνέχεια' : 'Confirm & Continue'}</span>
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '14px', height: '14px' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
};
export default CreateShipmentWizard;

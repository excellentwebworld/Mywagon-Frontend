import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { Shipment, ShipmentStop } from '../../context/AppContext';
import { Step1Details, Step2Itinerary, Step3Pricing } from '../../components/CreateShipmentWizard';
import './CreateShipmentWizard.css';

export const CreateShipmentWizard: React.FC = () => {
  const { t } = useTranslation();
  const { locations, addShipment, shipments, showToast, refreshLocationsFromApi } = useApp();
  const navigate = useNavigate();
  const locationState = useLocation().state as { prefillLocationId?: string } | null;

  useEffect(() => {
    refreshLocationsFromApi();
  }, [refreshLocationsFromApi]);

  const [step, setStep] = useState(1);

  // Step 1: Vehicle and Stops State
  const [vehicleSpecs, setVehicleSpecs] = useState<Record<string, string[]>>({
    semi: ['curtainside', 'box', 'platform', 'flatbed'],
    curtain: ['standard'],
  });
  const [stops, setStops] = useState<ShipmentStop[]>([
    {
      id: 1,
      type: 'pickup',
      location: '',
      address: '',
      date: new Date().toISOString().slice(0, 10),
      timeStart: '08:00',
      timeEnd: '12:00',
      customers: [],
    },
    {
      id: 2,
      type: 'delivery',
      location: '',
      address: '',
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      timeStart: '14:00',
      timeEnd: '18:00',
      customers: [],
    },
  ]);

  useEffect(() => {
    const prefillId = locationState?.prefillLocationId;
    if (!prefillId || locations.length === 0) return;
    const loc = locations.find((l) => l.id === prefillId);
    if (!loc) return;
    setStops((prev) =>
      prev.map((stop, idx) =>
        idx === 0
          ? {
            ...stop,
            type: loc.role === 'delivery' ? 'delivery' : 'pickup',
            location: loc.id,
            address: loc.address,
          }
          : stop
      )
    );
    showToast(`Prefilled pickup: ${loc.name}`, 'info');
  }, [locationState?.prefillLocationId, locations, showToast]);

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
        ? t('bulkCreationComplete', { count: totalBulkLoads })
        : t('shipmentCreatedSuccess');

    showToast(label, 'success');
    navigate('/shipments');
  };

  const handleSaveDraft = () => {
    showToast(t('draftSavedSuccess'), 'success');
  };

  return (
    <div className="animate-fade-in pt-5 px-7">
      {/* Page Header */}
      <div className="ph" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column' }}>
        <h1 className="ph-t" style={{ fontSize: '24px', fontWeight: 700 }}>
          {step === 1 && t('step1Title')}
          {step === 2 && t('step2Title')}
          {step === 3 && t('vehicleAndPricing')}
        </h1>
        <p className="ph-s" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          {step === 1 && t('step1Sub')}
          {step === 2 && t('step2Sub')}
          {step === 3 && t('vehiclePricingSub')}
        </p>
      </div>

      {/* Stepper Progress */}
      <nav className="stepper" aria-label="Progress steps">
        <div className={`step ${step === 1 ? 'act' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => setStep(1)}>
          <div className="sn">{step > 1 ? '✓' : '1'}</div>
          <span>{t('details')}</span>
        </div>
        <div className={`sl ${step > 1 ? 'done' : ''}`} />

        <div className={`step ${step === 2 ? 'act' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => setStep(2)}>
          <div className="sn">{step > 2 ? '✓' : '2'}</div>
          <span>{t('itinerary')}</span>
        </div>
        <div className={`sl ${step > 2 ? 'done' : ''}`} />

        <div className={`step ${step === 3 ? 'act' : ''}`} onClick={() => setStep(3)}>
          <div className="sn">3</div>
          <span>{t('vehicleAndPricing')}</span>
        </div>
      </nav>

      {/* Stepper Content */}
      <div className="content" style={{ paddingBottom: '120px' }}>
        {step === 1 && (
          <Step1Details
            vehicleSpecs={vehicleSpecs}
            setVehicleSpecs={setVehicleSpecs}
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
            <span>{t('autoSave')}</span>
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
            <span>{t('back')}</span>
          </button>

          <button className="btn" onClick={handleSaveDraft}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '14px', height: '14px' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            </svg>
            <span>{t('saveDraft')}</span>
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
                  ? t('createBulkShipments', { count: totalBulkLoads })
                  : t('createShipmentBtn')}
              </span>
            ) : (
              <span>{t('confirmContinue')}</span>
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

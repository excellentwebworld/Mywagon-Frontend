import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { Shipment } from '../../context/AppContext';
import { Step1Details, createNewStop } from '../../components/CreateShipmentWizard/Step1Details';
import { Step2Itinerary } from '../../components/CreateShipmentWizard/Step2Itinerary';
import { Step3Pricing } from '../../components/CreateShipmentWizard/Step3Pricing';
import './CreateShipmentWizard.css';

const validationSchema = Yup.object().shape({
  custRef: Yup.string().optional(),
  stops: Yup.array().of(
    Yup.object().shape({
      locationId: Yup.string().required('Location is required'),
      appointmentMode: Yup.string().oneOf(['fixed', 'self_scheduling']).required(),
      dateFrom: Yup.string().when('appointmentMode', {
        is: 'fixed',
        then: () => Yup.string().required('Date is required'),
      }),
      windowStart: Yup.string().when('appointmentMode', {
        is: 'self_scheduling',
        then: () => Yup.string().required('Window start is required'),
      }),
      windowEnd: Yup.string().when('appointmentMode', {
        is: 'self_scheduling',
        then: () => Yup.string().required('Window end is required'),
      }),
      lines: Yup.array().of(
        Yup.object().shape({
          productId: Yup.string().required('Product is required'),
          qty: Yup.number().positive('Qty must be positive').required('Required'),
          weight: Yup.number().positive('Weight must be positive').required('Required'),
        })
      ).min(1, 'At least one cargo line is required'),
    })
  ).min(2, 'At least two stops are required'),
  targetPrice: Yup.number().positive('Price must be positive').required('Price is required'),
});

export const CreateShipmentWizard: React.FC = () => {
  const { t } = useTranslation();
  const { locations, addShipment, shipments, showToast, refreshLocationsFromApi } = useApp();
  const navigate = useNavigate();
  const locationState = useLocation().state as { prefillLocationId?: string } | null;

  useEffect(() => {
    refreshLocationsFromApi();
  }, [refreshLocationsFromApi]);

  const [step, setStep] = useState(1);

  const initialValues = {
    loadId: `SHP-${5000 + shipments.length + 1}`,
    custRef: '',
    coOwners: [] as string[],
    stops: [
      createNewStop(true),
      createNewStop(true),
    ],
    itineraryConfirmed: false,
    vehicleSpecs: {
      'semi-trailer': [] as string[],
      'road-train': [] as string[],
      'triaxle': [] as string[],
      'van': [] as string[],
    } as Record<string, string[]>,
    broadcastType: 'private' as 'private' | 'public',
    selectedCarriers: ['krp', 'dntinos'] as string[],
    targetPrice: '790',
    trackingEmails: {} as Record<string, string[]>,
    driverNotes: 'Driver must wear safety equipment on arrival.',
    gpsRequired: true,
    bulkMode: 'single' as 'single' | 'qty' | 'dates' | 'rec',
    bulkQty: 5,
    bulkDates: [
      { date: '2026-06-21', qty: 3 },
      { date: '2026-06-22', qty: 3 },
    ] as { date: string; qty: number }[],
    bulkRecQty: 5,
    bulkRecType: 'weekly' as 'daily' | 'weekly' | 'monthly',
    bulkRecOccurrences: 7,
  };

  const handleConfirmWizard = (values: typeof initialValues, { setSubmitting }: any) => {
    const stops = values.stops;
    const originLoc = locations.find((l) => l.id === stops[0].locationId);
    const destLoc = locations.find((l) => l.id === stops[stops.length - 1].locationId);

    const customersMap = stops.flatMap((s) =>
      s.lines.map((l: any) => ({
        name: l.customerName || 'Direct Customer',
        orders: l.orderId ? [l.orderId] : [],
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

    const payload: Shipment = {
      id: values.loadId,
      date: stops[0].dateFrom
        ? new Date(stops[0].dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : new Date(stops[0].windowStart || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: 'pending',
      vis: values.broadcastType,
      origin: originLoc ? originLoc.city : 'Unknown',
      dest: destLoc ? destLoc.city : 'Unknown',
      via:
        stops.length > 2
          ? stops
            .slice(1, -1)
            .map((s) => locations.find((l) => l.id === s.locationId)?.city || s.locationCity)
            .filter(Boolean)
            .join(', ')
          : null,
      customer: finalCustomers,
      bids: 0,
      best_bid: null,
      bid_exp: values.broadcastType === 'public' ? '12h' : null,
      carrier: values.selectedCarriers.length > 0 ? values.selectedCarriers[0] : null,
      price: Number(values.targetPrice),
      price_type: values.broadcastType === 'public' ? 'spot' : 'contract',
      updated: 'Just now',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 1, // Posted state
      stops: stops.map((s, idx) => ({
        id: idx + 1,
        type: idx === 0 ? ('pickup' as const) : ('delivery' as const),
        location: s.locationId,
        address: s.locationCity ? `${s.locationCity}, Greece` : '',
        date: s.dateFrom || s.windowStart || '',
        timeStart: s.timeFrom || '08:00',
        timeEnd: s.timeTo || '18:00',
        customers: s.lines.filter((l: any) => l.productId).map((l: any) => ({
          name: l.customerName || 'Direct Customer',
          orders: [
            {
              id: l.orderId || l.orderRef || `ORD-${Date.now()}`,
              products: l.productName || 'General Cargo',
              qty: Number(l.qty) || 0,
              qtyUnit: l.unit || 'Pallets',
              weight: Number(l.weight) || 0,
              weightUnit: l.wtUnit || 'kg',
            },
          ],
        })),
      })),
      driverNotes: values.driverNotes,
      negotiable: true,
    };

    addShipment(payload);
    showToast(t('shipmentCreatedSuccess') || 'Shipment created successfully!', 'success');
    setSubmitting(false);
    navigate('/shipments');
  };

  return (
    <div className="animate-fade-in pt-5 px-7">
      {/* Page Header */}
      <div className="ph" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="ph-t" style={{ fontSize: '24px', fontWeight: 700 }}>
            {step === 1 && (t('step1Title') || 'Create Load')}
            {step === 2 && (t('step2Title') || 'Review Itinerary & Stats')}
            {step === 3 && (t('vehicleAndPricing') || 'Vehicle & Pricing options')}
          </h1>
          <p className="ph-s" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {step === 1 && (t('step1Sub') || 'Add stops and cargo details')}
            {step === 2 && (t('step2Sub') || 'Verify drive limits, weather warnings, and cargo balance.')}
            {step === 3 && (t('vehiclePricingSub') || 'Choose vehicle type, target price, and tracking options.')}
          </p>
        </div>
        {/* Portal Target for Header Controls */}
        <div id="wizard-header-portal" className="flex items-center gap-2 flex-wrap" />
      </div>

      {/* Stepper Progress */}
      <nav className="stepper" aria-label="Progress steps">
        <div className={`step ${step === 1 ? 'act' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => setStep(1)}>
          <div className="sn">{step > 1 ? '✓' : '1'}</div>
          <span>Details</span>
        </div>
        <div className={`sl ${step > 1 ? 'done' : ''}`} />

        <div className={`step ${step === 2 ? 'act' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => setStep(2)}>
          <div className="sn">{step > 2 ? '✓' : '2'}</div>
          <span>Itinerary</span>
        </div>
        <div className={`sl ${step > 2 ? 'done' : ''}`} />

        <div className={`step ${step === 3 ? 'act' : ''}`} onClick={() => setStep(3)}>
          <div className="sn">3</div>
          <span>Vehicle & Pricing</span>
        </div>
      </nav>

      {/* Formik Multi-step Wrapper */}
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleConfirmWizard}
      >
        {({ submitForm }) => (
          <Form>
            <div className="content" style={{ paddingBottom: '120px' }}>
              {step === 1 && <Step1Details onNextStep={() => setStep(2)} />}
              {step === 2 && <Step2Itinerary onBackStep={() => setStep(1)} onNextStep={() => setStep(3)} />}
              {step === 3 && <Step3Pricing onBackStep={() => setStep(2)} onSubmit={submitForm} />}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CreateShipmentWizard;

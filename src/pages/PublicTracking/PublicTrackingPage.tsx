import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Mail, Phone, Star } from 'lucide-react';
import { publicTrackingService } from '../../api/services/publicTrackingService';
import { loadGoogleMaps } from '../../components/AddressBook/GoogleMapAddressField';
import type { PublicTrackingPayload, TrackingReceiptItem } from './types';
import './publicTracking.css';

type Lang = 'en' | 'el';

const I18N: Record<string, { en: string; el: string }> = {
  itinerary: { en: 'Itinerary Details', el: 'Λεπτομέρειες διαδρομής' },
  liveTracking: { en: 'Live Tracking', el: 'Ζωντανός εντοπισμός' },
  transporter: { en: 'Transporter', el: 'Μεταφορέας' },
  orderDetails: { en: 'Order Details', el: 'Λεπτομέρειες παραγγελίας' },
  confirmReceipt: { en: 'Confirm Receipt of Goods', el: 'Επιβεβαίωση παραλαβής εμπορευμάτων' },
  rateTransporter: { en: 'Rate your Transporter', el: 'Αξιολογήστε τον μεταφορέα' },
  pickup: { en: 'Pickup', el: 'Παραλαβή' },
  dropoff: { en: 'Dropoff', el: 'Παράδοση' },
  onBehalf: { en: 'on behalf of', el: 'εκ μέρους' },
  freelancer: { en: 'Freelancer', el: 'Freelancer' },
  carrier: { en: 'Carrier', el: 'Μεταφορέας' },
  onTime: { en: 'On Time', el: 'Εντός χρόνου' },
  delayed: { en: 'Delayed', el: 'Καθυστέρηση' },
  eta: { en: 'ETA', el: 'ETA' },
  supplier: { en: 'Supplier', el: 'Προμηθευτής' },
  quantity: { en: 'Quantity', el: 'Ποσότητα' },
  weight: { en: 'Weight', el: 'Βάρος' },
  product: { en: 'Product', el: 'Προϊόν' },
  vehicleType: { en: 'Vehicle Type', el: 'Τύπος οχήματος' },
  vehicle: { en: 'Vehicle', el: 'Όχημα' },
  tripsCompleted: { en: 'trips completed', el: 'ολοκληρωμένα ταξίδια' },
  fullReceipt: { en: 'Full Receipt', el: 'Πλήρης παραλαβή' },
  partialReceipt: { en: 'Partial Receipt', el: 'Μερική παραλαβή' },
  confirmCta: { en: 'Confirm Receipt', el: 'Επιβεβαίωση παραλαβής' },
  receiptConfirmed: { en: 'Receipt Confirmed', el: 'Παραλαβή επιβεβαιώθηκε' },
  submitRating: { en: 'Submit Rating', el: 'Υποβολή αξιολόγησης' },
  ratingThanks: { en: 'Thanks for your rating', el: 'Ευχαριστούμε για την αξιολόγηση' },
  suggested: { en: 'Suggested', el: 'Προτεινόμενη' },
  actual: { en: 'Actual', el: 'Πραγματική' },
  orderId: { en: 'Order ID', el: 'Κωδ. παραγγελίας' },
  item: { en: 'Item', el: 'Είδος' },
  ordered: { en: 'Ordered', el: 'Παραγγελία' },
  received: { en: 'Received', el: 'Παραλαβή' },
  notes: { en: 'Add comments about the delivery… (optional)', el: 'Προσθέστε σχόλια… (προαιρετικό)' },
  reviewPh: { en: 'Write a review… (optional)', el: 'Γράψτε μια αξιολόγηση… (προαιρετικό)' },
  copied: { en: 'Copied to clipboard', el: 'Αντιγράφηκε' },
  loading: { en: 'Loading shipment…', el: 'Φόρτωση αποστολής…' },
  notFound: { en: 'Tracking link is invalid or expired.', el: 'Ο σύνδεσμος δεν είναι έγκυρος.' },
  powered: { en: 'Powered by', el: 'Με την υποστήριξη' },
};

function t(lang: Lang, key: string): string {
  return I18N[key]?.[lang] ?? key;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

function TrackingMap({
  points,
  actualRoute,
  showToggle,
  lang,
}: {
  points: PublicTrackingPayload['map']['points'];
  actualRoute: Array<{ lat: number; lng: number }>;
  showToggle: boolean;
  lang: Lang;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'suggested' | 'actual'>('suggested');

  useEffect(() => {
    let cancelled = false;
    let map: google.maps.Map | null = null;
    let poly: google.maps.Polyline | null = null;
    const markers: google.maps.Marker[] = [];

    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !mapRef.current || !window.google?.maps) return;

        const valid = points.filter((p) => p.lat != null && p.lng != null) as Array<{
          lat: number;
          lng: number;
          type: string;
          seq: number;
        }>;
        const center = valid[0]
          ? { lat: valid[0].lat, lng: valid[0].lng }
          : { lat: 37.9838, lng: 23.7275 };

        map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 7,
          disableDefaultUI: true,
          zoomControl: true,
        });

        const bounds = new google.maps.LatLngBounds();
        valid.forEach((p) => {
          const pos = { lat: p.lat, lng: p.lng };
          bounds.extend(pos);
          markers.push(
            new google.maps.Marker({
              map,
              position: pos,
              label: {
                text: String(p.seq),
                color: '#fff',
                fontWeight: '700',
              },
            })
          );
        });

        const path =
          mode === 'actual' && actualRoute.length > 1
            ? actualRoute
            : valid.map((p) => ({ lat: p.lat, lng: p.lng }));

        if (path.length > 1) {
          poly = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#6C3AED',
            strokeOpacity: 0.9,
            strokeWeight: 4,
            map,
          });
          path.forEach((pt) => bounds.extend(pt));
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 48);
        }
      } catch {
        // map optional
      }
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap(null));
      poly?.setMap(null);
    };
  }, [points, actualRoute, mode]);

  return (
    <div className="pt-map">
      {showToggle && (
        <div className="pt-map-toggle">
          <button type="button" className={mode === 'suggested' ? 'act' : ''} onClick={() => setMode('suggested')}>
            {t(lang, 'suggested')}
          </button>
          <button
            type="button"
            className={mode === 'actual' ? 'act' : ''}
            onClick={() => setMode('actual')}
            disabled={actualRoute.length < 2}
          >
            {t(lang, 'actual')}
          </button>
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export const PublicTrackingPage: React.FC = () => {
  const { encryptedId = '', encryptedLocationIds = '' } = useParams<{
    encryptedId: string;
    encryptedLocationIds: string;
  }>();
  const [lang, setLang] = useState<Lang>('en');
  const [data, setData] = useState<PublicTrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [activeNav, setActiveNav] = useState('itinerary');

  const [rcptType, setRcptType] = useState<'full' | 'partial'>('full');
  const [rcptNotes, setRcptNotes] = useState('');
  const [rcptReason, setRcptReason] = useState('');
  const [rcptItems, setRcptItems] = useState<TrackingReceiptItem[]>([]);
  const [rcptSaving, setRcptSaving] = useState(false);
  const [rcptDone, setRcptDone] = useState(false);

  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateDone, setRateDone] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  }, []);

  const copyText = useCallback(
    async (value?: string | null) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        showToast(t(lang, 'copied'));
      } catch {
        showToast(t(lang, 'copied'));
      }
    },
    [lang, showToast]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await publicTrackingService.getTracking(encryptedId, encryptedLocationIds);
        if (cancelled) return;
        setData(payload);
        setRcptItems(payload.receipt.items || []);
        setRcptDone(payload.receipt.already_confirmed);
        setRateDone(payload.rating.already_rated);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('en', 'notFound'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encryptedId, encryptedLocationIds]);

  const jumpTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const timeline = data?.timeline ?? [];

  const onConfirmReceipt = async () => {
    if (!data) return;
    setRcptSaving(true);
    try {
      await publicTrackingService.confirmReceipt(encryptedId, encryptedLocationIds, {
        confirmation_type: rcptType,
        reason_code: rcptType === 'partial' ? rcptReason || undefined : undefined,
        notes: rcptNotes || undefined,
        items: rcptItems.map((it) => ({
          location_id: it.location_id,
          order_id: it.order_id,
          ordered_qty: it.ordered_qty,
          received_qty: rcptType === 'full' ? it.ordered_qty : it.received_qty,
        })),
      });
      setRcptDone(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error');
    } finally {
      setRcptSaving(false);
    }
  };

  const onSubmitRating = async () => {
    if (!data || stars < 1) return;
    setRateSaving(true);
    try {
      await publicTrackingService.submitRating(encryptedId, encryptedLocationIds, {
        rating: stars,
        review: review || undefined,
      });
      setRateDone(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error');
    } finally {
      setRateSaving(false);
    }
  };

  const fontLink = useMemo(
    () => (
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
    ),
    []
  );

  if (loading) {
    return (
      <div className="pt-page">
        {fontLink}
        <div className="pt-loading">{t(lang, 'loading')}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="pt-page">
        {fontLink}
        <div className="pt-error">{error || t(lang, 'notFound')}</div>
      </div>
    );
  }

  const kindLabel =
    data.header.transporter_kind === 'freelancer' ? t(lang, 'freelancer') : t(lang, 'carrier');

  return (
    <div className="pt-page">
      {fontLink}

      <div className="pt-topbar">
        <div className="pt-topbar-inner">
          <a className="pt-logo" href="https://myvagon.com" target="_blank" rel="noreferrer">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#6C3AED" />
              <path
                d="M7 18V10l4 8 4-8v8M19 10h4l-4 8h4"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              MY<span className="hl">VAGON</span>
            </span>
          </a>
          <div className="pt-lang">
            <button type="button" className={lang === 'en' ? 'act' : ''} onClick={() => setLang('en')}>
              EN
            </button>
            <button type="button" className={lang === 'el' ? 'act' : ''} onClick={() => setLang('el')}>
              EL
            </button>
          </div>
        </div>
      </div>

      <div className="pt-cmd">
        <div className="pt-cmd-inner">
          <div className="pt-cmd-row">
            <div>
              <div className="pt-sid">
                #{data.shipment.auto_id}
                <span className="pt-badge pt-badge-in">
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'currentColor',
                      display: 'inline-block',
                    }}
                  />
                  {data.shipment.status_label}
                </span>
              </div>
              {data.shipment.lane ? <div className="pt-lane">{data.shipment.lane}</div> : null}
              <div className="pt-fwd">
                <span className="pt-fwd-badge">{kindLabel}</span>
                <strong>{data.header.transporter_name || '—'}</strong>
                <span style={{ color: 'var(--pt-t3)' }}>·</span>
                <span>{t(lang, 'onBehalf')}</span>
                <span className="pt-cust-badge">
                  <strong>{data.header.shipper_name || '—'}</strong>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {data.header.eta_label ? (
                <span className="pt-chip pt-chip-in">
                  {t(lang, 'eta')}: {data.header.eta_label}
                </span>
              ) : null}
              <span className={`pt-chip ${data.header.on_time ? 'pt-chip-ok' : 'pt-chip-wr'}`}>
                {data.header.on_time ? t(lang, 'onTime') : t(lang, 'delayed')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-ms-bar">
        <div className="pt-ms-row">
          {timeline.map((step, idx) => {
            const nextDone = timeline[idx + 1]?.state === 'done' || step.state === 'done';
            return (
              <div className="pt-ms-step" key={`${step.key}-${idx}`}>
                <div className={`pt-ms-dot ${step.state}`} />
                <div className={`pt-ms-line ${nextDone ? 'done' : ''}`} />
                <div className="pt-ms-label">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-jnav">
        {[
          ['itinerary', 'itinerary'],
          ['tracking', 'liveTracking'],
          ['transporter', 'transporter'],
          ['order', 'orderDetails'],
          ['receipt', 'confirmReceipt'],
          ['rating', 'rateTransporter'],
        ].map(([id, key]) => (
          <button
            key={id}
            type="button"
            className={`pt-jn ${activeNav === id ? 'act' : ''}`}
            onClick={() => jumpTo(id)}
          >
            {t(lang, key)}
          </button>
        ))}
      </div>

      <div className="pt-wrap">
        <div className="pt-grid">
          <div>
            <div className="pt-card" id="itinerary">
              <div className="pt-card-h">
                <h3>
                  {t(lang, 'itinerary')}{' '}
                  <span
                    style={{
                      fontSize: 11,
                      background: 'var(--pt-sa)',
                      padding: '2px 8px',
                      borderRadius: 99,
                      color: 'var(--pt-t3)',
                    }}
                  >
                    {data.stops.length}
                  </span>
                </h3>
              </div>
              <div className="pt-card-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
                {data.stops.map((stop) => (
                  <div className="pt-stop" key={stop.id}>
                    <div className="pt-stop-top">
                      <div className={`pt-stop-num ${stop.type === 'pickup' ? 'pk' : 'dl'}`}>{stop.seq}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className={`pt-stop-type ${stop.type === 'pickup' ? 'pk' : 'dl'}`}>
                          {stop.type === 'pickup' ? t(lang, 'pickup') : t(lang, 'dropoff')}
                        </span>
                        {stop.schedule_label ? (
                          <span className="pt-mono" style={{ fontSize: 12, color: 'var(--pt-t3)' }}>
                            {stop.schedule_label}
                          </span>
                        ) : null}
                        <div className="pt-stop-name">{stop.company_name || '—'}</div>
                        <div className="pt-stop-addr">{stop.address}</div>
                        <div className="pt-stop-tags">
                          {stop.supplier_name ? (
                            <span className="pt-stop-tag">
                              {t(lang, 'supplier')}: {stop.supplier_name}
                            </span>
                          ) : null}
                          {stop.lines.map((line, i) => (
                            <React.Fragment key={`${line.location_id}-${i}`}>
                              {line.order_id ? <span className="pt-stop-tag">{line.order_id}</span> : null}
                              {line.product_name ? <span className="pt-stop-tag">{line.product_name}</span> : null}
                              {line.qty != null ? (
                                <span className="pt-stop-tag">
                                  {line.qty} {line.qty_unit}
                                </span>
                              ) : null}
                              {line.weight != null ? (
                                <span className="pt-stop-tag">
                                  {line.weight} {line.weight_unit}
                                </span>
                              ) : null}
                            </React.Fragment>
                          ))}
                        </div>
                        {stop.type === 'pickup' && (stop.phone || stop.email) ? (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            {stop.phone ? (
                              <button
                                type="button"
                                className="pt-icon-btn"
                                title={stop.phone}
                                onClick={() => copyText(stop.phone)}
                              >
                                <Phone size={14} />
                              </button>
                            ) : null}
                            {stop.email ? (
                              <button
                                type="button"
                                className="pt-icon-btn"
                                title={stop.email}
                                onClick={() => copyText(stop.email)}
                              >
                                <Mail size={14} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {stop.completed ? (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--pt-ob)',
                            color: 'var(--pt-ok)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          ✓
                        </div>
                      ) : (
                        <div style={{ color: 'var(--pt-t3)', fontSize: 18 }}>○</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-card" id="order">
              <div className="pt-card-h">
                <h3>{t(lang, 'orderDetails')}</h3>
              </div>
              <div className="pt-card-body">
                {data.orders.map((order) => (
                  <table className="pt-order-table" key={order.order_id} style={{ marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th className="pt-order-header" colSpan={3}>
                          {order.order_id}
                        </th>
                      </tr>
                      <tr>
                        <th>{t(lang, 'product')}</th>
                        <th>{t(lang, 'quantity')}</th>
                        <th>{t(lang, 'weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.products.map((p, idx) => (
                        <tr key={`${p.location_id}-${idx}`}>
                          <td>{p.product_name || '—'}</td>
                          <td>
                            {p.qty != null ? `${p.qty} ${p.qty_unit}` : '—'}
                          </td>
                          <td>
                            {p.weight != null ? `${p.weight} ${p.weight_unit}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
                {data.vehicle_type ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '12px 14px',
                      background: 'var(--pt-sa)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--pt-t3)', textTransform: 'uppercase' }}>
                      {t(lang, 'vehicleType')}
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{data.vehicle_type}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <div className="pt-card" id="tracking">
              <div className="pt-card-h">
                <h3>{t(lang, 'liveTracking')}</h3>
              </div>
              <div className="pt-card-body">
                <TrackingMap
                  points={data.map.points}
                  actualRoute={data.map.actual_route || []}
                  showToggle={Boolean(data.map.permissions?.show_route_toggle)}
                  lang={lang}
                />
              </div>
            </div>

            <div className="pt-card" id="transporter">
              <div className="pt-card-h">
                <h3>{t(lang, 'transporter')}</h3>
              </div>
              <div className="pt-card-body">
                <div className="pt-cr-card">
                  <div className="pt-cr-av">{initials(data.transporter.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {data.transporter.name || '—'}
                      {data.transporter.rating != null ? (
                        <span style={{ fontSize: 12, color: 'var(--pt-wr)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <Star size={12} fill="currentColor" /> {Number(data.transporter.rating).toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--pt-t2)', marginTop: 2 }}>
                      {kindLabel}
                      {data.transporter.trips_count != null
                        ? ` · ${data.transporter.trips_count} ${t(lang, 'tripsCompleted')}`
                        : ''}
                    </div>
                    {data.transporter.vehicle ? (
                      <div style={{ fontSize: 12, marginTop: 6 }}>
                        <strong>{t(lang, 'vehicle')}:</strong> {data.transporter.vehicle}
                      </div>
                    ) : null}
                    {data.transporter.plates?.length ? (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {data.transporter.plates.map((p) => (
                          <span className="pt-plate" key={p}>
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {data.transporter.phone ? (
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="pt-icon-btn"
                          title={data.transporter.phone}
                          onClick={() => copyText(data.transporter.phone)}
                        >
                          <Phone size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-rcpt" id="receipt">
          <div className="pt-rcpt-h">
            <h3>{t(lang, 'confirmReceipt')}</h3>
          </div>
          {rcptDone ? (
            <div className="pt-confirmed">
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--pt-ok)' }}>{t(lang, 'receiptConfirmed')}</div>
            </div>
          ) : (
            <div className="pt-rcpt-body">
              <div className="pt-rcpt-type">
                <button
                  type="button"
                  className={`pt-rcpt-opt ${rcptType === 'full' ? 'selected' : ''}`}
                  onClick={() => setRcptType('full')}
                >
                  <div style={{ fontWeight: 600 }}>{t(lang, 'fullReceipt')}</div>
                </button>
                <button
                  type="button"
                  className={`pt-rcpt-opt ${rcptType === 'partial' ? 'selected' : ''}`}
                  onClick={() => setRcptType('partial')}
                >
                  <div style={{ fontWeight: 600 }}>{t(lang, 'partialReceipt')}</div>
                </button>
              </div>

              {rcptType === 'partial' ? (
                <table className="pt-order-table" style={{ marginBottom: 14 }}>
                  <thead>
                    <tr>
                      <th>{t(lang, 'orderId')}</th>
                      <th>{t(lang, 'item')}</th>
                      <th>{t(lang, 'ordered')}</th>
                      <th>{t(lang, 'received')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rcptItems.map((it, idx) => (
                      <tr key={`${it.location_id}-${idx}`}>
                        <td className="pt-mono">{it.order_id || '—'}</td>
                        <td>{it.product_name || '—'}</td>
                        <td>
                          {it.ordered_qty ?? '—'} {it.qty_unit}
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={it.received_qty ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRcptItems((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, received_qty: val } : row))
                              );
                            }}
                            style={{
                              width: 72,
                              padding: '4px 8px',
                              border: '1px solid var(--pt-bd)',
                              borderRadius: 4,
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {rcptType === 'partial' ? (
                <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Items missing', 'Damaged goods', 'Wrong items', 'Quantity mismatch'].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      className="pt-btn"
                      style={
                        rcptReason === reason
                          ? { borderColor: 'var(--pt-ac)', color: 'var(--pt-ac)', background: 'var(--pt-al)' }
                          : undefined
                      }
                      onClick={() => setRcptReason(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              ) : null}

              <textarea
                className="pt-textarea"
                placeholder={t(lang, 'notes')}
                value={rcptNotes}
                onChange={(e) => setRcptNotes(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="pt-btn pt-btn-ok"
                  style={{ padding: '12px 28px' }}
                  disabled={rcptSaving || !data.receipt.can_confirm}
                  onClick={onConfirmReceipt}
                >
                  {t(lang, 'confirmCta')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-card" id="rating">
          <div className="pt-card-h">
            <h3>{t(lang, 'rateTransporter')}</h3>
          </div>
          {rateDone ? (
            <div className="pt-confirmed">
              <div style={{ fontSize: 48, marginBottom: 8 }}>⭐</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--pt-wr)' }}>{t(lang, 'ratingThanks')}</div>
            </div>
          ) : (
            <div className="pt-card-body" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
                <div className="pt-cr-av" style={{ width: 36, height: 36, fontSize: 13 }}>
                  {initials(data.rating.transporter_name || data.transporter.name)}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {data.rating.transporter_name || data.transporter.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--pt-t3)' }}>
                    {(data.rating.plates || data.transporter.plates || []).join(' · ')}
                  </div>
                </div>
              </div>

              <div className="pt-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`pt-star ${n <= stars ? 'active' : ''}`}
                    onClick={() => setStars(n)}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                className="pt-textarea"
                placeholder={t(lang, 'reviewPh')}
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="pt-btn pt-btn-pr"
                  style={{ padding: '10px 28px' }}
                  disabled={rateSaving || stars < 1 || !data.rating.can_rate}
                  onClick={onSubmitRating}
                >
                  {t(lang, 'submitRating')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-footer">
          {t(lang, 'powered')} <strong>MYVAGON</strong>
        </div>
      </div>

      <div className={`pt-toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
};

export default PublicTrackingPage;

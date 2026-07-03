import React, { useState, useMemo } from 'react';
import { useFormikContext } from 'formik';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Maximize2,
  LayoutList,
  BarChart3,
  Sparkles,
} from 'lucide-react';

const T = {
  bg: 'var(--bg)',
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  sh: 'var(--surface-hover)',
  bd: 'var(--border)',
  bf: 'var(--border-focus)',
  t1: 'var(--text-primary)',
  t2: 'var(--text-secondary)',
  t3: 'var(--text-tertiary)',
  ac: 'var(--accent)',
  al: 'var(--accent-light)',
  ah: 'var(--accent-hover)',
  ap: 'var(--accent-light)',
};

const fmtW = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`);

const DRIVE = [
  { from: 0, to: 1, distKm: 215, durationMin: 165, label: '2h 45min' },
  { from: 1, to: 2, distKm: 248, durationMin: 195, label: '3h 15min' },
];

const WEATHER_MOCK: Record<string, any> = {
  'Ιωάννινα': { icon: '🌤', desc: 'Partly cloudy', tempC: 24, wind: 12, rain: 0 },
  'Λαμία': { icon: '☀️', desc: 'Clear sky', tempC: 28, wind: 8, rain: 0 },
  'Καλύβια': { icon: '🌧', desc: 'Light rain expected', tempC: 22, wind: 18, rain: 65, alert: true },
};
const getWeather = (city: string) => WEATHER_MOCK[city] || { icon: '☀️', desc: 'Clear', tempC: 25, wind: 10, rain: 0 };

interface Step2ItineraryProps {
  onBackStep: () => void;
  onNextStep: () => void;
}

export const Step2Itinerary: React.FC<Step2ItineraryProps> = ({ onBackStep, onNextStep }) => {
  const { t } = useTranslation();
  const { locations } = useApp();
  const { values, setFieldValue } = useFormikContext<any>();
  const stops = values.stops || [];

  const [leftView, setLeftView] = useState<'list' | 'timeline'>('list');
  const [fullMap, setFullMap] = useState(false);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);

  // Auto-calculate stats
  const totalPlt = useMemo(() => {
    let p = 0;
    stops.forEach((s: any) =>
      s.lines.forEach((l: any) => {
        if (l.action === 'pickup') p += parseFloat(l.qty) || 0;
      })
    );
    return p;
  }, [stops]);

  const totalWt = useMemo(() => {
    let w = 0;
    stops.forEach((s: any) =>
      s.lines.forEach((l: any) => {
        if (l.action === 'pickup') {
          const wt = parseFloat(l.weight) || 0;
          w += l.wtUnit === 't' ? wt * 1000 : l.wtUnit === 'lb' ? wt * 0.4536 : wt;
        }
      })
    );
    return w;
  }, [stops]);

  const totalDist = DRIVE.reduce((a, d) => a + d.distKm, 0);
  const totalDrive = DRIVE.reduce((a, d) => a + d.durationMin, 0);
  
  const uniqueCustomers = useMemo(() => {
    const s = new Set<string>();
    stops.forEach((st: any) => st.lines?.forEach((l: any) => l.customerName && s.add(l.customerName)));
    return s;
  }, [stops]);

  const totalOrders = useMemo(() => {
    const s = new Set<string>();
    stops.forEach((st: any) => st.lines?.forEach((l: any) => l.orderId && s.add(l.orderId)));
    return s.size;
  }, [stops]);

  // Drive time warnings
  const driveWarnings = useMemo(() => {
    return DRIVE.map((d) => {
      const prev = stops[d.from];
      const next = stops[d.to];
      if (!prev || !next || !prev.dateTo || !next.dateFrom) return { ...d, level: 'ok' as const, msg: '' };
      const prevEnd = new Date(`${prev.dateTo}T${prev.timeTo || '23:59'}`);
      const nextStart = new Date(`${next.dateFrom}T${next.timeFrom || '00:00'}`);
      const gapMin = (nextStart.getTime() - prevEnd.getTime()) / 60000;
      if (d.durationMin > gapMin) {
        return { ...d, level: 'red' as const, msg: `Drive ${d.label} exceeds ${Math.round(gapMin)}min gap` };
      }
      if (d.durationMin > gapMin * 0.8) {
        return { ...d, level: 'amber' as const, msg: `Drive ${d.label} close to ${Math.round(gapMin)}min gap` };
      }
      return { ...d, level: 'ok' as const, msg: '' };
    });
  }, [stops]);

  // Running weight on truck
  const runningWeights = useMemo(() => {
    let w = 0;
    return stops.map((s: any) => {
      s.lines.forEach((l: any) => {
        const wt = parseFloat(l.weight) || 0;
        const wk = l.wtUnit === 't' ? wt * 1000 : l.wtUnit === 'lb' ? wt * 0.4536 : wt;
        w += l.action === 'pickup' ? wk : -wk;
      });
      return w;
    });
  }, [stops]);

  // Weekend / holiday warnings
  const weekendWarnings = useMemo(() => {
    const hols = ['2026-01-01', '2026-01-06', '2026-03-25', '2026-05-01', '2026-08-15', '2026-10-28', '2026-12-25', '2026-12-26'];
    return stops.map((s: any) => {
      if (!s.dateFrom) return null;
      const dow = new Date(s.dateFrom).getDay();
      if (dow === 0) return 'Sunday — verify location is open';
      if (dow === 6) return 'Saturday — check hours';
      if (hols.includes(s.dateFrom)) return 'Public holiday — may be closed';
      return null;
    });
  }, [stops]);

  const getStopLocationName = (stop: any) => {
    const loc = locations.find((l) => l.id === stop.locationId);
    return loc ? loc.name : stop.locationName || 'Unknown Location';
  };

  const getStopAddress = (stop: any) => {
    const loc = locations.find((l) => l.id === stop.locationId);
    return loc ? loc.address : stop.address || 'Address unselected';
  };

  return (
    <div className="animate-fade-in pb-24">
      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div className="flex gap-4 items-start flex-col lg:flex-row mt-4">
        {/* LEFT COLUMN: Stops timeline or list */}
        <div className="flex-1 w-full min-w-0">
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: T.t2 }} />
                <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                  Route Stops
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold cursor-pointer border-none px-2.5 py-1 rounded"
                  style={{ background: T.al, color: T.ac, fontFamily: 'inherit' }}
                  onClick={onBackStep}
                >
                  Edit Itinerary
                </button>
              </div>
            </div>

            {/* Stop list view */}
            <div className="px-4 py-3">
              {stops.map((stop: any, si: number) => {
                const hasPickup = stop.lines.some((l: any) => l.action === 'pickup');
                const hasDropoff = stop.lines.some((l: any) => l.action === 'dropoff');
                const ww = weekendWarnings[si];
                const isExp = expandedStop === si;
                const rw = runningWeights[si];

                return (
                  <div key={stop.id}>
                    <div
                      className="flex gap-3 pb-4"
                      style={{
                        borderLeft: si < stops.length - 1 ? `2px solid ${T.ac}` : '2px solid transparent',
                        marginLeft: 14,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 -ml-[15px]"
                        style={{ background: '#059669' }}
                      >
                        {si + 1}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedStop(isExp ? null : si)}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {hasPickup && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: '#DBEAFE', color: '#2563EB' }}
                            >
                              PICKUP
                            </span>
                          )}
                          {hasDropoff && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: '#D1FAE5', color: '#059669' }}
                            >
                              DROPOFF
                            </span>
                          )}
                          {stop.appointmentMode === 'self_scheduling' ? (
                            <>
                              <span className="text-[10px]" style={{ color: T.t3 }}>
                                📅 {stop.windowStart} → {stop.windowEnd}
                              </span>
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                                style={{ background: '#F3F0FF', color: '#5E3BEE', border: '1px solid #E0DBFF' }}
                              >
                                Self-scheduling
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px]" style={{ color: T.t3 }}>
                              📅 {stop.dateFrom} · {stop.timeFrom}
                              {stop.timeTo ? ` – ${stop.timeTo}` : ''}
                            </span>
                          )}
                          {ww && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#D97706' }}>
                              ⚠ {ww}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold" style={{ color: T.t1 }}>
                          {getStopLocationName(stop)}
                        </div>
                        <div className="text-[11px] mb-1" style={{ color: T.t3 }}>
                          {getStopAddress(stop)}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-semibold" style={{ color: rw > 28000 ? '#DC2626' : T.t3 }}>
                            On Truck: {(rw / 1000).toFixed(1)}T
                          </span>
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: T.sa, maxWidth: 120 }}>
                            <div
                              style={{
                                width: `${Math.min((rw / 28000) * 100, 100)}%`,
                                height: '100%',
                                background: rw > 28000 ? '#DC2626' : rw > 20000 ? '#D97706' : '#059669',
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExp && (
                      <div className="pl-8 pb-4">
                        {stop.lines.map((l: any, li: number) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between text-xs py-1"
                            style={{ borderBottom: li < stop.lines.length - 1 ? `1px dashed ${T.bd}` : 'none' }}
                          >
                            <div>
                              <span
                                className="font-bold text-[10px] uppercase px-1 rounded mr-2"
                                style={{
                                  background: l.action === 'pickup' ? '#DBEAFE' : '#D1FAE5',
                                  color: l.action === 'pickup' ? '#2563EB' : '#059669',
                                }}
                              >
                                {l.action}
                              </span>
                              <span className="font-semibold" style={{ color: T.t1 }}>
                                {l.productName}
                              </span>
                            </div>
                            <span style={{ color: T.t2 }}>
                              {l.qty} {l.unit} · {l.weight} {l.wtUnit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Confirmation indicator */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${T.bd}`, background: T.sa }}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t2, fontFamily: 'inherit' }}
                onClick={onBackStep}
              >
                Go Back & Edit
              </button>
              {!values.itineraryConfirmed ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-white border-none"
                  style={{ background: '#059669', fontFamily: 'inherit' }}
                  onClick={() => {
                    setFieldValue('itineraryConfirmed', true);
                  }}
                >
                  <Check size={13} /> Confirm Itinerary
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: '#059669' }}>
                  <Check size={14} /> Itinerary Confirmed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Map & Summary */}
        <div className="w-full lg:w-[360px] shrink-0" style={{ position: 'sticky', top: 16 }}>
          <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <span className="text-[11px] font-semibold" style={{ color: T.ac }}>
                Google Maps Route
              </span>
              <button
                type="button"
                className="border-none bg-transparent cursor-pointer p-1"
                style={{ color: T.t3 }}
                onClick={() => setFullMap(!fullMap)}
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center" style={{ height: fullMap ? 340 : 200, background: T.sa }}>
              <MapPin size={36} style={{ color: T.t3, opacity: 0.3 }} />
              <div className="text-xs mt-2 truncate max-w-[280px]" style={{ color: T.t3 }}>
                {stops.map((s: any) => s.locationCity || getStopLocationName(s).split(' ')[0]).join(' → ')}
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <Sparkles size={14} style={{ color: T.t2 }} />
              <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                Trip Summary
              </span>
            </div>
            <div className="grid grid-cols-2">
              {[
                { label: 'Distance', value: `${totalDist} km` },
                { label: 'Drive Time', value: `${Math.floor(totalDrive / 60)}h ${totalDrive % 60}min` },
                { label: 'Stops Count', value: String(stops.length) },
                { label: 'Total Cargo Weight', value: fmtW(totalWt) },
                { label: 'Unique Customers', value: `${uniqueCustomers.size} 🏪` },
                { label: 'Orders count', value: String(totalOrders) },
              ].map((s, i) => (
                <div
                  key={i}
                  className="px-4 py-3"
                  style={{
                    borderBottom: i < 4 ? `1px solid ${T.bd}` : 'none',
                    borderRight: i % 2 === 0 ? `1px solid ${T.bd}` : 'none',
                  }}
                >
                  <div className="text-[9px] font-bold uppercase" style={{ color: T.t3 }}>
                    {s.label}
                  </div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: T.t1 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer continue control */}
      <footer
        className="fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 hidden md:flex"
        style={{ left: 'var(--sidebar-w, 240px)', background: T.sf, borderTop: `1px solid ${T.bd}` }}
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t2, fontFamily: 'inherit' }}
          onClick={onBackStep}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white border-none"
          style={{
            background: values.itineraryConfirmed ? T.ac : T.bf,
            cursor: values.itineraryConfirmed ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
          disabled={!values.itineraryConfirmed}
          onClick={onNextStep}
        >
          Continue
          <ArrowRight size={14} />
        </button>
      </footer>
    </div>
  );
};

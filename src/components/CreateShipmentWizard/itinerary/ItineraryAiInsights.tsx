import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Fuel,
  Leaf,
  Lightbulb,
  Sparkles,
  Timer,
} from 'lucide-react';
import { getMockWeather } from './scheduleWarnings';
import { formatWeightKg } from './cargoUtils';
import type { EnrichedStop } from './types';

interface ItineraryAiInsightsProps {
  totalDistKm: number;
  totalDriveMin: number;
  totalWeightKg: number;
  totalPallets: number;
  enrichedStops: EnrichedStop[];
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const ItineraryAiInsights: React.FC<ItineraryAiInsightsProps> = ({
  totalDistKm,
  totalDriveMin,
  totalWeightKg,
  totalPallets,
  enrichedStops,
  t,
}) => {
  const tachWarning = totalDriveMin > 270;
  const co2Kg = useMemo(
    () => Math.round(totalDistKm * (totalWeightKg / 1000) * 0.062),
    [totalDistKm, totalWeightKg]
  );
  const histPrice = useMemo(
    () => ({
      min: Math.round(totalDistKm * 1.05),
      max: Math.round(totalDistKm * 1.45),
      avg: Math.round(totalDistKm * 1.25),
      loads: 23,
    }),
    [totalDistKm]
  );
  const utilization = totalPallets > 0 ? Math.round((totalPallets / 33) * 100) : 0;

  const weatherAlerts = useMemo(() => {
    return enrichedStops
      .map((s) => ({
        city: s.resolvedCity || s.resolvedName,
        weather: getMockWeather(s.resolvedCity, s.locationId),
      }))
      .filter((w) => w.weather.alert);
  }, [enrichedStops]);

  const T = {
    sf: 'var(--surface)',
    sa: 'var(--surface-alt)',
    bd: 'var(--border)',
    t1: 'var(--text-primary)',
    t2: 'var(--text-secondary)',
    t3: 'var(--text-tertiary)',
  };

  return (
    <div className="rounded-xl overflow-hidden mt-6" style={{ border: `1px solid ${T.bd}`, background: T.sf }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
        <Sparkles size={16} style={{ color: '#D97706' }} />
        <span className="text-sm font-semibold" style={{ color: T.t1 }}>
          {t('step2AiRouteAnalysis')}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEF3C7', color: '#D97706' }}>
          AI
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-5 py-4">
        <div className="p-3 rounded-lg" style={{ background: T.sa }}>
          <div className="flex items-center gap-2 mb-2">
            <Fuel size={14} style={{ color: '#2563EB' }} />
            <span className="text-[11px] font-bold uppercase" style={{ color: '#2563EB' }}>
              {t('step2TollEstimate')}
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: T.t1 }}>
            €{(totalDistKm * 0.18).toFixed(0)}
            <span className="text-xs font-normal" style={{ color: T.t3 }}>
              {' '}
              – €{(totalDistKm * 0.25).toFixed(0)}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg" style={{ background: tachWarning ? '#FEF3C7' : T.sa }}>
          <div className="flex items-center gap-2 mb-2">
            <Timer size={14} style={{ color: tachWarning ? '#D97706' : '#059669' }} />
            <span className="text-[11px] font-bold uppercase" style={{ color: tachWarning ? '#D97706' : '#059669' }}>
              {t('step2EuTachograph')}
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: T.t1 }}>
            {Math.floor(totalDriveMin / 60)}h {totalDriveMin % 60}min
          </div>
          {tachWarning ? (
            <div className="text-[10px] mt-1 flex items-start gap-1" style={{ color: '#D97706' }}>
              <AlertTriangle size={10} className="shrink-0 mt-0.5" />
              {t('step2TachExceeds')}
            </div>
          ) : (
            <div className="text-[10px] mt-1" style={{ color: '#059669' }}>
              {t('step2TachOk')} ✓
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg" style={{ background: T.sa }}>
          <div className="flex items-center gap-2 mb-2">
            <Leaf size={14} style={{ color: '#059669' }} />
            <span className="text-[11px] font-bold uppercase" style={{ color: '#059669' }}>
              {t('step2Co2Emissions')}
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: T.t1 }}>
            {co2Kg} kg<span className="text-xs font-normal" style={{ color: T.t3 }}> CO₂</span>
          </div>
        </div>

        <div className="p-3 rounded-lg" style={{ background: T.sa }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} style={{ color: '#7C3AED' }} />
            <span className="text-[11px] font-bold uppercase" style={{ color: '#7C3AED' }}>
              {t('step2MarketRate')}
            </span>
          </div>
          <div className="text-xl font-bold" style={{ color: T.t1 }}>
            €{histPrice.avg}
            <span className="text-xs font-normal" style={{ color: T.t3 }}>
              {' '}
              {t('step2Avg')}
            </span>
          </div>
          <div className="text-[10px] mt-1" style={{ color: T.t3 }}>
            €{histPrice.min}–€{histPrice.max} · {histPrice.loads} {t('step2SimilarLoads')}
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="p-3 rounded-lg" style={{ background: T.sa }}>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} style={{ color: '#7C3AED' }} />
            <span className="text-[11px] font-bold uppercase" style={{ color: '#7C3AED' }}>
              {t('step2Recommendations')}
            </span>
          </div>
          <div className="space-y-1.5">
            {utilization > 0 && (
              <div className="text-[10px] flex items-start gap-1" style={{ color: T.t2 }}>
                <span style={{ color: '#059669' }}>✓</span>
                {utilization}% {t('step2UtilizationEfficiency')}
              </div>
            )}
            <div className="text-[10px] flex items-start gap-1" style={{ color: T.t2 }}>
              <span style={{ color: '#2563EB' }}>ℹ</span>
              {t('step2OvernightRest')}
            </div>
            <div className="text-[10px] flex items-start gap-1" style={{ color: T.t2 }}>
              <span style={{ color: '#059669' }}>✓</span>
              {t('step2CarbonBelow')}
            </div>
            {weatherAlerts.map(({ city, weather }) => (
              <div key={city} className="text-[10px] flex items-start gap-1" style={{ color: '#D97706' }}>
                <AlertTriangle size={9} className="shrink-0 mt-0.5" />
                {weather.icon} {t('step2WeatherAlert')} {city}: {weather.desc} — {weather.rain}% rain.
              </div>
            ))}
          </div>
          <div className="text-[10px] mt-2" style={{ color: T.t3 }}>
            {t('step2TotalCargo')}: {formatWeightKg(totalWeightKg)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryAiInsights;

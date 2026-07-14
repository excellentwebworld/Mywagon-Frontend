import React, { useState } from 'react';
import type { ShipmentStop } from '../../context/AppContext';

interface ItineraryPreviewProps {
  stops?: ShipmentStop[];
  origin?: string;
  dest?: string;
  pickDt?: string | null;
  delDt?: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const ItineraryPreview: React.FC<ItineraryPreviewProps> = ({
  stops,
  origin,
  dest,
  pickDt,
  delDt,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);

  const lines =
    stops && stops.length > 0
      ? stops.map((stop) => {
          const when = [stop.date, stop.timeStart].filter(Boolean).join(' ');
          const typeLabel = stop.type === 'pickup' ? t('pickup') : t('delivery');
          return `${typeLabel} · ${stop.location}${when ? ` · ${when}` : ''}`;
        })
      : [
          `${t('pickup')} · ${origin || '—'}${pickDt ? ` · ${pickDt}` : ''}`,
          `${t('delivery')} · ${dest || '—'}${delDt ? ` · ${delDt}` : ''}`,
        ];

  const collapsible = lines.length > 2;
  const visible = collapsible && !expanded ? lines.slice(0, 2) : lines;

  return (
    <div className="exp-section itinerary-preview" style={{ marginTop: 16 }}>
      <h4>{t('itinerary')}</h4>
      <ul className="itinerary-list">
        {visible.map((line, idx) => (
          <li key={`${line}-${idx}`}>{line}</li>
        ))}
      </ul>
      {collapsible && (
        <button type="button" className="itinerary-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('hideStops') : t('showAllStops', { count: lines.length })}
        </button>
      )}
    </div>
  );
};

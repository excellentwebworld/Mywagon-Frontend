import React, { useEffect, useState } from 'react';
import { shipmentsService } from '../../api/services/shipmentsService';
import type { ApiNegotiationHistoryItem } from '../../api/types/shipments';
import { formatEuro } from '../../pages/ManageShipments/utils/listingUtils';

type ExpTranslate = (key: string, opts?: Record<string, unknown>) => string;

interface NegotiationHistoryPanelProps {
  open: boolean;
  shipmentId: string | number;
  offerId: string;
  t: ExpTranslate;
}

function formatHistoryDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function typeLabel(type: string, t: ExpTranslate): string {
  const key = String(type || '').toLowerCase();
  if (key === 'bid') return t('negotiationBidPlaced');
  if (key === 'counter_offer') return t('negotiationCounterOffer');
  if (key === 'interest') return t('negotiationInterest');
  if (key === 'reject') return t('negotiationRejected');
  return type || t('negotiationEvent');
}

/** Inline expand/collapse timeline (no modal overlay). */
export const NegotiationHistoryPanel: React.FC<NegotiationHistoryPanelProps> = ({
  open,
  shipmentId,
  offerId,
  t,
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApiNegotiationHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const key = `${shipmentId}:${offerId}`;
    if (fetchedKey === key) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    void shipmentsService
      .getOfferNegotiationHistory(shipmentId, offerId)
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
        setFetchedKey(key);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('negotiationHistoryLoadFailed'));
        setFetchedKey(key);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, offerId, shipmentId, fetchedKey, t]);

  if (!open) return null;

  return (
    <div className="neg-hist-panel" aria-label={t('negotiationHistory')}>
      <div className="neg-hist-panel-title">{t('negotiationHistory')}</div>
      {loading ? <div className="neg-hist-empty">{t('loading')}…</div> : null}
      {!loading && error ? <div className="neg-hist-empty">{error}</div> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="neg-hist-empty">{t('negotiationHistoryEmpty')}</div>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <ul className="neg-hist-timeline">
          {items.map((item) => {
            const label = typeLabel(item.type, t);
            const name = item.initiated_by_name || t('unknown');
            const isCounter = String(item.type).toLowerCase() === 'counter_offer';
            return (
              <li key={item.id} className="neg-hist-item">
                <span className={`neg-hist-icon${isCounter ? ' is-counter' : ' is-bid'}`} aria-hidden>
                  {isCounter ? '⇄' : '€'}
                </span>
                <div className="neg-hist-main">
                  <div className="neg-hist-row">
                    <span className="neg-hist-label">
                      {label} {t('by')} {name}
                    </span>
                    <span className="neg-hist-date">{formatHistoryDate(item.created_at)}</span>
                  </div>
                  {item.price != null ? (
                    <div className="neg-hist-price">{formatEuro(item.price)}</div>
                  ) : null}
                  {item.notes ? <div className="neg-hist-notes">{item.notes}</div> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

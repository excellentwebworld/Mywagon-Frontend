import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { ShipmentStop } from '../../context/AppContext';

interface Step2ItineraryProps {
  stops: ShipmentStop[];
  onEditStep: (stepNumber: number) => void;
}

export const Step2Itinerary: React.FC<Step2ItineraryProps> = ({ stops, onEditStep }) => {
  const { t } = useTranslation();
  const { locations } = useApp();
  const [mapTab, setMapTab] = useState<'map' | 'sat'>('map');
  const [expandedStopId, setExpandedStopId] = useState<number | null>(null);

  // Auto-compute trip parameters from stops state
  const totalStops = stops.length;
  const totalWeight = stops.reduce((sum, stop) => {
    return (
      sum +
      stop.customers.reduce((cSum, cust) => {
        return (
          cSum +
          cust.orders.reduce((oSum, ord) => {
            const wt = ord.weight || 0;
            return oSum + (ord.weightUnit === 'Kg' ? wt / 1000 : wt);
          }, 0)
        );
      }, 0)
    );
  }, 0);

  // Group orders for the orders list right sidebar
  const uniqueCustomers = Array.from(
    new Set(
      stops.flatMap((s) => s.customers.map((c) => c.name)).filter((name) => name !== '')
    )
  );

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

  const getStopCity = (stop: ShipmentStop) => {
    const loc = locations.find((l) => l.id === stop.location);
    return loc ? loc.city : 'Unknown';
  };

  return (
    <div className="animate-fade-in wizard-grid">
      {/* LEFT: Timeline Panel */}
      <article className="card">
        <div className="ch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{t('routeStops')}</span>
          <div className="ch-r">
            <button className="edit-btn" onClick={() => onEditStep(1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>{t('edit')}</span>
            </button>
          </div>
        </div>

        <div className="timeline" role="list">
          {stops.map((stop, idx) => {
            const isPk = idx === 0;
            const dotCls = isPk ? 'pk' : 'dl';
            const badgeLabel = isPk ? t('pickupUpper') : t('deliveryUpper');
            const locName = getStopLocationName(stop);
            const locAddr = stop.address;
            const isExpanded = expandedStopId === stop.id;

            const timeStr = stop.timeEnd
              ? `${stop.date} · ${stop.timeStart} – ${stop.timeEnd}`
              : `${stop.date} · ${stop.timeStart}`;

            return (
              <div
                key={stop.id}
                className={`stop-row ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedStopId(isExpanded ? null : stop.id)}
              >
                <div className="tl-col">
                  <div className={`tl-dot ${dotCls}`}></div>
                  <div className="tl-line"></div>
                  <span className="tl-num">#{idx + 1}</span>
                </div>
                <div className="stop-content">
                  <div className="stop-meta">
                    <span className={`stop-badge ${dotCls}`}>{badgeLabel}</span>
                    <span className="stop-dt">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {timeStr}
                    </span>
                  </div>
                  <div className="stop-loc">{locName}</div>
                  <div className="stop-addr">{locAddr}</div>

                  {/* Collapsed view customer tags summary */}
                  {!isExpanded && stop.customers.length > 0 && (
                    <div className="stop-cust-summary">
                      {stop.customers.slice(0, 2).map((c, cIdx) => (
                        <span key={cIdx} className="cust-pill">
                          <span className="cust-ico">🏪</span>
                          {c.name || t('optional')}
                        </span>
                      ))}
                      {stop.customers.length > 2 && (
                        <span className="cust-pill-more">+{stop.customers.length - 2}</span>
                      )}
                    </div>
                  )}

                  {/* Expanded detail */}
                  <div className="stop-detail">
                    {stop.customers.map((cust, cIdx) => (
                      <div key={cIdx} className="cust-group">
                        <div className="cust-group-head">
                          <span className="cust-ico">🏪</span>
                          <span className="cust-group-name">{cust.name || t('noCustomerAssigned')}</span>
                        </div>
                        {cust.orders.map((order, oIdx) => (
                          <div key={oIdx} className="cust-order">
                            <div className="stop-chips">
                              <span className="chip">{order.products || 'General Cargo'}</span>
                              <span className="chip">
                                {t('quantity')}: <b>{order.qty} {order.qtyUnit}</b>
                              </span>
                              <span className="chip">
                                {t('weight')}: <b>{order.weight} {order.weightUnit}</b>
                              </span>
                            </div>
                            <div className="order-link">{order.id || 'No Order ID'}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      {/* RIGHT PANEL */}
      <aside className="right-panel">
        {/* Route Map */}
        <section className="card">
          <div className="map-tabs" role="tablist">
            <button
              className={`map-tab ${mapTab === 'map' ? 'act' : ''}`}
              onClick={() => setMapTab('map')}
            >
              {t('map')}
            </button>
            <button
              className={`map-tab ${mapTab === 'sat' ? 'act' : ''}`}
              onClick={() => setMapTab('sat')}
            >
              {t('satellite')}
            </button>
          </div>
          <iframe
            title="Wizard Map View"
            src={
              mapTab === 'sat'
                ? 'https://www.openstreetmap.org/export/embed.html?bbox=20.4%2C37.9%2C24.1%2C40.1&layer=cyclemap'
                : 'https://www.openstreetmap.org/export/embed.html?bbox=20.5%2C38.0%2C24.0%2C40.0&layer=mapnik'
            }
            style={{ width: '100%', height: '300px', border: 0 }}
          ></iframe>
          <div style={{ padding: '10px 16px', background: 'var(--surface-hover)', fontSize: '11px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            📍 {stops.map(getStopCity).join(' → ')}
          </div>
        </section>

        {/* Trip Summary statistics */}
        <section className="card">
          <div className="ch ch-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>{t('tripSummary')}</span>
          </div>
          <div className="ts-grid">
            <div className="ts-cell">
              <div className="ts-label">{t('distanceUpper')}</div>
              <div className="ts-val">
                463 <span className="unit">km</span>
              </div>
            </div>
            <div className="ts-cell">
              <div className="ts-label">{t('timeUpper')}</div>
              <div className="ts-val">
                4<span className="unit">{t('hoursShort')}</span> 57
                <span className="unit">{t('minutesShort')}</span>
              </div>
            </div>
            <div className="ts-cell">
              <div className="ts-label">{t('stopsUpper')}</div>
              <div className="ts-val">{totalStops}</div>
            </div>
            <div className="ts-cell">
              <div className="ts-label">{t('totalWeightUpper')}</div>
              <div className="ts-val">
                {totalWeight.toFixed(1)} <span className="unit">T</span>
              </div>
            </div>
          </div>
        </section>

        {/* Orders box */}
        <section className="card">
          <div className="ch ch-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>{t('orders')}</span>
            <div className="ch-r">
              <span>
                {allOrdersList.length} {t('ordersWord')}
              </span>
            </div>
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {uniqueCustomers.length > 0 ? (
              uniqueCustomers.map((custName, idx) => {
                const custOrders = allOrdersList.filter((o) => o.customerName === custName);
                if (custOrders.length === 0) return null;
                const custTotalWt = custOrders.reduce((sum, o) => sum + (o.weight || 0), 0);
                return (
                  <div key={idx} className="oc-cust-group">
                    <div className="oc-cust-head">
                      <span className="oc-cust-ico">🏪</span>
                      <span className="oc-cust-name">{custName}</span>
                      <span className="oc-cust-total">{custTotalWt} T</span>
                    </div>
                    {custOrders.map((o, oIdx) => (
                      <div key={oIdx} className="order-item">
                        <div>
                          <div className="oi-id">{o.id || 'No Order ID'}</div>
                          <div className="oi-route">
                            <span className="oi-pk">#{o.stopIndex} {o.stopType === 'pickup' ? t('stopLoadingShort') : t('stopDeliveryShort')}</span>
                          </div>
                        </div>
                        <div className="oi-wt">{o.weight} T</div>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : (
              allOrdersList.map((o, oIdx) => (
                <div key={oIdx} className="order-item ungrouped">
                  <div>
                    <div className="oi-id">{o.id || 'No Order ID'}</div>
                    <div className="oi-route">
                      <span className="oi-pk">#{o.stopIndex} {o.stopType === 'pickup' ? t('stopLoadingShort') : t('stopDeliveryShort')}</span>
                    </div>
                  </div>
                  <div className="oi-wt">{o.weight} T</div>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
};

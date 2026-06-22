import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/erp-orders.css';
import { useErpOrders } from './hooks/useErpOrders';
import type { ErpOrder, Stop, StopOrder, StopProduct } from './types';

// Custom clean inline SVG icons matching the mockup design
const svgPin = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const svgCargo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const svgChevron = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const svgTrash = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const svgCheck = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const svgSearch = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ST_CLS: { [key: string]: string } = {
  New: "st-new",
  "Ready to Plan": "st-ready",
  Planned: "st-planned",
  "In Transit": "st-transit",
  Completed: "st-completed",
  Canceled: "st-canceled",
  Exception: "st-exception"
};

export const ErpOrders: React.FC = () => {
  const store = useErpOrders();

  // Escape key handler to close panel sidebars/drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (store.drawerOrderId) {
          store.closeDrawer();
        } else if (store.viewMode === 'itin') {
          store.setViewMode('create');
        } else if (store.viewMode === 'create') {
          store.setViewMode('orders');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  // Date Formatter Utilities
  const getDayName = (dateStr: string | Date) => {
    if (!dateStr) return '';
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  };

  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return '';
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return `${getDayName(d)}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const fmtD = (d: Date) => {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtDT = (d: Date) => {
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Pagination totals
  const totalFiltered = store.filteredOrders.length;
  const totalPages = Math.ceil(totalFiltered / 20) || 1;
  const paginatedOrders = useMemo(() => {
    const startIdx = (store.page - 1) * 20;
    return store.filteredOrders.slice(startIdx, startIdx + 20);
  }, [store.filteredOrders, store.page]);

  // Autocomplete context search inputs
  const [locSearch, setLocSearch] = useState('');
  const [focusedStopId, setFocusedStopId] = useState<number | null>(null);

  const [orderSearch, setOrderSearch] = useState('');
  const [focusedOrder, setFocusedOrder] = useState<{ stopId: number; orderId: number } | null>(null);

  // New item modal inputs
  const [newOrderRef, setNewOrderRef] = useState('');
  const [newOrderCust, setNewOrderCust] = useState('');
  const [newOrderNotes, setNewOrderNotes] = useState('');

  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCat, setNewProdCat] = useState('');
  const [newProdWpu, setNewProdWpu] = useState('');

  const [newLocName, setNewLocName] = useState('');
  const [newLocAddr, setNewLocAddr] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [newLocCountry, setNewLocCountry] = useState('Greece');

  // Active Vehicle specifications label calculations
  const vehicleLabel = useMemo(() => {
    const types: string[] = [];
    Object.entries(store.vehicleSelections).forEach(([vid, v]) => {
      if (v.selected) {
        types.push(vid === 'semi' ? 'Semi-Trailer' : vid === 'curtain' ? 'Truck with Trailer' : vid === 'rigid' ? 'Rigid Truck' : 'Van');
      }
    });
    return types.join(', ') || 'None';
  }, [store.vehicleSelections]);

  const cargoSpecsLabel = useMemo(() => {
    const specs: string[] = [];
    Object.entries(store.vehicleSelections).forEach(([vid, v]) => {
      if (v.selected) {
        Object.entries(v.cats).forEach(([cat, cd]: any) => {
          Object.entries(cd.items).forEach(([itemKey, itemVal]: any) => {
            if (itemVal) {
              const label = itemKey === 'curtainside' ? 'Curtainside' : itemKey === 'temp' ? 'Temp-controlled' : itemKey === 'refr' ? 'Refrigerated' : itemKey;
              specs.push(label.charAt(0).toUpperCase() + label.slice(1));
            }
          });
        });
      }
    });
    return specs.slice(0, 3).join(', ') + (specs.length > 3 ? ` +${specs.length - 3} more` : '') || 'None';
  }, [store.vehicleSelections]);

  // Selected Order for drawer details
  const activeDrawerOrder = useMemo(() => {
    return store.orders.find(o => o.id === store.drawerOrderId) || null;
  }, [store.orders, store.drawerOrderId]);

  // View 3 Summary Data
  const itinerarySummary = useMemo(() => {
    let totalWt = 0;
    let pCount = 0;
    const allOrders: any[] = [];
    const routeParts: string[] = [];

    store.clState.stops.forEach((s, idx) => {
      if (s.locationName) {
        routeParts.push(s.locationName.split(' ')[0]);
      }
      const allOrds = s.customers.flatMap(c => c.orders).concat(s.orders || []);
      allOrds.forEach(o => {
        if (o.ref && !allOrders.find(a => a.ref === o.ref)) {
          const pkStop = store.clState.stops.find(st =>
            st.customers.flatMap(c => c.orders).concat(st.orders || []).some(or => or.ref === o.ref && or.products.some(p => p.action === 'pickup'))
          );
          const dlStop = store.clState.stops.find(st =>
            st.customers.flatMap(c => c.orders).concat(st.orders || []).some(or => or.ref === o.ref && or.products.some(p => p.action === 'dropoff'))
          );

          let wt = 0;
          o.products.forEach(p => {
            wt += parseFloat(p.weight as string) || 0;
          });

          allOrders.push({
            ref: o.ref,
            pk: pkStop?.locationName || 'Origin',
            dl: dlStop?.locationName || 'Destination',
            wt
          });
        }

        o.products.forEach(p => {
          totalWt += parseFloat(p.weight as string) || 0;
          pCount++;
        });
      });
    });

    const distance = 480; // random mock distance
    const hours = Math.floor(distance / 75);
    const mins = 15;

    return {
      totalWt,
      pCount,
      allOrders,
      route: routeParts.filter(Boolean).join(' → ') || 'Route',
      distance,
      hours,
      mins
    };
  }, [store.clState.stops]);

  // Handler for confirm creations
  const handleConfirmOrder = () => {
    store.confirmCreateOrder(newOrderRef, newOrderCust, newOrderNotes);
    setNewOrderRef('');
    setNewOrderCust('');
    setNewOrderNotes('');
  };

  const handleConfirmProduct = () => {
    store.confirmCreateProduct(newProdName, newProdSku, newProdCat, parseFloat(newProdWpu) || 0);
    setNewProdName('');
    setNewProdSku('');
    setNewProdCat('');
    setNewProdWpu('');
  };

  const handleConfirmLocation = () => {
    store.confirmCreateLocation(newLocName, newLocAddr, newLocCity, newLocCountry);
    setNewLocName('');
    setNewLocAddr('');
    setNewLocCity('');
    setNewLocCountry('Greece');
  };

  // Toggle vehicle nodes
  const toggleVehicleCardSelect = (vid: string) => {
    store.setVehicleSelections((prev: any) => {
      const next = { ...prev };
      const selected = !next[vid].selected;
      next[vid] = {
        ...next[vid],
        selected,
        cats: Object.keys(next[vid].cats).reduce((acc: any, catKey) => {
          acc[catKey] = {
            selected,
            items: Object.keys(next[vid].cats[catKey].items).reduce((iAcc: any, itemKey) => {
              iAcc[itemKey] = selected;
              return iAcc;
            }, {})
          };
          return acc;
        }, {})
      };
      return next;
    });
  };

  const toggleVehicleSubCategory = (vid: string, cat: string) => {
    store.setVehicleSelections((prev: any) => {
      const next = { ...prev };
      const targetCat = next[vid].cats[cat];
      const nextSelected = !targetCat.selected;

      next[vid].cats[cat] = {
        selected: nextSelected,
        items: Object.keys(targetCat.items).reduce((acc: any, itemKey) => {
          acc[itemKey] = nextSelected;
          return acc;
        }, {})
      };

      // Set vehicle card checked if at least one subcategory is checked
      const anyCatSelected = Object.values(next[vid].cats).some((c: any) => c.selected);
      next[vid].selected = anyCatSelected;

      return next;
    });
  };

  const toggleVehicleItem = (vid: string, cat: string, itemKey: string) => {
    store.setVehicleSelections((prev: any) => {
      const next = { ...prev };
      const itemVal = !next[vid].cats[cat].items[itemKey];
      next[vid].cats[cat].items[itemKey] = itemVal;

      // Sync category parent check
      const itemsList = Object.values(next[vid].cats[cat].items);
      const allChecked = itemsList.every(v => v);
      next[vid].cats[cat].selected = allChecked;

      // Sync vehicle card parent check
      const anyItemChecked = Object.values(next[vid].cats).some((c: any) =>
        Object.values(c.items).some(v => v)
      );
      next[vid].selected = anyItemChecked;

      return next;
    });
  };

  // Submit Itinerary workflow (Mock save and toast message)
  const submitItineraryDetails = () => {
    store.setViewMode('orders');
    store.clearSel();
    store.showToast('Shipment created successfully!', 'success');
  };

  return (
    <div className="erp-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* VIEW 1: ERP ORDERS DASHBOARD */}
      {store.viewMode === 'orders' && (
        <div className="anim" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Page Hero Header */}
          <div className="pg-head">
            <div className="pg-head-l">
              <div className="pg-t">ERP Orders</div>
              <div className="pg-s" id="pgSub">
                {store.orders.length} orders synced from 4 ERP systems
              </div>
            </div>
            <div className="pg-head-r">
              <button
                className="btn"
                onClick={() => store.showToast('Exported CSV', 'success')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              <button
                className="btn btn-p"
                id="btnCL"
                disabled={!store.selectedOrders.size}
                onClick={store.goToCreateLoad}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Load
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="kpi-strip">
            {store.kpis.map((x: any) => (
              <div
                key={x.key}
                className={`kpi-card${store.activeKpi === x.key ? ' act' : ''}`}
                onClick={() => store.toggleKpi(x.key)}
              >
                <div className="kpi-val" style={{ color: x.color }}>
                  {x.val}
                </div>
                <div className="kpi-lbl">
                  <span className="kpi-dot" style={{ background: x.color }}></span>
                  {x.label}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs row */}
          <div className="tabs-row">
            {(
              [
                { k: 'work', l: 'Work Queue', n: store.tabCounts.work },
                { k: 'all', l: 'All Orders', n: store.tabCounts.all },
                { k: 'completed', l: 'Completed', n: store.tabCounts.completed },
                { k: 'exceptions', l: 'Exceptions', n: store.tabCounts.exceptions }
              ] as const
            ).map(t => (
              <div
                key={t.k}
                className={`tab-i${store.activeTab === t.k ? ' act' : ''}`}
                onClick={() => store.setActiveTab(t.k)}
              >
                {t.l}
                <span className="tab-cnt">{t.n}</span>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="fbar">
            <div className="f-search">
              {svgSearch}
              <input
                type="text"
                placeholder="Search ID, order, customer..."
                value={store.searchQ}
                onChange={e => store.setSearchQ(e.target.value)}
              />
            </div>

            <button
              className={`f-pill${store.filters.urgent ? ' has' : ''}`}
              onClick={() => store.toggleFilter('urgent')}
            >
              ⚡ Urgent Only
            </button>
            <button
              className={`f-pill${store.filters.noload ? ' has' : ''}`}
              onClick={() => store.toggleFilter('noload')}
            >
              🚛 No load assigned
            </button>
            <button
              className={`f-pill${store.filters.sync ? ' has' : ''}`}
              onClick={() => store.toggleFilter('sync')}
            >
              🔄 Sync issues
            </button>

            {(store.searchQ || store.filters.urgent || store.filters.noload || store.filters.sync || store.activeKpi) && (
              <span className="f-clear" onClick={store.clearFilters}>
                ✕ Clear all
              </span>
            )}
          </div>

          {/* Selected Action Bar */}
          {store.selectedOrders.size > 0 && (
            <div className="sel-bar">
              <span>
                <b>{store.selectedOrders.size}</b> order{store.selectedOrders.size > 1 ? 's' : ''} selected
              </span>
              <button className="btn btn-sm" onClick={store.goToCreateLoad}>
                Create Load
              </button>
              <button className="btn btn-sm" onClick={store.clearSel}>
                ✕ Clear
              </button>
            </div>
          )}

          {/* Scrollable Data Table Wrapper */}
          <div className="tbl-wrap">
            <div className="tbl-scroll">
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="chk"
                        checked={paginatedOrders.length > 0 && paginatedOrders.every((o: ErpOrder) => store.selectedOrders.has(o.id))}
                        onChange={e => store.toggleAll(e.target.checked)}
                      />
                    </th>
                    <th onClick={() => store.doSort('id')} className={store.sortField === 'id' ? 'sorted' : ''}>
                      Order ID / ERP <span className="s-arr">{store.sortField === 'id' ? (store.sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </th>
                    <th onClick={() => store.doSort('customer')} className={store.sortField === 'customer' ? 'sorted' : ''}>
                      Customer <span className="s-arr">{store.sortField === 'customer' ? (store.sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th onClick={() => store.doSort('sDate')} className={store.sortField === 'sDate' ? 'sorted' : ''}>
                      Ship Date <span className="s-arr">{store.sortField === 'sDate' ? (store.sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </th>
                    <th>Product details</th>
                    <th onClick={() => store.doSort('status')} className={store.sortField === 'status' ? 'sorted' : ''}>
                      Status <span className="s-arr">{store.sortField === 'status' ? (store.sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </th>
                    <th>Load ID</th>
                    <th onClick={() => store.doSort('lastSync')} className={store.sortField === 'lastSync' ? 'sorted' : ''}>
                      Sync <span className="s-arr">{store.sortField === 'lastSync' ? (store.sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary, #8E8E9A)' }}>
                        No orders match filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((o: ErpOrder) => (
                      <tr
                        key={o.id}
                        className={store.selectedOrders.has(o.id) ? 'sel' : ''}
                        onClick={() => store.openDrawer(o.id)}
                      >
                        <td onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="chk"
                            checked={store.selectedOrders.has(o.id)}
                            onChange={() => store.toggleSel(o.id)}
                          />
                        </td>
                        <td>
                          <div className="cell-id">{o.id}</div>
                          <div className="cell-erp">{o.erpNum}</div>
                        </td>
                        <td className="cell-cust">
                          {o.priority !== 'Normal' && (
                            <span className={`pri-badge ${o.priority.toLowerCase()}`} style={{ marginRight: '5px' }}>
                              {o.priority === 'Urgent' ? '⚡' : '▲'}
                            </span>
                          )}
                          {o.customer}
                        </td>
                        <td>
                          <div className="cell-loc">
                            {svgPin}
                            {o.origin}
                          </div>
                        </td>
                        <td>
                          <div className="cell-loc">
                            {svgPin}
                            {o.dest}
                          </div>
                        </td>
                        <td className="cell-date">{fmtD(o.sDate)}</td>
                        <td className="cell-prod">
                          {o.lc} line{o.lc > 1 ? 's' : ''} · {o.tp} plt · {(o.tw / 1000).toFixed(1)}t
                        </td>
                        <td>
                          <span className={`st ${ST_CLS[o.status] || ''}`}>
                            {o.status === 'Exception' && '⚠ '}
                            {o.status}
                          </span>
                        </td>
                        <td className="cell-load">
                          {o.loadSid ? (
                            <a href="#linked-load" onClick={e => { e.preventDefault(); e.stopPropagation(); store.showToast(`Navigating to ${o.loadSid}`); }}>
                              {o.loadSid}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary, #8E8E9A)' }}>—</span>
                          )}
                        </td>
                        <td className="cell-sync">
                          <span className={`dq-dot ${o.syncOk ? 'ok' : 'err'}`}></span>
                          {fmtDT(o.lastSync)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ color: 'var(--text-tertiary, #8E8E9A)', fontSize: '16px' }}>⋮</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="pag">
              <div className="pag-info">
                {totalFiltered ? `Showing ${(store.page - 1) * 20 + 1}–${Math.min(store.page * 20, totalFiltered)} of ${totalFiltered}` : ''}
              </div>
              <div className="pag-btns">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
                  <button
                    key={pNum}
                    className={`pg-btn${store.page === pNum ? ' act' : ''}`}
                    onClick={() => store.setPage(pNum)}
                  >
                    {pNum}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Detail Panel Overlay */}
          <div
            className={`dr-overlay${store.drawerOrderId ? ' show' : ''}`}
            onClick={store.closeDrawer}
          ></div>

          {/* Slide out Drawer */}
          <div className={`drawer${store.drawerOrderId ? ' show' : ''}`}>
            {activeDrawerOrder && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Drawer Header */}
                <div className="dr-head">
                  <div className="dr-head-top">
                    <div>
                      <div className="dr-title">
                        <span className="cell-id" style={{ fontSize: '16px' }}>
                          {activeDrawerOrder.id}
                        </span>
                        <span className={`st ${ST_CLS[activeDrawerOrder.status] || ''}`}>
                          {activeDrawerOrder.status === 'Exception' && '⚠ '}
                          {activeDrawerOrder.status}
                        </span>
                        {activeDrawerOrder.priority !== 'Normal' && (
                          <span className={`pri-badge ${activeDrawerOrder.priority.toLowerCase()}`}>
                            {activeDrawerOrder.priority === 'Urgent' ? '⚡ Urgent' : '▲ High'}
                          </span>
                        )}
                      </div>
                      <div className="dr-erp">
                        {activeDrawerOrder.erpNum} · {activeDrawerOrder.erp}
                      </div>
                    </div>
                    <button className="dr-close" onClick={store.closeDrawer}>
                      ✕
                    </button>
                  </div>

                  {/* Metadata fields grid */}
                  <div className="dr-meta">
                    <div>
                      <div className="dm-label">Customer</div>
                      <div className="dm-val">{activeDrawerOrder.customer}</div>
                    </div>
                    <div>
                      <div className="dm-label">Order Date</div>
                      <div className="dm-val">{fmtD(activeDrawerOrder.oDate)}</div>
                    </div>
                    <div>
                      <div className="dm-label">Ship Date</div>
                      <div className="dm-val">{fmtD(activeDrawerOrder.sDate)}</div>
                    </div>
                    <div>
                      <div className="dm-label">Delivery Date</div>
                      <div className="dm-val">{fmtD(activeDrawerOrder.dDate)}</div>
                    </div>
                    <div>
                      <div className="dm-label">ERP System</div>
                      <div className="dm-val">{activeDrawerOrder.erp}</div>
                    </div>
                    <div>
                      <div className="dm-label">Last Sync</div>
                      <div className="dm-val">
                        <span className={`dq-dot ${activeDrawerOrder.syncOk ? 'ok' : 'err'}`} style={{ marginRight: '4px' }}></span>
                        {fmtDT(activeDrawerOrder.lastSync)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Body Scroll Container */}
                <div className="dr-body">
                  {/* Exception message banner */}
                  {activeDrawerOrder.status === 'Exception' && (
                    <div className="dr-sec">
                      <div className="banner-err">
                        ⚠️ <strong>Exception:</strong>&nbsp;{activeDrawerOrder.excReason}
                      </div>
                    </div>
                  )}

                  {/* Notes banner */}
                  {activeDrawerOrder.notes && (
                    <div className="dr-sec">
                      <div className="banner-warn">
                        📋 <strong>Notes:</strong>&nbsp;{activeDrawerOrder.notes}
                      </div>
                    </div>
                  )}

                  {/* Location address mapping */}
                  <div className="dr-sec">
                    <div className="dr-sec-h">
                      {svgPin} Ship From / Ship To
                    </div>
                    <div className="addr-grid">
                      <div className="addr-card">
                        <div className="addr-lbl">Ship From (Origin)</div>
                        <div className="addr-name">{activeDrawerOrder.origin}</div>
                        <div className="addr-detail">Warehouse / Distribution Center</div>
                      </div>
                      <div className="addr-card">
                        <div className="addr-lbl">Ship To (Destination)</div>
                        <div className="addr-name">{activeDrawerOrder.dest}</div>
                        <div className="addr-detail">Customer Facility</div>
                      </div>
                    </div>
                  </div>

                  {/* SKU lines table */}
                  <div className="dr-sec">
                    <div className="dr-sec-h">
                      {svgCargo} Line Items ({activeDrawerOrder.lc})
                    </div>
                    <table className="lt">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th>UoM</th>
                          <th style={{ textAlign: 'right' }}>Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDrawerOrder.lines.map((l, lIdx) => (
                          <tr key={lIdx}>
                            <td style={{ fontWeight: 500 }}>{l.name}</td>
                            <td className="sku">{l.sku}</td>
                            <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                              {l.qty}
                            </td>
                            <td>{l.uom}</td>
                            <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                              {(l.lw / 1000).toFixed(2)} t
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="lines-totals">
                      <span>📦 {activeDrawerOrder.tp} pallets</span>
                      <span>⚖️ {(activeDrawerOrder.tw / 1000).toFixed(1)} t total</span>
                    </div>
                  </div>

                  {/* Linked shipment load */}
                  {activeDrawerOrder.loadSid && (
                    <div className="dr-sec">
                      <div className="dr-sec-h">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <rect x="1" y="3" width="15" height="13" rx="2" />
                          <path d="M16 8h4l3 5v5h-7V8z" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                        Linked Load
                      </div>
                      <div className="load-card">
                        <div>
                          <div className="load-sid">{activeDrawerOrder.loadSid}</div>
                          <div className="load-meta">Status: {activeDrawerOrder.loadSt}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="dr-foot">
                  {!activeDrawerOrder.loadSid && (
                    <button
                      className="btn btn-p btn-sm"
                      onClick={() => {
                        store.closeDrawer();
                        store.clearSel();
                        store.toggleSel(activeDrawerOrder.id);
                        store.goToCreateLoad();
                      }}
                    >
                      {svgCargo} Create Load
                    </button>
                  )}
                  {activeDrawerOrder.status === 'Exception' && (
                    <button className="btn btn-sm btn-danger" onClick={() => store.showToast('Exception acknowledged')}>
                      Resolve Exception
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={() => store.showToast(`Sync triggered for ${activeDrawerOrder.id}`)}>
                    Re-sync
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CREATE LOAD STEP WIZARD */}
      {store.viewMode === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* View Scroll Container */}
          <div className="v-scroll">
            {/* Steps Timeline Header */}
            <div className="stepper">
              <div className="step act">
                <span className="sn">1</span>
                <span>Create Load</span>
              </div>
              <div className="sl-s"></div>
              <div className="step">
                <span className="sn">2</span>
                <span>Itinerary Confirmation</span>
              </div>
              <div className="sl-s"></div>
              <div className="step">
                <span className="sn">3</span>
                <span>Pricing & Tracking</span>
              </div>
            </div>

            {/* Collapsible Vehicle Selection Card */}
            <div className="v2card">
              <div
                className={`v2card-h${store.vehicleExpanded ? '' : ' ch-collapsed'}`}
                onClick={() => store.setVehicleExpanded(!store.vehicleExpanded)}
              >
                {svgChevron}
                <span>Vehicle Type</span>
                {!store.vehicleExpanded && <span className="ch-brief">{vehicleLabel}</span>}
                {store.vehicleExpanded && <span className="ch-r2">Select 1 or more types</span>}
                <div className={`ch-chev${store.vehicleExpanded ? ' open' : ''}`}>▼</div>
              </div>

              {store.vehicleExpanded && (
                <div className="v2card-b">
                  <div className="vg">
                    {/* Semi Trailer */}
                    <div className="vc-wrap">
                      <div
                        className={`vc${store.vehicleSelections.semi.selected ? ' sel' : ''}`}
                        onClick={() => toggleVehicleCardSelect('semi')}
                      >
                        <div className="ck">✓</div>
                        <div className="vi">
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="2" y="20" width="42" height="22" rx="3" />
                            <path d="M44 28h10l6 8v6H44V28z" />
                            <circle cx="14" cy="46" r="5" />
                            <circle cx="52" cy="46" r="5" />
                            <path d="M6 20V16a2 2 0 0 1 2-2h32a2 2 0 0 1 2 2v4" opacity=".5" />
                          </svg>
                        </div>
                        <div className="vn">Semi-Trailer</div>
                        <div className="vs2">Tilt trailer</div>
                      </div>
                      <div className={`vnest${store.vehicleSelections.semi.selected ? ' open' : ''}`}>
                        {Object.entries(store.vehicleSelections.semi.cats).map(([catKey, catVal]: any) => (
                          <div key={catKey}>
                            <div className="nc" onClick={() => toggleVehicleSubCategory('semi', catKey)}>
                              <span className={`chev${catVal.selected ? ' open' : ''}`}>▶</span>
                              <div className={`cbx${catVal.selected ? ' on' : ''}`}>{catVal.selected ? '✓' : ''}</div>
                              <span>{catKey.charAt(0).toUpperCase() + catKey.slice(1)}</span>
                            </div>
                            <div className={`ns${catVal.selected ? ' open' : ''}`}>
                              {Object.keys(catVal.items).map(itemKey => (
                                <div
                                  key={itemKey}
                                  className="ni-cb"
                                  onClick={() => toggleVehicleItem('semi', catKey, itemKey)}
                                >
                                  <div className={`cbx${catVal.items[itemKey] ? ' on' : ''}`}>
                                    {catVal.items[itemKey] ? '✓' : ''}
                                  </div>
                                  <span>{itemKey === 'temp' ? 'Temperature-controlled' : itemKey === 'multitemp' ? 'Multi-temp' : itemKey.charAt(0).toUpperCase() + itemKey.slice(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Truck with Trailer */}
                    <div className="vc-wrap">
                      <div
                        className={`vc${store.vehicleSelections.curtain.selected ? ' sel' : ''}`}
                        onClick={() => toggleVehicleCardSelect('curtain')}
                      >
                        <div className="ck">✓</div>
                        <div className="vi">
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="2" y="20" width="42" height="22" rx="3" />
                            <path d="M44 28h10l6 8v6H44V28z" />
                            <circle cx="14" cy="46" r="5" />
                            <circle cx="52" cy="46" r="5" />
                            <path d="M10 26v10M20 26v10M30 26v10" strokeDasharray="2 2" opacity=".4" />
                          </svg>
                        </div>
                        <div className="vn">Truck with Trailer</div>
                        <div className="vs2">Curtainsider</div>
                      </div>
                      <div className={`vnest${store.vehicleSelections.curtain.selected ? ' open' : ''}`}>
                        {Object.entries(store.vehicleSelections.curtain.cats).map(([catKey, catVal]: any) => (
                          <div key={catKey}>
                            <div className="nc" onClick={() => toggleVehicleSubCategory('curtain', catKey)}>
                              <span className={`chev${catVal.selected ? ' open' : ''}`}>▶</span>
                              <div className={`cbx${catVal.selected ? ' on' : ''}`}>{catVal.selected ? '✓' : ''}</div>
                              <span>{catKey.charAt(0).toUpperCase() + catKey.slice(1)}</span>
                            </div>
                            <div className={`ns${catVal.selected ? ' open' : ''}`}>
                              {Object.keys(catVal.items).map(itemKey => (
                                <div
                                  key={itemKey}
                                  className="ni-cb"
                                  onClick={() => toggleVehicleItem('curtain', catKey, itemKey)}
                                >
                                  <div className={`cbx${catVal.items[itemKey] ? ' on' : ''}`}>
                                    {catVal.items[itemKey] ? '✓' : ''}
                                  </div>
                                  <span>{itemKey === 'refr' ? 'Refrigerated' : itemKey === 'mega' ? 'Mega (3m+)' : itemKey.charAt(0).toUpperCase() + itemKey.slice(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rigid Truck */}
                    <div className="vc-wrap">
                      <div
                        className={`vc${store.vehicleSelections.rigid.selected ? ' sel' : ''}`}
                        onClick={() => toggleVehicleCardSelect('rigid')}
                      >
                        <div className="ck">✓</div>
                        <div className="vi">
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="2" y="22" width="38" height="18" rx="3" />
                            <path d="M40 28h10l6 6v6H40V28z" />
                            <circle cx="12" cy="44" r="5" />
                            <circle cx="24" cy="44" r="5" />
                            <circle cx="50" cy="44" r="5" />
                          </svg>
                        </div>
                        <div className="vn">Rigid Truck (7-12t)</div>
                        <div className="vs2">7.5T – 12.0T</div>
                      </div>
                      <div className={`vnest${store.vehicleSelections.rigid.selected ? ' open' : ''}`}>
                        {Object.entries(store.vehicleSelections.rigid.cats).map(([catKey, catVal]: any) => (
                          <div key={catKey}>
                            <div className="nc" onClick={() => toggleVehicleSubCategory('rigid', catKey)}>
                              <span className={`chev${catVal.selected ? ' open' : ''}`}>▶</span>
                              <div className={`cbx${catVal.selected ? ' on' : ''}`}>{catVal.selected ? '✓' : ''}</div>
                              <span>{catKey.charAt(0).toUpperCase() + catKey.slice(1)}</span>
                            </div>
                            <div className={`ns${catVal.selected ? ' open' : ''}`}>
                              {Object.keys(catVal.items).map(itemKey => (
                                <div
                                  key={itemKey}
                                  className="ni-cb"
                                  onClick={() => toggleVehicleItem('rigid', catKey, itemKey)}
                                >
                                  <div className={`cbx${catVal.items[itemKey] ? ' on' : ''}`}>
                                    {catVal.items[itemKey] ? '✓' : ''}
                                  </div>
                                  <span>{itemKey === 'refr' ? 'Refrigerated' : itemKey.charAt(0).toUpperCase() + itemKey.slice(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Van */}
                    <div className="vc-wrap">
                      <div
                        className={`vc${store.vehicleSelections.van.selected ? ' sel' : ''}`}
                        onClick={() => toggleVehicleCardSelect('van')}
                      >
                        <div className="ck">✓</div>
                        <div className="vi">
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="6" y="22" width="48" height="20" rx="4" />
                            <path d="M42 22V18a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4" />
                            <circle cx="16" cy="46" r="5" />
                            <circle cx="46" cy="46" r="5" />
                            <rect x="42" y="24" width="12" height="10" rx="2" opacity=".3" />
                          </svg>
                        </div>
                        <div className="vn">Van</div>
                        <div className="vs2">Van / LCV</div>
                      </div>
                      <div className={`vnest${store.vehicleSelections.van.selected ? ' open' : ''}`}>
                        {Object.entries(store.vehicleSelections.van.cats).map(([catKey, catVal]: any) => (
                          <div key={catKey}>
                            <div className="nc" onClick={() => toggleVehicleSubCategory('van', catKey)}>
                              <span className={`chev${catVal.selected ? ' open' : ''}`}>▶</span>
                              <div className={`cbx${catVal.selected ? ' on' : ''}`}>{catVal.selected ? '✓' : ''}</div>
                              <span>{catKey.charAt(0).toUpperCase() + catKey.slice(1)}</span>
                            </div>
                            <div className={`ns${catVal.selected ? ' open' : ''}`}>
                              {Object.keys(catVal.items).map(itemKey => (
                                <div
                                  key={itemKey}
                                  className="ni-cb"
                                  onClick={() => toggleVehicleItem('van', catKey, itemKey)}
                                >
                                  <div className={`cbx${catVal.items[itemKey] ? ' on' : ''}`}>
                                    {catVal.items[itemKey] ? '✓' : ''}
                                  </div>
                                  <span>{itemKey === 'refr' ? 'Refrigerated Van' : itemKey === 'small' ? 'Small Van' : itemKey === 'large' ? 'Large Van' : itemKey.charAt(0).toUpperCase() + itemKey.slice(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary labels inside expanded card */}
                  <div className="vreqs">
                    <div className="vr">
                      <span>🚛 Vehicle type</span>
                      <span className="vr-v">{vehicleLabel}</span>
                    </div>
                    <div className="vr">
                      <span>📦 Cargo specs</span>
                      <span className="vr-v" style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'flex-end' }}>
                        {cargoSpecsLabel}
                      </span>
                    </div>
                  </div>

                  <div className="veh-confirm">
                    <button className="btn btn-p btn-sm" onClick={() => store.setVehicleExpanded(false)}>
                      {svgCheck} Confirm Selection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Shipment Stops timeline list */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {store.clState.stops.map((stop, idx) => {
                const tags = store.getStopTags(stop);
                const isExp = stop.expanded;
                const summary = store.getStopSummary(stop);

                return (
                  <div className="stop-card" key={stop.id}>
                    {/* Accordion header */}
                    <div className="stop-h" onClick={() => store.toggleStop(stop.id)}>
                      <div className="stop-ico">{svgPin}</div>
                      <span className="stop-num">Stop {idx + 1}</span>
                      <div className="stop-tags">
                        {tags.map((tg, tgIdx) => (
                          <span key={tgIdx} className={`tag ${tg.type}`}>
                            {tg.label}
                          </span>
                        ))}
                      </div>
                      {!isExp && <span className="stop-brief">{store.getStopBrief(stop)}</span>}
                      <div className="stop-acts">
                        <div className={`stop-chev${isExp ? ' open' : ''}`} onClick={e => { e.stopPropagation(); store.toggleStop(stop.id); }}>
                          ▼
                        </div>
                        {store.clState.stops.length > 2 && (
                          <div className="stop-del" onClick={e => { e.stopPropagation(); store.deleteStop(stop.id); }}>
                            ✕
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collapsed view text summary */}
                    {!isExp && stop.locationName && (
                      <div className="stop-sum">
                        <div className="sum-loc">📍 {summary.loc}</div>
                        {summary.addr && <div className="sum-addr" style={{ marginLeft: '22px' }}>{summary.addr}</div>}
                        <div className="sum-meta">{summary.meta}</div>
                      </div>
                    )}

                    {/* Expanded Stop body content */}
                    {isExp && (
                      <div className="stop-body">
                        {/* Location autocomplete row */}
                        <div className="field" style={{ marginTop: '14px', position: 'relative' }}>
                          <label className="field-l">Location</label>
                          <div className="inp-w">
                            <span className="ico">📍</span>
                            <input
                              className="inp"
                              placeholder="Search city, address, or facility…"
                              value={stop.locationName || ''}
                              onChange={e => {
                                setLocSearch(e.target.value);
                                store.setStopField(stop.id, 'locationName', e.target.value);
                              }}
                              onFocus={() => {
                                setFocusedStopId(stop.id);
                                setLocSearch(stop.locationName || '');
                              }}
                            />
                            {stop.locationId && (
                              <span
                                className="eye"
                                title="Preview"
                                onClick={() => store.showToast(`Preview facility: ${stop.locationName}`)}
                              >
                                👁
                              </span>
                            )}
                          </div>

                          {/* Autocomplete suggestions dropdown container */}
                          {focusedStopId === stop.id && (
                            <div className="loc-dd show">
                              <div
                                className="dd-create"
                                onClick={() => {
                                  store.setPendingLocCtx(stop.id);
                                  setFocusedStopId(null);
                                  store.setLocationModalOpen(true);
                                }}
                              >
                                + Create New Location
                              </div>
                              <div className="dd-section">My Locations</div>
                              {store.locations.my
                                .filter(l => l.name.toLowerCase().includes(locSearch.toLowerCase()) || l.city.toLowerCase().includes(locSearch.toLowerCase()))
                                .map(l => (
                                  <div
                                    key={l.id}
                                    className="dd-item"
                                    onClick={() => {
                                      store.setStopField(stop.id, 'locationId', l.id);
                                      store.setStopField(stop.id, 'locationName', l.name);
                                      store.setStopField(stop.id, 'locationAddr', l.address + ', ' + l.city);
                                      setFocusedStopId(null);
                                    }}
                                  >
                                    <div><b>{l.name}</b></div>
                                    <div className="dd-item-sub">{l.address}, {l.city}</div>
                                  </div>
                                ))}

                              <div className="dd-section">Customer Locations</div>
                              {store.locations.customers
                                .flatMap(c => c.locations.map(l => ({ ...l, customer: c.custName })))
                                .filter(l => l.name.toLowerCase().includes(locSearch.toLowerCase()) || l.city.toLowerCase().includes(locSearch.toLowerCase()))
                                .map(l => (
                                  <div
                                    key={l.id}
                                    className="dd-item"
                                    onClick={() => {
                                      store.setStopField(stop.id, 'locationId', l.id);
                                      store.setStopField(stop.id, 'locationName', l.name);
                                      store.setStopField(stop.id, 'locationAddr', l.address + ', ' + l.city);
                                      setFocusedStopId(null);
                                    }}
                                  >
                                    <div><b>{l.name}</b> <span style={{ fontSize: '10px', color: 'var(--text-tertiary, #8E8E9A)' }}>({l.customer})</span></div>
                                    <div className="dd-item-sub">{l.address}, {l.city}</div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Date and Time Appointment fields */}
                        <div className="field">
                          <label className="field-l">Appointment</label>
                          <div className="appt-row">
                            <div className="field">
                              <input
                                type="date"
                                className="inp"
                                value={stop.date || ''}
                                onChange={e => store.setStopField(stop.id, 'date', e.target.value)}
                              />
                            </div>
                            {stop.date && <span className="day-badge">{getDayName(stop.date)}</span>}
                          </div>
                          <div style={{ marginTop: '10px' }}>
                            <div className="time-tog">
                              <button
                                className={`tt-b${stop.timeMode === 'precise' ? ' act' : ''}`}
                                onClick={() => store.setTimeMode(stop.id, 'precise')}
                              >
                                Precise Time
                              </button>
                              <button
                                className={`tt-b${stop.timeMode === 'range' ? ' act' : ''}`}
                                onClick={() => store.setTimeMode(stop.id, 'range')}
                              >
                                Time Range
                              </button>
                            </div>
                            <div className="time-row">
                              <div className="field">
                                <input
                                  type="time"
                                  className="inp"
                                  value={stop.timeStart || ''}
                                  onChange={e => store.setStopField(stop.id, 'timeStart', e.target.value)}
                                />
                              </div>
                              {stop.timeMode === 'range' && (
                                <div className="field">
                                  <input
                                    type="time"
                                    className="inp"
                                    value={stop.timeEnd || ''}
                                    onChange={e => store.setStopField(stop.id, 'timeEnd', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Cargo lines nested section */}
                        <div className="cargo">
                          <div className="cargo-h">
                            {svgCargo} Cargo at this stop
                          </div>

                          {/* Customer orders mapping */}
                          {stop.customers.map(cust => (
                            <div className="cust-c" key={cust.id}>
                              <div className="cust-h" onClick={() => store.toggleCustomer(stop.id, cust.id)}>
                                <span>👤 Customer</span>
                                <span className="order-sum">{cust.name || 'Select Customer...'}</span>
                                <div className="acts">
                                  <div className={`mini-btn chev2${cust.expanded ? ' open' : ''}`}>▼</div>
                                  <div className="mini-btn del" onClick={e => { e.stopPropagation(); store.deleteCustomer(stop.id, cust.id); }}>
                                    ✕
                                  </div>
                                </div>
                              </div>

                              {cust.expanded && (
                                <div className="cust-body">
                                  <div className="field">
                                    <label className="field-l">Customer</label>
                                    <select
                                      className="inp"
                                      value={cust.name || ''}
                                      onChange={e => store.setCustName(stop.id, cust.id, e.target.value)}
                                    >
                                      <option value="">Select customer…</option>
                                      {store.customers.map(c => (
                                        <option value={c.name} key={c.id}>
                                          {c.name} — {c.city}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {cust.orders.map(order => (
                                    <div className="order-c" style={{ marginBottom: '8px' }} key={order.id}>
                                      <div className="order-h" onClick={() => store.toggleCustOrder(stop.id, cust.id, order.id)}>
                                        <span>Order</span>
                                        <span className="order-sum">{order.ref || 'Choose reference...'}</span>
                                        {order.ref && order.ref.startsWith('ORD-') && (
                                          <span className="erp-tag">📥 ERP</span>
                                        )}
                                        <div className="acts">
                                          <div className={`mini-btn chev2${order.expanded ? ' open' : ''}`}>▼</div>
                                          <div className="mini-btn del" onClick={e => { e.stopPropagation(); store.deleteCustOrder(stop.id, cust.id, order.id); }}>
                                            ✕
                                          </div>
                                        </div>
                                      </div>

                                      {order.expanded && (
                                        <div className="order-body">
                                          <div className="field" style={{ position: 'relative' }}>
                                            <label className="field-l">Order Reference</label>
                                            <input
                                              className="inp"
                                              placeholder="Select or create order…"
                                              value={order.ref}
                                              onChange={e => {
                                                setOrderSearch(e.target.value);
                                                store.setCustOrderRef(stop.id, cust.id, order.id, e.target.value);
                                              }}
                                              onFocus={() => {
                                                setFocusedOrder({ stopId: stop.id, orderId: order.id });
                                                setOrderSearch(order.ref || '');
                                              }}
                                            />
                                            <div className="helper">Use PO / reference / internal ID</div>

                                            {/* Order Autocomplete search dropdown */}
                                            {focusedOrder?.stopId === stop.id && focusedOrder?.orderId === order.id && (
                                              <div className="order-dd show">
                                                <div
                                                  className="dd-create"
                                                  onClick={() => {
                                                    store.setPendingOrderCtx({ stopId: stop.id, orderId: order.id, customerId: cust.id });
                                                    setFocusedOrder(null);
                                                    setNewOrderCust(cust.name);
                                                    store.setOrderModalOpen(true);
                                                  }}
                                                >
                                                  + Create New Order
                                                </div>
                                                <div className="dd-section">ERP Sync list</div>
                                                {store.erpOrdersDd
                                                  .filter(o => o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.customer.toLowerCase().includes(orderSearch.toLowerCase()))
                                                  .map(o => (
                                                    <div
                                                      key={o.id}
                                                      className="dd-item"
                                                      onClick={() => {
                                                        store.setCustOrderRef(stop.id, cust.id, order.id, o.id);
                                                        setFocusedOrder(null);
                                                      }}
                                                    >
                                                      <div><b>{o.id}</b></div>
                                                      <div className="dd-item-sub">{o.customer}</div>
                                                    </div>
                                                  ))}
                                              </div>
                                            )}
                                          </div>

                                          {/* Cargo line rows list header */}
                                          {order.products.length > 0 && (
                                            <div className="prod-labels">
                                              <span className="pl-product">Product</span>
                                              <span className="pl-action" style={{ width: '135px' }}>Action</span>
                                              <span className="pl-qty" style={{ width: '70px' }}>Qty</span>
                                              <span className="pl-unit" style={{ width: '90px' }}>Unit</span>
                                              <span className="pl-wt" style={{ width: '70px' }}>Weight</span>
                                              <span className="pl-wtu" style={{ width: '72px' }}>Wt Unit</span>
                                              <span style={{ width: '28px' }}></span>
                                            </div>
                                          )}

                                          {/* Nested product line entries list */}
                                          {order.products.map(p => (
                                            <div className="prod-row" key={p.id}>
                                              <div className="pr-product">
                                                <select
                                                  value={p.productId || ''}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    store.setProductField(stop.id, order.id, p.id, cust.id, 'productId', val);
                                                  }}
                                                >
                                                  <option value="">Select product…</option>
                                                  <option value="__new__" style={{ color: 'var(--accent, #6C3AED)', fontWeight: 600 }}>
                                                    + Create New Product
                                                  </option>
                                                  {store.products.map(grp => (
                                                    <optgroup label={grp.type} key={grp.type}>
                                                      {grp.skus.map(s => (
                                                        <option value={s.id} key={s.id}>
                                                          {s.name} ({s.sku})
                                                        </option>
                                                      ))}
                                                    </optgroup>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="act-tog">
                                                <button
                                                  className={`act-b pk${p.action === 'pickup' ? ' on' : ''}`}
                                                  onClick={() => store.setProductField(stop.id, order.id, p.id, cust.id, 'action', 'pickup')}
                                                >
                                                  ↑ Pickup
                                                </button>
                                                <button
                                                  className={`act-b do${p.action === 'dropoff' ? ' on' : ''}`}
                                                  onClick={() => store.setProductField(stop.id, order.id, p.id, cust.id, 'action', 'dropoff')}
                                                >
                                                  ↓ Dropoff
                                                </button>
                                              </div>

                                              <div className="pr-qty">
                                                <input
                                                  type="number"
                                                  placeholder="0"
                                                  value={p.qty || ''}
                                                  onChange={e => store.setProductField(stop.id, order.id, p.id, cust.id, 'qty', e.target.value)}
                                                />
                                              </div>

                                              <div className="pr-unit">
                                                <select
                                                  value={p.unit}
                                                  onChange={e => store.setProductField(stop.id, order.id, p.id, cust.id, 'unit', e.target.value)}
                                                >
                                                  {['Pallets', 'Kg', 'Tons', 'Boxes', 'Pieces', 'Liters'].map(u => (
                                                    <option key={u} value={u}>
                                                      {u}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="pr-wt">
                                                <input
                                                  type="number"
                                                  placeholder="0"
                                                  value={p.weight || ''}
                                                  onChange={e => store.setProductField(stop.id, order.id, p.id, cust.id, 'weight', e.target.value)}
                                                />
                                              </div>

                                              <div className="pr-wtu">
                                                <select
                                                  value={p.wtUnit}
                                                  onChange={e => store.setProductField(stop.id, order.id, p.id, cust.id, 'wtUnit', e.target.value)}
                                                >
                                                  {['Kg', 'Tons', 'Lbs'].map(wu => (
                                                    <option key={wu} value={wu}>
                                                      {wu}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="prod-del" onClick={() => store.deleteProduct(stop.id, order.id, p.id, cust.id)}>
                                                ✕
                                              </div>
                                            </div>
                                          ))}

                                          <button className="add-btn" onClick={() => store.addCustProduct(stop.id, cust.id, order.id)}>
                                            + Add product
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  <button className="add-btn" style={{ background: '#fff', borderStyle: 'solid' }} onClick={() => store.addCustOrder(stop.id, cust.id)}>
                                    + Add Order
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          <button className="add-btn lg" style={{ margin: '6px 0 0 0', width: '100%' }} onClick={() => store.addCustomer(stop.id)}>
                            + Add customer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button className="add-btn lg" onClick={store.addStop}>
                + Add stop
              </button>
            </div>
          </div>

          {/* Bottom wizard sticky bar navigation */}
          <div className="bbar">
            <button className="btn" onClick={() => store.setViewMode('orders')}>
              Back to Orders
            </button>
            <button
              className="btn btn-p"
              id="continueBtn"
              disabled={!store.isFormValid}
              onClick={store.goToItinerary}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: ITINERARY REVIEW & TRIP SUMMARY */}
      {store.viewMode === 'itin' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Stepper Timeline Header */}
          <div className="stepper">
            <div className="step done">
              <span className="sn">✓</span>
              <span>Create Load</span>
            </div>
            <div className="sl-s done"></div>
            <div className="step act">
              <span className="sn">2</span>
              <span>Itinerary Confirmation</span>
            </div>
            <div className="sl-s"></div>
            <div className="step">
              <span className="sn">3</span>
              <span>Pricing & Tracking</span>
            </div>
          </div>

          {/* View Grid columns */}
          <div className="itin-grid">
            {/* Left stop itinerary sequence panel */}
            <div className="itin-card anim">
              <div className="itin-ch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Route Stops
                <div className="ch-r">
                  <button className="edit-btn" onClick={() => store.setViewMode('create')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                </div>
              </div>

              {/* Stop route sequence timeline */}
              <div className="tl-v3">
                {store.clState.stops.map((s, idx) => {
                  const pkTags = store.getStopTags(s);
                  const isPk = pkTags.some(t => t.type === 'pickup');

                  // Stop detail aggregators
                  let countProds = 0;
                  let stopWt = 0;
                  const refsList: string[] = [];
                  const stopCusts = s.customers.map(c => c.name).filter(Boolean);

                  const allOrds = s.customers.flatMap(c => c.orders).concat(s.orders || []);
                  allOrds.forEach(o => {
                    if (o.ref) refsList.push(o.ref);
                    o.products.forEach(p => {
                      countProds++;
                      stopWt += parseFloat(p.weight as string) || 0;
                    });
                  });

                  return (
                    <div className="sr3 expanded" key={s.id}>
                      <div className="tl-col3">
                        <div className={`tl-dot3 ${isPk ? 'pk' : 'dl'}`}></div>
                        <div className="tl-line3"></div>
                        <span className="tl-num3">#{idx + 1}</span>
                      </div>
                      <div className="sc3">
                        <div className="sm3">
                          <span className={`sb3 ${isPk ? 'pk' : 'dl'}`}>
                            {isPk ? 'PICKUP' : 'DELIVERY'}
                          </span>
                          <span className="sdt3">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {formatDate(s.date)} · {s.timeStart}
                            {s.timeMode === 'range' && s.timeEnd ? ` - ${s.timeEnd}` : ''}
                          </span>
                        </div>
                        <div className="sl3">{s.locationName || `Stop ${idx + 1}`}</div>
                        {stopCusts.length > 0 && <div className="sa3">{stopCusts.join(', ')}</div>}
                        <div className="stop-detail3">
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            <span className="chip">{countProds} products</span>
                            <span className="chip">
                              Weight: <b>{(stopWt / 1000).toFixed(1)} T</b>
                            </span>
                          </div>
                          {refsList.length > 0 && (
                            <div style={{ marginTop: '6px' }}>
                              {refsList.map((refId, rIdx) => (
                                <div
                                  key={rIdx}
                                  style={{
                                    fontSize: '12px',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 500,
                                    color: 'var(--accent, #6C3AED)',
                                    marginTop: '2px'
                                  }}
                                >
                                  {refId}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="stop-menu3">⋯</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right details sidebar */}
            <div className="right-panel">
              {/* Google maps visual placeholder block */}
              <div className="itin-card anim">
                <div className="map-tabs">
                  <button className="map-tab act">Map</button>
                  <button className="map-tab">Satellite</button>
                </div>
                <div className="map-ph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
                  </svg>
                  <div className="map-route">{itinerarySummary.route}</div>
                  <div className="map-hint">Embedded Google Maps</div>
                </div>
              </div>

              {/* Distances and travel summaries */}
              <div className="itin-card anim">
                <div className="itin-ch" style={{ padding: '14px 18px', fontSize: '14px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  Trip Summary
                </div>
                <div className="ts-grid">
                  <div className="ts-cell">
                    <div className="ts-label">DISTANCE</div>
                    <div className="ts-val">
                      {itinerarySummary.distance} <span className="unit">km</span>
                    </div>
                  </div>
                  <div className="ts-cell">
                    <div className="ts-label">TIME</div>
                    <div className="ts-val">
                      {itinerarySummary.hours}
                      <span className="unit">h</span> {itinerarySummary.mins}
                      <span className="unit">m</span>
                    </div>
                  </div>
                  <div className="ts-cell">
                    <div className="ts-label">STOPS</div>
                    <div className="ts-val">{store.clState.stops.length}</div>
                  </div>
                  <div className="ts-cell">
                    <div className="ts-label">TOTAL WEIGHT</div>
                    <div className="ts-val">
                      {(itinerarySummary.totalWt / 1000).toFixed(1)} <span className="unit">T</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected orders summaries list */}
              <div className="itin-card anim">
                <div className="itin-ch" style={{ padding: '14px 18px', fontSize: '14px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Orders
                  <div className="ch-r">
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary, #8E8E9A)' }}>
                      {itinerarySummary.allOrders.length} orders
                    </span>
                  </div>
                </div>
                {itinerarySummary.allOrders.map((o, oIdx) => (
                  <div className="order-item" key={oIdx}>
                    <div>
                      <div className="oi-id">{o.ref}</div>
                      <div className="oi-route">
                        <span className="oi-pk">{o.pk.split(' ')[0]}</span>
                        <span className="oi-arrow">→</span>
                        <span className="oi-dl">{o.dl.split(' ')[0]}</span>
                      </div>
                    </div>
                    <div className="oi-wt">{(o.wt / 1000).toFixed(1)} T</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar step navigation */}
          <div className="bbar">
            <button className="btn" onClick={() => store.setViewMode('create')}>
              Back
            </button>
            <button className="btn btn-p" onClick={submitItineraryDetails}>
              Confirm & Continue
            </button>
          </div>
        </div>
      )}

      {/* CREATE NEW ORDER MODAL */}
      <div className={`modal-bg${store.isOrderModalOpen ? ' show' : ''}`}>
        <div className="modal">
          <div className="modal-hd">
            <span>Create New Order</span>
            <button className="modal-close" onClick={() => store.setOrderModalOpen(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label className="field-l">Order ID / Reference *</label>
              <input
                className="inp"
                placeholder="e.g. PO-2024-005"
                value={newOrderRef}
                onChange={e => setNewOrderRef(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-l">Customer (optional)</label>
              <select
                className="inp"
                value={newOrderCust}
                onChange={e => setNewOrderCust(e.target.value)}
              >
                <option value="">—</option>
                {store.customers.map(c => (
                  <option value={c.name} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-l">Notes</label>
              <textarea
                className="inp"
                rows={2}
                style={{ resize: 'vertical' }}
                value={newOrderNotes}
                onChange={e => setNewOrderNotes(e.target.value)}
              ></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-sm" onClick={() => store.setOrderModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-p btn-sm" onClick={handleConfirmOrder}>
              Create Order
            </button>
          </div>
        </div>
      </div>

      {/* CREATE NEW PRODUCT MODAL */}
      <div className={`modal-bg${store.isProductModalOpen ? ' show' : ''}`}>
        <div className="modal">
          <div className="modal-hd">
            <span>Create New Product</span>
            <button className="modal-close" onClick={() => store.setProductModalOpen(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label className="field-l">Product Name *</label>
              <input
                className="inp"
                placeholder="e.g. Olive Oil 5L"
                value={newProdName}
                onChange={e => setNewProdName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-l">SKU *</label>
              <input
                className="inp"
                placeholder="e.g. FOD-050"
                value={newProdSku}
                onChange={e => setNewProdSku(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-l">Category</label>
              <input
                className="inp"
                placeholder="e.g. Oils"
                value={newProdCat}
                onChange={e => setNewProdCat(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-l">Weight per unit (kg)</label>
              <input
                type="number"
                step="0.1"
                className="inp"
                placeholder="e.g. 30"
                value={newProdWpu}
                onChange={e => setNewProdWpu(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-sm" onClick={() => store.setProductModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-p btn-sm" onClick={handleConfirmProduct}>
              Create Product
            </button>
          </div>
        </div>
      </div>

      {/* CREATE NEW LOCATION MODAL */}
      <div className={`modal-bg${store.isLocationModalOpen ? ' show' : ''}`}>
        <div className="modal">
          <div className="modal-hd">
            <span>Create New Location</span>
            <button className="modal-close" onClick={() => store.setLocationModalOpen(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label className="field-l">Location Name *</label>
              <input
                className="inp"
                placeholder="e.g. Patras Warehouse"
                value={newLocName}
                onChange={e => setNewLocName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-l">Address *</label>
              <input
                className="inp"
                placeholder="e.g. 10 Industrial St"
                value={newLocAddr}
                onChange={e => setNewLocAddr(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-l">City *</label>
              <input
                className="inp"
                placeholder="e.g. Patras"
                value={newLocCity}
                onChange={e => setNewLocCity(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-l">Country *</label>
              <input
                className="inp"
                placeholder="e.g. Greece"
                value={newLocCountry}
                onChange={e => setNewLocCountry(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-sm" onClick={() => store.setLocationModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-p btn-sm" onClick={handleConfirmLocation}>
              Create Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

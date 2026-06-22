import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { LocationItem, ShipmentStop, ShipmentCustomer, ShipmentCustomerOrder } from '../../context/AppContext';
import { CreateCustomerModal } from './CreateCustomerModal';
import { CreateOrderModal } from './CreateOrderModal';
import { CreateLocationModal } from './CreateLocationModal';
import { CreateProductModal } from './CreateProductModal';

interface Step1DetailsProps {
  vehicleSpecs: Record<string, string[]>;
  setVehicleSpecs: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  stops: ShipmentStop[];
  setStops: React.Dispatch<React.SetStateAction<ShipmentStop[]>>;
}

export const Step1Details: React.FC<Step1DetailsProps> = ({
  vehicleSpecs,
  setVehicleSpecs,
  stops,
  setStops,
}) => {
  const { t, lang } = useTranslation();
  const { locations, companies, skus, showToast, refreshSkusFromApi } = useApp();

  useEffect(() => {
    refreshSkusFromApi();
  }, [refreshSkusFromApi]);

  // Modals Visibility
  const [isCustOpen, setIsCustOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isLocOpen, setIsLocOpen] = useState(false);
  const [isProdOpen, setIsProdOpen] = useState(false);

  // Modal Context Pointers
  const [activeStopId, setActiveStopId] = useState<number | null>(null);
  const [activeCustIndex, setActiveCustIndex] = useState<number | null>(null);
  const [activeOrderIndex, setActiveOrderIndex] = useState<number | null>(null);

  // Search filter states
  const [locSearch, setLocSearch] = useState<Record<number, string>>({});
  const [activeLocDD, setActiveLocDD] = useState<number | null>(null);

  const [vehicleCardExpanded, setVehicleCardExpanded] = useState(true);
  const [openNests, setOpenNests] = useState<string[]>(['semi', 'curtain']);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    'semi-dry': true,
  });

  type VehicleCat = { items: string[] };
  type VehicleEntry = {
    name: { en: string; el: string };
    desc: string;
    cats: Record<string, VehicleCat>;
  };

  const vehData: Record<string, VehicleEntry> = {
    semi: {
      name: { en: 'Semi-Trailer', el: 'Επικαθήμενο' },
      desc: 'Tilt trailer',
      cats: {
        dry: { items: ['curtainside', 'box', 'platform', 'flatbed'] },
        reefer: { items: ['temp', 'multitemp'] },
        other: { items: ['tanker', 'silo'] },
      },
    },
    curtain: {
      name: { en: 'Truck with Trailer', el: 'Συρρόμενο' },
      desc: 'Curtainsider',
      cats: {
        dry: { items: ['standard', 'mega'] },
        reefer: { items: ['refr'] },
      },
    },
    rigid: {
      name: { en: 'Rigid Truck (7-12t)', el: 'Τριαξονικό' },
      desc: '7.5T – 12.0T',
      cats: {
        dry: { items: ['box', 'flatbed'] },
        reefer: { items: ['refr'] },
      },
    },
    van: {
      name: { en: 'Van', el: 'Βαν' },
      desc: 'Van / LCV',
      cats: {
        dry: { items: ['small', 'large'] },
        reefer: { items: ['refr'] },
      },
    },
  };

  const catLabels: Record<string, { en: string; el: string }> = {
    dry: { en: 'Dry', el: 'Ξηρό' },
    reefer: { en: 'Reefer', el: 'Ψυγείο' },
    other: { en: 'Other', el: 'Άλλο' },
  };

  const specLabels: Record<string, string> = {
    curtainside: 'Curtainside',
    box: 'Box',
    platform: 'Platform',
    flatbed: 'Flatbed',
    temp: 'Temperature-controlled',
    multitemp: 'Multi-temp',
    tanker: 'Tanker',
    silo: 'Silo',
    standard: 'Standard',
    mega: 'Mega (3m+)',
    refr: 'Refrigerated',
    small: 'Small Van',
    large: 'Large Van (Sprinter)',
  };

  const getSpecLabel = (vid: string, spec: string) => {
    if (spec === 'refr' && vid === 'van') return t('refrigeratedVan');
    if (spec === 'mega') return 'Mega (3m+)';
    return specLabels[spec] || spec.charAt(0).toUpperCase() + spec.slice(1);
  };

  const isVehicleSelected = (vid: string) => (vehicleSpecs[vid]?.length ?? 0) > 0;

  const getAllSpecsForVehicle = (vid: string) =>
    Object.values(vehData[vid].cats).flatMap((cat) => cat.items);

  const getCatState = (vid: string, cat: string): 'on' | 'ind' | 'off' => {
    const items = vehData[vid].cats[cat].items;
    const selected = vehicleSpecs[vid] || [];
    const count = items.filter((it) => selected.includes(it)).length;
    if (count === items.length) return 'on';
    if (count > 0) return 'ind';
    return 'off';
  };

  const syncVehicleSpecs = (vid: string, specs: string[]) => {
    setVehicleSpecs((prev) => {
      const next = { ...prev };
      if (specs.length === 0) {
        delete next[vid];
      } else {
        next[vid] = specs;
      }
      return next;
    });
  };

  const handleToggleVehicle = (vid: string) => {
    if (openNests.includes(vid)) {
      setOpenNests((prev) => prev.filter((v) => v !== vid));
      return;
    }

    const currentSpecs = vehicleSpecs[vid] || [];
    if (currentSpecs.length === 0) {
      syncVehicleSpecs(vid, getAllSpecsForVehicle(vid));
    }
    setOpenNests((prev) => [...prev, vid]);
  };

  const handleDeselectVehicle = (vid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    syncVehicleSpecs(vid, []);
    setOpenNests((prev) => prev.filter((v) => v !== vid));
  };

  const handleToggleCat = (vid: string, cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const catKey = `${vid}-${cat}`;
    setExpandedCats((prev) => ({ ...prev, [catKey]: !prev[catKey] }));

    const items = vehData[vid].cats[cat].items;
    const catState = getCatState(vid, cat);
    const isOn = catState === 'on' || catState === 'ind';
    const currentSpecs = vehicleSpecs[vid] || [];

    let newSpecs: string[];
    if (isOn) {
      newSpecs = currentSpecs.filter((s) => !items.includes(s));
    } else {
      newSpecs = [...currentSpecs];
      items.forEach((it) => {
        if (!newSpecs.includes(it)) newSpecs.push(it);
      });
    }
    syncVehicleSpecs(vid, newSpecs);
  };

  const handleToggleSpec = (vid: string, _cat: string, spec: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSpecs = vehicleSpecs[vid] || [];
    const hasSpec = currentSpecs.includes(spec);
    const newSpecs = hasSpec
      ? currentSpecs.filter((s) => s !== spec)
      : [...currentSpecs, spec];
    syncVehicleSpecs(vid, newSpecs);
  };

  const selectedTypes = Object.keys(vehData)
    .filter((vid) => isVehicleSelected(vid))
    .map((vid) => vehData[vid].name[lang as 'en' | 'el']);

  const selectedSpecLabels = Object.keys(vehData).flatMap((vid) => {
    if (!isVehicleSelected(vid)) return [];
    return (vehicleSpecs[vid] || []).map((spec) => getSpecLabel(vid, spec));
  });

  const vehicleBrief =
    selectedTypes.length > 0
      ? `${selectedTypes.join(', ')}${
          selectedSpecLabels.length > 0
            ? ` — ${selectedSpecLabels.slice(0, 4).join(', ')}${
                selectedSpecLabels.length > 4 ? ` +${selectedSpecLabels.length - 4} more` : ''
              }`
            : ''
        }`
      : '';

  const handleConfirmVehicle = () => {
    setVehicleCardExpanded(false);
    showToast(t('vehicleSelectionConfirmed'));
  };

  // Stop Actions
  const handleAddStop = () => {
    const nextId = Math.max(...stops.map((s) => s.id), 0) + 1;
    const defaultLoc = locations[0];
    const newStop: ShipmentStop = {
      id: nextId,
      type: 'delivery',
      location: defaultLoc?.id || '',
      address: defaultLoc?.address || '',
      date: new Date().toISOString().split('T')[0],
      timeStart: '08:00',
      timeEnd: '12:00',
      customers: [],
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (id: number) => {
    if (stops.length <= 2) {
      showToast(
        t('minTwoStops'),
        'warning'
      );
      return;
    }
    setStops(stops.filter((s) => s.id !== id));
  };

  const handleUpdateStopField = (stopId: number, field: keyof ShipmentStop, value: any) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          if (field === 'location') {
            const loc = locations.find((l) => l.id === value);
            return { ...s, location: value, address: loc ? loc.address : '' };
          }
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const toggleStopExpand = (stopId: number) => {
    // Custom expansion state can be maintained inside this step component
  };

  // Dynamic Modals return handlers
  const handleLocCreated = (locId: string) => {
    if (activeStopId !== null) {
      handleUpdateStopField(activeStopId, 'location', locId);
    }
  };

  const handleCustCreated = (name: string) => {
    if (activeStopId !== null && activeCustIndex !== null) {
      updateCustomerName(activeStopId, activeCustIndex, name);
    }
  };

  const handleOrderCreated = (ref: string, customerName?: string) => {
    if (activeStopId !== null && activeCustIndex !== null && activeOrderIndex !== null) {
      updateOrderRef(activeStopId, activeCustIndex, activeOrderIndex, ref);
      if (customerName) {
        updateCustomerName(activeStopId, activeCustIndex, customerName);
      }
    }
  };

  const handleProductCreated = (skuName: string) => {
    // SKU is registered inside AppContext automatically. We will trigger refresh of select options.
    showToast(t('productCreated', { name: skuName }));
  };

  // Customers & Orders state manipulation under stops
  const addCustomerToStop = (stopId: number) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const newCust: ShipmentCustomer = {
            name: '',
            orders: [],
          };
          return { ...s, customers: [...s.customers, newCust] };
        }
        return s;
      })
    );
  };

  const removeCustomerFromStop = (stopId: number, custIdx: number) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          return { ...s, customers: s.customers.filter((_, idx) => idx !== custIdx) };
        }
        return s;
      })
    );
  };

  const updateCustomerName = (stopId: number, custIdx: number, name: string) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const updated = [...s.customers];
          updated[custIdx] = { ...updated[custIdx], name };
          return { ...s, customers: updated };
        }
        return s;
      })
    );
  };

  const addOrderToCustomer = (stopId: number, custIdx: number) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const updated = [...s.customers];
          const newOrder: ShipmentCustomerOrder = {
            id: '',
            products: '',
            qty: 1,
            qtyUnit: 'Pallets',
            weight: 1,
            weightUnit: 'T',
          };
          updated[custIdx] = {
            ...updated[custIdx],
            orders: [...updated[custIdx].orders, newOrder],
          };
          return { ...s, customers: updated };
        }
        return s;
      })
    );
  };

  const removeOrderFromCustomer = (stopId: number, custIdx: number, orderIdx: number) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const updated = [...s.customers];
          updated[custIdx] = {
            ...updated[custIdx],
            orders: updated[custIdx].orders.filter((_, idx) => idx !== orderIdx),
          };
          return { ...s, customers: updated };
        }
        return s;
      })
    );
  };

  const updateOrderRef = (stopId: number, custIdx: number, orderIdx: number, ref: string) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const updated = [...s.customers];
          const updatedOrders = [...updated[custIdx].orders];
          updatedOrders[orderIdx] = { ...updatedOrders[orderIdx], id: ref };
          updated[custIdx] = { ...updated[custIdx], orders: updatedOrders };
          return { ...s, customers: updated };
        }
        return s;
      })
    );
  };

  const addProductToOrder = (stopId: number, custIdx: number, orderIdx: number) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const updated = [...s.customers];
          const updatedOrders = [...updated[custIdx].orders];
          const prevProducts = updatedOrders[orderIdx].products;
          // If empty, set a default SKU
          const newProd = skus[0]?.name || 'Dry Goods';
          updatedOrders[orderIdx] = {
            ...updatedOrders[orderIdx],
            products: prevProducts ? `${prevProducts}, ${newProd}` : newProd,
          };
          updated[custIdx] = { ...updated[custIdx], orders: updatedOrders };
          return { ...s, customers: updated };
        }
        return s;
      })
    );
  };

  const updateOrderProductField = (
    stopId: number,
    custIdx: number,
    orderIdx: number,
    field: keyof ShipmentCustomerOrder,
    value: any
  ) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const updated = [...s.customers];
          const updatedOrders = [...updated[custIdx].orders];
          updatedOrders[orderIdx] = { ...updatedOrders[orderIdx], [field]: value };
          updated[custIdx] = { ...updated[custIdx], orders: updatedOrders };
          return { ...s, customers: updated };
        }
        return s;
      })
    );
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-US', options);
  };

  return (
    <div className="animate-fade-in">
      {/* ═══ VEHICLE TYPE SELECTOR ═══ */}
      <article className="card" id="vehicleCard">
        <div className={`ch ${!vehicleCardExpanded ? 'ch-collapsed' : ''}`} onClick={() => setVehicleCardExpanded(!vehicleCardExpanded)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="2" />
            <path d="M16 8h4l3 5v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span>{t('vehicleType')}</span>
          {!vehicleCardExpanded && vehicleBrief && (
            <span className="ch-brief">{vehicleBrief}</span>
          )}
          <span className="ch-r" style={{ display: vehicleCardExpanded ? '' : 'none' }}>
            {t('selectOneOrMoreTypes')}
          </span>
          <div className={`ch-chev ${vehicleCardExpanded ? 'open' : ''}`}>▼</div>
        </div>

        {vehicleCardExpanded && (
          <div className="cb">
            <div className="vg" role="group">
              {Object.entries(vehData).map(([key, data]) => {
                const isSelected = isVehicleSelected(key);
                const isNestOpen = openNests.includes(key);
                return (
                  <div key={key} className="vc-wrap">
                    <div className={`vc ${isSelected ? 'sel' : ''}`} onClick={() => handleToggleVehicle(key)}>
                      <div className="ck" title="Deselect" onClick={(e) => handleDeselectVehicle(key, e)}>✓</div>
                      <div className="vi">
                        {key === 'semi' && (
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="2" y="20" width="42" height="22" rx="3" />
                            <path d="M44 28h10l6 8v6H44V28z" />
                            <circle cx="14" cy="46" r="5" />
                            <circle cx="52" cy="46" r="5" />
                            <path d="M6 20V16a2 2 0 0 1 2-2h32a2 2 0 0 1 2 2v4" opacity=".5" />
                          </svg>
                        )}
                        {key === 'curtain' && (
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="2" y="20" width="42" height="22" rx="3" />
                            <path d="M44 28h10l6 8v6H44V28z" />
                            <circle cx="14" cy="46" r="5" />
                            <circle cx="52" cy="46" r="5" />
                            <path d="M10 26v10M20 26v10M30 26v10" strokeDasharray="2 2" opacity=".4" />
                          </svg>
                        )}
                        {key === 'rigid' && (
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="2" y="22" width="38" height="18" rx="3" />
                            <path d="M40 28h10l6 6v6H40V28z" />
                            <circle cx="12" cy="44" r="5" />
                            <circle cx="24" cy="44" r="5" />
                            <circle cx="50" cy="44" r="5" />
                          </svg>
                        )}
                        {key === 'van' && (
                          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="6" y="22" width="48" height="20" rx="4" />
                            <path d="M42 22V18a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4" />
                            <circle cx="16" cy="46" r="5" />
                            <circle cx="46" cy="46" r="5" />
                            <rect x="42" y="24" width="12" height="10" rx="2" opacity=".3" />
                          </svg>
                        )}
                      </div>
                      <div className="vn">{data.name[lang as 'en' | 'el']}</div>
                      <div className="vs">{data.desc}</div>
                    </div>

                    <div className={`vnest ${isNestOpen ? 'open' : ''}`}>
                      {Object.entries(data.cats).map(([catKey, catData]) => {
                        const catState = getCatState(key, catKey);
                        const catExpanded = expandedCats[`${key}-${catKey}`] ?? false;
                        return (
                          <React.Fragment key={catKey}>
                            <div className="nc" onClick={(e) => handleToggleCat(key, catKey, e)}>
                              <span className={`chev ${catExpanded ? 'open' : ''}`}>▶</span>
                              <div className={`cbx ${catState === 'on' ? 'on' : ''} ${catState === 'ind' ? 'ind' : ''}`}>
                                {catState === 'on' ? '✓' : catState === 'ind' ? '–' : ''}
                              </div>
                              <span>{catLabels[catKey]?.[lang as 'en' | 'el'] || catKey}</span>
                            </div>
                            <div className={`ns ${catExpanded ? 'open' : ''}`}>
                              {catData.items.map((spec) => {
                                const hasSpec = (vehicleSpecs[key] || []).includes(spec);
                                return (
                                  <div key={spec} className="ni" onClick={(e) => handleToggleSpec(key, catKey, spec, e)}>
                                    <div className={`cbx ${hasSpec ? 'on' : ''}`}>{hasSpec && '✓'}</div>
                                    <span>{getSpecLabel(key, spec)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="vreqs">
              <div className="vr">
                <span>
                  🚛 {t('vehicleType')}
                </span>
                <span className="vr-v">{selectedTypes.length ? selectedTypes.join(' | ') : '—'}</span>
              </div>
              <div className="vr">
                <span>
                  📦 {t('cargoSpecs')}
                </span>
                <span className="vr-v">
                  {selectedSpecLabels.length
                    ? selectedSpecLabels.map((s, i) => (
                        <span key={`${s}-${i}`} className="vt">
                          {s}
                        </span>
                      ))
                    : '—'}
                </span>
              </div>
            </div>

            <div className="veh-confirm">
              <button className="btn btn-p btn-sm" onClick={handleConfirmVehicle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{t('confirmSelection')}</span>
              </button>
            </div>
          </div>
        )}
      </article>

      {/* ═══ STOPS CONFIGURATION ═══ */}
      <div id="stopsContainer">
        {stops.map((stop, idx) => {
          const isPickup = idx === 0; // First is always pickup, others delivery in sequential wizard
          const selectedLoc = locations.find((l) => l.id === stop.location);
          
          return (
            <div key={stop.id} className="stop-card">
              <div className="stop-h" onClick={() => toggleStopExpand(stop.id)}>
                <div className="stop-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
                  </svg>
                </div>
                <span className="stop-num">
                  {t('stopNumber')} #{idx + 1}
                </span>
                <div className="stop-tags">
                  <span className={`tag ${isPickup ? 'pk' : 'do'}`}>
                    {isPickup ? t('loadingUpper') : t('deliveryUpper')}
                  </span>
                </div>
                
                <div className="stop-acts">
                  {stops.length > 2 && (
                    <div
                      className="stop-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveStop(stop.id);
                      }}
                      title="Remove Stop"
                    >
                      ✕
                    </div>
                  )}
                </div>
              </div>

              <div className="stop-body">
                {/* Location select search dropdown */}
                <div className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="field-l">{t('location')}</label>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ border: 'none', padding: '0 4px', color: 'var(--accent)', fontSize: '11px' }}
                      onClick={() => {
                        setActiveStopId(stop.id);
                        setIsLocOpen(true);
                      }}
                    >
                      + {t('createNewLocation')}
                    </button>
                  </div>
                  <div className="inp-w">
                    <span className="ico">📍</span>
                    <select
                      className="inp"
                      value={stop.location}
                      onChange={(e) => handleUpdateStopField(stop.id, 'location', e.target.value)}
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Appointment Date */}
                <div className="field">
                  <label className="field-l">{t('appointment')}</label>
                  <div className="appt-row">
                    <div className="field" style={{ flex: 1 }}>
                      <input
                        type="date"
                        className="inp"
                        value={stop.date}
                        onChange={(e) => handleUpdateStopField(stop.id, 'date', e.target.value)}
                      />
                    </div>
                    {stop.date && <span className="day-badge">{getDayName(stop.date)}</span>}
                  </div>
                </div>

                {/* Hours Frame */}
                <div style={{ marginTop: '12px' }}>
                  <div className="time-tog">
                    <button className="tt-b act">{t('preciseTime')}</button>
                  </div>
                  <div className="time-row">
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-l">{t('from')}</label>
                      <input
                        type="time"
                        className="inp"
                        value={stop.timeStart}
                        onChange={(e) => handleUpdateStopField(stop.id, 'timeStart', e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-l">{t('to')}</label>
                      <input
                        type="time"
                        className="inp"
                        value={stop.timeEnd}
                        onChange={(e) => handleUpdateStopField(stop.id, 'timeEnd', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Cargo Details under Stop */}
                <div className="cargo">
                  <div className="cargo-h">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <span>{t('cargoAtStop')}</span>
                  </div>

                  {stop.customers.map((cust, custIdx) => (
                    <div key={custIdx} className="cust-c">
                      <div className="cust-h">
                        <span>🏪 {t('customer')}</span>
                        <span className="order-sum">{cust.name || t('optional')}</span>
                        <div className="acts">
                          <div className="mini-btn del" onClick={() => removeCustomerFromStop(stop.id, custIdx)}>✕</div>
                        </div>
                      </div>
                      <div className="cust-body">
                        <div className="field" style={{ marginTop: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="field-l">{t('selectCustomer')}</label>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ border: 'none', padding: '0 4px', color: 'var(--accent)', fontSize: '11px' }}
                              onClick={() => {
                                setActiveStopId(stop.id);
                                setActiveCustIndex(custIdx);
                                setIsCustOpen(true);
                              }}
                            >
                              + {t('createNewCustomer')}
                            </button>
                          </div>
                          <select
                            className="inp"
                            value={cust.name}
                            onChange={(e) => updateCustomerName(stop.id, custIdx, e.target.value)}
                          >
                            <option value="">—</option>
                            {companies.map((comp) => (
                              <option key={comp.id} value={comp.name}>
                                {comp.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Customer Orders */}
                        {cust.orders.map((order, orderIdx) => (
                          <div key={orderIdx} className="order-c" style={{ marginTop: '12px' }}>
                            <div className="order-h">
                              <span>{t('order')}</span>
                              <span className="order-sum">{order.id || 'No ID'}</span>
                              <div className="acts">
                                <div className="mini-btn del" onClick={() => removeOrderFromCustomer(stop.id, custIdx, orderIdx)}>✕</div>
                              </div>
                            </div>
                            <div className="order-body">
                              <div className="field" style={{ marginTop: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label className="field-l">{t('referenceId')}</label>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ border: 'none', padding: '0 4px', color: 'var(--accent)', fontSize: '11px' }}
                                    onClick={() => {
                                      setActiveStopId(stop.id);
                                      setActiveCustIndex(custIdx);
                                      setActiveOrderIndex(orderIdx);
                                      setIsOrderOpen(true);
                                    }}
                                  >
                                    + {t('createNewOrder')}
                                  </button>
                                </div>
                                <input
                                  className="inp"
                                  placeholder="e.g. PO-2026-001"
                                  value={order.id}
                                  onChange={(e) => updateOrderRef(stop.id, custIdx, orderIdx, e.target.value)}
                                />
                              </div>

                              <div style={{ marginTop: '10px' }}>
                                <div className="prod-labels">
                                  <span className="pl-product">{t('product')}</span>
                                  <span className="pl-action" style={{ width: '135px' }}>{t('action')}</span>
                                  <span className="pl-qty" style={{ width: '70px' }}>{t('qty')}</span>
                                  <span className="pl-unit" style={{ width: '90px' }}>{t('unit')}</span>
                                  <span className="pl-wt" style={{ width: '70px' }}>{t('weight')}</span>
                                </div>

                                <div className="prod-row">
                                  <div className="pr-product">
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <select
                                        value={order.products}
                                        onChange={(e) => updateOrderProductField(stop.id, custIdx, orderIdx, 'products', e.target.value)}
                                      >
                                        <option value="">—</option>
                                        {skus.map((sku) => (
                                          <option key={sku.id} value={sku.name}>
                                            {sku.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        className="btn btn-ghost"
                                        style={{ padding: '6px 8px', border: '1px solid var(--border)' }}
                                        onClick={() => setIsProdOpen(true)}
                                        title="Create SKU"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <div className="act-tog">
                                    <button
                                      className={`act-b pk ${order.qty >= 0 ? 'on' : ''}`}
                                      type="button"
                                    >
                                      {isPickup ? t('stopLoading') : t('stopDelivery')}
                                    </button>
                                  </div>
                                  <div className="pr-qty">
                                    <input
                                      type="number"
                                      value={order.qty}
                                      onChange={(e) => updateOrderProductField(stop.id, custIdx, orderIdx, 'qty', Number(e.target.value))}
                                    />
                                  </div>
                                  <div className="pr-unit">
                                    <select
                                      value={order.qtyUnit}
                                      onChange={(e) => updateOrderProductField(stop.id, custIdx, orderIdx, 'qtyUnit', e.target.value)}
                                    >
                                      <option value="Pallets">{t('pallets')}</option>
                                      <option value="Boxes">{t('boxes')}</option>
                                      <option value="Pieces">{t('pieces')}</option>
                                      <option value="Liters">{t('liters')}</option>
                                      <option value="Kg">Kg</option>
                                      <option value="Tons">{t('tons')}</option>
                                    </select>
                                  </div>
                                  <div className="pr-wt">
                                    <input
                                      type="number"
                                      value={order.weight}
                                      onChange={(e) => updateOrderProductField(stop.id, custIdx, orderIdx, 'weight', Number(e.target.value))}
                                    />
                                  </div>
                                  <div className="pr-wtu" style={{ width: '60px' }}>
                                    <select
                                      value={order.weightUnit}
                                      onChange={(e) => updateOrderProductField(stop.id, custIdx, orderIdx, 'weightUnit', e.target.value)}
                                    >
                                      <option value="T">T</option>
                                      <option value="Kg">Kg</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          className="add-btn"
                          onClick={() => addOrderToCustomer(stop.id, custIdx)}
                        >
                          + {t('addOrder')}
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    className="add-btn lg"
                    style={{ background: 'var(--surface)' }}
                    onClick={() => addCustomerToStop(stop.id)}
                  >
                    + {t('addCustomer')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button className="add-btn lg" onClick={handleAddStop}>
          + {t('addStopLabel')}
        </button>
      </div>

      {/* Modals Mounting */}
      <CreateCustomerModal
        isOpen={isCustOpen}
        onClose={() => setIsCustOpen(false)}
        onCreated={handleCustCreated}
      />
      <CreateOrderModal
        isOpen={isOrderOpen}
        onClose={() => setIsOrderOpen(false)}
        onCreated={handleOrderCreated}
      />
      <CreateLocationModal
        isOpen={isLocOpen}
        onClose={() => setIsLocOpen(false)}
        onCreated={handleLocCreated}
      />
      <CreateProductModal
        isOpen={isProdOpen}
        onClose={() => setIsProdOpen(false)}
        onCreated={handleProductCreated}
      />
    </div>
  );
};

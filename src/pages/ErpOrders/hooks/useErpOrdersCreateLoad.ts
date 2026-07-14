import { useState, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import type {
  ErpOrderLegacy,
  ProductLine,
  Stop,
  StopOrder,
  StopCustomer,
  StopProduct,
  Location,
  LocationsData,
  ProductGroup,
  ClCustomer,
  ErpOrderDdItem,
  CreateLoadState,
  ViewMode
} from '../types';

// Helper utilities for generating mock data
function rnd(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function pick<T>(a: T[]): T {
  return a[rnd(0, a.length - 1)];
}
function rndDate(s: Date, e: Date): Date {
  return new Date(s.getTime() + Math.random() * (e.getTime() - s.getTime()));
}

// Master lists for generating mock data & autocompletes
const LOCATIONS_INIT: LocationsData = {
  my: [
    { id: 1, name: "Athens Distribution Center", address: "12 Piraeus St", city: "Athens", contact: "+30 210 123 4567" },
    { id: 2, name: "Thessaloniki Hub", address: "45 Egnatia Ave", city: "Thessaloniki", contact: "+30 231 456 7890" },
    { id: 3, name: "Piraeus Port Terminal", address: "1 Port St", city: "Piraeus", contact: "+30 210 987 6543" },
    { id: 4, name: "Rotterdam DC", address: "88 Harbor Rd", city: "Rotterdam" },
    { id: 5, name: "Antwerp Warehouse", address: "12 Dock St", city: "Antwerp" },
    { id: 6, name: "Hamburg Hub", address: "5 Hafen Blvd", city: "Hamburg" },
    { id: 7, name: "Marseille Depot", address: "3 Port Ave", city: "Marseille" },
    { id: 8, name: "Barcelona Terminal", address: "7 Passeig de Colom", city: "Barcelona" },
    { id: 9, name: "Milan Logistics", address: "21 Via Torino", city: "Milan" },
    { id: 10, name: "Vienna DC", address: "45 Donau Str", city: "Vienna" }
  ],
  customers: [
    { custId: 101, custName: "Alpha Foods Ltd", locations: [
      { id: 201, name: "Paris North DC", address: "8 Rue du Commerce", city: "Paris" },
      { id: 202, name: "Berlin Central WH", address: "22 Industriestr", city: "Berlin" }
    ]},
    { custId: 102, custName: "Beta Distributors", locations: [
      { id: 301, name: "Madrid Distribution", address: "23 Calle Mayor", city: "Madrid" },
      { id: 302, name: "Rome Terminal", address: "89 Via Appia", city: "Rome" }
    ]},
    { custId: 103, custName: "Gamma Logistics", locations: [
      { id: 401, name: "Warsaw Logistics", address: "15 Marszałkowska", city: "Warsaw" },
      { id: 402, name: "Prague Hub", address: "8 Václavské nám", city: "Prague" }
    ]},
    { custId: 104, custName: "Delta Transport", locations: [
      { id: 501, name: "Budapest DC", address: "12 Andrássy út", city: "Budapest" },
      { id: 502, name: "Bucharest WH", address: "44 Calea Victoriei", city: "Bucharest" }
    ]}
  ]
};

const PRODUCTS_INIT: ProductGroup[] = [
  { type: "Beverages", skus: [{ id: 1, name: "Sparkling Water 24pk", sku: "SW-3302", wpu: 820 }, { id: 2, name: "UHT Milk 1L x12", sku: "ML-2210", wpu: 12.8 }, { id: 3, name: "Fresh Orange Juice 2L", sku: "OJ-1120", wpu: 720 }] },
  { type: "Dry Goods", skus: [{ id: 4, name: "Premium Cocoa Powder", sku: "CP-4021", wpu: 25 }, { id: 5, name: "Wheat Flour Type 550", sku: "WF-0094", wpu: 50 }, { id: 6, name: "Basmati Rice 10kg", sku: "BR-0451", wpu: 10 }] },
  { type: "Oils", skus: [{ id: 7, name: "Organic Olive Oil 5L", sku: "OO-1187", wpu: 6.2 }] },
  { type: "Canned", skus: [{ id: 8, name: "Canned Tomatoes 400g x24", sku: "CT-8830", wpu: 10.5 }] },
  { type: "Frozen", skus: [{ id: 9, name: "Frozen Pizza Margherita", sku: "FP-7761", wpu: 640 }] },
  { type: "Industrial", skus: [{ id: 10, name: "Industrial Detergent 20L", sku: "ID-5540", wpu: 22 }] },
  { type: "Confectionery", skus: [{ id: 11, name: "Biscuits Assorted 500g", sku: "FOD-010", wpu: 18 }, { id: 12, name: "Cookies Box 1kg", sku: "FOD-011", wpu: 24 }] }
];

const CL_CUSTOMERS_INIT: ClCustomer[] = [
  { id: 101, name: "Nestlé S.A.", vat: "CH123456789", city: "Vevey" },
  { id: 102, name: "Unilever PLC", vat: "GB987654321", city: "London" },
  { id: 103, name: "Danone Group", vat: "FR456789123", city: "Paris" },
  { id: 104, name: "Mondelez Int'l", vat: "US321654987", city: "Chicago" },
  { id: 105, name: "PepsiCo Inc.", vat: "US789456123", city: "Purchase" },
  { id: 106, name: "Coca-Cola HBC", vat: "CH654987321", city: "Steinhausen" },
  { id: 107, name: "AB InBev", vat: "BE147258369", city: "Leuven" },
  { id: 108, name: "Heineken N.V.", vat: "NL951753864", city: "Amsterdam" },
  { id: 109, name: "L'Oréal S.A.", vat: "FR357159852", city: "Clichy" },
  { id: 110, name: "Procter & Gamble", vat: "US753951456", city: "Cincinnati" }
];

const ERP_ORDERS_DD_INIT: ErpOrderDdItem[] = [
  { id: "PO-2024-001", customer: "Nestlé S.A." },
  { id: "PO-2024-002", customer: "Unilever PLC" },
  { id: "PO-2024-003", customer: "Danone Group" },
  { id: "PO-2024-004", customer: "Mondelez Int'l" }
];

const CUST_NAMES = ["Nestlé S.A.", "Unilever PLC", "Danone Group", "Mondelez Int'l", "PepsiCo Inc.", "Coca-Cola HBC", "AB InBev", "Heineken N.V.", "L'Oréal S.A.", "Procter & Gamble"];
const ORIGINS = ["Rotterdam DC", "Antwerp Warehouse", "Hamburg Hub", "Marseille Depot", "Barcelona Terminal", "Milan Logistics", "Vienna DC"];
const DESTS = ["Paris North DC", "Berlin Central WH", "Madrid Distribution", "Rome Terminal", "Warsaw Logistics", "Prague Hub", "Budapest DC", "Bucharest WH", "Athens Terminal", "Sofia DC", "Lisbon Port WH"];

const PROD_POOL = [
  { name: "Premium Cocoa Powder", sku: "CP-4021", uom: "kg", w: 25, pid: 4 },
  { name: "Organic Olive Oil 5L", sku: "OO-1187", uom: "cases", w: 6.2, pid: 7 },
  { name: "Sparkling Water 24pk", sku: "SW-3302", uom: "pallets", w: 820, pid: 1 },
  { name: "Wheat Flour Type 550", sku: "WF-0094", uom: "bags", w: 50, pid: 5 },
  { name: "UHT Milk 1L x12", sku: "ML-2210", uom: "cases", w: 12.8, pid: 2 },
  { name: "Frozen Pizza Margherita", sku: "FP-7761", uom: "pallets", w: 640, pid: 9 },
  { name: "Industrial Detergent 20L", sku: "ID-5540", uom: "drums", w: 22, pid: 10 },
  { name: "Canned Tomatoes 400g x24", sku: "CT-8830", uom: "cases", w: 10.5, pid: 8 },
  { name: "Fresh Orange Juice 2L", sku: "OJ-1120", uom: "pallets", w: 720, pid: 3 },
  { name: "Basmati Rice 10kg", sku: "BR-0451", uom: "bags", w: 10, pid: 6 }
];

const STATUSES = ["New", "Ready to Plan", "Planned", "In Transit", "Completed", "Canceled", "Exception"];
const ERP_SYS = ["SAP S/4HANA", "MS Dynamics BC", "Soft1 ERP", "Oracle NetSuite"];
const EXC_REASONS = ["Missing ship-to address", "Missing UoM on line items", "Unknown product mapping", "Duplicate order detected"];

// Static seed generator for 86 orders
function generateMockOrders(): ErpOrderLegacy[] {
  const result: ErpOrderLegacy[] = [];
  for (let i = 0; i < 86; i++) {
    const st = Math.random() < 0.3 ? 'New' : Math.random() < 0.2 ? 'Exception' : pick(STATUSES);
    const erp = pick(ERP_SYS);
    const oD = rndDate(new Date(2025, 10, 1), new Date(2026, 1, 20));
    const sD = new Date(oD.getTime() + rnd(2, 5) * 86400000);
    const dD = new Date(sD.getTime() + rnd(1, 4) * 86400000);
    const lc = rnd(1, 4);
    const lines: ProductLine[] = [];
    let tw = 0, tp = 0;

    for (let j = 0; j < lc; j++) {
      const p = { ...pick(PROD_POOL) };
      const qty = rnd(1, 50);
      const lw = Math.round(qty * p.w);
      tw += lw;
      tp += p.uom === 'pallets' ? qty : Math.ceil(qty / 12);
      lines.push({
        name: p.name,
        sku: p.sku,
        uom: p.uom,
        qty,
        lw,
        pid: p.pid
      });
    }

    const hl = ['Planned', 'In Transit', 'Completed'].includes(st);
    const syncOk = st !== 'Exception' || Math.random() > 0.5;

    result.push({
      id: 'ORD-' + String(10000 + i).slice(1),
      erpNum: (erp === 'SAP S/4HANA' ? 'SO' : erp === 'MS Dynamics BC' ? 'BC' : erp === 'Soft1 ERP' ? 'SF' : 'NS') + '-' + (300000 + i),
      erp,
      status: st,
      customer: pick(CUST_NAMES),
      origin: pick(ORIGINS),
      dest: pick(DESTS),
      oDate: oD,
      sDate: sD,
      dDate: dD,
      lines,
      lc,
      tw: Math.round(tw),
      tp,
      loadSid: hl ? 'MV-2026' + rnd(1000, 9999) : '',
      loadSt: hl ? (st === 'Planned' ? 'Draft' : st === 'In Transit' ? 'In Transit' : 'Delivered') : '',
      lastSync: rndDate(new Date(2026, 1, 18), new Date(2026, 1, 22)),
      syncOk,
      excReason: st === 'Exception' ? pick(EXC_REASONS) : '',
      priority: Math.random() < 0.12 ? 'Urgent' : Math.random() < 0.25 ? 'High' : 'Normal',
      notes: Math.random() < 0.3 ? 'Deliver before 10:00 AM. Dock #4 only.' : ''
    });
  }
  return result;
}

export function useErpOrdersCreateLoad() {
  const { showToast } = useApp();
  const { t } = useTranslation();

  // Persisted master list states (editable inline during Wizard steps)
  const [orders, setOrders] = useState<ErpOrderLegacy[]>(() => generateMockOrders());
  const [locations, setLocations] = useState<LocationsData>(LOCATIONS_INIT);
  const [products, setProducts] = useState<ProductGroup[]>(PRODUCTS_INIT);
  const [customers, setCustomers] = useState<ClCustomer[]>(CL_CUSTOMERS_INIT);
  const [erpOrdersDd, setErpOrdersDd] = useState<ErpOrderDdItem[]>(ERP_ORDERS_DD_INIT);

  // Table state (View 1)
  const [searchQ, setSearchQ] = useState('');
  const [activeTab, setActiveTab] = useState<'work' | 'all' | 'completed' | 'exceptions'>('work');
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('sDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ urgent: false, noload: false, sync: false });
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('orders');

  // Create Load Wizard state (View 2)
  const [clState, setClState] = useState<CreateLoadState>({ stops: [] });
  const [activeStopId, setActiveStopId] = useState<number | null>(null);
  const [vehicleExpanded, setVehicleExpanded] = useState(true);

  // Complex vehicle configuration state matching mock vehicle nesting
  const [vehicleSelections, setVehicleSelections] = useState({
    semi: {
      selected: true,
      cats: {
        dry: { selected: true, items: { curtainside: true, box: true, platform: true, flatbed: true } },
        reefer: { selected: false, items: { temp: false, multitemp: false } },
        other: { selected: false, items: { tanker: false, silo: false } }
      }
    },
    curtain: {
      selected: true,
      cats: {
        dry: { selected: true, items: { standard: true, mega: true } },
        reefer: { selected: false, items: { refr: false } }
      }
    },
    rigid: {
      selected: false,
      cats: {
        dry: { selected: false, items: { box: false, flatbed: false } },
        reefer: { selected: false, items: { refr: false } }
      }
    },
    van: {
      selected: false,
      cats: {
        dry: { selected: false, items: { small: false, large: false } },
        reefer: { selected: false, items: { refr: false } }
      }
    }
  });

  // Modal open states
  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);

  // Context storage for modal triggers from nested locations / orders / products
  const [pendingOrderCtx, setPendingOrderCtx] = useState<{ stopId: number; orderId: number; customerId: number | null } | null>(null);
  const [pendingProductCtx, setPendingProductCtx] = useState<{ stopId: number; orderId: number; productId: number; customerId: number | null } | null>(null);
  const [pendingLocCtx, setPendingLocCtx] = useState<number | null>(null);

  // Wizard unique counters ref (persisted across state calls)
  const idCounterRef = useRef({ stop: 1000, order: 1000, product: 1000, customer: 1000, locId: 600, prodId: 200 });

  // Reset helper
  const clearSel = useCallback(() => {
    setSelectedOrders(new Set());
  }, []);

  const openDrawer = useCallback((id: string) => {
    setDrawerOrderId(id);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOrderId(null);
  }, []);

  // Filter actions
  const toggleFilter = useCallback((k: 'urgent' | 'noload' | 'sync') => {
    setFilters(f => ({ ...f, [k]: !f[k] }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQ('');
    setFilters({ urgent: false, noload: false, sync: false });
    setActiveKpi(null);
    setPage(1);
    showToast(t('filtersCleared'), 'info');
  }, [showToast, t]);

  const toggleKpi = useCallback((k: string) => {
    setActiveKpi(prev => (prev === k ? null : k));
    setPage(1);
  }, []);

  const doSort = useCallback((f: string) => {
    setSortField(prevField => {
      if (prevField === f) {
        setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortDir('asc');
      }
      return f;
    });
    setPage(1);
  }, []);

  const toggleSel = useCallback((id: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // KPI Computations
  const kpis = useMemo(() => {
    return [
      { key: 'unplanned', label: 'Unplanned', val: orders.filter(o => o.status === 'New' || o.status === 'Ready to Plan').length, color: '#6366F1' },
      { key: 'planned', label: 'Planned', val: orders.filter(o => o.status === 'Planned').length, color: '#3B82F6' },
      { key: 'transit', label: 'In Transit', val: orders.filter(o => o.status === 'In Transit').length, color: '#F59E0B' },
      { key: 'completed', label: 'Completed', val: orders.filter(o => o.status === 'Completed').length, color: '#10B981' },
      { key: 'exceptions', label: 'Exceptions', val: orders.filter(o => o.status === 'Exception').length, color: '#EF4444' }
    ];
  }, [orders]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      work: orders.filter(o => ['New', 'Ready to Plan', 'Exception'].includes(o.status) || o.priority === 'Urgent').length,
      all: orders.length,
      completed: orders.filter(o => o.status === 'Completed').length,
      exceptions: orders.filter(o => o.status === 'Exception').length
    };
  }, [orders]);

  // Filtered & Sorted orders list
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by Tab
    if (activeTab === 'work') {
      result = result.filter(o => ['New', 'Ready to Plan', 'Exception'].includes(o.status) || o.priority === 'Urgent');
    } else if (activeTab === 'completed') {
      result = result.filter(o => o.status === 'Completed');
    } else if (activeTab === 'exceptions') {
      result = result.filter(o => o.status === 'Exception');
    }

    // Filter by KPI selection
    if (activeKpi === 'unplanned') {
      result = result.filter(o => o.status === 'New' || o.status === 'Ready to Plan');
    } else if (activeKpi === 'planned') {
      result = result.filter(o => o.status === 'Planned');
    } else if (activeKpi === 'transit') {
      result = result.filter(o => o.status === 'In Transit');
    } else if (activeKpi === 'completed') {
      result = result.filter(o => o.status === 'Completed');
    } else if (activeKpi === 'exceptions') {
      result = result.filter(o => o.status === 'Exception');
    }

    // Filter by Pills
    if (filters.urgent) {
      result = result.filter(o => o.priority === 'Urgent' || o.priority === 'High');
    }
    if (filters.noload) {
      result = result.filter(o => !o.loadSid);
    }
    if (filters.sync) {
      result = result.filter(o => !o.syncOk);
    }

    // Filter by Search Query
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(o =>
        [
          o.id,
          o.erpNum,
          o.customer,
          o.origin,
          o.dest,
          o.loadSid,
          ...o.lines.map(x => x.name + ' ' + x.sku)
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let va: any, vb: any;
      if (sortField === 'id') {
        va = a.id;
        vb = b.id;
      } else if (sortField === 'customer') {
        va = a.customer;
        vb = b.customer;
      } else if (sortField === 'status') {
        va = a.status;
        vb = b.status;
      } else if (sortField === 'lastSync') {
        va = a.lastSync.getTime();
        vb = b.lastSync.getTime();
      } else {
        va = a.sDate.getTime();
        vb = b.sDate.getTime();
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, activeTab, activeKpi, filters, searchQ, sortField, sortDir]);

  const toggleAll = useCallback((checked: boolean) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      const itemsOnPage = filteredOrders.slice((page - 1) * 20, page * 20);
      itemsOnPage.forEach(o => {
        if (checked) {
          next.add(o.id);
        } else {
          next.delete(o.id);
        }
      });
      return next;
    });
  }, [filteredOrders, page]);

  // View 2 (Wizard) helpers
  const getAllStopOrders = (stop: Stop): StopOrder[] => {
    return stop.customers.flatMap(c => c.orders).concat(stop.orders || []);
  };

  const calcRemaining = useCallback((orderRef: string, productId: number, upToIdx: number, stopsState: Stop[]) => {
    let pickup = 0, dropoff = 0;
    for (let i = 0; i < upToIdx; i++) {
      const stop = stopsState[i];
      getAllStopOrders(stop).forEach(o => {
        if (o.ref === orderRef) {
          o.products.forEach(p => {
            if (p.productId === productId) {
              if (p.action === 'pickup') pickup += parseFloat(p.qty as any) || 0;
              if (p.action === 'dropoff') dropoff += parseFloat(p.qty as any) || 0;
            }
          });
        }
      });
    }
    return pickup - dropoff;
  }, []);

  const tryAutoFill = useCallback((
    sid: number,
    oid: number,
    orderRef: string,
    customerId: number | null,
    newStopsState?: Stop[]
  ) => {
    const stopsList = newStopsState || clState.stops;
    const currentStop = stopsList.find(s => s.id === sid);
    if (!currentStop) return;
    const currentStopIdx = stopsList.indexOf(currentStop);

    let currentOrder: StopOrder | undefined;
    if (customerId !== null) {
      const c = currentStop.customers.find(cust => cust.id === customerId);
      if (c) currentOrder = c.orders.find(o => o.id === oid);
    } else {
      currentOrder = currentStop.orders.find(o => o.id === oid);
    }

    if (!currentOrder || currentOrder.products.length > 0) return;

    const productsToAdd: StopProduct[] = [];
    for (let i = 0; i < currentStopIdx; i++) {
      const prevStop = stopsList[i];
      getAllStopOrders(prevStop).forEach(prevOrder => {
        if (prevOrder.ref === orderRef) {
          prevOrder.products.forEach(p => {
            if (p.action === 'pickup' && p.productId) {
              const remaining = calcRemaining(orderRef, p.productId, currentStopIdx, stopsList);
              if (remaining > 0) {
                productsToAdd.push({
                  id: ++idCounterRef.current.product,
                  productId: p.productId,
                  productName: p.productName,
                  action: 'dropoff',
                  qty: remaining,
                  unit: p.unit,
                  weight: p.weight ? (parseFloat(p.weight as string) / parseFloat(p.qty as any) * remaining).toFixed(1) : '',
                  wtUnit: p.wtUnit || 'Kgs'
                });
              }
            }
          });
        }
      });
    }

    if (productsToAdd.length) {
      const updatedStops = stopsList.map(s => {
        if (s.id !== sid) return s;
        if (customerId !== null) {
          return {
            ...s,
            customers: s.customers.map(c => {
              if (c.id !== customerId) return c;
              return {
                ...c,
                orders: c.orders.map(o => {
                  if (o.id !== oid) return o;
                  return { ...o, products: productsToAdd };
                })
              };
            })
          };
        } else {
          return {
            ...s,
            orders: s.orders.map(o => {
              if (o.id !== oid) return o;
              return { ...o, products: productsToAdd };
            })
          };
        }
      });
      setClState({ stops: updatedStops });
      showToast(`${productsToAdd.length} dropoffs added from pickup details`, 'success');
    }
  }, [clState.stops, calcRemaining, showToast]);

  // Convert selected ERP orders to itinerary wizard stops state
  const buildStopsFromERP = useCallback((selectedIds: Set<string>) => {
    const selectedList = orders.filter(o => selectedIds.has(o.id));
    const byO: { [key: string]: ErpOrderLegacy[] } = {};
    const byD: { [key: string]: ErpOrderLegacy[] } = {};

    selectedList.forEach(o => {
      (byO[o.origin] = byO[o.origin] || []).push(o);
      (byD[o.dest] = byD[o.dest] || []).push(o);
    });

    const stopsList: Stop[] = [];
    const fmtISO = (d: Date) => d.toISOString().split('T')[0];

    // Build Pickup stops from unique origins
    Object.entries(byO).forEach(([loc, ords]) => {
      const sid = ++idCounterRef.current.stop;
      const locMatch = LOCATIONS_INIT.my.find(l => l.name === loc);
      const byCust: { [key: string]: ErpOrderLegacy[] } = {};
      ords.forEach(o => {
        (byCust[o.customer] = byCust[o.customer] || []).push(o);
      });

      const stopCustomers: StopCustomer[] = Object.entries(byCust).map(([custName, custOrds]) => {
        const cid = ++idCounterRef.current.customer;
        const stopOrders: StopOrder[] = custOrds.map(o => {
          const oid = ++idCounterRef.current.order;
          const stopProducts: StopProduct[] = o.lines.map(l => {
            const pid = ++idCounterRef.current.product;
            const matchProd = PRODUCTS_INIT.flatMap(g => g.skus).find(s => s.sku === l.sku);
            return {
              id: pid,
              productId: matchProd ? matchProd.id : null,
              productName: l.name,
              action: 'pickup',
              qty: l.qty,
              unit: l.uom === 'pallets' ? 'EUR Pallets' : l.uom === 'kg' ? 'Kgs' : l.uom === 'cases' ? 'Boxes' : l.uom === 'bags' ? 'Kgs' : l.uom === 'drums' ? 'Units' : 'EUR Pallets',
              weight: l.lw,
              wtUnit: 'Kgs'
            };
          });
          return { id: oid, ref: o.id, expanded: true, products: stopProducts };
        });
        return { id: cid, name: custName, expanded: true, orders: stopOrders };
      });

      stopsList.push({
        id: sid,
        locationId: locMatch ? locMatch.id : null,
        locationName: loc,
        locationAddr: locMatch ? locMatch.address + ', ' + locMatch.city : '',
        date: fmtISO(ords[0].sDate),
        timeMode: 'precise',
        timeStart: '06:00',
        timeEnd: '',
        expanded: true,
        orders: [],
        customers: stopCustomers
      });
    });

    // Build Delivery stops from unique destinations
    Object.entries(byD).forEach(([loc, ords]) => {
      const sid = ++idCounterRef.current.stop;
      const locMatch = [...LOCATIONS_INIT.my, ...LOCATIONS_INIT.customers.flatMap(c => c.locations)].find(l => l.name === loc);
      const byCust: { [key: string]: ErpOrderLegacy[] } = {};
      ords.forEach(o => {
        (byCust[o.customer] = byCust[o.customer] || []).push(o);
      });

      const stopCustomers: StopCustomer[] = Object.entries(byCust).map(([custName, custOrds]) => {
        const cid = ++idCounterRef.current.customer;
        const stopOrders: StopOrder[] = custOrds.map(o => {
          const oid = ++idCounterRef.current.order;
          const stopProducts: StopProduct[] = o.lines.map(l => {
            const pid = ++idCounterRef.current.product;
            const matchProd = PRODUCTS_INIT.flatMap(g => g.skus).find(s => s.sku === l.sku);
            return {
              id: pid,
              productId: matchProd ? matchProd.id : null,
              productName: l.name,
              action: 'dropoff',
              qty: l.qty,
              unit: l.uom === 'pallets' ? 'EUR Pallets' : l.uom === 'kg' ? 'Kgs' : l.uom === 'cases' ? 'Boxes' : l.uom === 'bags' ? 'Kgs' : l.uom === 'drums' ? 'Units' : 'EUR Pallets',
              weight: l.lw,
              wtUnit: 'Kgs'
            };
          });
          return { id: oid, ref: o.id, expanded: true, products: stopProducts };
        });
        return { id: cid, name: custName, expanded: true, orders: stopOrders };
      });

      stopsList.push({
        id: sid,
        locationId: locMatch ? locMatch.id : null,
        locationName: loc,
        locationAddr: locMatch ? locMatch.address + ', ' + locMatch.city : '',
        date: fmtISO(ords[0].dDate),
        timeMode: 'range',
        timeStart: '08:00',
        timeEnd: '12:00',
        expanded: false,
        orders: [],
        customers: stopCustomers
      });
    });

    setClState({ stops: stopsList });
    if (stopsList.length) {
      setActiveStopId(stopsList[0].id);
    }
  }, [orders]);

  const goToCreateLoad = useCallback(() => {
    if (!selectedOrders.size) {
      showToast('Select at least one order', 'warning');
      return;
    }
    closeDrawer();
    buildStopsFromERP(selectedOrders);
    setVehicleExpanded(true);
    setViewMode('create');
  }, [selectedOrders, buildStopsFromERP, closeDrawer, showToast]);

  const goToItinerary = useCallback(() => {
    setViewMode('itin');
  }, []);

  // Wizard state editing functions
  const addStop = useCallback(() => {
    const sid = ++idCounterRef.current.stop;
    setClState(prev => ({
      stops: [
        ...prev.stops,
        {
          id: sid,
          locationId: null,
          locationName: '',
          locationAddr: '',
          date: '',
          timeMode: 'precise',
          timeStart: '08:00',
          timeEnd: '',
          expanded: true,
          orders: [],
          customers: []
        }
      ]
    }));
    setActiveStopId(sid);
  }, []);

  const deleteStop = useCallback((stopId: number) => {
    setClState(prev => {
      const nextStops = prev.stops.filter(s => s.id !== stopId);
      return { stops: nextStops };
    });
  }, []);

  const toggleStop = useCallback((stopId: number) => {
    setClState(prev => ({
      stops: prev.stops.map(s => (s.id === stopId ? { ...s, expanded: !s.expanded } : s))
    }));
  }, []);

  const setStopField = useCallback((stopId: number, field: string, val: any) => {
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        if (field === 'locationId') {
          return { ...s, locationId: val };
        }
        return { ...s, [field]: val };
      })
    }));
  }, []);

  const setTimeMode = useCallback((stopId: number, mode: 'precise' | 'range') => {
    setClState(prev => ({
      stops: prev.stops.map(s => (s.id === stopId ? { ...s, timeMode: mode, timeEnd: mode === 'range' ? '12:00' : '' } : s))
    }));
  }, []);

  const addCustomer = useCallback((stopId: number) => {
    const cid = ++idCounterRef.current.customer;
    const oid = ++idCounterRef.current.order;
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: [
            ...s.customers,
            {
              id: cid,
              name: '',
              expanded: true,
              orders: [{ id: oid, ref: '', expanded: true, products: [] }]
            }
          ]
        };
      })
    }));
  }, []);

  const deleteCustomer = useCallback((stopId: number, customerId: number) => {
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: s.customers.filter(c => c.id !== customerId)
        };
      })
    }));
  }, []);

  const toggleCustomer = useCallback((stopId: number, customerId: number) => {
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: s.customers.map(c => (c.id === customerId ? { ...c, expanded: !c.expanded } : c))
        };
      })
    }));
  }, []);

  const setCustName = useCallback((stopId: number, customerId: number, name: string) => {
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: s.customers.map(c => (c.id === customerId ? { ...c, name } : c))
        };
      })
    }));
  }, []);

  const addCustOrder = useCallback((stopId: number, customerId: number) => {
    const oid = ++idCounterRef.current.order;
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: s.customers.map(c => {
            if (c.id !== customerId) return c;
            return {
              ...c,
              orders: [...c.orders, { id: oid, ref: '', expanded: true, products: [] }]
            };
          })
        };
      })
    }));
  }, []);

  const deleteCustOrder = useCallback((stopId: number, customerId: number, orderId: number) => {
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: s.customers.map(c => {
            if (c.id !== customerId) return c;
            return {
              ...c,
              orders: c.orders.filter(o => o.id !== orderId)
            };
          })
        };
      })
    }));
  }, []);

  const toggleCustOrder = useCallback((stopId: number, customerId: number, orderId: number) => {
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: s.customers.map(c => {
            if (c.id !== customerId) return c;
            return {
              ...c,
              orders: c.orders.map(o => (o.id === orderId ? { ...o, expanded: !o.expanded } : o))
            };
          })
        };
      })
    }));
  }, []);

  const setCustOrderRef = useCallback((stopId: number, customerId: number, orderId: number, ref: string) => {
    setClState(prev => {
      const nextStops = prev.stops.map(s => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          customers: s.customers.map(c => {
            if (c.id !== customerId) return c;
            return {
              ...c,
              orders: c.orders.map(o => (o.id === orderId ? { ...o, ref } : o))
            };
          })
        };
      });
      // Trigger dropoff autofill if matching reference is found
      setTimeout(() => {
        tryAutoFill(stopId, orderId, ref, customerId, nextStops);
      }, 0);
      return { stops: nextStops };
    });
  }, [tryAutoFill]);

  const addCustProduct = useCallback((stopId: number, customerId: number, orderId: number) => {
    const pid = ++idCounterRef.current.product;
    setClState(prev => {
      const s = prev.stops.find(st => st.id === stopId);
      if (!s) return prev;
      const stopIdx = prev.stops.indexOf(s);
      const defAction = stopIdx === 0 ? 'pickup' : (prev.stops.length === 2 && stopIdx === prev.stops.length - 1) ? 'dropoff' : 'pickup';

      return {
        stops: prev.stops.map(st => {
          if (st.id !== stopId) return st;
          return {
            ...st,
            customers: st.customers.map(c => {
              if (c.id !== customerId) return c;
              return {
                ...c,
                orders: c.orders.map(o => {
                  if (o.id !== orderId) return o;
                  return {
                    ...o,
                    products: [
                      ...o.products,
                      { id: pid, productId: null, productName: '', action: defAction, qty: 0, unit: 'EUR Pallets', weight: '', wtUnit: 'Kgs' }
                    ]
                  };
                })
              };
            })
          };
        })
      };
    });
  }, []);

  const addProduct = useCallback((stopId: number, orderId: number) => {
    const pid = ++idCounterRef.current.product;
    setClState(prev => {
      const s = prev.stops.find(st => st.id === stopId);
      if (!s) return prev;
      const stopIdx = prev.stops.indexOf(s);
      const defAction = stopIdx === 0 ? 'pickup' : (prev.stops.length === 2 && stopIdx === prev.stops.length - 1) ? 'dropoff' : 'pickup';

      return {
        stops: prev.stops.map(st => {
          if (st.id !== stopId) return st;
          return {
            ...st,
            orders: st.orders.map(o => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                products: [
                  ...o.products,
                  { id: pid, productId: null, productName: '', action: defAction, qty: 0, unit: 'EUR Pallets', weight: '', wtUnit: 'Kgs' }
                ]
              };
            })
          };
        })
      };
    });
  }, []);

  const deleteProduct = useCallback((stopId: number, orderId: number, productId: number, customerId: number | null) => {
    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        if (customerId !== null) {
          return {
            ...s,
            customers: s.customers.map(c => {
              if (c.id !== customerId) return c;
              return {
                ...c,
                orders: c.orders.map(o => {
                  if (o.id !== orderId) return o;
                  return {
                    ...o,
                    products: o.products.filter(p => p.id !== productId)
                  };
                })
              };
            })
          };
        } else {
          return {
            ...s,
            orders: s.orders.map(o => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                products: o.products.filter(p => p.id !== productId)
              };
            })
          };
        }
      })
    }));
  }, []);

  const setProductField = useCallback((
    stopId: number,
    orderId: number,
    productRowId: number,
    customerId: number | null,
    field: string,
    val: any
  ) => {
    // Intercept creating new product from select option
    if (field === 'productId' && val === '__new__') {
      setPendingProductCtx({ stopId, orderId, productId: productRowId, customerId });
      setProductModalOpen(true);
      return;
    }

    setClState(prev => ({
      stops: prev.stops.map(s => {
        if (s.id !== stopId) return s;
        const updateProduct = (p: StopProduct) => {
          if (p.id !== productRowId) return p;
          if (field === 'productId') {
            const parsedVal = val === '' ? null : parseInt(val);
            // Auto fill weight per unit if matching product is selected
            let name = p.productName;
            let weight = p.weight;
            if (parsedVal) {
              const matched = products.flatMap(g => g.skus).find(sku => sku.id === parsedVal);
              if (matched) {
                name = matched.name;
                if (p.qty) {
                  weight = (p.qty * matched.wpu).toFixed(1);
                }
              }
            }
            return { ...p, productId: parsedVal, productName: name, weight };
          }
          if (field === 'qty') {
            const qtyNum = parseFloat(val) || 0;
            let weight = p.weight;
            if (p.productId) {
              const matched = products.flatMap(g => g.skus).find(sku => sku.id === p.productId);
              if (matched) {
                weight = (qtyNum * matched.wpu).toFixed(1);
              }
            }
            return { ...p, qty: qtyNum, weight };
          }
          return { ...p, [field]: val };
        };

        if (customerId !== null) {
          return {
            ...s,
            customers: s.customers.map(c => {
              if (c.id !== customerId) return c;
              return {
                ...c,
                orders: c.orders.map(o => {
                  if (o.id !== orderId) return o;
                  return {
                    ...o,
                    products: o.products.map(updateProduct)
                  };
                })
              };
            })
          };
        } else {
          return {
            ...s,
            orders: s.orders.map(o => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                products: o.products.map(updateProduct)
              };
            })
          };
        }
      })
    }));
  }, [products]);

  // Modal confirm workflow actions
  const confirmCreateOrder = useCallback((ref: string, customer: string, notes: string) => {
    if (!ref) {
      showToast('Order ID required', 'warning');
      return;
    }
    const newDdItem: ErpOrderDdItem = { id: ref, customer };
    setErpOrdersDd(prev => [...prev, newDdItem]);

    if (pendingOrderCtx) {
      const { stopId, orderId, customerId } = pendingOrderCtx;
      setClState(prev => ({
        stops: prev.stops.map(s => {
          if (s.id !== stopId) return s;
          if (customerId !== null) {
            return {
              ...s,
              customers: s.customers.map(c => {
                if (c.id !== customerId) return c;
                return {
                  ...c,
                  orders: c.orders.map(o => (o.id === orderId ? { ...o, ref } : o))
                };
              })
            };
          } else {
            return {
              ...s,
              orders: s.orders.map(o => (o.id === orderId ? { ...o, ref } : o))
            };
          }
        })
      }));

      // Trigger auto fill dropoffs
      setTimeout(() => {
        tryAutoFill(stopId, orderId, ref, customerId);
      }, 0);
      setPendingOrderCtx(null);
    }

    setOrderModalOpen(false);
    showToast(`Order created: ${ref}`, 'success');
  }, [pendingOrderCtx, tryAutoFill, showToast]);

  const confirmCreateProduct = useCallback((name: string, sku: string, category: string, wpu: number) => {
    if (!name || !sku) {
      showToast('Name and SKU required', 'warning');
      return;
    }
    const newId = ++idCounterRef.current.prodId;
    const cat = category || 'Custom';

    setProducts(prev => {
      const copy = [...prev];
      let group = copy.find(p => p.type === cat);
      if (!group) {
        group = { type: cat, skus: [] };
        copy.push(group);
      }
      group.skus.push({ id: newId, name, sku, wpu });
      return copy;
    });

    if (pendingProductCtx) {
      const { stopId, orderId, productId, customerId } = pendingProductCtx;
      setClState(prev => ({
        stops: prev.stops.map(s => {
          if (s.id !== stopId) return s;
          const updateProduct = (p: StopProduct) => {
            if (p.id !== productId) return p;
            return { ...p, productId: newId, productName: name };
          };

          if (customerId !== null) {
            return {
              ...s,
              customers: s.customers.map(c => {
                if (c.id !== customerId) return c;
                return {
                  ...c,
                  orders: c.orders.map(o => {
                    if (o.id !== orderId) return o;
                    return { ...o, products: o.products.map(updateProduct) };
                  })
                };
              })
            };
          } else {
            return {
              ...s,
              orders: s.orders.map(o => {
                if (o.id !== orderId) return o;
                return { ...o, products: o.products.map(updateProduct) };
              })
            };
          }
        })
      }));
      setPendingProductCtx(null);
    }

    setProductModalOpen(false);
    showToast(`Product created: ${name}`, 'success');
  }, [pendingProductCtx, showToast]);

  const confirmCreateLocation = useCallback((name: string, address: string, city: string, country: string) => {
    if (!name || !address || !city) {
      showToast('All fields required', 'warning');
      return;
    }
    const newId = ++idCounterRef.current.locId;
    const newLoc: Location = { id: newId, name, address, city };

    setLocations(prev => ({
      ...prev,
      my: [...prev.my, newLoc]
    }));

    if (pendingLocCtx !== null) {
      const stopId = pendingLocCtx;
      setClState(prev => ({
        stops: prev.stops.map(s => {
          if (s.id !== stopId) return s;
          return {
            ...s,
            locationId: newId,
            locationName: name,
            locationAddr: address + ', ' + city
          };
        })
      }));
      setPendingLocCtx(null);
    }

    setLocationModalOpen(false);
    showToast(`Location created: ${name}`, 'success');
  }, [pendingLocCtx, showToast]);

  // Validation state
  const isFormValid = useMemo(() => {
    if (clState.stops.length < 2) return false;
    let hasPk = false;
    let hasDo = false;
    let detailsFilled = true;

    clState.stops.forEach(s => {
      if (!s.locationName) detailsFilled = false;
      if (!s.date) detailsFilled = false;

      const check = (ordersList: StopOrder[]) => {
        ordersList.forEach(o => {
          o.products.forEach(p => {
            if (p.action === 'pickup' && parseFloat(p.qty as any) > 0) hasPk = true;
            if (p.action === 'dropoff' && parseFloat(p.qty as any) > 0) hasDo = true;
          });
        });
      };
      s.customers.forEach(c => check(c.orders));
      check(s.orders || []);
    });

    return detailsFilled && hasPk && hasDo;
  }, [clState.stops]);

  // Stop Tags Helper
  const getStopTags = useCallback((stop: Stop) => {
    let hasPk = false;
    let hasDo = false;
    const check = (ordersList: StopOrder[]) => {
      ordersList.forEach(o => {
        o.products.forEach(p => {
          if (p.action === 'pickup') hasPk = true;
          if (p.action === 'dropoff') hasDo = true;
        });
      });
    };
    stop.customers.forEach(c => check(c.orders));
    check(stop.orders || []);

    const tags: { type: 'pickup' | 'dropoff'; label: string }[] = [];
    if (hasPk) tags.push({ type: 'pickup', label: 'PICKUP' });
    if (hasDo) tags.push({ type: 'dropoff', label: 'DELIVERY' });
    return tags;
  }, []);

  const getStopBrief = useCallback((stop: Stop) => {
    const parts: string[] = [];
    if (stop.locationName) parts.push(stop.locationName);
    if (stop.date) {
      const d = new Date(stop.date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[d.getDay()].substring(0, 3);
      parts.push(`${day} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    let cCount = stop.customers.length;
    let oCount = 0;
    let pCount = 0;

    stop.customers.forEach(c => {
      oCount += c.orders.length;
      c.orders.forEach(o => (pCount += o.products.length));
    });
    (stop.orders || []).forEach(o => {
      oCount++;
      pCount += o.products.length;
    });

    if (cCount) parts.push(`${cCount} customers`);
    if (oCount) parts.push(`${oCount} orders`);
    if (pCount) parts.push(`${pCount} products`);

    return parts.join(' • ') || '—';
  }, []);

  const getStopSummary = useCallback((stop: Stop) => {
    let cCount = stop.customers.length;
    let oCount = 0;
    let pCount = 0;

    stop.customers.forEach(c => {
      oCount += c.orders.length;
      c.orders.forEach(o => (pCount += o.products.length));
    });
    (stop.orders || []).forEach(o => {
      oCount++;
      pCount += o.products.length;
    });

    const d = stop.date ? new Date(stop.date) : null;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStr = d ? `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';

    const parts = [dayStr];
    if (cCount) parts.push(`${cCount} customers`);
    parts.push(`${oCount} orders`, `${pCount} products`);

    return {
      loc: stop.locationName,
      addr: stop.locationAddr,
      meta: parts.filter(Boolean).join(' • ')
    };
  }, []);

  return {
    // Global & seed states
    orders,
    setOrders,
    locations,
    products,
    customers,
    erpOrdersDd,

    // V1 state
    searchQ,
    setSearchQ,
    activeTab,
    setActiveTab,
    activeKpi,
    toggleKpi,
    selectedOrders,
    toggleSel,
    toggleAll,
    clearSel,
    sortField,
    sortDir,
    doSort,
    page,
    setPage,
    filters,
    toggleFilter,
    clearFilters,
    drawerOrderId,
    openDrawer,
    closeDrawer,

    // Computed states
    filteredOrders,
    kpis,
    tabCounts,
    showToast,

    // Navigation View mode
    viewMode,
    setViewMode,
    goToCreateLoad,
    goToItinerary,

    // V2 Stepper state
    clState,
    setClState,
    activeStopId,
    setActiveStopId,
    vehicleExpanded,
    setVehicleExpanded,
    vehicleSelections,
    setVehicleSelections,

    // Autocomplete contexts & Modals
    isOrderModalOpen,
    setOrderModalOpen,
    isProductModalOpen,
    setProductModalOpen,
    isLocationModalOpen,
    setLocationModalOpen,
    pendingOrderCtx,
    setPendingOrderCtx,
    pendingProductCtx,
    setPendingProductCtx,
    pendingLocCtx,
    setPendingLocCtx,

    // Handler functions
    addStop,
    deleteStop,
    toggleStop,
    setStopField,
    setTimeMode,
    addCustomer,
    deleteCustomer,
    toggleCustomer,
    setCustName,
    addCustOrder,
    deleteCustOrder,
    toggleCustOrder,
    setCustOrderRef,
    addCustProduct,
    deleteProduct,
    setProductField,
    addProduct,

    // Modal confirmations
    confirmCreateOrder,
    confirmCreateProduct,
    confirmCreateLocation,

    // Stop and wizard summary helpers
    getStopTags,
    getStopBrief,
    getStopSummary,
    isFormValid
  };
}

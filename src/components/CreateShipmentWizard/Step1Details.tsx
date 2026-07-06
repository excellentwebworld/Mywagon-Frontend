import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFormikContext } from 'formik';
import { useApp, type LocationItem } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  MapPin, ChevronDown, ChevronRight, X, Plus, Save, ArrowRight, Users,
  ArrowDown, ArrowUp, FileText, Check, Trash2, Eye, Copy, StickyNote, Phone,
  AlertTriangle, GripVertical, Minimize2, RotateCcw,
} from 'lucide-react';

import { SearchableSelect } from '../ui/SearchableSelect';
import { LocationSelect } from './LocationSelect';
import { createNewStop, createNewCargoLine } from './types';
import {
  useCreateShipmentOrders,
  findOrderLineForProduct,
  getProductOptionsForOrder,
} from '../../hooks/useCreateShipmentOrders';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { CreateCustomerModal } from './CreateCustomerModal';
import { CreateLocationModal } from '../AddressBook/CreateLocationModal';
import { CreateCompanyModal } from '../AddressBook/CreateCompanyModal';
import { ProductMasterSkuModal } from '../ProductMaster/ProductMasterSkuModal';
import { CreateEditOrderModal } from '../ErpOrders';
import { useQueryClient } from '@tanstack/react-query';
import { productMasterService, addressBookService, erpOrdersService, ApiError } from '../../api';
import { EMPTY_ORDER_FORM } from '../../pages/ErpOrders/types';
import type { ErpOrderFormState } from '../../pages/ErpOrders/types';
import type { ApiErpOrderCustomer } from '../../api/types/erpOrders';
import { checkLocationDuplicate, DUPLICATE_LOCATION_MESSAGE } from '../../pages/AddressBook/validation/locationDuplicateValidation';
import { validateCreateAll } from '../../pages/AddressBook/validation/locationCreateValidation';
import { applyTemplate as applyAddressTemplate } from '../../pages/AddressBook/utils/locationUtils';
import { EMPTY_CREATE_DATA, EMPTY_COMPANY_DATA } from '../../pages/AddressBook/types';
import type { CreateLocationData, CompanyFormData } from '../../pages/AddressBook/types';
import type { ApiCompanyLookup } from '../../api/types/addressBook';
import { QTY_UNIT_OPTIONS, WEIGHT_UNIT_OPTIONS } from '../../constants/cargoUnits';

// Mocks imports
import { MOCK_LOCATIONS as AB_LOCATIONS, DEFAULT_DIRECTORIES } from '../../mocks/addressBookData';
import { PARTNERS } from '../../mocks/partnersMasterData';
import { ORDERS } from '../../mocks/ordersMasterData';
import { CATEGORIES as PM_CAT, PRODUCT_TYPES as PM_TYP, SKUS as PM_SKU } from '../../mocks/productMasterData';
import { MOCK_USERS } from '../../mocks/userMgmtData';
import {
  LOADING_POINTS as SCHED_LPS,
  BLACKOUT_PERIODS as SCHED_BLK,
  SCHEDULE_TEMPLATES as SCHED_TPL,
  SCHEDULE_RULES as SCHED_RUL,
} from '../../mocks/schedulingData';
import { ITINERARY_TEMPLATES as INIT_TPLS } from '../../mocks/itineraryTemplates';

import useConflicts from '../../hooks/useConflicts';
import { FieldValidationHint } from './FieldValidationHint';
import {
  focusFirstConflict,
  getBlockersForAnchor,
  getConflictAnchor,
  translateConflict,
  translateResolution,
} from './validation';

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

export { createNewStop, createNewCargoLine } from './types';

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

interface Step1DetailsProps {
  onSaveDraft: () => Promise<void>;
  onContinue: () => Promise<void>;
  isSaving?: boolean;
  validationRequest?: number;
}

export const Step1Details: React.FC<Step1DetailsProps> = ({
  onSaveDraft,
  onContinue,
  isSaving = false,
  validationRequest = 0,
}) => {
  const { t } = useTranslation();
  const { values, setFieldValue } = useFormikContext<any>();
  const stops = values.stops || [];
  const { orderOptions, fetchOrderDetail, addOrder, orders: apiOrders } = useCreateShipmentOrders();
  const [orderDetailsById, setOrderDetailsById] = useState<Record<string, import('../../pages/ErpOrders/types').ErpOrder>>({});

  // Modal Visibility states
  const [mLoc, setMLoc] = useState(false);
  const [mComp, setMComp] = useState(false);
  const [mCust, setMCust] = useState(false);
  const [mOrd, setMOrd] = useState(false);
  const [mPC, setMPC] = useState(false);
  const [mSku, setMSku] = useState(false);
  const [mTyp, setMTyp] = useState(false);
  const [mCat, setMCat] = useState(false);

  const [pCtx, setPCtx] = useState<any>({});
  const [balExp, setBalExp] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewLoc, setPreviewLoc] = useState<any | null>(null);
  const [previewProd, setPreviewProd] = useState<any | null>(null);
  const [previewCust, setPreviewCust] = useState<any | null>(null);
  const [previewOrd, setPreviewOrd] = useState<any | null>(null);
  const [notesStop, setNotesStop] = useState<string | null>(null);

  const { locations, skus, showToast, refreshLocationsFromApi, refreshSkusFromApi } = useApp();
  const queryClient = useQueryClient();

  // Local master data states
  const [abLocs, setAbLocs] = useState<any[]>(() =>
    locations.length > 0 ? locations.filter((l) => l.status === 'active') : AB_LOCATIONS.filter((l) => l.status === 'active')
  );
  const [abComps, setAbComps] = useState<any[]>(() => []);
  const [custs, setCusts] = useState<any[]>(() => PARTNERS.filter((p) => p.type === 'customer' && p.status === 'active'));
  const [ords, setOrds] = useState<any[]>(() => [...ORDERS]);
  const [pmCats, setPmCats] = useState<any[]>(() => [...PM_CAT]);
  const [pmTyps, setPmTyps] = useState<any[]>(() => [...PM_TYP]);
  const [pmSkus, setPmSkus] = useState<any[]>(() =>
    skus.length > 0 ? skus.filter((s) => s.active) : PM_SKU.filter((s) => s.active)
  );

  // Address Book Location Modal states
  const [createStep, setCreateStep] = useState(1);
  const [createData, setCreateData] = useState<CreateLocationData>(EMPTY_CREATE_DATA);
  const [companyQuery, setCompanyQuery] = useState('');
  const [apiCompanies, setApiCompanies] = useState<ApiCompanyLookup[]>([]);
  const [potentialDuplicates, setPotentialDuplicates] = useState<LocationItem[]>([]);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyFormData>(EMPTY_COMPANY_DATA);
  const [savingLocation, setSavingLocation] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [skuSaving, setSkuSaving] = useState(false);

  // ERP Order Modal states
  const [erpOrderForm, setErpOrderForm] = useState<ErpOrderFormState>(EMPTY_ORDER_FORM);
  const [erpOrderSaving, setErpOrderSaving] = useState(false);
  const [erpCompanies, setErpCompanies] = useState<ApiErpOrderCustomer[]>([]);

  const filteredCompanies = useMemo(() => apiCompanies, [apiCompanies]);

  useEffect(() => {
    if (!mOrd) return;
    erpOrdersService
      .listCustomers()
      .then(setErpCompanies)
      .catch(() => setErpCompanies([]));
  }, [mOrd]);

  useEffect(() => {
    if (locations.length > 0) {
      setAbLocs(locations.filter((l) => l.status === 'active'));
    }
  }, [locations]);

  useEffect(() => {
    if (skus.length > 0) {
      setPmSkus(skus.filter((s) => s.active));
    }
  }, [skus]);

  useEffect(() => {
    if (!mLoc) return;
    const q = companyQuery.trim();
    const timer = setTimeout(() => {
      addressBookService
        .listCompanies(q || undefined, 'my_locations')
        .then(setApiCompanies)
        .catch(() => setApiCompanies([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [companyQuery, mLoc]);

  useEffect(() => {
    if (createStep !== 4) {
      setPotentialDuplicates([]);
      return;
    }

    const name = createData.name.trim();
    const company = createData.company.trim();
    if (!name || !company) return;

    let cancelled = false;
    addressBookService
      .checkDuplicate(name, company)
      .then(async (result) => {
        if (cancelled || !result.duplicate || !result.existing_id) {
          if (!cancelled) setPotentialDuplicates([]);
          return;
        }
        const existing = await queryClient.fetchQuery({
          queryKey: ['locationDetail', String(result.existing_id)],
          queryFn: () => addressBookService.getLocation(String(result.existing_id)),
        });
        if (!cancelled) setPotentialDuplicates([existing]);
      })
      .catch(() => {
        if (!cancelled) setPotentialDuplicates([]);
      });

    return () => {
      cancelled = true;
    };
  }, [createStep, createData, queryClient]);



  // Co-owners states
  const activeUsers = useMemo(() => MOCK_USERS.filter((u) => u.status === 'active'), []);
  const [coOpen, setCoOpen] = useState(false);
  const [coSearch, setCoSearch] = useState('');

  // Templates states
  const [templates, setTemplates] = useState<any[]>(() => [...INIT_TPLS]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplSearch, setTplSearch] = useState('');

  // Refs for click outside handling
  const coRef = useRef<HTMLDivElement>(null);
  const tplRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (coRef.current && !coRef.current.contains(event.target as Node)) {
        setCoOpen(false);
      }
      if (tplRef.current && !tplRef.current.contains(event.target as Node)) {
        setTplOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [activeTpl, setActiveTpl] = useState<any | null>(null);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [saveTplName, setSaveTplName] = useState('');

  useEffect(() => {
    if (apiOrders.length > 0) {
      setOrds(apiOrders);
    }
  }, [apiOrders]);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const iS = {
    border: `1px solid ${T.bd}`,
    borderRadius: 6,
    background: T.sf,
    color: T.t1,
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '6px 8px',
    outline: 'none',
    width: '100%',
  };

  // ═══ STOP CRUD ═══
  const uStop = useCallback(
    (sid: string, up: any) => {
      const updated = stops.map((s: any) =>
        s.id === sid ? (typeof up === 'function' ? up(s) : { ...s, ...up }) : s
      );
      setFieldValue('stops', updated);
    },
    [stops, setFieldValue]
  );

  const toggleStop = useCallback(
    (sid: string) => {
      const idx = stops.findIndex((s: any) => s.id === sid);
      const stop = stops[idx];
      if (!stop) return;
      const wasExpanded = stop.expanded;
      let updated = stops.map((s: any) => (s.id === sid ? { ...s, expanded: !s.expanded } : s));

      // Auto-mirror
      if (wasExpanded && idx === 0 && updated.length >= 2) {
        const s0 = updated[0];
        const s1 = updated[1];
        const pickups = s0.lines.filter((l: any) => l.action === 'pickup' && l.productId);
        const manual = s1.lines.filter((l: any) => !l.mirrorOf);
        const mirrored = pickups.map((pk: any) => {
          const existing = s1.lines.find((l: any) => l.mirrorOf === pk.id);
          return {
            id: existing?.id || makeId('l'),
            productId: pk.productId,
            productName: pk.productName,
            customerId: pk.customerId,
            customerName: pk.customerName,
            orderId: pk.orderId,
            orderRef: pk.orderRef,
            action: 'dropoff',
            qty: pk.qty,
            unit: pk.unit,
            weight: pk.weight,
            wtUnit: pk.wtUnit,
            mirrorOf: pk.id,
          };
        });
        const manualKept = mirrored.length > 0 ? manual.filter((l: any) => l.productId) : manual;
        const newLines = [...mirrored, ...manualKept];
        if (newLines.length > 0 || s1.lines.some((l: any) => l.mirrorOf)) {
          updated = updated.map((s: any) =>
            s.id === s1.id ? { ...s, lines: newLines.length ? newLines : [createNewCargoLine('dropoff')] } : s
          );
        }
      }
      setFieldValue('stops', updated);
    },
    [stops, setFieldValue]
  );

  const addStop = useCallback(() => {
    setFieldValue('stops', [...stops, createNewStop(true)]);
  }, [stops, setFieldValue]);

  const delStop = useCallback(
    (sid: string) => {
      const n = stops.filter((s: any) => s.id !== sid);
      if (n.length < 2) return;
      setFieldValue('stops', n);
    },
    [stops, setFieldValue]
  );

  const dupStop = useCallback(
    (sid: string) => {
      const src = stops.find((s: any) => s.id === sid);
      if (!src) return;
      const ns = { ...JSON.parse(JSON.stringify(src)), id: makeId('s'), expanded: true };
      ns.lines = ns.lines.map((l: any) => ({ ...l, id: makeId('l'), mirrorOf: '' }));
      const idx = stops.findIndex((s: any) => s.id === sid);
      const out = [...stops];
      out.splice(idx + 1, 0, ns);
      setFieldValue('stops', out);
    },
    [stops, setFieldValue]
  );

  // Drag-to-reorder
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingIdx(null);
    setDragOverIdx(null);
  }, []);

  const handleDrop = useCallback(
    (dropIdx: number) => {
      const dragIdx = draggingIdx;
      if (dragIdx === null || dragIdx === dropIdx) {
        setDraggingIdx(null);
        setDragOverIdx(null);
        return;
      }
      const out = [...stops];
      const a = out[dragIdx];
      const b = out[dropIdx];

      // Swap dates/times
      const [aDF, aTF, aDT, aTT] = [a.dateFrom, a.timeFrom, a.dateTo, a.timeTo];
      out[dragIdx] = { ...a, dateFrom: b.dateFrom, timeFrom: b.timeFrom, dateTo: b.dateTo, timeTo: b.timeTo };
      out[dropIdx] = { ...b, dateFrom: aDF, timeFrom: aTF, dateTo: aDT, timeTo: aTT };

      // Swap positions
      [out[dragIdx], out[dropIdx]] = [out[dropIdx], out[dragIdx]];
      setFieldValue('stops', out);
      setDraggingIdx(null);
      setDragOverIdx(null);
    },
    [draggingIdx, stops, setFieldValue]
  );

  // ═══ LINE CRUD ═══
  const addLine = useCallback(
    (sid: string, action: 'pickup' | 'dropoff' = 'pickup') => {
      uStop(sid, (s: any) => ({ ...s, lines: [...s.lines, createNewCargoLine(action)] }));
    },
    [uStop]
  );

  const delLine = useCallback(
    (sid: string, lid: string) => {
      uStop(sid, (s: any) => ({ ...s, lines: s.lines.filter((l: any) => l.id !== lid) }));
    },
    [uStop]
  );

  const dupLine = useCallback(
    (sid: string, lid: string) => {
      uStop(sid, (s: any) => {
        const src = s.lines.find((l: any) => l.id === lid);
        if (!src) return s;
        const nl = { ...src, id: makeId('l'), mirrorOf: '' };
        const idx = s.lines.findIndex((l: any) => l.id === lid);
        const lines = [...s.lines];
        lines.splice(idx + 1, 0, nl);
        return { ...s, lines };
      });
    },
    [uStop]
  );

  const setLF = useCallback(
    (sid: string, lid: string, fieldOrUpdates: string | Record<string, any>, val?: any) => {
      uStop(sid, (s: any) => ({
        ...s,
        lines: s.lines.map((l: any) => {
          if (l.id !== lid) return l;
          if (typeof fieldOrUpdates === 'string') {
            return { ...l, [fieldOrUpdates]: val };
          }
          return { ...l, ...fieldOrUpdates };
        }),
      }));
    },
    [uStop]
  );

  const quickFill = useCallback(
    async (sid: string, orderId: string) => {
      const mo = orderDetailsById[orderId] || (await fetchOrderDetail(orderId));
      if (!mo) return;
      if (mo) {
        setOrderDetailsById((prev) => ({ ...prev, [orderId]: mo }));
      }
      if (!mo?.lines?.length) return;
      const newLines = mo.lines.map((ln) => ({
        id: makeId('l'),
        productId: ln.productSkuId ? String(ln.productSkuId) : '',
        productName: ln.productName || '',
        customerId: mo.companyEntityId ? String(mo.companyEntityId) : '',
        customerName: mo.customerName || '',
        orderId: mo.id,
        orderRef: mo.orderReference,
        action: 'pickup' as const,
        qty: ln.quantity != null ? String(ln.quantity) : '',
        unit: ln.unit || 'EUR Pallets',
        weight: ln.weight != null ? String(ln.weight) : '',
        wtUnit: ln.weightUnit || 'Kgs',
        mirrorOf: '',
      }));
      uStop(sid, (s: any) => ({ ...s, lines: [...s.lines.filter((l: any) => l.productId), ...newLines] }));
    },
    [fetchOrderDetail, orderDetailsById, uStop]
  );

  // ═══ OPTIONS ═══
  const ordOpts = useMemo(() => orderOptions, [orderOptions]);

  // ═══ HANDLERS ═══
  const selLoc = useCallback(
    (sid: string, lid: string) => {
      const l = abLocs.find((x) => String(x.id) === String(lid));
      if (l) {
        uStop(sid, (s: any) => {
          let updatedStop = {
            ...s,
            locationId: lid,
            locationName: l.name,
            locationCompany: l.company || '',
            locationCity: l.city || '',
            locationCountry: l.country || '',
          };
          if (l.noteCarrier) {
            updatedStop.noteCarrier = s.noteCarrier || l.noteCarrier;
          }
          if (l.contacts?.[0]) {
            updatedStop.contactName = s.contactName || l.contacts[0].name;
            updatedStop.contactPhone = s.contactPhone || l.contacts[0].phone;
          }
          return updatedStop;
        });
      }
    },
    [abLocs, uStop]
  );

  const handleApplyCompany = useCallback(async (values: CompanyFormData) => {
    try {
      setCompanySaving(true);
      const created = await addressBookService.createCompanyEntity({
        name: values.name.trim(),
        vat_number: values.vat.trim(),
        address: values.address.trim(),
        country: values.country.trim() || 'Greece',
        phone: values.phone || undefined,
        email: values.email || undefined,
        website: values.website || undefined,
        industry: values.industry || undefined,
        primary_contact: values.contactPerson || undefined,
      });

      setApiCompanies((prev) => [
        ...prev,
        {
          company_name: created.name,
          company_vat: created.vat_number || '',
        },
      ]);
      setCreateData((prev) => ({
        ...prev,
        company: created.name,
        companyVat: created.vat_number || '',
      }));
      setIsCompanyOpen(false);
      showToast(t('erpOrdersCompanyCreated') || 'Company created successfully.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (t('erpOrdersCompanyCreateError') || 'Failed to create company');
      showToast(message, 'error');
    } finally {
      setCompanySaving(false);
    }
  }, [showToast, t]);

  const submitNewLocation = useCallback(async () => {
    const payload: CreateLocationData = {
      ...createData,
      company:
        createData.context === 'customer'
          ? createData.company
          : 'My Company',
      companyVat:
        createData.context === 'customer' ? createData.companyVat : createData.companyVat || 'N/A',
      contacts: [],
      amenityIds: [],
      equipment: [],
      hours: '',
      tags: '',
    };

    const errors = validateCreateAll(payload);
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      showToast(errors[firstKey] ?? 'Please fix validation errors', 'error');
      if (firstKey === 'companyEntity' || firstKey === 'type') setCreateStep(1);
      else if (['name', 'address', 'city', 'postal', 'role'].includes(firstKey)) setCreateStep(2);
      else setCreateStep(3);
      return;
    }

    try {
      setSavingLocation(true);
      const isDuplicate = await checkLocationDuplicate(payload.name, payload.company);
      if (isDuplicate) {
        showToast(DUPLICATE_LOCATION_MESSAGE, 'error');
        setCreateStep(4);
        return;
      }

      const created = await addressBookService.createLocation(payload);
      await refreshLocationsFromApi();

      if (pCtx.orderFormTarget === 'origin') {
        setErpOrderForm((f) => ({ ...f, originLocationId: Number(created.id) }));
        setPCtx((p: any) => ({ ...p, orderFormTarget: null }));
      } else if (pCtx.orderFormTarget === 'dest') {
        setErpOrderForm((f) => ({ ...f, destLocationId: Number(created.id) }));
        setPCtx((p: any) => ({ ...p, orderFormTarget: null }));
      } else if (pCtx.locS) {
        selLoc(pCtx.locS, String(created.id));
        setPCtx((p: any) => ({ ...p, locS: null }));
      }
      setMLoc(false);
      showToast(t('erpOrdersLocationCreated') || 'Address created successfully.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (t('erpOrdersLocationCreateError') || 'Failed to create address.');
      showToast(message, 'error');
    } finally {
      setSavingLocation(false);
    }
  }, [createData, showToast, t, pCtx, selLoc, refreshLocationsFromApi]);

  const selCustLine = useCallback(
    (sid: string, lid: string, cid: string) => {
      const c = custs.find((x) => x.id === cid);
      if (c) {
        setLF(sid, lid, { customerId: cid, customerName: c.name });
      }
    },
    [custs, setLF]
  );

  const onCustCreated = useCallback(
    (d: any) => {
      const nc = { ...d, id: `PR-N-${Date.now()}`, type: 'customer', status: 'active', source: 'manual' };
      setCusts((p) => [...p, nc]);
      if (pCtx.custS && pCtx.custL) {
        setLF(pCtx.custS, pCtx.custL, { customerId: nc.id, customerName: d.name });
        setPCtx((p: any) => ({ ...p, custS: null, custL: null }));
      }
      setMCust(false);
    },
    [pCtx, setLF]
  );

  const selOrdLine = useCallback(
    async (sid: string, lid: string, oid: string) => {
      const detail = await fetchOrderDetail(oid);
      if (detail) {
        setOrderDetailsById((prev) => ({ ...prev, [oid]: detail }));
        setLF(sid, lid, {
          orderId: oid,
          orderRef: detail.orderReference,
          customerName: detail.customerName || '',
          customerId: detail.companyEntityId ? String(detail.companyEntityId) : '',
          productId: '',
          productName: '',
          qty: '',
          weight: '',
        });
        return;
      }
      const mo = ords.find((o) => o.id === oid);
      if (mo) {
        setLF(sid, lid, {
          orderId: oid,
          orderRef: mo.orderReference || oid,
          customerName: mo.customerName || mo.customer || '',
          customerId: mo.companyEntityId ? String(mo.companyEntityId) : '',
          productId: '',
          productName: '',
          qty: '',
          weight: '',
        });
      } else {
        setLF(sid, lid, { orderId: oid, orderRef: oid, productId: '', productName: '', qty: '', weight: '' });
      }
    },
    [fetchOrderDetail, ords, setLF]
  );

  const clearOrderLine = useCallback(
    (sid: string, lid: string) => {
      setLF(sid, lid, {
        orderId: '',
        orderRef: '',
        customerId: '',
        customerName: '',
        productId: '',
        productName: '',
        qty: '',
        weight: '',
      });
    },
    [setLF]
  );

  const handleCreateOrder = useCallback(async (values: ErpOrderFormState) => {
    try {
      setErpOrderSaving(true);

      const payload = {
        order_reference: values.orderReference,
        erp_reference: values.erpReference || null,
        company_entity_id: values.companyEntityId,
        customer_name: values.customerName,
        origin_location_id: values.originLocationId,
        dest_location_id: values.destLocationId,
        ship_date: values.shipDate || null,
        delivery_date: values.deliveryDate,
        notes: values.notes || null,
        high_priority: values.highPriority,
        lines: values.lines.map((l) => ({
          product_sku_id: l.productSkuId,
          product_name: l.productName,
          quantity: l.quantity,
          unit: l.unit,
          weight: l.weight,
          weight_unit: l.weightUnit,
        })),
      };

      const created = await erpOrdersService.createOrder(payload);

      addOrder(created);
      setOrds((prev) => [...prev, created]);
      setOrderDetailsById((prev) => ({ ...prev, [created.id]: created }));

      if (pCtx.ordS && pCtx.ordL) {
        setLF(pCtx.ordS, pCtx.ordL, {
          orderId: created.id,
          orderRef: created.orderReference,
          customerName: created.customerName,
          customerId: created.companyEntityId ? String(created.companyEntityId) : '',
        });
        setPCtx((p: any) => ({ ...p, ordS: null, ordL: null }));
      }

      setMOrd(false);
      setErpOrderForm(EMPTY_ORDER_FORM);
      showToast(t('erpOrdersCreateSuccess') || 'Order created successfully.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (t('erpOrdersCreateError') || 'Failed to create order');
      showToast(message, 'error');
    } finally {
      setErpOrderSaving(false);
    }
  }, [addOrder, pCtx, setLF, showToast, t]);

  const selProdLine = useCallback(
    async (sid: string, lid: string, skuId: string) => {
      const stop = stops.find((s: any) => s.id === sid);
      const line = stop?.lines?.find((l: any) => l.id === lid);
      const order = line?.orderId ? orderDetailsById[line.orderId] || (await fetchOrderDetail(line.orderId)) : null;
      if (order && line?.orderId) {
        setOrderDetailsById((prev) => ({ ...prev, [line.orderId]: order }));
      }
      const orderLine = findOrderLineForProduct(order, skuId);
      if (orderLine) {
        setLF(sid, lid, {
          productId: skuId,
          productName: orderLine.productName || '',
          qty: orderLine.quantity != null ? String(orderLine.quantity) : '',
          unit: orderLine.unit || line?.unit || 'EUR Pallets',
          weight: orderLine.weight != null ? String(orderLine.weight) : '',
          wtUnit: orderLine.weightUnit || line?.wtUnit || 'Kgs',
        });
        return;
      }
      const sk = pmSkus.find((s) => String(s.id) === String(skuId));
      if (sk) {
        setLF(sid, lid, { productId: skuId, productName: sk.name });
      }
    },
    [fetchOrderDetail, orderDetailsById, pmSkus, setLF, stops]
  );

  const handleCreateSku = useCallback(async (values: any) => {
    try {
      setSkuSaving(true);
      const created = await productMasterService.createSku(values);
      await refreshSkusFromApi();

      if (pCtx.orderFormTarget === 'product' && pCtx.orderFormLineIndex !== undefined) {
        setErpOrderForm((f) => {
          const lines = [...f.lines];
          if (lines[pCtx.orderFormLineIndex]) {
            lines[pCtx.orderFormLineIndex] = {
              ...lines[pCtx.orderFormLineIndex],
              productSkuId: Number(created.id),
              productName: created.name,
            };
          }
          return { ...f, lines };
        });
        setPCtx((p: any) => ({ ...p, orderFormTarget: null, orderFormLineIndex: null }));
      } else if (pCtx.pS && pCtx.pL) {
        setLF(pCtx.pS, pCtx.pL, { productId: created.id, productName: created.name });
        setPCtx((p: any) => ({ ...p, pS: null, pL: null }));
      }
      setMSku(false);
      showToast(t('erpOrdersProductCreated') || 'Product created successfully.', 'success');
    } catch {
      showToast(t('erpOrdersProductCreateError') || 'Failed to create product', 'error');
    } finally {
      setSkuSaving(false);
    }
  }, [pCtx, setLF, refreshSkusFromApi, showToast]);

  const getCatName = useCallback(
    (catId: string) => {
      const c = pmCats.find((x) => x.id === catId);
      return c ? c.name.en : '';
    },
    [pmCats]
  );

  const localProds = useMemo(() => pmSkus.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, sku: s.number || s.id })), [pmSkus]);
  const localCusts = useMemo(() => custs.map((c) => ({ id: c.id, name: c.name })), [custs]);
  const localLocs = useMemo(() => abLocs.map((l) => `${l.name}, ${l.city}, ${l.country || 'GR'}`), [abLocs]);

  const previewLocation = useCallback(
    (locId: string) => {
      const l = abLocs.find((x) => x.id === locId);
      if (l) setPreviewLoc(l);
    },
    [abLocs]
  );

  const previewProduct = useCallback(
    (skuId: string) => {
      const s = pmSkus.find((x) => x.id === skuId);
      if (s) setPreviewProd(s);
    },
    [pmSkus]
  );

  const previewCustomer = useCallback(
    (custId: string) => {
      const c = custs.find((x) => x.id === custId);
      if (c) setPreviewCust(c);
    },
    [custs]
  );

  const previewOrder = useCallback(
    (ordId: string) => {
      const o = ords.find((x) => x.id === ordId);
      if (o) setPreviewOrd(o);
    },
    [ords]
  );

  // ═══ GOODS TYPE INDICATORS ═══
  const getGoodsIndicators = useCallback(
    (productId: string) => {
      const sku = pmSkus.find((s) => s.id === productId);
      if (!sku) return [];
      const ind = [];
      if (sku.adrRequired) ind.push({ key: 'adr', label: 'ADR', color: '#DC2626', bg: '#FEE2E2' });
      if (sku.tempRequired) ind.push({ key: 'temp', label: sku.tempValue || 'Temp', color: '#2563EB', bg: '#DBEAFE' });
      if (!sku.stackable) ind.push({ key: 'frag', label: 'Fragile', color: '#D97706', bg: '#FEF3C7' });
      return ind;
    },
    [pmSkus]
  );

  // ═══ TEMPLATES ═══
  const applyTemplate = useCallback(
    (tpl: any) => {
      const newStops = tpl.stops.map((ts: any) => {
        const lines = ts.lines.map((tl: any) => ({ ...tl, id: makeId('l'), mirrorOf: '' }));
        return {
          id: makeId('s'),
          locationId: ts.locationId,
          locationName: ts.locationName,
          locationCompany: ts.locationCompany || '',
          locationCity: ts.locationCity || '',
          locationCountry: ts.locationCountry || '',
          dateFrom: '',
          timeFrom: '',
          dateTo: '',
          timeTo: '',
          expanded: true,
          lines: lines.length ? lines : [createNewCargoLine()],
          noteCarrier: ts.noteCarrier || '',
          noteInternal: ts.noteInternal || '',
          contactName: ts.contactName || '',
          contactPhone: ts.contactPhone || '',
          appointmentMode: 'fixed' as const,
          windowStart: '',
          windowEnd: '',
          allowedLoadingPoints: [],
        };
      });
      setFieldValue('stops', newStops);
      setActiveTpl(tpl);
      setTplOpen(false);
      setTemplates((p) =>
        p.map((t2) =>
          t2.id === tpl.id
            ? { ...t2, usageCount: t2.usageCount + 1, lastUsedAt: new Date().toISOString().slice(0, 10) }
            : t2
        )
      );
    },
    [setFieldValue]
  );

  const clearTemplate = useCallback(() => {
    setActiveTpl(null);
  }, []);

  const resetItinerary = useCallback(() => {
    setFieldValue('stops', [createNewStop(true), createNewStop(true)]);
    setActiveTpl(null);
    setFieldValue('custRef', '');
    setFieldValue('coOwners', []);
  }, [setFieldValue]);

  // DEV Fill Test
  const fillTestData = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d1 = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
      tomorrow.getDate()
    ).padStart(2, '0')}`;
    const day2 = new Date(tomorrow);
    day2.setDate(day2.getDate() + 1);
    const d2 = `${day2.getFullYear()}-${String(day2.getMonth() + 1).padStart(2, '0')}-${String(
      day2.getDate()
    ).padStart(2, '0')}`;

    setFieldValue('stops', [
      {
        id: makeId('s'),
        locationId: 'LOC-001',
        locationName: 'ΒΙΚΟΣ Κεντρική Αποθήκη',
        locationCompany: 'ΒΙΚΟΣ Α.Ε.',
        locationCity: 'Ιωάννινα',
        locationCountry: 'GR',
        dateFrom: d1,
        timeFrom: '06:30',
        dateTo: d1,
        timeTo: '08:00',
        expanded: false,
        lines: [
          {
            id: makeId('l'),
            productId: 'SKU-001',
            productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)',
            action: 'pickup',
            qty: '15',
            unit: 'Pallets',
            weight: '3000',
            wtUnit: 'kg',
            customerId: 'PR-080',
            customerName: 'FreshCo S.A.',
            orderId: '',
            orderRef: '',
            mirrorOf: '',
          },
          {
            id: makeId('l'),
            productId: 'SKU-004',
            productName: 'ΒΙΚΟΣ Σόδα Lemon 330ml (x24)',
            action: 'pickup',
            qty: '10',
            unit: 'Pallets',
            weight: '2000',
            wtUnit: 'kg',
            customerId: 'PR-081',
            customerName: 'Σκλαβενίτης Α.Ε.Ε.',
            orderId: '',
            orderRef: '',
            mirrorOf: '',
          },
        ],
        noteCarrier: 'Report to Gate B',
        noteInternal: '',
        contactName: 'Γιώργος Μπακόλας',
        contactPhone: '+30 26510 42100',
        appointmentMode: 'fixed',
        windowStart: '',
        windowEnd: '',
        allowedLoadingPoints: [],
      },
      {
        id: makeId('s'),
        locationId: 'LOC-003',
        locationName: 'Αποθήκη Λαμίας',
        locationCompany: 'ΒΙΚΟΣ Α.Ε.',
        locationCity: 'Λαμία',
        locationCountry: 'GR',
        dateFrom: d1,
        timeFrom: '10:30',
        dateTo: d1,
        timeTo: '11:30',
        expanded: false,
        lines: [
          {
            id: makeId('l'),
            productId: 'SKU-001',
            productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)',
            action: 'dropoff',
            qty: '5',
            unit: 'Pallets',
            weight: '1000',
            wtUnit: 'kg',
            customerId: 'PR-082',
            customerName: 'Lidl Hellas',
            orderId: '',
            orderRef: '',
            mirrorOf: '',
          },
        ],
        noteCarrier: '',
        noteInternal: '',
        contactName: '',
        contactPhone: '',
        appointmentMode: 'fixed',
        windowStart: '',
        windowEnd: '',
        allowedLoadingPoints: [],
      },
      {
        id: makeId('s'),
        locationId: 'LOC-002',
        locationName: 'Αποθήκη Καλύβια',
        locationCompany: 'ΒΙΚΟΣ Α.Ε.',
        locationCity: 'Καλύβια',
        locationCountry: 'GR',
        dateFrom: d2,
        timeFrom: '08:00',
        dateTo: d2,
        timeTo: '10:00',
        expanded: false,
        lines: [
          {
            id: makeId('l'),
            productId: 'SKU-001',
            productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)',
            action: 'dropoff',
            qty: '10',
            unit: 'Pallets',
            weight: '2000',
            wtUnit: 'kg',
            customerId: 'PR-080',
            customerName: 'FreshCo S.A.',
            orderId: '',
            orderRef: '',
            mirrorOf: '',
          },
          {
            id: makeId('l'),
            productId: 'SKU-004',
            productName: 'ΒΙΚΟΣ Σόδα Lemon 330ml (x24)',
            action: 'dropoff',
            qty: '10',
            unit: 'Pallets',
            weight: '2000',
            wtUnit: 'kg',
            customerId: 'PR-081',
            customerName: 'Σκλαβενίτης Α.Ε.Ε.',
            orderId: '',
            orderRef: '',
            mirrorOf: '',
          },
        ],
        noteCarrier: 'Dock assignment at gate',
        noteInternal: 'Main Attica hub',
        contactName: '',
        contactPhone: '',
        appointmentMode: 'fixed',
        windowStart: '',
        windowEnd: '',
        allowedLoadingPoints: [],
      },
    ]);
    setFieldValue('custRef', 'DEV-TEST-001');
    setShowAll(false);
  }, [setFieldValue]);

  const saveAsTemplate = useCallback(() => {
    if (!saveTplName.trim()) return;
    const tpl = {
      id: `TPL-IT-${Date.now()}`,
      name: saveTplName.trim(),
      usageCount: 0,
      lastUsedAt: new Date().toISOString().slice(0, 10),
      stops: stops.map((s: any) => ({
        locationId: s.locationId,
        locationName: s.locationName,
        locationCompany: s.locationCompany,
        locationCity: s.locationCity,
        locationCountry: s.locationCountry,
        noteCarrier: s.noteCarrier,
        noteInternal: s.noteInternal,
        contactName: s.contactName,
        contactPhone: s.contactPhone,
        lines: s.lines
          .filter((l: any) => l.productId)
          .map((l: any) => ({
            productId: l.productId,
            productName: l.productName,
            action: l.action,
            qty: l.qty,
            unit: l.unit,
            weight: l.weight,
            wtUnit: l.wtUnit,
            customerId: l.customerId,
            customerName: l.customerName,
            orderId: l.orderId,
            orderRef: l.orderRef,
          })),
      })),
    };
    setTemplates((p) => [...p, tpl]);
    setSaveTplOpen(false);
    setSaveTplName('');
  }, [saveTplName, stops]);

  const deleteTemplate = useCallback(
    (tplId: string) => {
      setTemplates((p) => p.filter((t2) => t2.id !== tplId));
      if (activeTpl?.id === tplId) setActiveTpl(null);
    },
    [activeTpl]
  );

  const filteredTpls = useMemo(() => {
    return tplSearch ? templates.filter((t2) => t2.name.toLowerCase().includes(tplSearch.toLowerCase())) : templates;
  }, [templates, tplSearch]);

  // ═══ LOAD BALANCE + VALIDATION ═══
  const bal = useMemo(() => {
    let pkU = 0,
      doU = 0,
      pkW = 0,
      doW = 0;
    const byP: Record<string, any> = {};
    stops.forEach((s: any) =>
      s.lines.forEach((ln: any) => {
        const q = parseFloat(ln.qty) || 0,
          w = parseFloat(ln.weight) || 0;
        const wk = ln.wtUnit === 't' ? w * 1000 : ln.wtUnit === 'lb' ? w * 0.4536 : w;
        if (ln.action === 'pickup') {
          pkU += q;
          pkW += wk;
        } else {
          doU += q;
          doW += wk;
        }
        const nm = ln.productName || '—';
        if (!byP[nm]) byP[nm] = { pk: 0, do: 0, unit: ln.unit };
        if (ln.action === 'pickup') byP[nm].pk += q;
        else byP[nm].do += q;
      })
    );
    const mx = Math.max(pkU, doU, 1);
    return {
      pkU,
      doU,
      pkW,
      doW,
      pkBar: (pkU / mx) * 50,
      doBar: (doU / mx) * 50,
      balanced: pkU > 0 && doU > 0 && pkU === doU,
      byP,
    };
  }, [stops]);

  const fmtW = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`);

  // ═══ CONFLICT CHECKING ═══
  const { blockers, warnings, all: allConflicts } = useConflicts(stops, {
    locations: AB_LOCATIONS,
    loadingPoints: SCHED_LPS,
    blackouts: SCHED_BLK,
    products: PM_SKU,
    orders: ords,
    templates: SCHED_TPL,
    rules: SCHED_RUL,
  });

  const canContinue = blockers.length === 0;
  const [conflictPopup, setConflictPopup] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [previewDock, setPreviewDock] = useState<string | null>(null);

  const [portalTargetReady, setPortalTargetReady] = useState(false);
  useEffect(() => {
    if (document.getElementById('wizard-header-portal')) {
      setPortalTargetReady(true);
    }
  }, []);

  const MISSING = new Set<string>();
  const conflictCount = useMemo(() => {
    if (showAll) return blockers.length + warnings.length;
    return allConflicts.filter((c) => c.severity !== 'info' && !MISSING.has(c.code)).length;
  }, [allConflicts, blockers, warnings, showAll]);

  const expandStopForValidation = useCallback(
    (stopIndex: number) => {
      const stop = stops[stopIndex];
      if (!stop || stop.expanded) return;
      uStop(stop.id, { expanded: true });
    },
    [stops, uStop]
  );

  const isFieldInvalid = useCallback(
    (anchor: string) => showAll && getBlockersForAnchor(blockers, anchor).length > 0,
    [blockers, showAll]
  );

  const invalidFieldClass = (anchor: string) => (isFieldInvalid(anchor) ? 'wizard-field-invalid' : '');

  useEffect(() => {
    if (!validationRequest) return;
    setShowAll(true);
    if (blockers.length > 0) {
      focusFirstConflict(blockers, expandStopForValidation);
    }
  }, [validationRequest]);

  const handleContinue = useCallback(async () => {
    setShowAll(true);
    if (blockers.length > 0) {
      focusFirstConflict(blockers, expandStopForValidation);
      return;
    }
    if (warnings.length > 0) {
      setConflictPopup(true);
      return;
    }
    try {
      await onContinue();
    } catch {
      // Error handled by parent
    }
  }, [blockers, warnings, onContinue, expandStopForValidation]);

  const handleProceedAnyway = useCallback(async () => {
    setConflictPopup(false);
    try {
      await onContinue();
    } catch {
      // Error toast handled by parent
    }
  }, [onContinue]);

  const handleSaveDraftClick = useCallback(async () => {
    try {
      await onSaveDraft();
      setLastSaved(new Date());
    } catch {
      // Error toast handled by parent
    }
  }, [onSaveDraft]);

  const stopConflicts = useCallback(
    (idx: number) => {
      return allConflicts.filter((c) => c.stopIndex === idx && (showAll || !MISSING.has(c.code)));
    },
    [allConflicts, showAll]
  );

  const LOC_CODES = new Set(['L1', 'L2', 'L4']);
  const DATE_CODES = new Set(['D1', 'D2', 'D3', 'D4', 'D5', 'D7', 'D8', 'S1', 'S2']);
  const CARGO_CODES = new Set(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'O1', 'O2', 'O3', 'S4', 'X4']);

  const hintsFor = useCallback(
    (idx: number, codeSet: Set<string>) => {
      const hits = stopConflicts(idx).filter((c) => codeSet.has(c.code));
      if (!hits.length) return null;
      return hits.map((c, ci) => (
        <div
          key={ci}
          className="flex items-center gap-1 mt-1 text-[10px]"
          style={{
            color: c.severity === 'blocker' ? '#DC2626' : c.severity === 'warning' ? '#D97706' : '#2563EB',
          }}
        >
          <AlertTriangle size={9} className="shrink-0" />
          <span>{translateConflict(c, t)}</span>
        </div>
      ));
    },
    [stopConflicts, t]
  );

  const globalBlockers = useMemo(
    () => blockers.filter((conflict) => conflict.stopIndex < 0),
    [blockers]
  );

  return (
    <div className="pb-24">
      {portalTargetReady && document.getElementById('wizard-header-portal')
        ? createPortal(
          <div className="flex items-center gap-2 flex-wrap">
            {/* Template select */}
            <div className="relative" ref={tplRef}>
              {activeTpl ? (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: T.al, color: T.ac, border: `1px solid ${T.ac}` }}
                >
                  <FileText size={13} /> {activeTpl.name}
                  <button
                    type="button"
                    className="border-none bg-transparent cursor-pointer p-0 ml-1"
                    style={{ color: T.ac }}
                    onClick={clearTemplate}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t2, fontFamily: 'inherit' }}
                  onClick={() => {
                    setTplOpen(!tplOpen);
                    setTplSearch('');
                  }}
                >
                  <FileText size={13} /> {t('useTemplate') || 'Use Template'} <ChevronDown size={12} />
                </button>
              )}
              {tplOpen && (
                <div
                  className="absolute right-0 top-full mt-2 rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ width: 340, background: T.sf, border: `1px solid ${T.bd}` }}
                >
                  <div className="p-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
                    <input
                      placeholder="Search templates..."
                      value={tplSearch}
                      onChange={(e) => setTplSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded text-xs outline-none"
                      style={{ border: `1px solid ${T.bd}`, background: T.sa, color: T.t1, fontFamily: 'inherit' }}
                      autoFocus
                    />
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {filteredTpls.length === 0 && <div className="px-3 py-4 text-xs text-center" style={{ color: T.t3 }}>No templates</div>}
                    {filteredTpls.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                        style={{ borderBottom: `0.5px solid ${T.bd}` }}
                        onClick={() => applyTemplate(tpl)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: T.t1 }}>
                            {tpl.name}
                          </div>
                          <div className="text-[10px] truncate" style={{ color: T.t3 }}>
                            {tpl.stops.map((s: any) => s.locationCity || s.locationName).join(' → ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer border-none shrink-0"
                          style={{ background: 'transparent', color: T.t3 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(tpl.id);
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              placeholder={t('refPlaceholder') || 'Customer Ref...'}
              value={values.custRef || ''}
              onChange={(e) => setFieldValue('custRef', e.target.value)}
              style={{ ...iS, width: 160, fontSize: 11 }}
            />

            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide"
              style={{ background: T.sa, color: T.t1, border: `1px solid ${T.bd}` }}
            >
              {values.loadId}
            </div>

            {/* Co-owners */}
            <div className="relative" ref={coRef}>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.ac, fontFamily: 'inherit' }}
                onClick={() => {
                  setCoOpen(!coOpen);
                  setCoSearch('');
                }}
              >
                <Users size={14} />
                {(values.coOwners || []).length > 0 && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: T.ac }}
                  >
                    {(values.coOwners || []).length}
                  </span>
                )}
              </button>
              {coOpen && (
                <div
                  className="absolute right-0 top-full mt-2 rounded-lg shadow-xl overflow-hidden z-50"
                  style={{ width: 260, background: T.sf, border: `1px solid ${T.bd}` }}
                >
                  <div className="px-3 py-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
                    <input
                      placeholder="Search users..."
                      value={coSearch}
                      onChange={(e) => setCoSearch(e.target.value)}
                      className="w-full px-2 py-1 rounded text-xs outline-none"
                      style={{ border: `1px solid ${T.bd}`, background: T.sa, color: T.t1, fontFamily: 'inherit' }}
                      autoFocus
                    />
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {activeUsers
                      .filter((u) => !coSearch || `${u.firstName} ${u.lastName}`.toLowerCase().includes(coSearch.toLowerCase()))
                      .map((u) => {
                        const sel = (values.coOwners || []).includes(u.id);
                        return (
                          <div
                            key={u.id}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50"
                            onClick={() => {
                              const cur = values.coOwners || [];
                              setFieldValue('coOwners', sel ? cur.filter((id: string) => id !== u.id) : [...cur, u.id]);
                            }}
                          >
                            <input type="checkbox" checked={sel} readOnly />
                            <div className="text-xs truncate" style={{ color: T.t1 }}>
                              {u.firstName} {u.lastName}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none shrink-0"
              style={{ background: 'transparent', color: T.t3 }}
              onClick={resetItinerary}
            >
              <RotateCcw size={15} />
            </button>
          </div>,
          document.getElementById('wizard-header-portal')!
        )
        : null}

      <LoadBalanceBar bal={bal} balExp={balExp} setBalExp={setBalExp} fmtW={fmtW} T={T} t={t} />

      {showAll && blockers.length > 0 && (
        <div className="wizard-validation-banner" role="alert" data-validation-anchor="wizard-global">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <div>{t('validationFixFieldsBelow')}</div>
            {globalBlockers.length > 0 && (
              <div className="mt-1 text-[11px] font-medium">
                {globalBlockers.map((conflict) => translateConflict(conflict, t)).join(' · ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TIMELINE ═══ */}
      <div className="relative" style={{ paddingLeft: 18 }}>
        <div
          className="absolute top-0 bottom-0"
          style={{ left: 37, width: 2, background: T.bd, borderRadius: 1, zIndex: 0 }}
        />

        {stops.map((stop: any, idx: number) => (
          <div
            key={stop.id}
            className="relative mb-3 transition-opacity"
            style={{ opacity: draggingIdx === idx ? 0.4 : 1 }}
            data-validation-anchor={`stop-${idx}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIdx(idx);
            }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={() => handleDrop(idx)}
          >
            <div className="flex gap-3 items-start">
              {/* Timeline node */}
              <div className="shrink-0" style={{ position: 'relative', zIndex: 1 }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-grab"
                  draggable
                  onDragStart={(e) => handleDragStart(idx, e)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: stop.expanded ? T.ac : T.sf,
                    color: stop.expanded ? '#fff' : T.t3,
                    border: `2px solid ${stop.expanded ? T.ac : T.bd}`,
                  }}
                  onClick={() => toggleStop(stop.id)}
                >
                  {idx + 1}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {!stop.expanded ? (
                  /* Collapsed Card */
                  <div
                    className="rounded-xl flex items-center gap-2 px-4 py-3 cursor-pointer"
                    style={{
                      background: T.sf,
                      border: `1px solid ${T.bd}`,
                      outline: dragOverIdx === idx ? `2px solid ${T.ac}` : 'none',
                    }}
                    onClick={() => toggleStop(stop.id)}
                  >
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleDragStart(idx, e);
                      }}
                      onDragEnd={handleDragEnd}
                      style={{ cursor: 'grab', display: 'flex', flexShrink: 0 }}
                    >
                      <GripVertical size={14} style={{ color: T.t3 }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      {stop.locationName ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <MapPin size={14} style={{ color: T.t3, flexShrink: 0 }} />
                          <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                            {stop.locationName}
                          </span>
                          {stop.locationCompany && (
                            <span className="text-[11px]" style={{ color: T.t3 }}>
                              {stop.locationCompany} · {stop.locationCity}
                            </span>
                          )}
                          {getStopTags(stop).map((tg) => (
                            <span
                              key={tg}
                              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                              style={{
                                background: tg === 'pickup' ? '#EFF6FF' : '#F3F0FF',
                                color: tg === 'pickup' ? '#2563EB' : '#5E3BEE',
                              }}
                            >
                              {t(tg) || tg}
                            </span>
                          ))}
                          <span className="text-[11px] hidden sm:inline" style={{ color: T.t3 }}>
                            {fmtStopBrief(stop, t)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: T.t3 }}>
                          Empty Stop
                        </span>
                      )}
                    </div>
                    {stops.length > 2 && (
                      <button
                        type="button"
                        className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer border-none shrink-0 transition-colors"
                        style={{ background: T.sa, color: T.t3 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(stop.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <ChevronRight size={16} style={{ color: T.t3, flexShrink: 0 }} />
                  </div>
                ) : (
                  /* Expanded Card */
                  <div
                    className="rounded-xl overflow-visible"
                    style={{
                      background: T.sf,
                      border: `1px solid ${T.bd}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      outline: dragOverIdx === idx ? `2px solid ${T.ac}` : 'none',
                    }}
                  >
                    {/* Header */}
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
                      style={{ borderBottom: `1px solid ${T.bd}` }}
                      onClick={() => toggleStop(stop.id)}
                    >
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(idx, e);
                        }}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: 'grab', display: 'flex' }}
                      >
                        <GripVertical size={14} style={{ color: T.t3 }} />
                      </span>
                      <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                        Stop {idx + 1}
                      </span>
                      {getStopTags(stop).map((tg) => (
                        <span
                          key={tg}
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: tg === 'pickup' ? '#EFF6FF' : '#F3F0FF',
                            color: tg === 'pickup' ? '#2563EB' : '#5E3BEE',
                          }}
                        >
                          {t(tg) || tg}
                        </span>
                      ))}
                      <div className="flex-1" />
                      <button
                        type="button"
                        className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer border-none shrink-0"
                        style={{ background: stop.noteCarrier ? T.al : 'transparent', color: stop.noteCarrier ? T.ac : T.t3 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotesStop(notesStop === stop.id ? null : stop.id);
                        }}
                      >
                        <StickyNote size={14} />
                      </button>
                      {stop.contactName && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 shrink-0 cursor-pointer"
                          style={{ background: T.sa, color: T.t2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotesStop(notesStop === stop.id ? null : stop.id);
                          }}
                        >
                          <Phone size={10} />
                          {stop.contactName}
                        </span>
                      )}
                      <ChevronDown size={16} style={{ color: T.t3, flexShrink: 0 }} />
                    </div>

                    {/* Notes popup */}
                    {notesStop === stop.id && (
                      <div className="mx-4 mt-3 p-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: T.t1 }}>
                            📝 {t('notes') || 'Notes'}
                          </span>
                          <button
                            type="button"
                            className="border-none bg-transparent cursor-pointer"
                            style={{ color: T.t3 }}
                            onClick={() => setNotesStop(null)}
                          >
                            <Minimize2 size={14} />
                          </button>
                        </div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: T.t3 }}>
                          🚛 Carrier Note
                        </label>
                        <textarea
                          rows={2}
                          className="w-full rounded text-xs mb-2 p-2 outline-none resize-y"
                          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontFamily: 'inherit' }}
                          value={stop.noteCarrier}
                          onChange={(e) => uStop(stop.id, { noteCarrier: e.target.value })}
                          placeholder="e.g. Report to Gate B"
                        />
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: T.t3 }}>
                          🔒 Internal Note
                        </label>
                        <textarea
                          rows={2}
                          className="w-full rounded text-xs p-2 outline-none resize-y"
                          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontFamily: 'inherit' }}
                          value={stop.noteInternal}
                          onChange={(e) => uStop(stop.id, { noteInternal: e.target.value })}
                          placeholder="Internal remarks..."
                        />
                        <label className="block text-[10px] font-semibold mt-2 mb-1" style={{ color: T.t3 }}>
                          📞 Contact Person
                        </label>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded text-xs p-2 outline-none"
                            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontFamily: 'inherit' }}
                            value={stop.contactName}
                            onChange={(e) => uStop(stop.id, { contactName: e.target.value })}
                            placeholder="Name..."
                          />
                          <input
                            className="w-[140px] rounded text-xs p-2 outline-none"
                            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontFamily: 'inherit' }}
                            value={stop.contactPhone}
                            onChange={(e) => uStop(stop.id, { contactPhone: e.target.value })}
                            placeholder="Phone..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Location + Appointment */}
                    <div className="p-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
                      {/* Location Select */}
                      <div className="mb-3">
                        <label className="block text-[11px] font-semibold mb-1 uppercase tracking-wide" style={{ color: T.t3 }}>
                          Location
                        </label>
                        <div
                          className={`flex items-center gap-1 ${invalidFieldClass(`stop-${idx}-location`)}`}
                          data-validation-anchor={`stop-${idx}-location`}
                        >
                          <div className="flex-1 min-w-0">
                            <LocationSelect
                              locations={abLocs}
                              value={stop.locationId}
                              onChange={(lid) => selLoc(stop.id, lid)}
                              onCreateNew={() => {
                                setPCtx({ locS: stop.id });
                                setMLoc(true);
                              }}
                              onPreview={(loc) => previewLocation(loc.id)}
                              invalid={isFieldInvalid(`stop-${idx}-location`)}
                            />
                          </div>
                        </div>
                        <FieldValidationHint
                          conflicts={getBlockersForAnchor(blockers, `stop-${idx}-location`)}
                          show={showAll}
                          t={t}
                        />
                        {hintsFor(idx, LOC_CODES)}
                      </div>

                      {/* Appointment Row — Fixed Time only */}
                      <div
                        className={`flex items-end gap-2 flex-wrap ${invalidFieldClass(`stop-${idx}-date`)}`}
                        data-validation-anchor={`stop-${idx}-date`}
                      >
                        <div>
                          <label className="block text-[11px] font-semibold mb-1 uppercase tracking-wide" style={{ color: T.t3 }}>
                            From
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="date"
                              style={{ ...iS, width: 125 }}
                              value={stop.dateFrom}
                              onChange={(e) => uStop(stop.id, { dateFrom: e.target.value })}
                            />
                            <input
                              type="time"
                              style={{ ...iS, width: 90 }}
                              value={stop.timeFrom}
                              onChange={(e) => uStop(stop.id, { timeFrom: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.t3 }}>
                              To (Optional)
                            </label>
                          </div>
                          <div className="flex gap-1">
                            <input
                              type="date"
                              style={{ ...iS, width: 125 }}
                              value={stop.dateTo}
                              onChange={(e) => uStop(stop.id, { dateTo: e.target.value })}
                            />
                            <input
                              type="time"
                              style={{ ...iS, width: 90 }}
                              value={stop.timeTo}
                              onChange={(e) => uStop(stop.id, { timeTo: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <FieldValidationHint
                        conflicts={getBlockersForAnchor(blockers, `stop-${idx}-date`)}
                        show={showAll}
                        t={t}
                      />
                      {hintsFor(idx, DATE_CODES)}
                    </div>

                    {/* Cargo Lines Table */}
                    <div className="p-4 pt-3">
                      <CargoTable
                        stop={stop}
                        T={T}
                        t={t}
                        iS={iS}
                        ordOpts={ordOpts}
                        orderDetailsById={orderDetailsById}
                        onClearOrder={(lid) => clearOrderLine(stop.id, lid)}
                        onAddLine={() => addLine(stop.id)}
                        onDelLine={(lid) => delLine(stop.id, lid)}
                        onDupLine={(lid) => dupLine(stop.id, lid)}
                        onSetField={(lid, f, v) => setLF(stop.id, lid, f, v)}
                        onSelProd={(lid, sk) => selProdLine(stop.id, lid, sk)}
                        onSelOrd={(lid, oid) => selOrdLine(stop.id, lid, oid)}
                        onNewProd={(lid) => {
                          setPCtx({ pS: stop.id, pL: lid });
                          setMSku(true);
                        }}
                        onNewOrd={(lid) => {
                          setPCtx({ ordS: stop.id, ordL: lid });
                          setMOrd(true);
                        }}
                        onQuickFill={(oid) => quickFill(stop.id, oid)}
                        onQuickFillNew={() => {
                          setPCtx({ ordS: stop.id, ordL: null });
                          setMOrd(true);
                        }}
                        getGoodsIndicators={getGoodsIndicators}
                        showValidation={showAll}
                        blockers={blockers}
                        stopIndex={idx}
                        previewProduct={previewProduct}
                        previewCustomer={previewCustomer}
                        previewOrder={previewOrder}
                      />
                      {hintsFor(idx, CARGO_CODES)}
                    </div>

                    {/* Footer Checkmark actions */}
                    <div className="flex justify-end items-center gap-2 px-4 pb-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none text-white"
                        style={{ background: '#2563EB', fontFamily: 'inherit' }}
                        onClick={() => toggleStop(stop.id)}
                      >
                        <Check size={14} /> Done
                      </button>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none shrink-0 transition-colors"
                        style={{ background: T.sa, color: T.t3 }}
                        onClick={() => dupStop(stop.id)}
                      >
                        <Copy size={14} />
                      </button>
                      {stops.length > 2 && (
                        <button
                          type="button"
                          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none shrink-0 transition-colors"
                          style={{ background: 'transparent', color: T.t3 }}
                          onClick={() => setDeleteConfirm(stop.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Stop Button */}
        <div className="flex items-center gap-3 py-2 relative" style={{ zIndex: 1 }}>
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer border-none transition-colors"
            style={{ background: T.sf, border: `2px dashed ${T.bd}`, color: T.ac }}
            onClick={addStop}
          >
            <Plus size={16} />
          </button>
          <span className="text-xs font-semibold cursor-pointer" style={{ color: T.ac }} onClick={addStop}>
            Add Stop
          </span>
        </div>
      </div>

      {/* Footer controls mirroring BottomBar */}
      <footer
        className="fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 hidden md:flex"
        style={{ left: 'var(--sidebar-w, 240px)', background: T.sf, borderTop: `1px solid ${T.bd}` }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.ac, fontFamily: 'inherit' }}
            onClick={handleSaveDraftClick}
            disabled={isSaving}
          >
            <Save size={14} /> {isSaving ? (t('saving') || 'Saving...') : (t('saveDraft') || 'Save Draft')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ border: `1px solid ${T.ac}`, background: T.al, color: T.ac, fontFamily: 'inherit' }}
            onClick={() => {
              setSaveTplOpen(true);
              setSaveTplName('');
            }}
          >
            <FileText size={13} /> Save as Template
          </button>
          {lastSaved && (
            <span className="text-[10px]" style={{ color: T.t3 }}>
              {t('draftSavedAt') || 'Draft saved'} {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold cursor-pointer"
            style={{ border: `1px dashed #D97706`, background: '#FEF3C7', color: '#D97706', fontFamily: 'inherit' }}
            onClick={fillTestData}
          >
            ⚡ Dev: Fill test
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white border-none"
            style={{
              background: canContinue ? T.ac : T.bf,
              cursor: canContinue ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
            disabled={!canContinue || isSaving}
            onClick={handleContinue}
          >
            {isSaving ? (t('saving') || 'Saving...') : 'Continue'}
            {conflictCount > 0 && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: blockers.length > 0 ? '#DC2626' : '#D97706', color: '#fff' }}
              >
                {conflictCount}
              </span>
            )}
            <ArrowRight size={14} />
          </button>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <CreateLocationModal
        isCreateOpen={mLoc}
        closeCreateModal={() => setMLoc(false)}
        createStep={createStep}
        setCreateStep={setCreateStep}
        createData={createData}
        setCreateData={setCreateData}
        submitNewLocation={submitNewLocation}
        potentialDuplicates={potentialDuplicates}
        selectExistingDuplicate={async (loc) => {
          if (pCtx.locS) {
            selLoc(pCtx.locS, String(loc.id));
            setPCtx((p: any) => ({ ...p, locS: null }));
          }
          setMLoc(false);
        }}
        saving={savingLocation}
        filteredCompanies={filteredCompanies}
        setCompanyQuery={setCompanyQuery}
        setIsCompanyOpen={setIsCompanyOpen}
        handleApplyTemplate={(tpl) => setCreateData((prev) => applyAddressTemplate(tpl, prev))}
        t={t}
      />

      <CreateCompanyModal
        isCompanyOpen={isCompanyOpen}
        closeCompanyModal={() => setIsCompanyOpen(false)}
        companyData={companyData}
        setCompanyData={setCompanyData}
        handleApplyCompany={handleApplyCompany}
      />

      <CreateCustomerModal
        isOpen={mCust}
        onClose={() => setMCust(false)}
        onCreated={onCustCreated}
      />
      <CreateEditOrderModal
        t={t}
        isOpen={mOrd}
        isEdit={false}
        form={erpOrderForm}
        setForm={setErpOrderForm}
        onClose={() => {
          setMOrd(false);
          setErpOrderForm(EMPTY_ORDER_FORM);
        }}
        onSubmit={handleCreateOrder}
        saving={erpOrderSaving}
        companies={erpCompanies}
        locations={locations}
        skus={skus}
        onAddLocationOrigin={() => {
          setPCtx((p: any) => ({ ...p, orderFormTarget: 'origin' }));
          setCreateStep(1);
          setCreateData({
            ...EMPTY_CREATE_DATA,
            context: 'my',
            role: 'pickup',
          });
          setMLoc(true);
        }}
        onAddLocationDest={() => {
          setPCtx((p: any) => ({ ...p, orderFormTarget: 'dest' }));
          setCreateStep(1);
          setCreateData({
            ...EMPTY_CREATE_DATA,
            context: 'my',
            role: 'delivery',
          });
          setMLoc(true);
        }}
        onAddProduct={(index) => {
          setPCtx((p: any) => ({ ...p, orderFormTarget: 'product', orderFormLineIndex: index }));
          setMSku(true);
        }}
      />

      <ProductMasterSkuModal
        isOpen={mSku}
        onClose={() => setMSku(false)}
        onSubmit={handleCreateSku}
        saving={skuSaving}
      />

      {/* Dialog for templates */}
      {saveTplOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setSaveTplOpen(false)}
        >
          <div
            className="rounded-xl overflow-hidden p-5"
            style={{ width: 400, background: T.sf, border: `1px solid ${T.bd}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                Save as Template
              </span>
              <button
                type="button"
                className="border-none bg-transparent cursor-pointer"
                style={{ color: T.t3 }}
                onClick={() => setSaveTplOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-semibold mb-1 uppercase" style={{ color: T.t3 }}>
                Template Name
              </label>
              <input
                style={{ ...iS, fontSize: 13 }}
                value={saveTplName}
                onChange={(e) => setSaveTplName(e.target.value)}
                placeholder="Name..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border"
                style={{ borderColor: T.bd, background: T.sf, color: T.t2, fontFamily: 'inherit' }}
                onClick={() => setSaveTplOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer text-white border-none"
                style={{ background: saveTplName.trim() ? T.ac : T.bf, fontFamily: 'inherit' }}
                disabled={!saveTplName.trim()}
                onClick={saveAsTemplate}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict summary dialog */}
      {conflictPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setConflictPopup(false)}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{ width: 480, maxHeight: '80vh', background: T.sf, border: `1px solid ${T.bd}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: '#D97706' }} />
                <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                  {t('validationWarningsTitle', { count: warnings.length })}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: T.t3 }}>
                {t('validationReviewBeforeProceed')}
              </span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
              {warnings.map((c, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3" style={{ borderBottom: `0.5px solid ${T.bd}` }}>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ background: '#FEF3C7', color: '#D97706' }}
                  >
                    {c.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: T.t1 }}>
                      {translateConflict(c, t)}
                    </div>
                    {c.stopIndex >= 0 && (
                      <div className="text-[10px] mt-0.5" style={{ color: T.t3 }}>
                        Stop {c.stopIndex + 1}
                        {stops[c.stopIndex]?.locationName ? ` — ${stops[c.stopIndex].locationName}` : ''}
                      </div>
                    )}
                    <div className="text-[10px] mt-0.5" style={{ color: T.ac }}>
                      {translateResolution(c, t)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${T.bd}`, background: T.sa }}>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border"
                style={{ borderColor: T.bd, background: T.sf, color: T.t2, fontFamily: 'inherit' }}
                onClick={() => setConflictPopup(false)}
              >
                {t('validationGoBackAndFix')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer text-white border-none"
                style={{ background: T.ac, fontFamily: 'inherit' }}
                onClick={handleProceedAnyway}
              >
                {t('validationProceedAnyway')} →
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            delStop(deleteConfirm);
            setDeleteConfirm(null);
          }
        }}
        title={t('deleteStopTitle') || 'Delete Stop'}
        message={t('deleteStopMsg') || 'Are you sure you want to delete this stop and all its cargo lines?'}
        confirmText={t('deleteStopConfirm') || 'Delete'}
        cancelText={t('deleteStopCancel') || 'Cancel'}
        type="danger"
      />
    </div>
  );
};

// ═══════════════════════════════════════
// CARGO TABLE
// ═══════════════════════════════════════
interface CargoTableProps {
  stop: any;
  T: any;
  t: any;
  iS: any;
  ordOpts: any[];
  orderDetailsById: Record<string, import('../../pages/ErpOrders/types').ErpOrder>;
  onAddLine: () => void;
  onDelLine: (lid: string) => void;
  onDupLine: (lid: string) => void;
  onSetField: (lid: string, field: string, val: any) => void;
  onSelProd: (lid: string, skuId: string) => void;
  onSelOrd: (lid: string, oid: string) => void;
  onClearOrder: (lid: string) => void;
  onNewProd: (lid: string) => void;
  onNewOrd: (lid: string) => void;
  onQuickFill: (oid: string) => void;
  onQuickFillNew: () => void;
  getGoodsIndicators: (productId: string) => any[];
  showValidation?: boolean;
  blockers?: import('../../hooks/useConflicts').Conflict[];
  stopIndex: number;
  previewProduct: (skuId: string) => void;
  previewCustomer: (custId: string) => void;
  previewOrder: (ordId: string) => void;
}

const CargoTable: React.FC<CargoTableProps> = ({
  stop,
  T,
  t,
  iS,
  ordOpts,
  orderDetailsById,
  onAddLine,
  onDelLine,
  onDupLine,
  onSetField,
  onSelProd,
  onSelOrd,
  onClearOrder,
  onNewProd,
  onNewOrd,
  onQuickFill,
  onQuickFillNew,
  getGoodsIndicators,
  showValidation = false,
  blockers = [],
  stopIndex,
}) => {
  const thS: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: T.t3,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    padding: '5px 3px',
    borderBottom: `1px solid ${T.bd}`,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };
  const tdS: React.CSSProperties = { padding: '3px', borderBottom: `0.5px solid ${T.bd}`, verticalAlign: 'middle' };
  const monoS = {
    ...iS,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: 12,
    textAlign: 'right' as const,
    padding: '5px 6px',
    width: 56,
  };
  const selS = { ...iS, cursor: 'pointer', fontSize: 11, padding: '5px 4px', width: 72 };
  const [qfOpen, setQfOpen] = useState(false);

  const isInvalid = (anchor: string) =>
    showValidation && getBlockersForAnchor(blockers, anchor).length > 0;

  const invalidClass = (anchor: string) => (isInvalid(anchor) ? 'wizard-field-invalid' : '');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, isLast: boolean) => {
      if (e.key === 'Enter' && isLast) onAddLine();
    },
    [onAddLine]
  );

  return (
    <div className="rounded-lg overflow-visible" style={{ border: `1px solid ${T.bd}` }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thS, width: '12%' }}>Order ID</th>
              <th style={{ ...thS, width: '12%' }}>Customer</th>
              <th style={{ ...thS, width: '20%' }}>Product</th>
              <th style={{ ...thS, width: '11%', textAlign: 'center' }}>Action</th>
              <th style={{ ...thS, width: '7%' }}>Qty</th>
              <th style={{ ...thS, width: '8%' }}>Unit</th>
              <th style={{ ...thS, width: '7%' }}>Weight</th>
              <th style={{ ...thS, width: '7%' }}>W.Unit</th>
              <th style={{ ...thS, width: '3%' }}></th>
            </tr>
          </thead>
          <tbody>
            {(stop.lines || []).map((ln: any, li: number) => {
              const indicators = getGoodsIndicators(ln.productId);
              const isLast = li === stop.lines.length - 1;
              const orderDetail = ln.orderId ? orderDetailsById[ln.orderId] : undefined;
              const productOpts = getProductOptionsForOrder(orderDetail).map((opt) => ({
                value: opt.value,
                label: opt.label,
                sublabel: opt.sublabel,
              }));
              return (
                <tr key={ln.id} style={{ background: ln.mirrorOf ? T.sa : 'transparent' }}>
                  <td
                    style={tdS}
                    data-validation-anchor={`stop-${stopIndex}-line-${li}-order`}
                    className={invalidClass(`stop-${stopIndex}-line-${li}-order`)}
                  >
                    <OrderCell
                      ln={ln}
                      T={T}
                      t={t}
                      iS={iS}
                      ordOpts={ordOpts}
                      onSelOrd={(v) => onSelOrd(ln.id, v)}
                      onSetField={(f, v) => onSetField(ln.id, f, v)}
                      onNewOrd={() => onNewOrd(ln.id)}
                    />
                  </td>
                  <td style={tdS}>
                    {ln.orderId && ln.customerName ? (
                      <div className="flex items-center gap-0.5">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded truncate"
                          style={{ background: T.sa, color: T.t1, maxWidth: 100 }}
                        >
                          {ln.customerName}
                        </span>
                        <button
                          type="button"
                          className="border-none bg-transparent cursor-pointer p-0"
                          style={{ color: T.t3 }}
                          onClick={() => onClearOrder(ln.id)}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px]" style={{ color: T.t3 }}>
                        {ln.orderId ? '—' : t('createLoadSelectOrderFirst')}
                      </span>
                    )}
                  </td>
                  <td
                    style={tdS}
                    data-validation-anchor={`stop-${stopIndex}-line-${li}-product`}
                    className={invalidClass(`stop-${stopIndex}-line-${li}-product`)}
                  >
                    <SearchableSelect
                      value={ln.productId}
                      onChange={(v) => onSelProd(ln.id, v)}
                      options={productOpts}
                      placeholder={
                        ln.orderId
                          ? productOpts.length
                            ? t('selectProduct')
                            : t('createLoadNoOrderProducts')
                          : t('createLoadSelectOrderFirst')
                      }
                      disabled={!ln.orderId || productOpts.length === 0}
                      headerAction={
                        ln.orderId
                          ? {
                              label: `+ Create Product`,
                              onClick: () => onNewProd(ln.id),
                            }
                          : undefined
                      }
                      menuFixed={true}
                      hideSublabelInTrigger={true}
                    />
                    {indicators.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {indicators.map((ind) => (
                          <span
                            key={ind.key}
                            className="text-[9px] font-bold px-1 py-0 rounded"
                            style={{ background: ind.bg, color: ind.color }}
                          >
                            {ind.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <FieldValidationHint
                      conflicts={getBlockersForAnchor(blockers, `stop-${stopIndex}-line-${li}-product`)}
                      show={showValidation}
                      t={t}
                    />
                  </td>
                  <td style={{ ...tdS, textAlign: 'center' }}>
                    <div className="inline-flex overflow-hidden rounded" style={{ border: `1px solid ${T.bd}` }}>
                      <button
                        type="button"
                        className="py-1 px-2.5 text-[10px] font-semibold cursor-pointer border-none"
                        style={{
                          background: ln.action === 'pickup' ? '#2563EB' : T.sf,
                          color: ln.action === 'pickup' ? '#fff' : T.t3,
                          fontFamily: 'inherit',
                        }}
                        onClick={() => onSetField(ln.id, 'action', 'pickup')}
                      >
                        Pick
                      </button>
                      <button
                        type="button"
                        className="py-1 px-2.5 text-[10px] font-semibold cursor-pointer border-none"
                        style={{
                          background: ln.action === 'dropoff' ? '#5E3BEE' : T.sf,
                          color: ln.action === 'dropoff' ? '#fff' : T.t3,
                          fontFamily: 'inherit',
                        }}
                        onClick={() => onSetField(ln.id, 'action', 'dropoff')}
                      >
                        Drop
                      </button>
                    </div>
                  </td>
                  <td
                    style={tdS}
                    data-validation-anchor={`stop-${stopIndex}-line-${li}-qty`}
                    className={invalidClass(`stop-${stopIndex}-line-${li}-qty`)}
                  >
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      style={monoS}
                      value={ln.qty}
                      onChange={(e) => onSetField(ln.id, 'qty', e.target.value)}
                    />
                    <FieldValidationHint
                      conflicts={[
                        ...getBlockersForAnchor(blockers, `stop-${stopIndex}-line-${li}-qty`),
                        ...getBlockersForAnchor(blockers, `stop-${stopIndex}-line-${li}-product`).filter(
                          (c) => c.code === 'C2'
                        ),
                      ]}
                      show={showValidation}
                      t={t}
                    />
                  </td>
                  <td style={tdS}>
                    <select
                      style={{ ...selS, width: 105 }}
                      value={ln.unit}
                      onChange={(e) => onSetField(ln.id, 'unit', e.target.value)}
                    >
                      {QTY_UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    style={tdS}
                    data-validation-anchor={`stop-${stopIndex}-line-${li}-weight`}
                    className={invalidClass(`stop-${stopIndex}-line-${li}-weight`)}
                  >
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      style={monoS}
                      value={ln.weight}
                      onChange={(e) => onSetField(ln.id, 'weight', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, isLast)}
                    />
                    <FieldValidationHint
                      conflicts={getBlockersForAnchor(blockers, `stop-${stopIndex}-line-${li}-weight`)}
                      show={showValidation}
                      t={t}
                    />
                  </td>
                  <td style={tdS}>
                    <select
                      style={{ ...selS, width: 75 }}
                      value={ln.wtUnit}
                      onChange={(e) => onSetField(ln.id, 'wtUnit', e.target.value)}
                    >
                      {WEIGHT_UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={tdS}>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer border-none"
                        style={{ background: 'transparent', color: T.t3 }}
                        onClick={() => onDupLine(ln.id)}
                      >
                        <Copy size={10} />
                      </button>
                      <button
                        type="button"
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer border-none"
                        style={{ background: 'transparent', color: T.t3 }}
                        onClick={() => onDelLine(ln.id)}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={9} style={{ padding: '4px 3px' }}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none py-1 px-1"
                    style={{ background: 'transparent', color: T.ac, fontFamily: 'inherit' }}
                    onClick={onAddLine}
                  >
                    <Plus size={14} /> Add Line
                  </button>
                  <div style={{ width: qfOpen ? 220 : 'auto' }}>
                    {qfOpen ? (
                      <SearchableSelect
                        value=""
                        onChange={(v) => {
                          onQuickFill(v);
                          setQfOpen(false);
                        }}
                        options={ordOpts}
                        placeholder="Search ERP orders..."
                        footerAction={{
                          label: `+ Create Order`,
                          onClick: () => {
                            setQfOpen(false);
                            onQuickFillNew();
                          },
                        }}
                        menuFixed={true}
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer border-none py-1 px-2 rounded"
                        style={{ background: T.sa, color: T.t2, fontFamily: 'inherit' }}
                        onClick={() => setQfOpen(true)}
                      >
                        <FileText size={12} /> Quick Fill
                      </button>
                    )}
                  </div>
                  {qfOpen && (
                    <button
                      type="button"
                      className="text-[10px] cursor-pointer border-none"
                      style={{ background: 'transparent', color: T.t3, fontFamily: 'inherit' }}
                      onClick={() => setQfOpen(false)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// ORDER CELL
// ═══════════════════════════════════════
interface OrderCellProps {
  ln: any;
  T: any;
  t: any;
  iS: any;
  ordOpts: any[];
  onSelOrd: (val: string) => void;
  onSetField: (field: string, val: any) => void;
  onNewOrd: () => void;
}

const OrderCell: React.FC<OrderCellProps> = ({
  ln,
  T,
  t,
  ordOpts,
  onSelOrd,
  onSetField,
  onNewOrd,
}) => {
  if (ln.orderRef) {
    return (
      <div className="flex items-center gap-0.5">
        <span
          className="text-[11px] font-medium truncate px-1.5 py-0.5 rounded"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t1, maxWidth: 80 }}
        >
          {ln.orderRef}
        </span>
        <button
          type="button"
          className="border-none bg-transparent cursor-pointer p-0"
          style={{ color: T.t3 }}
          onClick={() => {
            onSetField('orderId', '');
            onSetField('orderRef', '');
          }}
        >
          <X size={10} />
        </button>
      </div>
    );
  }
  return (
    <SearchableSelect
      value=""
      onChange={onSelOrd}
      options={ordOpts}
      placeholder="—"
      footerAction={{
        label: `+ Create Order`,
        onClick: onNewOrd,
      }}
      menuFixed={true}
      hideSublabelInTrigger={true}
    />
  );
};

// ═══════════════════════════════════════
// LOAD BALANCE BAR
// ═══════════════════════════════════════
interface LoadBalanceBarProps {
  bal: any;
  balExp: boolean;
  setBalExp: (val: boolean) => void;
  fmtW: (kg: number) => string;
  T: any;
  t: any;
}

const LoadBalanceBar: React.FC<LoadBalanceBarProps> = ({ bal, balExp, setBalExp, fmtW, T, t }) => {
  const hasData = bal.pkU > 0 || bal.doU > 0;
  return (
    <div className="rounded-xl overflow-hidden mb-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
        onClick={() => hasData && setBalExp(!balExp)}
      >
        <span className="text-sm font-semibold" style={{ color: T.t1 }}>
          Load Balance
        </span>
        <div className="flex-1 mx-1">
          <div className="flex h-2 rounded-full overflow-hidden" style={{ background: T.sa }}>
            {hasData && (
              <>
                <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    className="transition-all duration-500"
                    style={{ width: `${bal.pkBar * 2}%`, background: '#2563EB', borderRadius: '4px 0 0 4px' }}
                  />
                </div>
                <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    className="transition-all duration-500"
                    style={{ width: `${bal.doBar * 2}%`, background: '#5E3BEE', borderRadius: '0 4px 4px 0' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#2563EB' }}>
          ↑ {bal.pkU} · {fmtW(bal.pkW)}
        </span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: '#F3F0FF', color: '#5E3BEE' }}>
          ↓ {bal.doU} · {fmtW(bal.doW)}
        </span>
        {bal.balanced && hasData && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#D1FAE5', color: '#059669' }}>
            ✓ Balanced
          </span>
        )}
        <ChevronDown
          size={14}
          style={{
            color: T.t3,
            transition: 'transform 0.2s',
            transform: balExp ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </div>
      {balExp && hasData && (
        <div className="px-4 pb-3" style={{ borderTop: `1px solid ${T.bd}` }}>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold" style={{ color: '#2563EB' }}>
                <ArrowUp size={13} />
                Total Pickup
              </div>
              <div className="text-lg font-bold" style={{ color: T.t1 }}>
                {bal.pkU} <span className="text-xs font-normal" style={{ color: T.t3 }}>units</span>
              </div>
              <div className="text-sm font-semibold" style={{ color: T.t2 }}>
                {fmtW(bal.pkW)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold" style={{ color: '#5E3BEE' }}>
                <ArrowDown size={13} />
                Total Dropoff
              </div>
              <div className="text-lg font-bold" style={{ color: T.t1 }}>
                {bal.doU} <span className="text-xs font-normal" style={{ color: T.t3 }}>units</span>
              </div>
              <div className="text-sm font-semibold" style={{ color: T.t2 }}>
                {fmtW(bal.doW)}
              </div>
            </div>
          </div>
          {Object.keys(bal.byP).length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.bd}` }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: T.t3 }}>
                Per Product
              </div>
              {Object.entries(bal.byP).map(([nm, v]: [string, any]) => (
                <div
                  key={nm}
                  className="flex items-center justify-between py-1 text-xs"
                  style={{ borderBottom: `1px solid ${T.bd}` }}
                >
                  <span className="truncate mr-2 font-medium" style={{ color: T.t1 }}>
                    {nm}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span style={{ color: '#2563EB' }}>
                      ↑ {v.pk} {v.unit}
                    </span>
                    <span style={{ color: '#5E3BEE' }}>
                      ↓ {v.do} {v.unit}
                    </span>
                    {v.pk > 0 && v.pk !== v.do && (
                      <span
                        className="text-[10px] font-bold px-1 rounded"
                        style={{ background: '#FEF3C7', color: '#D97706' }}
                      >
                        {v.pk - v.do > 0 ? `+${v.pk - v.do}` : v.pk - v.do}
                      </span>
                    )}
                    {v.pk > 0 && v.pk === v.do && <span className="text-[10px]" style={{ color: '#059669' }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function getStopTags(stop: any) {
  let pk = false,
    d = false;
  (stop.lines || []).forEach((ln: any) => {
    if (ln.action === 'pickup') pk = true;
    if (ln.action === 'dropoff') d = true;
  });
  const tags = [];
  if (pk) tags.push('pickup');
  if (d) tags.push('dropoff');
  return tags;
}

function fmtStopBrief(s: any, t: any) {
  const parts = [];
  const fmtD = (ds: string) => {
    const d = new Date(ds);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  if (s.dateFrom) {
    let str = `From ${fmtD(s.dateFrom)}`;
    if (s.timeFrom) str += `, ${s.timeFrom}`;
    if (s.dateTo) {
      str += ` To ${fmtD(s.dateTo)}`;
      if (s.timeTo) str += `, ${s.timeTo}`;
    } else if (s.timeTo) {
      str += ` To ${s.timeTo}`;
    }
    parts.push(str);
  }
  const cargoCount = (s.lines || []).filter((l: any) => l.productId).length;
  if (cargoCount) parts.push(`${cargoCount} lines`);
  return parts.join(' · ');
}

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useFormikContext } from "formik";
import { useApp, type LocationItem } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Save,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  FileText,
  Check,
  Trash2,
  Eye,
  Copy,
  Phone,
  AlertTriangle,
  GripVertical,
} from "lucide-react";

import { SearchableSelect } from "../ui/SearchableSelect";
import { DatePicker, getTodayDateString } from "../ui/DatePicker";
import { TimePicker } from "../ui/TimePicker";
import { formatDisplayDate, formatDisplayTime } from "../../utils/dateDisplay";
import { LocationSelect } from "./LocationSelect";
import { LocationPreviewOverlay } from "./LocationPreviewOverlay";
import { createNewStop, createNewCargoLine } from "./types";
import {
  useCreateShipmentOrders,
  findOrderLineForProduct,
  getProductOptionsForCargoLine,
  countUnmappedOrderLines,
} from "../../hooks/useCreateShipmentOrders";
import { ConfirmationModal } from "../ui/ConfirmationModal";
import { CreateLocationModal } from "../AddressBook/CreateLocationModal";
import { CreateCompanyModal } from "../AddressBook/CreateCompanyModal";
import { ProductMasterSkuModal } from "../ProductMaster/ProductMasterSkuModal";
import { CreateEditOrderModal } from "../ErpOrders";
import { useQueryClient } from "@tanstack/react-query";
import {
  productMasterService,
  addressBookService,
  erpOrdersService,
  ApiError,
  getApiErrorMessage,
} from "../../api";
import { EMPTY_ORDER_FORM } from "../../pages/ErpOrders/types";
import type { ErpOrderFormState } from "../../pages/ErpOrders/types";
import type { ApiErpOrderCustomer } from "../../api/types/erpOrders";
import {
  checkLocationDuplicate,
  DUPLICATE_LOCATION_MESSAGE,
} from "../../pages/AddressBook/validation/locationDuplicateValidation";
import { validateCreateAll } from "../../pages/AddressBook/validation/locationCreateValidation";
import { applyTemplate as applyAddressTemplate } from "../../pages/AddressBook/utils/locationUtils";
import {
  EMPTY_CREATE_DATA,
  EMPTY_COMPANY_DATA,
} from "../../pages/AddressBook/types";
import type {
  CreateLocationData,
  CompanyFormData,
} from "../../pages/AddressBook/types";
import type { ApiCompanyLookup } from "../../api/types/addressBook";
import {
  QTY_UNIT_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  normalizeQtyUnit,
  normalizeWeightUnit,
  formatWeightDisplay,
  formatWeightKgTotal,
  convertWeightValue,
} from "../../constants/cargoUnits";
import {
  computeLoadBalance,
  computeCargoLineQtyWeight,
  getPickupAllocatedQty,
  getPickupAllocatedWeight,
  formatQtyWithUnit,
  remainingOrderWeight,
} from "./itinerary/cargoUtils";

const clearOrderDependentCargoFields = () => {
  const blank = createNewCargoLine();
  return {
    orderId: blank.orderId,
    orderRef: blank.orderRef,
    orderLineId: blank.orderLineId,
    customerId: blank.customerId,
    customerName: blank.customerName,
    productId: blank.productId,
    productName: blank.productName,
    qty: blank.qty,
    unit: blank.unit,
    weight: blank.weight,
    wtUnit: blank.wtUnit,
  };
};

import useConflicts from "../../hooks/useConflicts";
import { FieldValidationHint } from "./FieldValidationHint";
import {
  focusFirstConflict,
  getBlockersForAnchor,
  getConflictAnchor,
  getStopDoneBlockers,
  translateConflict,
  translateResolution,
} from "./validation";

const makeId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

export { createNewStop, createNewCargoLine } from "./types";

const T = {
  bg: "var(--bg)",
  sf: "var(--surface)",
  sa: "var(--surface-alt)",
  sh: "var(--surface-hover)",
  bd: "var(--border)",
  bf: "var(--border-focus)",
  t1: "var(--text-primary)",
  t2: "var(--text-secondary)",
  t3: "var(--text-tertiary)",
  ac: "var(--accent)",
  al: "var(--accent-light)",
  ah: "var(--accent-hover)",
  ap: "var(--accent-light)",
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
  const {
    orderOptions,
    fetchOrderDetail,
    addOrder,
    orders: apiOrders,
    loading: ordersLoading,
    error: ordersError,
  } = useCreateShipmentOrders();
  const [orderDetailsById, setOrderDetailsById] = useState<
    Record<string, import("../../pages/ErpOrders/types").ErpOrder>
  >({});

  // Modal Visibility states
  const [mLoc, setMLoc] = useState(false);
  const [mComp, setMComp] = useState(false);
  const [mOrd, setMOrd] = useState(false);
  const [mSku, setMSku] = useState(false);

  const [pCtx, setPCtx] = useState<any>({});
  const [balExp, setBalExp] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewLoc, setPreviewLoc] = useState<any | null>(null);
  const [orderLoadingLineId, setOrderLoadingLineId] = useState<string | null>(
    null,
  );

  const {
    locations,
    skus,
    showToast,
    refreshLocationsFromApi,
    refreshSkusFromApi,
  } = useApp();
  const queryClient = useQueryClient();

  // Local master data states
  const [abLocs, setAbLocs] = useState<any[]>(() =>
    locations.filter((l) => l.status === "active"),
  );
  const [pmSkus, setPmSkus] = useState<any[]>(() =>
    skus.filter((s) => s.active),
  );

  // Address Book Location Modal states
  const [createStep, setCreateStep] = useState(1);
  const [createData, setCreateData] =
    useState<CreateLocationData>(EMPTY_CREATE_DATA);
  const [companyQuery, setCompanyQuery] = useState("");
  const [apiCompanies, setApiCompanies] = useState<ApiCompanyLookup[]>([]);
  const [potentialDuplicates, setPotentialDuplicates] = useState<
    LocationItem[]
  >([]);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyData, setCompanyData] =
    useState<CompanyFormData>(EMPTY_COMPANY_DATA);
  const [savingLocation, setSavingLocation] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [skuSaving, setSkuSaving] = useState(false);

  // ERP Order Modal states
  const [erpOrderForm, setErpOrderForm] =
    useState<ErpOrderFormState>(EMPTY_ORDER_FORM);
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
      setAbLocs(locations.filter((l) => l.status === "active"));
    }
  }, [locations]);

  useEffect(() => {
    if (skus.length > 0) {
      setPmSkus(skus.filter((s) => s.active));
    }
  }, [skus]);

  const orderIdsFromStops = useMemo(() => {
    const ids = new Set<string>();
    stops.forEach((stop: { lines?: { orderId?: string }[] }) => {
      (stop.lines || []).forEach((line) => {
        if (line.orderId) ids.add(String(line.orderId));
      });
    });
    return [...ids].sort().join(",");
  }, [stops]);

  useEffect(() => {
    if (!orderIdsFromStops) return;

    let cancelled = false;
    const ids = orderIdsFromStops.split(",").filter(Boolean);

    void (async () => {
      for (const orderId of ids) {
        const detail = await fetchOrderDetail(orderId);
        if (cancelled || !detail) continue;
        setOrderDetailsById((prev) =>
          prev[orderId] ? prev : { ...prev, [orderId]: detail },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchOrderDetail, orderIdsFromStops]);

  useEffect(() => {
    if (!mLoc) return;
    const q = companyQuery.trim();
    const timer = setTimeout(() => {
      addressBookService
        .listCompanies(q || undefined, "my_locations")
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
          queryKey: ["locationDetail", String(result.existing_id)],
          queryFn: () =>
            addressBookService.getLocation(String(result.existing_id)),
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

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const todayStr = useMemo(() => getTodayDateString(), []);

  const iS = {
    border: `1px solid ${T.bd}`,
    borderRadius: 6,
    background: T.sf,
    color: T.t1,
    fontFamily: "inherit",
    fontSize: 12,
    padding: "6px 8px",
    outline: "none",
    width: "100%",
  };

  // ═══ STOP CRUD ═══
  const uStop = useCallback(
    (sid: string, up: any) => {
      const updated = stops.map((s: any) =>
        s.id === sid ? (typeof up === "function" ? up(s) : { ...s, ...up }) : s,
      );
      setFieldValue("stops", updated);
    },
    [stops, setFieldValue],
  );

  const addStop = useCallback(() => {
    setFieldValue("stops", [...stops, createNewStop(true)]);
  }, [stops, setFieldValue]);

  const delStop = useCallback(
    (sid: string) => {
      const n = stops.filter((s: any) => s.id !== sid);
      if (n.length < 2) return;
      setFieldValue("stops", n);
    },
    [stops, setFieldValue],
  );

  const dupStop = useCallback(
    (sid: string) => {
      const src = stops.find((s: any) => s.id === sid);
      if (!src) return;
      const ns = {
        ...JSON.parse(JSON.stringify(src)),
        id: makeId("s"),
        expanded: true,
      };
      ns.lines = ns.lines.map((l: any) => ({
        ...l,
        id: makeId("l"),
        mirrorOf: "",
      }));
      const idx = stops.findIndex((s: any) => s.id === sid);
      const out = [...stops];
      out.splice(idx + 1, 0, ns);
      setFieldValue("stops", out);
    },
    [stops, setFieldValue],
  );

  // Drag-to-reorder
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = "move";
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
      out[dragIdx] = {
        ...a,
        dateFrom: b.dateFrom,
        timeFrom: b.timeFrom,
        dateTo: b.dateTo,
        timeTo: b.timeTo,
      };
      out[dropIdx] = {
        ...b,
        dateFrom: aDF,
        timeFrom: aTF,
        dateTo: aDT,
        timeTo: aTT,
      };

      // Swap positions
      [out[dragIdx], out[dropIdx]] = [out[dropIdx], out[dragIdx]];
      setFieldValue("stops", out);
      setDraggingIdx(null);
      setDragOverIdx(null);
    },
    [draggingIdx, stops, setFieldValue],
  );

  // ═══ LINE CRUD ═══
  const addLine = useCallback(
    (sid: string, action: "pickup" | "dropoff" = "pickup") => {
      uStop(sid, (s: any) => ({
        ...s,
        lines: [...s.lines, createNewCargoLine(action)],
      }));
    },
    [uStop],
  );

  const delLine = useCallback(
    (sid: string, lid: string) => {
      uStop(sid, (s: any) => ({
        ...s,
        lines: s.lines.filter((l: any) => l.id !== lid),
      }));
    },
    [uStop],
  );

  const dupLine = useCallback(
    (sid: string, lid: string) => {
      uStop(sid, (s: any) => {
        const src = s.lines.find((l: any) => l.id === lid);
        if (!src) return s;
        const nl = { ...src, id: makeId("l"), mirrorOf: "" };
        const idx = s.lines.findIndex((l: any) => l.id === lid);
        const lines = [...s.lines];
        lines.splice(idx + 1, 0, nl);
        return { ...s, lines };
      });
    },
    [uStop],
  );

  const setLF = useCallback(
    (
      sid: string,
      lid: string,
      fieldOrUpdates: string | Record<string, any>,
      val?: any,
    ) => {
      uStop(sid, (s: any) => ({
        ...s,
        lines: s.lines.map((l: any) => {
          if (l.id !== lid) return l;
          if (typeof fieldOrUpdates === "string") {
            return { ...l, [fieldOrUpdates]: val };
          }
          return { ...l, ...fieldOrUpdates };
        }),
      }));
    },
    [uStop],
  );

  /** Keep order+product lines on every stop on the same qty unit (load balance end-to-end). */
  const setLineUnit = useCallback(
    (sid: string, lid: string, unit: string) => {
      const nextUnit = normalizeQtyUnit(unit) || unit || "EUR Pallets";
      const source = stops
        .find((s: any) => s.id === sid)
        ?.lines?.find((l: any) => l.id === lid);
      const orderId = source?.orderId ? String(source.orderId) : "";
      const productId = source?.productId ? String(source.productId) : "";

      if (!orderId || !productId) {
        setLF(sid, lid, "unit", nextUnit);
        return;
      }

      const updated = stops.map((s: any) => ({
        ...s,
        lines: (s.lines || []).map((l: any) => {
          if (String(l.id) === String(lid)) return { ...l, unit: nextUnit };
          if (
            String(l.orderId || "") === orderId &&
            String(l.productId || "") === productId
          ) {
            return { ...l, unit: nextUnit };
          }
          return l;
        }),
      }));
      setFieldValue("stops", updated);
    },
    [setFieldValue, setLF, stops],
  );

  /** Keep order+product lines on every stop on the same weight unit; convert magnitudes. */
  const setLineWtUnit = useCallback(
    (sid: string, lid: string, wtUnit: string) => {
      const nextUnit = normalizeWeightUnit(wtUnit);
      const source = stops
        .find((s: any) => s.id === sid)
        ?.lines?.find((l: any) => l.id === lid);
      const orderId = source?.orderId ? String(source.orderId) : "";
      const productId = source?.productId ? String(source.productId) : "";

      const applyWtUnit = (l: any) => {
        const fromUnit = normalizeWeightUnit(l.wtUnit);
        if (fromUnit === nextUnit) return { ...l, wtUnit: nextUnit };
        const hasWeight =
          l.weight != null && String(l.weight).trim() !== "";
        return {
          ...l,
          wtUnit: nextUnit,
          weight: hasWeight
            ? String(convertWeightValue(l.weight, fromUnit, nextUnit))
            : l.weight,
        };
      };

      if (!orderId || !productId) {
        uStop(sid, (s: any) => ({
          ...s,
          lines: (s.lines || []).map((l: any) =>
            String(l.id) === String(lid) ? applyWtUnit(l) : l,
          ),
        }));
        return;
      }

      const updated = stops.map((s: any) => ({
        ...s,
        lines: (s.lines || []).map((l: any) => {
          if (String(l.id) === String(lid)) return applyWtUnit(l);
          if (
            String(l.orderId || "") === orderId &&
            String(l.productId || "") === productId
          ) {
            return applyWtUnit(l);
          }
          return l;
        }),
      }));
      setFieldValue("stops", updated);
    },
    [setFieldValue, stops, uStop],
  );

  /** Qty edits stay independent of weight (no auto-ratio). */
  const setLineQty = useCallback(
    (sid: string, lid: string, qty: string) => {
      setLF(sid, lid, "qty", qty);
    },
    [setLF],
  );

  const setLineAction = useCallback(
    async (sid: string, lid: string, action: "pickup" | "dropoff") => {
      const stop = stops.find((s: any) => s.id === sid);
      const line = stop?.lines?.find((l: any) => l.id === lid);
      if (!line?.orderId || !line?.productId) {
        setLF(sid, lid, "action", action);
        return;
      }

      const order =
        orderDetailsById[line.orderId] ||
        (await fetchOrderDetail(line.orderId));
      if (!order) {
        setLF(sid, lid, "action", action);
        return;
      }
      setOrderDetailsById((prev) => ({ ...prev, [line.orderId]: order }));

      const orderLine = findOrderLineForProduct(order, line.productId);
      if (!orderLine) {
        setLF(sid, lid, "action", action);
        return;
      }

      const orderId = String(line.orderId);
      const productId = String(line.productId);
      const { qty, weight, unit, wtUnit } = computeCargoLineQtyWeight({
        stops,
        lineId: lid,
        orderId,
        productId,
        action,
        orderLine,
        lineUnit: line.unit,
        lineWtUnit: line.wtUnit,
      });

      const patch = { action, qty, weight, unit, wtUnit };
      const updated = stops.map((s: any) => ({
        ...s,
        lines: (s.lines || []).map((l: any) => {
          if (String(l.id) === String(lid)) return { ...l, ...patch };
          if (
            String(l.orderId || "") === orderId &&
            String(l.productId || "") === productId
          ) {
            return { ...l, unit, wtUnit };
          }
          return l;
        }),
      }));
      setFieldValue("stops", updated);
    },
    [fetchOrderDetail, orderDetailsById, setFieldValue, setLF, stops],
  );

  const quickFill = useCallback(
    async (sid: string, orderId: string) => {
      const mo = orderDetailsById[orderId] || (await fetchOrderDetail(orderId));
      if (!mo) {
        showToast(
          t("createLoadOrderLoadError") || "Could not load order details.",
          "error",
        );
        return;
      }
      setOrderDetailsById((prev) => ({ ...prev, [orderId]: mo }));
      if (!mo.lines?.length) return;

      const stopIndex = stops.findIndex((s: any) => s.id === sid);
      const defaultAction =
        stopIndex === stops.length - 1 && stops.length > 1
          ? "dropoff"
          : "pickup";

      const newLines = mo.lines.map((ln) => ({
        id: makeId("l"),
        productId: ln.productSkuId ? String(ln.productSkuId) : "",
        productName: ln.productName || "",
        customerId: mo.companyEntityId ? String(mo.companyEntityId) : "",
        customerName: mo.customerName || "",
        orderId: mo.id,
        orderRef: mo.orderReference,
        orderLineId: ln.id != null ? String(ln.id) : "",
        action: defaultAction as "pickup" | "dropoff",
        qty: ln.quantity != null ? String(ln.quantity) : "",
        unit: normalizeQtyUnit(ln.unit) || "EUR Pallets",
        weight: ln.weight != null ? String(ln.weight) : "",
        wtUnit: normalizeWeightUnit(ln.weightUnit),
        mirrorOf: "",
      }));
      uStop(sid, (s: any) => ({
        ...s,
        lines: [...s.lines.filter((l: any) => l.productId), ...newLines],
      }));
    },
    [fetchOrderDetail, orderDetailsById, showToast, stops, t, uStop],
  );

  // ═══ OPTIONS ═══
  const ordOpts = useMemo(() => orderOptions, [orderOptions]);

  // ═══ HANDLERS ═══
  const applyLocationToStop = useCallback(
    (sid: string, l: LocationItem) => {
      uStop(sid, (s: any) => {
        const updatedStop = {
          ...s,
          locationId: String(l.id),
          locationName: l.name,
          locationCompany: l.company || "",
          locationCity: l.city || "",
          locationCountry: l.region || "",
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
    },
    [uStop],
  );

  const selLoc = useCallback(
    (sid: string, lid: string) => {
      const l = abLocs.find((x) => String(x.id) === String(lid));
      if (l) applyLocationToStop(sid, l);
    },
    [abLocs, applyLocationToStop],
  );

  const handleApplyCompany = useCallback(
    async (values: CompanyFormData) => {
      try {
        setCompanySaving(true);
        const created = await addressBookService.createCompanyEntity({
          name: values.name.trim(),
          vat_number: values.vat.trim(),
          address: values.address.trim(),
          country: values.country.trim() || "Greece",
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
            company_vat: created.vat_number || "",
          },
        ]);
        setCreateData((prev) => ({
          ...prev,
          company: created.name,
          companyVat: created.vat_number || "",
        }));
        setIsCompanyOpen(false);
        showToast(
          t("erpOrdersCompanyCreated") || "Company created successfully.",
          "success",
        );
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : t("erpOrdersCompanyCreateError") || "Failed to create company";
        showToast(message, "error");
      } finally {
        setCompanySaving(false);
      }
    },
    [showToast, t],
  );

  const submitNewLocation = useCallback(async () => {
    const payload: CreateLocationData = {
      ...createData,
      company:
        createData.context === "customer" ? createData.company : "My Company",
      companyVat:
        createData.context === "customer"
          ? createData.companyVat
          : createData.companyVat || "N/A",
      contacts: [],
      amenityIds: [],
      equipment: [],
      hours: "",
      tags: "",
    };

    const errors = validateCreateAll(payload);
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      showToast(errors[firstKey] ?? "Please fix validation errors", "error");
      if (firstKey === "companyEntity" || firstKey === "type") setCreateStep(1);
      else if (["name", "address", "city", "postal", "role"].includes(firstKey))
        setCreateStep(2);
      else setCreateStep(3);
      return;
    }

    try {
      setSavingLocation(true);
      const isDuplicate = await checkLocationDuplicate(
        payload.name,
        payload.company,
      );
      if (isDuplicate) {
        showToast(DUPLICATE_LOCATION_MESSAGE, "error");
        setCreateStep(4);
        return;
      }

      const created = await addressBookService.createLocation(payload);

      setAbLocs((prev) => {
        const id = String(created.id);
        if (prev.some((x) => String(x.id) === id)) {
          return prev.map((x) => (String(x.id) === id ? created : x));
        }
        return [...prev, created];
      });

      if (pCtx.orderFormTarget === "origin") {
        setErpOrderForm((f) => ({
          ...f,
          originLocationId: Number(created.id),
        }));
        setPCtx((p: any) => ({ ...p, orderFormTarget: null }));
      } else if (pCtx.orderFormTarget === "dest") {
        setErpOrderForm((f) => ({ ...f, destLocationId: Number(created.id) }));
        setPCtx((p: any) => ({ ...p, orderFormTarget: null }));
      } else if (pCtx.locS) {
        applyLocationToStop(pCtx.locS, created);
        setPCtx((p: any) => ({ ...p, locS: null }));
      }

      void refreshLocationsFromApi(true);
      setMLoc(false);
      showToast(
        t("erpOrdersLocationCreated") || "Address created successfully.",
        "success",
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t("erpOrdersLocationCreateError") || "Failed to create address.";
      showToast(message, "error");
    } finally {
      setSavingLocation(false);
    }
  }, [
    applyLocationToStop,
    createData,
    showToast,
    t,
    pCtx,
    refreshLocationsFromApi,
  ]);

  const selOrdLine = useCallback(
    async (sid: string, lid: string, oid: string) => {
      if (!oid) {
        setLF(sid, lid, clearOrderDependentCargoFields());
        return;
      }
      setOrderLoadingLineId(lid);
      try {
        const detail = await fetchOrderDetail(oid, { force: true });
        if (detail) {
          setOrderDetailsById((prev) => ({ ...prev, [oid]: detail }));
          const blank = clearOrderDependentCargoFields();
          setLF(sid, lid, {
            ...blank,
            orderId: oid,
            orderRef: detail.orderReference,
            customerName: detail.customerName || "",
            customerId: detail.companyEntityId
              ? String(detail.companyEntityId)
              : "",
          });
          return;
        }
        showToast(
          t("createLoadOrderLoadError") || "Could not load order details.",
          "error",
        );
        setLF(sid, lid, clearOrderDependentCargoFields());
      } finally {
        setOrderLoadingLineId(null);
      }
    },
    [fetchOrderDetail, setLF, showToast, t],
  );

  const clearOrderLine = useCallback(
    (sid: string, lid: string) => {
      setLF(sid, lid, clearOrderDependentCargoFields());
    },
    [setLF],
  );

  const handleCreateOrder = useCallback(
    async (values: ErpOrderFormState) => {
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
        setOrderDetailsById((prev) => ({ ...prev, [created.id]: created }));

        if (pCtx.ordS && pCtx.ordL) {
          setLF(pCtx.ordS, pCtx.ordL, {
            orderId: created.id,
            orderRef: created.orderReference,
            customerName: created.customerName,
            customerId: created.companyEntityId
              ? String(created.companyEntityId)
              : "",
            productId: "",
            productName: "",
            qty: "",
            weight: "",
          });
          setPCtx((p: any) => ({ ...p, ordS: null, ordL: null }));
        }

        setMOrd(false);
        setErpOrderForm(EMPTY_ORDER_FORM);
        showToast(
          t("erpOrdersCreateSuccess") || "Order created successfully.",
          "success",
        );
      } catch (err) {
        const message =
          err instanceof ApiError
            ? getApiErrorMessage(
                err,
                t("erpOrdersCreateError") || "Failed to create order",
                t,
              )
            : t("erpOrdersCreateError") || "Failed to create order";
        showToast(message, "error");
      } finally {
        setErpOrderSaving(false);
      }
    },
    [addOrder, pCtx, setLF, showToast, t],
  );

  const selProdLine = useCallback(
    async (sid: string, lid: string, skuId: string) => {
      const stop = stops.find((s: any) => s.id === sid);
      const line = stop?.lines?.find((l: any) => l.id === lid);
      const order = line?.orderId
        ? orderDetailsById[line.orderId] ||
          (await fetchOrderDetail(line.orderId))
        : null;
      if (order && line?.orderId) {
        setOrderDetailsById((prev) => ({ ...prev, [line.orderId]: order }));
      }
      const orderLine = findOrderLineForProduct(order, skuId);
      if (orderLine) {
        const isDropoff = line?.action === "dropoff";
        const { qty, weight, unit: orderUnit, wtUnit: orderWtUnit } =
          computeCargoLineQtyWeight({
            stops,
            lineId: lid,
            orderId: line?.orderId ? String(line.orderId) : "",
            productId: skuId,
            action: isDropoff ? "dropoff" : "pickup",
            orderLine,
            lineUnit: line?.unit,
            lineWtUnit: line?.wtUnit,
          });

        const patch = {
          productId: skuId,
          productName: orderLine.productName || "",
          orderLineId: orderLine.id != null ? String(orderLine.id) : "",
          qty,
          unit: orderUnit,
          weight,
          wtUnit: orderWtUnit,
        };

        const orderId = line?.orderId ? String(line.orderId) : "";
        if (orderId) {
          const updated = stops.map((s: any) => ({
            ...s,
            lines: (s.lines || []).map((l: any) => {
              if (String(l.id) === String(lid)) return { ...l, ...patch };
              if (
                String(l.orderId || "") === orderId &&
                String(l.productId || "") === String(skuId)
              ) {
                return { ...l, unit: orderUnit, wtUnit: orderWtUnit };
              }
              return l;
            }),
          }));
          setFieldValue("stops", updated);
          return;
        }

        setLF(sid, lid, patch);
      }
    },
    [fetchOrderDetail, orderDetailsById, setFieldValue, setLF, stops],
  );

  const handleCreateSku = useCallback(
    async (values: any) => {
      try {
        setSkuSaving(true);

        const cargoLine =
          pCtx.pS && pCtx.pL
            ? stops
                .find((s: any) => s.id === pCtx.pS)
                ?.lines?.find((l: any) => l.id === pCtx.pL)
            : undefined;

        const orderContext = cargoLine?.orderId
          ? {
              erpOrderId: cargoLine.orderId,
              orderLineId: cargoLine.orderLineId || undefined,
            }
          : undefined;

        const created = await productMasterService.createSku(
          values,
          orderContext,
        );
        await refreshSkusFromApi(true);

        if (
          pCtx.orderFormTarget === "product" &&
          pCtx.orderFormLineIndex !== undefined
        ) {
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
          setPCtx((p: any) => ({
            ...p,
            orderFormTarget: null,
            orderFormLineIndex: null,
          }));
        } else if (pCtx.pS && pCtx.pL && cargoLine) {
          const sid = pCtx.pS;
          const lid = pCtx.pL;
          const linkedLine = created.linkedOrderLine;

          if (cargoLine.orderId) {
            const refreshed = await fetchOrderDetail(cargoLine.orderId, {
              force: true,
            });
            if (refreshed) {
              addOrder(refreshed);
              setOrderDetailsById((prev) => ({
                ...prev,
                [cargoLine.orderId]: refreshed,
              }));
            }
          }

          setLF(sid, lid, {
            orderLineId: linkedLine
              ? linkedLine.id
              : cargoLine.orderLineId || "",
            productId: String(created.id),
            productName: linkedLine?.productName || created.name,
            qty:
              linkedLine?.quantity != null
                ? String(linkedLine.quantity)
                : cargoLine.qty || "",
            unit:
              normalizeQtyUnit(linkedLine?.unit || cargoLine.unit) ||
              "EUR Pallets",
            weight:
              linkedLine?.weight != null
                ? String(linkedLine.weight)
                : cargoLine.weight || "",
            wtUnit: normalizeWeightUnit(
              linkedLine?.weightUnit || cargoLine.wtUnit,
            ),
          });
          setPCtx((p: any) => ({ ...p, pS: null, pL: null }));
        }
        setMSku(false);
        showToast(
          t("erpOrdersProductCreated") || "Product created successfully.",
          "success",
        );
      } catch {
        showToast(
          t("erpOrdersProductCreateError") || "Failed to create product",
          "error",
        );
      } finally {
        setSkuSaving(false);
      }
    },
    [addOrder, fetchOrderDetail, pCtx, refreshSkusFromApi, setLF, showToast, stops, t],
  );

  const previewLocation = useCallback(
    (locId: string) => {
      const l = abLocs.find((x) => String(x.id) === String(locId));
      if (l) setPreviewLoc(l);
    },
    [abLocs],
  );

  const handlePreviewCopy = useCallback(
    (text: string, message: string) => {
      navigator.clipboard?.writeText(text);
      showToast(message, "success");
    },
    [showToast],
  );

  // ═══ GOODS TYPE INDICATORS ═══
  const getGoodsIndicators = useCallback(
    (productId: string) => {
      const sku = pmSkus.find((s) => s.id === productId);
      if (!sku) return [];
      const ind = [];
      if (sku.adrRequired)
        ind.push({ key: "adr", label: "ADR", color: "#DC2626", bg: "#FEE2E2" });
      if (sku.tempRequired)
        ind.push({
          key: "temp",
          label: sku.tempValue || "Temp",
          color: "#2563EB",
          bg: "#DBEAFE",
        });
      if (!sku.stackable)
        ind.push({
          key: "frag",
          label: "Fragile",
          color: "#D97706",
          bg: "#FEF3C7",
        });
      return ind;
    },
    [pmSkus],
  );

  // ═══ LOAD BALANCE + VALIDATION ═══
  const bal = useMemo(() => computeLoadBalance(stops), [stops]);

  const fmtW = (kg: number) => formatWeightKgTotal(kg);

  // ═══ CONFLICT CHECKING ═══
  const {
    blockers,
    warnings,
    all: allConflicts,
  } = useConflicts(stops, {
    locations: abLocs,
    loadingPoints: [],
    blackouts: [],
    products: pmSkus,
    orders: apiOrders,
    orderDetailsById,
    templates: [],
    rules: [],
    t,
  });

  const canContinue = blockers.length === 0;
  const [conflictPopup, setConflictPopup] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [validatingStopIndex, setValidatingStopIndex] = useState<number | null>(
    null,
  );

  const conflictCount = useMemo(() => {
    if (!showAll) return 0;
    return blockers.length + warnings.length;
  }, [blockers, warnings, showAll]);

  const expandStopForValidation = useCallback(
    (stopIndex: number) => {
      const stop = stops[stopIndex];
      if (!stop || stop.expanded) return;
      uStop(stop.id, { expanded: true });
    },
    [stops, uStop],
  );

  const showValidationForStop = useCallback(
    (stopIndex: number) => showAll || validatingStopIndex === stopIndex,
    [showAll, validatingStopIndex],
  );

  const toggleStop = useCallback(
    (sid: string) => {
      setFieldValue(
        "stops",
        stops.map((s: any) =>
          s.id === sid ? { ...s, expanded: !s.expanded } : s,
        ),
      );
    },
    [setFieldValue, stops],
  );

  const handleStopDone = useCallback(
    (sid: string) => {
      const idx = stops.findIndex((s: any) => s.id === sid);
      const stop = stops[idx];
      if (!stop?.expanded) return;

      setValidatingStopIndex(idx);
      const stopBlockers = getStopDoneBlockers(blockers, idx);
      if (stopBlockers.length > 0) {
        focusFirstConflict(stopBlockers, expandStopForValidation);
        return;
      }

      setValidatingStopIndex(null);
      setFieldValue(
        "stops",
        stops.map((s: any) => (s.id === sid ? { ...s, expanded: false } : s)),
      );
    },
    [blockers, expandStopForValidation, setFieldValue, stops],
  );

  const isFieldInvalid = useCallback(
    (anchor: string, stopIndex: number) =>
      showValidationForStop(stopIndex) &&
      getBlockersForAnchor(blockers, anchor).length > 0,
    [blockers, showValidationForStop],
  );

  const invalidFieldClass = (anchor: string, stopIndex: number) =>
    isFieldInvalid(anchor, stopIndex) ? "wizard-field-invalid" : "";

  useEffect(() => {
    if (!validationRequest) return;
    setShowAll(true);
    setValidatingStopIndex(null);
    if (blockers.length > 0) {
      focusFirstConflict(blockers, expandStopForValidation);
    }
  }, [validationRequest]);

  const handleContinue = useCallback(async () => {
    setShowAll(true);
    setValidatingStopIndex(null);
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
    setShowAll(true);
    try {
      await onSaveDraft();
      setLastSaved(new Date());
    } catch {
      // Error toast handled by parent
    }
  }, [onSaveDraft, setShowAll]);

  const stopConflicts = useCallback(
    (idx: number) => {
      if (!showValidationForStop(idx)) return [];
      return allConflicts.filter((c) => c.stopIndex === idx);
    },
    [allConflicts, showValidationForStop],
  );

  return (
    <div className="pb-24">
      {ordersError && (
        <div className="wizard-validation-banner mb-4" role="alert">
          {t("createLoadOrdersLoadError") || "Could not load orders."}{" "}
          {ordersError}
        </div>
      )}

      <LoadBalanceBar
        bal={bal}
        balExp={balExp}
        setBalExp={setBalExp}
        fmtW={fmtW}
        T={T}
        t={t}
      />

      {/* ═══ TIMELINE ═══ */}
      <div className="relative" style={{ paddingLeft: 18 }}>
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: 37,
            width: 2,
            background: T.bd,
            borderRadius: 1,
            zIndex: 0,
          }}
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
              <div
                className="shrink-0"
                style={{ position: "relative", zIndex: 1 }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-grab"
                  draggable
                  onDragStart={(e) => handleDragStart(idx, e)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: stop.expanded ? T.ac : T.sf,
                    color: stop.expanded ? "#fff" : T.t3,
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
                      outline:
                        dragOverIdx === idx ? `2px solid ${T.ac}` : "none",
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
                      style={{ cursor: "grab", display: "flex", flexShrink: 0 }}
                    >
                      <GripVertical size={14} style={{ color: T.t3 }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      {stop.locationName ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <MapPin
                            size={14}
                            style={{ color: T.t3, flexShrink: 0 }}
                          />
                          <span
                            className="text-sm font-semibold"
                            style={{ color: T.t1 }}
                          >
                            {stop.locationName}
                          </span>
                          {stop.locationCompany && (
                            <span
                              className="text-[11px]"
                              style={{ color: T.t3 }}
                            >
                              {stop.locationCompany} · {stop.locationCity}
                            </span>
                          )}
                          {getStopTags(stop).map((tg) => (
                            <span
                              key={tg}
                              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                              style={{
                                background:
                                  tg === "pickup" ? "#EFF6FF" : "#F3F0FF",
                                color: tg === "pickup" ? "#2563EB" : "#5E3BEE",
                              }}
                            >
                              {t(tg) || tg}
                            </span>
                          ))}
                          <span
                            className="text-[11px] hidden sm:inline"
                            style={{ color: T.t3 }}
                          >
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
                    <ChevronRight
                      size={16}
                      style={{ color: T.t3, flexShrink: 0 }}
                    />
                  </div>
                ) : (
                  /* Expanded Card */
                  <div
                    className="rounded-xl overflow-visible"
                    style={{
                      background: T.sf,
                      border: `1px solid ${T.bd}`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      outline:
                        dragOverIdx === idx ? `2px solid ${T.ac}` : "none",
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
                        style={{ cursor: "grab", display: "flex" }}
                      >
                        <GripVertical size={14} style={{ color: T.t3 }} />
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: T.t1 }}
                      >
                        Stop {idx + 1}
                      </span>
                      {getStopTags(stop).map((tg) => (
                        <span
                          key={tg}
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: tg === "pickup" ? "#EFF6FF" : "#F3F0FF",
                            color: tg === "pickup" ? "#2563EB" : "#5E3BEE",
                          }}
                        >
                          {t(tg) || tg}
                        </span>
                      ))}
                      <div className="flex-1" />
                      {stop.contactName && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 shrink-0"
                          style={{ background: T.sa, color: T.t2 }}
                        >
                          <Phone size={10} />
                          {stop.contactName}
                        </span>
                      )}
                      <ChevronDown
                        size={16}
                        style={{ color: T.t3, flexShrink: 0 }}
                      />
                    </div>

                    {/* Location + Appointment */}
                    <div
                      className="p-4"
                      style={{ borderBottom: `1px solid ${T.bd}` }}
                    >
                      {/* Location Select */}
                      <div className="mb-3">
                        <label
                          className="block text-[11px] font-semibold mb-1 uppercase tracking-wide"
                          style={{ color: T.t3 }}
                        >
                          Location
                        </label>
                        <div
                          className="flex items-center gap-1"
                          data-validation-anchor={`stop-${idx}-location`}
                        >
                          <div className="flex-1 min-w-0">
                            <LocationSelect
                              locations={abLocs}
                              value={stop.locationId}
                              onChange={(lid) => selLoc(stop.id, lid)}
                              onCreateNew={() => {
                                setPCtx((p: any) => ({ ...p, locS: stop.id }));
                                setCreateStep(1);
                                setCreateData({
                                  ...EMPTY_CREATE_DATA,
                                  context: "my",
                                  role:
                                    idx === 0
                                      ? "pickup"
                                      : idx === stops.length - 1
                                        ? "delivery"
                                        : "both",
                                });
                                setMLoc(true);
                              }}
                              onPreview={(loc) => previewLocation(loc.id)}
                              invalid={isFieldInvalid(
                                `stop-${idx}-location`,
                                idx,
                              )}
                            />
                          </div>
                          {stop.locationId && (
                            <button
                              type="button"
                              className="w-7 h-7 rounded flex items-center justify-center cursor-pointer border-none shrink-0"
                              style={{ background: "transparent", color: T.t3 }}
                              title={
                                t("createLoadViewLocation") || "View location"
                              }
                              onClick={() => previewLocation(stop.locationId)}
                            >
                              <Eye size={15} />
                            </button>
                          )}
                        </div>
                        <FieldValidationHint
                          conflicts={getBlockersForAnchor(
                            blockers,
                            `stop-${idx}-location`,
                          )}
                          show={showValidationForStop(idx)}
                          t={t}
                        />
                      </div>

                      {/* Appointment Row — Fixed Time only */}
                      <div
                        className="flex items-end gap-2 flex-wrap"
                        data-validation-anchor={`stop-${idx}-date`}
                      >
                        <div>
                          <label
                            className="block text-[11px] font-semibold mb-1 uppercase tracking-wide"
                            style={{ color: T.t3 }}
                          >
                            From
                          </label>
                          <div className="flex gap-1 items-center">
                            <DatePicker
                              className="cs-stop-date-picker"
                              value={stop.dateFrom}
                              onChange={(val) =>
                                uStop(stop.id, { dateFrom: val })
                              }
                              min={todayStr}
                              hasError={isFieldInvalid(`stop-${idx}-date`, idx)}
                              direction="auto"
                            />
                            <TimePicker
                              className={invalidFieldClass(
                                `stop-${idx}-date`,
                                idx,
                              )}
                              style={{ ...iS, width: 90 }}
                              value={stop.timeFrom}
                              onChange={(val) =>
                                uStop(stop.id, { timeFrom: val })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <label
                              className="text-[11px] font-semibold uppercase tracking-wide"
                              style={{ color: T.t3 }}
                            >
                              To (Optional)
                            </label>
                          </div>
                          <div className="flex gap-1 items-center">
                            <DatePicker
                              className="cs-stop-date-picker"
                              value={stop.dateTo}
                              onChange={(val) =>
                                uStop(stop.id, { dateTo: val })
                              }
                              min={stop.dateFrom || todayStr}
                              direction="auto"
                            />
                            <TimePicker
                              style={{ ...iS, width: 90 }}
                              value={stop.timeTo}
                              onChange={(val) =>
                                uStop(stop.id, { timeTo: val })
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <FieldValidationHint
                        conflicts={getBlockersForAnchor(
                          blockers,
                          `stop-${idx}-date`,
                        )}
                        show={showValidationForStop(idx)}
                        t={t}
                      />
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
                        allStops={stops}
                        onClearOrder={(lid) => clearOrderLine(stop.id, lid)}
                        onAddLine={() => addLine(stop.id)}
                        onDelLine={(lid) => delLine(stop.id, lid)}
                        onDupLine={(lid) => dupLine(stop.id, lid)}
                        onSetField={(lid, f, v) => {
                          if (f === "unit") {
                            setLineUnit(stop.id, lid, v);
                            return;
                          }
                          if (f === "wtUnit") {
                            setLineWtUnit(stop.id, lid, v);
                            return;
                          }
                          if (f === "qty") {
                            setLineQty(stop.id, lid, v);
                            return;
                          }
                          if (f === "action") {
                            setLineAction(stop.id, lid, v);
                            return;
                          }
                          setLF(stop.id, lid, f, v);
                        }}
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
                        showValidation={showValidationForStop(idx)}
                        blockers={blockers}
                        stopIndex={idx}
                        orderLoadingLineId={orderLoadingLineId}
                        ordersLoading={ordersLoading}
                      />
                    </div>

                    {/* Footer Checkmark actions */}
                    <div className="flex justify-end items-center gap-2 px-4 pb-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none text-white"
                        style={{ background: "#2563EB", fontFamily: "inherit" }}
                        onClick={() => handleStopDone(stop.id)}
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
                          style={{ background: "transparent", color: T.t3 }}
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
        <div
          className="flex items-center gap-3 py-2 relative"
          style={{ zIndex: 1 }}
        >
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer border-none transition-colors"
            style={{
              background: T.sf,
              border: `2px dashed ${T.bd}`,
              color: T.ac,
            }}
            onClick={addStop}
          >
            <Plus size={16} />
          </button>
          <span
            className="text-xs font-semibold cursor-pointer"
            style={{ color: T.ac }}
            onClick={addStop}
          >
            Add Stop
          </span>
        </div>
      </div>

      {/* Footer controls mirroring BottomBar */}
      <footer
        className="wizard-footer-bar fixed bottom-0 right-0 h-[72px] items-center justify-between px-6 z-40 flex"
        style={{
          background: T.sf,
          borderTop: `1px solid ${T.bd}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            style={{
              border: `1px solid ${T.bd}`,
              background: T.sf,
              color: T.ac,
              fontFamily: "inherit",
            }}
            onClick={handleSaveDraftClick}
            disabled={isSaving}
          >
            <Save size={14} />{" "}
            {isSaving
              ? t("saving") || "Saving..."
              : t("saveDraft") || "Save Draft"}
          </button>
          {lastSaved && (
            <span className="text-[10px]" style={{ color: T.t3 }}>
              {t("draftSavedAt") || "Draft saved"}{" "}
              {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white border-none"
            style={{
              background: canContinue ? T.ac : T.bf,
              cursor: canContinue ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
            disabled={!canContinue || isSaving}
            onClick={handleContinue}
          >
            {isSaving ? t("saving") || "Saving..." : t("continue")}
            {conflictCount > 0 && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: blockers.length > 0 ? "#DC2626" : "#D97706",
                  color: "#fff",
                }}
              >
                {conflictCount}
              </span>
            )}
            <ArrowRight size={14} />
          </button>
        </div>
      </footer>

      {previewLoc && (
        <LocationPreviewOverlay
          location={previewLoc}
          onClose={() => setPreviewLoc(null)}
          t={t}
          onCopy={handlePreviewCopy}
        />
      )}

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
          setAbLocs((prev) => {
            const id = String(loc.id);
            if (prev.some((x) => String(x.id) === id)) return prev;
            return [...prev, loc];
          });
          if (pCtx.locS) {
            applyLocationToStop(pCtx.locS, loc);
            setPCtx((p: any) => ({ ...p, locS: null }));
          }
          setMLoc(false);
        }}
        saving={savingLocation}
        filteredCompanies={filteredCompanies}
        setCompanyQuery={setCompanyQuery}
        setIsCompanyOpen={setIsCompanyOpen}
        handleApplyTemplate={(tpl) =>
          setCreateData((prev) => applyAddressTemplate(tpl, prev))
        }
        t={t}
      />

      <CreateCompanyModal
        isCompanyOpen={isCompanyOpen}
        closeCompanyModal={() => setIsCompanyOpen(false)}
        companyData={companyData}
        setCompanyData={setCompanyData}
        handleApplyCompany={handleApplyCompany}
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
          setPCtx((p: any) => ({ ...p, orderFormTarget: "origin" }));
          setCreateStep(1);
          setCreateData({
            ...EMPTY_CREATE_DATA,
            context: "my",
            role: "pickup",
          });
          setMLoc(true);
        }}
        onAddLocationDest={() => {
          setPCtx((p: any) => ({ ...p, orderFormTarget: "dest" }));
          setCreateStep(1);
          setCreateData({
            ...EMPTY_CREATE_DATA,
            context: "my",
            role: "delivery",
          });
          setMLoc(true);
        }}
        onAddProduct={(index) => {
          setPCtx((p: any) => ({
            ...p,
            orderFormTarget: "product",
            orderFormLineIndex: index,
          }));
          setMSku(true);
        }}
      />

      <ProductMasterSkuModal
        isOpen={mSku}
        onClose={() => setMSku(false)}
        onSubmit={handleCreateSku}
        saving={skuSaving}
      />

      {/* Conflict summary dialog */}
      {conflictPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setConflictPopup(false)}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{
              width: 480,
              maxHeight: "80vh",
              background: T.sf,
              border: `1px solid ${T.bd}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: `1px solid ${T.bd}` }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: "#D97706" }} />
                <span className="text-sm font-semibold" style={{ color: T.t1 }}>
                  {t("validationWarningsTitle", { count: warnings.length })}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: T.t3 }}>
                {t("validationReviewBeforeProceed")}
              </span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
              {warnings.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-5 py-3"
                  style={{ borderBottom: `0.5px solid ${T.bd}` }}
                >
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ background: "#FEF3C7", color: "#D97706" }}
                  >
                    {c.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: T.t1 }}
                    >
                      {translateConflict(c, t)}
                    </div>
                    {c.stopIndex >= 0 && (
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: T.t3 }}
                      >
                        Stop {c.stopIndex + 1}
                        {stops[c.stopIndex]?.locationName
                          ? ` — ${stops[c.stopIndex].locationName}`
                          : ""}
                      </div>
                    )}
                    <div className="text-[10px] mt-0.5" style={{ color: T.ac }}>
                      {translateResolution(c, t)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: `1px solid ${T.bd}`, background: T.sa }}
            >
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border"
                style={{
                  borderColor: T.bd,
                  background: T.sf,
                  color: T.t2,
                  fontFamily: "inherit",
                }}
                onClick={() => setConflictPopup(false)}
              >
                {t("validationGoBackAndFix")}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer text-white border-none"
                style={{ background: T.ac, fontFamily: "inherit" }}
                onClick={handleProceedAnyway}
              >
                {t("validationProceedAnyway")} →
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
        title={t("deleteStopTitle") || "Delete Stop"}
        message={
          t("deleteStopMsg") ||
          "Are you sure you want to delete this stop and all its cargo lines?"
        }
        confirmText={t("deleteStopConfirm") || "Delete"}
        cancelText={t("deleteStopCancel") || "Cancel"}
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
  orderDetailsById: Record<
    string,
    import("../../pages/ErpOrders/types").ErpOrder
  >;
  allStops: any[];
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
  blockers?: import("../../hooks/useConflicts").Conflict[];
  stopIndex: number;
  orderLoadingLineId?: string | null;
  ordersLoading?: boolean;
}

const CargoTable: React.FC<CargoTableProps> = ({
  stop,
  T,
  t,
  iS,
  ordOpts,
  orderDetailsById,
  allStops,
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
  orderLoadingLineId = null,
  ordersLoading = false,
}) => {
  const thS: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: T.t3,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    padding: "5px 3px",
    borderBottom: `1px solid ${T.bd}`,
    textAlign: "left",
    whiteSpace: "nowrap",
  };
  const tdS: React.CSSProperties = {
    padding: "3px",
    borderBottom: `0.5px solid ${T.bd}`,
    verticalAlign: "middle",
  };
  const monoS = {
    ...iS,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: 12,
    textAlign: "right" as const,
    padding: "5px 6px",
    width: 56,
  };
  const selS = {
    ...iS,
    cursor: "pointer",
    fontSize: 11,
    padding: "5px 4px",
    width: 72,
  };
  const [qfOpen, setQfOpen] = useState(false);

  const isInvalid = (anchor: string) =>
    showValidation && getBlockersForAnchor(blockers, anchor).length > 0;

  const invalidClass = (anchor: string) =>
    isInvalid(anchor) ? "wizard-field-invalid" : "";

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, isLast: boolean) => {
      if (e.key === "Enter" && isLast) onAddLine();
    },
    [onAddLine],
  );

  return (
    <div
      className="rounded-lg overflow-visible"
      style={{ border: `1px solid ${T.bd}` }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr>
              <th style={{ ...thS, width: "12%" }}>{t("cargoColOrderId")}</th>
              <th style={{ ...thS, width: "12%" }}>{t("cargoColCustomer")}</th>
              <th style={{ ...thS, width: "20%" }}>{t("cargoColProduct")}</th>
              <th style={{ ...thS, width: "11%", textAlign: "center" }}>
                {t("cargoColAction")}
              </th>
              <th style={{ ...thS, width: "7%" }}>{t("cargoColQty")}</th>
              <th style={{ ...thS, width: "8%" }}>{t("cargoColUnit")}</th>
              <th style={{ ...thS, width: "7%" }}>{t("cargoColWeight")}</th>
              <th style={{ ...thS, width: "7%" }}>{t("cargoColWeightUnit")}</th>
              <th style={{ ...thS, width: "3%" }}></th>
            </tr>
          </thead>
          <tbody>
            {(stop.lines || []).map((ln: any, li: number) => {
              const indicators = getGoodsIndicators(ln.productId);
              const isLast = li === stop.lines.length - 1;
              const orderDetail = ln.orderId
                ? orderDetailsById[ln.orderId]
                : undefined;
              const productOpts = getProductOptionsForCargoLine(
                orderDetail,
              ).map((opt) => ({
                value: opt.value,
                label: opt.label,
                sublabel: opt.sublabel,
              }));
              // Ensure a selected product (e.g. one created at runtime that is not
              // part of the order's mapped lines) still appears and stays displayed.
              if (
                ln.productId &&
                !productOpts.some((o) => o.value === String(ln.productId))
              ) {
                productOpts.push({
                  value: String(ln.productId),
                  label: ln.productName || "Product",
                  sublabel: undefined,
                });
              }
              const unmappedCount = countUnmappedOrderLines(orderDetail);
              return (
                <tr
                  key={ln.id}
                  style={{ background: ln.mirrorOf ? T.sa : "transparent" }}
                >
                  <td
                    style={tdS}
                    data-validation-anchor={`stop-${stopIndex}-line-${li}-order`}
                  >
                    <OrderCell
                      ln={ln}
                      T={T}
                      t={t}
                      iS={iS}
                      ordOpts={ordOpts}
                      loading={ordersLoading || orderLoadingLineId === ln.id}
                      hasError={isInvalid(`stop-${stopIndex}-line-${li}-order`)}
                      onSelOrd={(v) => onSelOrd(ln.id, v)}
                      onClearOrder={() => onClearOrder(ln.id)}
                      onNewOrd={() => onNewOrd(ln.id)}
                    />
                    <FieldValidationHint
                      conflicts={getBlockersForAnchor(
                        blockers,
                        `stop-${stopIndex}-line-${li}-order`,
                      )}
                      show={showValidation}
                      t={t}
                    />
                  </td>
                  <td style={tdS}>
                    {ln.orderId && ln.customerName ? (
                      <div className="flex items-center gap-0.5">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded truncate"
                          style={{
                            background: T.sa,
                            color: T.t1,
                            maxWidth: 100,
                          }}
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
                        {ln.orderId ? "—" : t("createLoadSelectOrderFirst")}
                      </span>
                    )}
                  </td>
                  <td
                    style={tdS}
                    data-validation-anchor={`stop-${stopIndex}-line-${li}-product`}
                    className={invalidClass(
                      `stop-${stopIndex}-line-${li}-product`,
                    )}
                  >
                    <SearchableSelect
                      value={ln.productId}
                      onChange={(v) => onSelProd(ln.id, v)}
                      options={productOpts}
                      placeholder={
                        ln.orderId
                          ? t("selectProduct")
                          : t("createLoadSelectOrderFirst")
                      }
                      disabled={!ln.orderId}
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
                    {unmappedCount > 0 && productOpts.length === 0 && (
                      <div
                        className="text-[10px] mt-1"
                        style={{ color: "#D97706" }}
                      >
                        {t("createLoadUnmappedOrderLines") ||
                          `${unmappedCount} order line(s) have no mapped product SKU.`}
                      </div>
                    )}
                    <FieldValidationHint
                      conflicts={getBlockersForAnchor(
                        blockers,
                        `stop-${stopIndex}-line-${li}-product`,
                      )}
                      show={showValidation}
                      t={t}
                    />
                  </td>
                  <td style={{ ...tdS, textAlign: "center" }}>
                    <div
                      className="inline-flex overflow-hidden rounded"
                      style={{ border: `1px solid ${T.bd}` }}
                    >
                      <button
                        type="button"
                        className="py-1 px-2.5 text-[10px] font-semibold cursor-pointer border-none"
                        style={{
                          background: ln.action === "pickup" ? "#2563EB" : T.sf,
                          color: ln.action === "pickup" ? "#fff" : T.t3,
                          fontFamily: "inherit",
                        }}
                        onClick={() => onSetField(ln.id, "action", "pickup")}
                      >
                        Pick
                      </button>
                      <button
                        type="button"
                        className="py-1 px-2.5 text-[10px] font-semibold cursor-pointer border-none"
                        style={{
                          background:
                            ln.action === "dropoff" ? "#5E3BEE" : T.sf,
                          color: ln.action === "dropoff" ? "#fff" : T.t3,
                          fontFamily: "inherit",
                        }}
                        onClick={() => onSetField(ln.id, "action", "dropoff")}
                      >
                        Drop
                      </button>
                    </div>
                  </td>
                  <td
                    style={tdS}
                    data-validation-anchor={`stop-${stopIndex}-line-${li}-qty`}
                    className="wizard-table-field-cell"
                  >
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      style={
                        isInvalid(`stop-${stopIndex}-line-${li}-qty`)
                          ? {
                              ...monoS,
                              border: "1px solid #DC2626",
                              boxShadow: "0 0 0 1px #DC2626",
                            }
                          : monoS
                      }
                      value={ln.qty}
                      onChange={(e) => onSetField(ln.id, "qty", e.target.value)}
                    />
                    {(() => {
                      if (ln.action !== "pickup" || !ln.orderId || !ln.productId) return null;
                      const order = orderDetailsById[ln.orderId];
                      const orderLine = findOrderLineForProduct(order, ln.productId);
                      if (!orderLine || orderLine.quantity == null) return null;
                      const orderQty = Number(orderLine.quantity) || 0;
                      if (orderQty <= 0) return null;
                      const displayUnit =
                        normalizeQtyUnit(ln.unit || orderLine.unit) || "";
                      const allocated = getPickupAllocatedQty(
                        allStops,
                        String(ln.orderId),
                        String(ln.productId),
                        { unit: displayUnit },
                      );
                      return (
                        <div
                          className="text-[9px] mt-0.5"
                          title={`${formatQtyWithUnit(allocated, displayUnit)} / ${formatQtyWithUnit(orderQty, displayUnit)}`}
                          style={{
                            whiteSpace: "nowrap",
                            color:
                              allocated === orderQty
                                ? "#059669"
                                : allocated > orderQty
                                  ? "#DC2626"
                                  : T.t3,
                          }}
                        >
                          {formatQtyWithUnit(allocated)} /{" "}
                          {formatQtyWithUnit(orderQty)}
                        </div>
                      );
                    })()}
                    <FieldValidationHint
                      compact
                      conflicts={[
                        ...getBlockersForAnchor(
                          blockers,
                          `stop-${stopIndex}-line-${li}-qty`,
                        ),
                        ...getBlockersForAnchor(
                          blockers,
                          `stop-${stopIndex}-line-${li}-product`,
                        ).filter((c) => c.code === "C2"),
                      ]}
                      show={showValidation}
                      t={t}
                    />
                  </td>
                  <td style={tdS}>
                    <select
                      style={{ ...selS, width: 105 }}
                      value={normalizeQtyUnit(ln.unit) || ln.unit || "EUR Pallets"}
                      onChange={(e) =>
                        onSetField(ln.id, "unit", e.target.value)
                      }
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
                    className="wizard-table-field-cell"
                  >
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      style={
                        isInvalid(`stop-${stopIndex}-line-${li}-weight`)
                          ? {
                              ...monoS,
                              border: "1px solid #DC2626",
                              boxShadow: "0 0 0 1px #DC2626",
                            }
                          : monoS
                      }
                      value={ln.weight}
                      onChange={(e) =>
                        onSetField(ln.id, "weight", e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, isLast)}
                    />
                    {(() => {
                      if (ln.action !== "pickup" || !ln.orderId || !ln.productId)
                        return null;
                      const order = orderDetailsById[ln.orderId];
                      const orderLine = findOrderLineForProduct(
                        order,
                        ln.productId,
                      );
                      if (!orderLine || orderLine.weight == null) return null;
                      const orderWeight = Number(orderLine.weight) || 0;
                      if (orderWeight <= 0) return null;
                      const displayWtUnit = normalizeWeightUnit(
                        ln.wtUnit || orderLine.weightUnit,
                      );
                      const orderWeightDisplay = convertWeightValue(
                        orderWeight,
                        orderLine.weightUnit,
                        displayWtUnit,
                      );
                      const allocated = getPickupAllocatedWeight(
                        allStops,
                        String(ln.orderId),
                        String(ln.productId),
                        { displayUnit: displayWtUnit },
                      );
                      return (
                        <div
                          className="text-[9px] mt-0.5"
                          style={{
                            color:
                              Math.abs(allocated - orderWeightDisplay) < 0.01
                                ? "#059669"
                                : allocated > orderWeightDisplay
                                  ? "#DC2626"
                                  : T.t3,
                          }}
                        >
                          {formatWeightDisplay(allocated, displayWtUnit)} /{" "}
                          {formatWeightDisplay(
                            orderWeightDisplay,
                            displayWtUnit,
                          )}
                        </div>
                      );
                    })()}
                    <FieldValidationHint
                      compact
                      conflicts={getBlockersForAnchor(
                        blockers,
                        `stop-${stopIndex}-line-${li}-weight`,
                      )}
                      show={showValidation}
                      t={t}
                    />
                  </td>
                  <td style={tdS}>
                    <select
                      style={{ ...selS, width: 75 }}
                      value={normalizeWeightUnit(ln.wtUnit)}
                      onChange={(e) =>
                        onSetField(ln.id, "wtUnit", e.target.value)
                      }
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
                        style={{ background: "transparent", color: T.t3 }}
                        onClick={() => onDupLine(ln.id)}
                      >
                        <Copy size={10} />
                      </button>
                      <button
                        type="button"
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer border-none"
                        style={{ background: "transparent", color: T.t3 }}
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
              <td colSpan={9} style={{ padding: "4px 3px" }}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none py-1 px-1"
                    style={{
                      background: "transparent",
                      color: T.ac,
                      fontFamily: "inherit",
                    }}
                    onClick={onAddLine}
                  >
                    <Plus size={14} /> Add Line
                  </button>
                  <div style={{ width: qfOpen ? 220 : "auto" }}>
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
                        style={{
                          background: T.sa,
                          color: T.t2,
                          fontFamily: "inherit",
                        }}
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
                      style={{
                        background: "transparent",
                        color: T.t3,
                        fontFamily: "inherit",
                      }}
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
  loading?: boolean;
  hasError?: boolean;
  onSelOrd: (val: string) => void;
  onClearOrder: () => void;
  onNewOrd: () => void;
}

const OrderCell: React.FC<OrderCellProps> = ({
  ln,
  T,
  t,
  ordOpts,
  loading = false,
  hasError = false,
  onSelOrd,
  onClearOrder,
  onNewOrd,
}) => {
  if (loading && !ln.orderRef) {
    return (
      <span className="text-[10px]" style={{ color: T.t3 }}>
        {t("loading") || "Loading..."}
      </span>
    );
  }
  if (ln.orderRef) {
    return (
      <div className="flex items-center gap-0.5">
        <span
          className="text-[11px] font-medium truncate px-1.5 py-0.5 rounded"
          style={{
            background: T.sa,
            border: `1px solid ${T.bd}`,
            color: T.t1,
            maxWidth: 80,
          }}
        >
          {ln.orderRef}
        </span>
        <button
          type="button"
          className="border-none bg-transparent cursor-pointer p-0"
          style={{ color: T.t3 }}
          onClick={onClearOrder}
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
      hasError={hasError}
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

const LoadBalanceBar: React.FC<LoadBalanceBarProps> = ({
  bal,
  balExp,
  setBalExp,
  fmtW,
  T,
  t,
}) => {
  const hasData = bal.pkU > 0 || bal.doU > 0;
  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      data-validation-anchor="wizard-global"
      style={{ background: T.sf, border: `1px solid ${T.bd}` }}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
        onClick={() => hasData && setBalExp(!balExp)}
      >
        <span className="text-sm font-semibold" style={{ color: T.t1 }}>
          Load Balance
        </span>
        <div className="flex-1 mx-1">
          <div
            className="flex h-2 rounded-full overflow-hidden"
            style={{ background: T.sa }}
          >
            {hasData && (
              <>
                <div
                  style={{
                    width: "50%",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    className="transition-all duration-500"
                    style={{
                      width: `${bal.pkBar * 2}%`,
                      background: "#2563EB",
                      borderRadius: "4px 0 0 4px",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "50%",
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <div
                    className="transition-all duration-500"
                    style={{
                      width: `${bal.doBar * 2}%`,
                      background: "#5E3BEE",
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded"
          style={{ background: "#EFF6FF", color: "#2563EB" }}
        >
          ↑ {bal.pkU} · {fmtW(bal.pkW)}
        </span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded"
          style={{ background: "#F3F0FF", color: "#5E3BEE" }}
        >
          ↓ {bal.doU} · {fmtW(bal.doW)}
        </span>
        {bal.balanced && hasData && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: "#D1FAE5", color: "#059669" }}
          >
            ✓ Balanced
          </span>
        )}
        <ChevronDown
          size={14}
          style={{
            color: T.t3,
            transition: "transform 0.2s",
            transform: balExp ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </div>
      {balExp && hasData && (
        <div className="px-4 pb-3" style={{ borderTop: `1px solid ${T.bd}` }}>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div
                className="flex items-center gap-1.5 mb-1 text-xs font-bold"
                style={{ color: "#2563EB" }}
              >
                <ArrowUp size={13} />
                Total Pickup
              </div>
              <div className="text-lg font-bold" style={{ color: T.t1 }}>
                {bal.pkU}{" "}
                <span className="text-xs font-normal" style={{ color: T.t3 }}>
                  units
                </span>
              </div>
              <div className="text-sm font-semibold" style={{ color: T.t2 }}>
                {fmtW(bal.pkW)}
              </div>
            </div>
            <div>
              <div
                className="flex items-center gap-1.5 mb-1 text-xs font-bold"
                style={{ color: "#5E3BEE" }}
              >
                <ArrowDown size={13} />
                Total Dropoff
              </div>
              <div className="text-lg font-bold" style={{ color: T.t1 }}>
                {bal.doU}{" "}
                <span className="text-xs font-normal" style={{ color: T.t3 }}>
                  units
                </span>
              </div>
              <div className="text-sm font-semibold" style={{ color: T.t2 }}>
                {fmtW(bal.doW)}
              </div>
            </div>
          </div>
          {Object.keys(bal.byP).length > 0 && (
            <div
              className="mt-3 pt-3"
              style={{ borderTop: `1px solid ${T.bd}` }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: T.t3 }}
              >
                Per Product
              </div>
              {Object.entries(bal.byP).map(([nm, v]: [string, any]) => {
                const label = nm.includes("||") ? nm.split("||")[0] : nm;
                return (
                <div
                  key={nm}
                  className="flex items-center justify-between py-1 text-xs"
                  style={{ borderBottom: `1px solid ${T.bd}` }}
                >
                  <span
                    className="truncate mr-2 font-medium"
                    style={{ color: T.t1 }}
                  >
                    {label}
                    {v.unit ? (
                      <span className="font-normal" style={{ color: T.t3 }}>
                        {" "}
                        ({v.unit})
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span style={{ color: "#2563EB" }}>
                      ↑ {v.pk} {v.unit}
                    </span>
                    <span style={{ color: "#5E3BEE" }}>
                      ↓ {v.do} {v.unit}
                    </span>
                    {v.pk > 0 && v.pk !== v.do && (
                      <span
                        className="text-[10px] font-bold px-1 rounded"
                        style={{ background: "#FEF3C7", color: "#D97706" }}
                      >
                        {v.pk - v.do > 0 ? `+${v.pk - v.do}` : v.pk - v.do}
                      </span>
                    )}
                    {v.pk > 0 && v.pk === v.do && (
                      <span
                        className="text-[10px]"
                        style={{ color: "#059669" }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
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
    if (ln.action === "pickup") pk = true;
    if (ln.action === "dropoff") d = true;
  });
  const tags = [];
  if (pk) tags.push("pickup");
  if (d) tags.push("dropoff");
  return tags;
}

function fmtStopBrief(s: any, t: any) {
  const parts = [];
  if (s.dateFrom) {
    let str = `From ${formatDisplayDate(s.dateFrom)}`;
    if (s.timeFrom) str += `, ${formatDisplayTime(s.timeFrom)}`;
    if (s.dateTo) {
      str += ` To ${formatDisplayDate(s.dateTo)}`;
      if (s.timeTo) str += `, ${formatDisplayTime(s.timeTo)}`;
    } else if (s.timeTo) {
      str += ` To ${formatDisplayTime(s.timeTo)}`;
    }
    parts.push(str);
  }
  const cargoCount = (s.lines || []).filter((l: any) => l.productId).length;
  if (cargoCount) parts.push(`${cargoCount} lines`);
  return parts.join(" · ");
}

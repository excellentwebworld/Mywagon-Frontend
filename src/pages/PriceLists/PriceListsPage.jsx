/**
 * PriceListsPage — Master Data › Price Lists.
 *
 * Used by: Shipper, Forwarder, Carrier.
 * Route: /pricing
 *
 * 3-pane layout: DirectoryPane (230px left) + ListPane (center) + DetailPane (420px right).
 * Filter bar: search.
 * Bulk select + row actions (duplicate, archive, reactivate, delete forever).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Download, Upload as UploadIcon, ClipboardList, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../api/client';
import { priceListsService } from '../../api/services/priceListsService';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toUpperGreek } from '../../utils/greekUppercase';

import {
  calculateRouteTotals,
} from '../../mocks/priceListsData';
import {
  laneHasMetric,
  laneIsDirectTrip,
  laneIsExpiringSoonActive,
  laneIsFtl,
  laneIsMultistop,
  laneIsSimpleLane,
} from '../../api/utils/laneMetricDisplay';
import { serializeLanesToCsv } from '../../api/utils/laneCsvSchema';

import DirectoryPane from './pricelists/DirectoryPane';
import FilterBar from './pricelists/FilterBar';
import ListPane from './pricelists/ListPane';
import DetailPane from './pricelists/DetailPane';
import AddEditLaneModal from './pricelists/modals/AddEditLaneModalV2';
import ImportModal from './pricelists/modals/ImportModal';
import QuoteCalculator from './pricelists/QuoteCalculator';
import AuditLogPanel from './pricelists/AuditLogPanel';
import BulkActionBar from './pricelists/BulkActionBar';
import PriceListsSkeleton from './pricelists/PriceListsSkeleton';

function buildLegacyPricingFromRows(rows = []) {
  const pricing = {
    perLoad: null,
    perPallet: null,
    perKm: null,
    perKg: null,
    perTonne: null,
    currency: 'EUR',
    minimumCharge: null,
  };

  rows.forEach((row) => {
    const amount = Number(row?.price_eur || 0);
    if (!amount || !row?.metric) return;

    if (row.metric === 'load_any_size' && pricing.perLoad == null) pricing.perLoad = amount;
    if (row.metric === 'unit_transport' && pricing.perPallet == null) pricing.perPallet = amount;
    if (row.metric === 'weight') {
      if (row.metric_value?.unit === 'kg' && pricing.perKg == null) pricing.perKg = amount;
      if (row.metric_value?.unit === 'ton' && pricing.perTonne == null) pricing.perTonne = amount;
    }
    if (row.metric === 'ftl_truck_type' && pricing.perLoad == null) pricing.perLoad = amount;
  });

  return pricing;
}

function mapApiLaneToUiLane(apiLane) {
  const stops = Array.isArray(apiLane?.stops) ? apiLane.stops : [];
  const normalizedStops = stops
    .map((s) => ({
      city: s?.city || s?.value || '',
      label: s?.label || s?.city || s?.value || '',
      type: s?.type || 'city',
      value: s?.value || s?.city || '',
      countryCode: s?.countryCode || 'GR',
    }))
    .filter((s) => s.city || s.value);

  const isRoundTrip = apiLane?.trip_type === 'roundtrip';
  const routeCalc = normalizedStops.length >= 2 ? calculateRouteTotals(normalizedStops, isRoundTrip) : { legs: [], routeLabel: '' };

  const directKm = Number(apiLane?.total_km_direct || routeCalc.totalKm || 0);
  const effectiveKm = Number(apiLane?.total_km_effective || (isRoundTrip ? directKm * 2 : directKm));
  const pricingRows = Array.isArray(apiLane?.pricing_rows)
    ? apiLane.pricing_rows.map((row) => ({
      metric: row.metric,
      priceEur: Number(row.price_eur || 0),
      metricValue: row.metric_value || {},
    }))
    : [];

  return {
    id: `APL-${apiLane.id}`,
    apiId: apiLane.id,
    stops: normalizedStops,
    isRoundTrip,
    tripType: isRoundTrip ? 'roundtrip' : 'direct',
    routeLabel: routeCalc.routeLabel || normalizedStops.map((s) => s.label || s.city).join(isRoundTrip ? ' ↔ ' : ' → '),
    totalKm: effectiveKm,
    totalKmDirect: directKm,
    totalKmEffective: effectiveKm,
    legs: routeCalc.legs || [],
    pricing: buildLegacyPricingFromRows(apiLane.pricing_rows),
    pricingRows,
    vehicleRates: null,
    weightBreaks: null,
    laneCosts: null,
    effectiveFrom: apiLane.effective_from || '',
    effectiveTo: apiLane.effective_to || null,
    status: apiLane.status || 'active',
    scope: apiLane.scope || 'default',
    scopePartnerIds: apiLane.scope_partner_ids || [],
    scopeLabel: (apiLane.scope_partner_ids || []).length > 0 ? 'Specific' : 'Default',
    scopeDirection: apiLane.scope_direction || null,
    notes: apiLane.notes || '',
    createdAt: apiLane.created_at || new Date().toISOString(),
    updatedAt: apiLane.updated_at || new Date().toISOString(),
    createdBy: 'API',
  };
}

function mapUiEntryToStorePayload(entry) {
  const stops = Array.isArray(entry?.stops) ? entry.stops : [];
  const origin = stops[0]?.city || stops[0]?.value || '';
  const destination = stops[stops.length - 1]?.city || stops[stops.length - 1]?.value || '';
  const tripType = entry.tripType || (entry.isRoundTrip ? 'roundtrip' : 'direct');

  return {
    origin_city: origin,
    destination_city: destination,
    stops: stops.map((s) => ({
      city: s.city || s.value || '',
      label: s.label || s.city || s.value || '',
      type: s.type || 'city',
      value: s.value || s.city || '',
      countryCode: s.countryCode || 'GR',
    })),
    trip_type: tripType,
    total_km_direct: Number(entry.totalKmDirect || entry.totalKm || 0),
    total_km_effective: Number(entry.totalKmEffective || entry.totalKm || 0),
    pricing_rows: (entry.pricingRows || []).map((row) => ({
      price_eur: Number(row.priceEur || 0),
      metric: row.metric,
      metric_value: row.metricValue || {},
    })),
    effective_from: entry.effectiveFrom || undefined,
    effective_to: entry.effectiveTo || null,
    scope: entry.scope || 'default',
    scope_partner_ids: entry.scopePartnerIds || [],
    scope_direction: entry.scopeDirection || null,
    notes: entry.notes || '',
    status: entry.status || 'active',
  };
}

export default function PriceListsPage() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { role } = useAuth();
  const { toast } = useToast();
  const isGreek = i18n.language === 'el';

  // ─── Core state ───
  const [lanes, setLanes] = useState([]);
  const [lanesLoading, setLanesLoading] = useState(true);
  const [lanesError, setLanesError] = useState(null);
  const [auditLog] = useState([]);

  // ─── UI state ───
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeNode, setActiveNode] = useState('all');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editLane, setEditLane] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [importOpen, setImportOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [forwarderTab, setForwarderTab] = useState('carrier'); // 'carrier' | 'shipper' — forwarder only
  const [savingLane, setSavingLane] = useState(false);

  // Effective role for view behavior: forwarder tab switches perspective
  const viewRole = role === 'forwarder'
    ? (forwarderTab === 'carrier' ? 'shipper' : 'carrier')
    : role;

  const [search, setSearch] = useState('');

  const hasActiveFilters = Boolean(search.trim());
  const clearFilters = useCallback(() => {
    setSearch('');
    setActiveNode('all');
  }, []);

  // ─── Combined filtering: Forwarder tab + Directory + search ───
  const filteredLanes = useMemo(() => {
    let result = [...lanes];

    if (role === 'forwarder') {
      if (forwarderTab === 'carrier') {
        result = result.filter(l => l.scopeDirection === 'buy' || l.scope === 'default');
      } else {
        result = result.filter(l => l.scopeDirection === 'sell' || l.scope === 'default');
      }
    }

    if (activeNode && activeNode !== 'all') {
      if (activeNode === 'active') result = result.filter(l => l.status === 'active');
      else if (activeNode === 'ftl') result = result.filter(l => laneIsFtl(l));
      else if (activeNode === 'perWeight') result = result.filter(l => laneHasMetric(l, 'weight'));
      else if (activeNode === 'perLoad') result = result.filter(l => laneHasMetric(l, 'load_any_size'));
      else if (activeNode === 'perUnitTransport') result = result.filter(l => laneHasMetric(l, 'unit_transport'));
      else if (activeNode === 'directTrip') result = result.filter(l => laneIsDirectTrip(l));
      else if (activeNode === 'simpleLane') result = result.filter(l => laneIsSimpleLane(l));
      else if (activeNode === 'expiring') result = result.filter(l => laneIsExpiringSoonActive(l));
      else if (activeNode === 'roundTrips') result = result.filter(l => l.isRoundTrip);
      else if (activeNode === 'multiStop') result = result.filter(l => laneIsMultistop(l));
      else if (activeNode === 'scope_default') result = result.filter(l => l.scope === 'default');
      else if (activeNode.startsWith('scope_')) {
        const scopeId = activeNode.replace('scope_', '');
        result = result.filter(l => (l.scopePartnerIds || []).includes(scopeId) || l.scope === scopeId);
      }
      else if (activeNode === 'inactive') result = result.filter(l => l.status === 'inactive');
      else if (activeNode === 'archived') result = result.filter(l => l.status === 'archived');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        const route = l.routeLabel?.toLowerCase() || '';
        const cities = l.stops.map(s => `${s.city} ${s.label || ''}`).join(' ').toLowerCase();
        return route.includes(q) || cities.includes(q) || l.id.toLowerCase().includes(q);
      });
    }

    return result;
  }, [lanes, activeNode, search, role, forwarderTab]);

  // ─── Selected lane ───
  const selectedLane = useMemo(() => {
    if (!selectedId) return null;
    return lanes.find(l => l.id === selectedId) || null;
  }, [lanes, selectedId]);

  const handleNodeClick = useCallback((node) => {
    setActiveNode(prev => prev === node ? 'all' : node);
  }, []);

  // ─── Multi-select ───
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((ids) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  }, []);

  const persistLaneStatus = useCallback(async (lane, nextStatus, successMessage) => {
    if (!lane) return;

    if (lane.apiId) {
      try {
        const payload = {
          ...mapUiEntryToStorePayload(lane),
          status: nextStatus,
        };
        const updatedApiLane = await priceListsService.updateLane(lane.apiId, payload);
        const updatedUiLane = mapApiLaneToUiLane(updatedApiLane);
        setLanes((prev) => prev.map((l) => (
          l.id === lane.id
            ? { ...l, ...updatedUiLane, id: l.id, apiId: updatedUiLane.apiId }
            : l
        )));
        toast.success(successMessage);
        return;
      } catch (_e) {
        toast.error(t('genericError', 'Something went wrong'));
        return;
      }
    }

    setLanes(prev => prev.map(l => l.id === lane.id ? { ...l, status: nextStatus, updatedAt: new Date().toISOString() } : l));
    toast.success(successMessage);
  }, [t, toast]);

  // ─── CRUD actions ───
  const handleAction = useCallback((action, lane) => {
    switch (action) {
      case 'edit':
        setEditLane(lane);
        setModalMode('edit');
        setAddEditOpen(true);
        break;

      case 'duplicate':
        setEditLane({
          ...JSON.parse(JSON.stringify(lane)),
          duplicateSourceId: lane.id,
          id: undefined,
          apiId: undefined,
          status: 'inactive',
        });
        setModalMode('duplicate');
        setAddEditOpen(true);
        break;

      case 'archive':
        setConfirmDialog({
          title: t('priceLists.confirm.archiveTitle', 'Archive Lane'),
          message: t('priceLists.confirm.archiveMessage', 'Archive this lane? It will be hidden from active views.'),
          confirmLabel: t('priceLists.actions.archive', 'Archive'),
          destructive: false,
          onConfirm: () => {
            setLanes(prev => prev.map(l => l.id === lane.id ? { ...l, status: 'archived', updatedAt: new Date().toISOString() } : l));
            if (selectedId === lane.id) setSelectedId(null);
            toast.success(t('priceLists.toast.archived', 'Lane archived'));
            setConfirmDialog(null);
          },
        });
        break;

      case 'reactivate':
        void persistLaneStatus(lane, 'active', t('priceLists.toast.reactivated', 'Lane reactivated'));
        break;

      case 'activate':
        void persistLaneStatus(lane, 'active', t('priceLists.toast.activated', 'Lane activated'));
        break;

      case 'deactivate':
        void persistLaneStatus(lane, 'inactive', t('priceLists.toast.deactivated', 'Lane deactivated'));
        break;

      case 'deleteForever':
        setConfirmDialog({
          title: t('priceLists.confirm.deleteTitle', 'Delete Forever'),
          message: t('priceLists.confirm.deleteMessage', 'This lane will be permanently deleted. This cannot be undone.'),
          confirmLabel: t('priceLists.actions.deleteForever', 'Delete forever'),
          destructive: true,
          onConfirm: () => {
            setLanes(prev => prev.filter(l => l.id !== lane.id));
            if (selectedId === lane.id) setSelectedId(null);
            toast.success(t('priceLists.toast.deleted', 'Lane deleted'));
            setConfirmDialog(null);
          },
        });
        break;

      default:
        break;
    }
  }, [t, toast, selectedId, persistLaneStatus]);

  // ─── Save lane (add/edit) ───
  const handleSaveLane = useCallback(async (entry, existingId) => {
    if (savingLane) return;

    setSavingLane(true);
    try {
      const payload = mapUiEntryToStorePayload(entry);
      const editingLane = existingId ? lanes.find((l) => l.id === existingId) : null;
      const canUseApiUpdate = Boolean(editingLane?.apiId);

      if (existingId && canUseApiUpdate) {
        const updatedApiLane = await priceListsService.updateLane(editingLane.apiId, payload);
        const updatedUiLane = mapApiLaneToUiLane(updatedApiLane);
        setLanes((prev) => prev.map((l) => (l.id === existingId ? { ...l, ...updatedUiLane, id: l.id, apiId: updatedUiLane.apiId } : l)));
        toast.success(t('priceLists.toast.laneUpdated', 'Lane updated'));
      } else if (existingId) {
        setLanes((prev) => prev.map((l) => (l.id === existingId ? { ...l, ...entry, updatedAt: new Date().toISOString() } : l)));
        toast.success(t('priceLists.toast.laneUpdated', 'Lane updated'));
      } else {
        const createdApiLane = await priceListsService.storeLane(payload);
        const createdUiLane = mapApiLaneToUiLane(createdApiLane);
        setLanes((prev) => [createdUiLane, ...prev]);
        toast.success(t('priceLists.toast.laneCreated', 'Lane created'));
      }

      setAddEditOpen(false);
      setEditLane(null);
      setModalMode('add');
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }

      toast.error(t('genericError', 'Something went wrong'));
      throw e;
    } finally {
      setSavingLane(false);
    }
  }, [savingLane, lanes, t, toast]);

  // ─── Export CSV ───
  const handleExport = useCallback(() => {
    const lang = isGreek ? 'el' : 'en';
    const csv = serializeLanesToCsv(filteredLanes, lang);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MYVAGON_PriceLists_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('priceLists.toast.exported', 'Exported'));
  }, [filteredLanes, isGreek, t, toast]);

  const reloadLanes = useCallback(async () => {
    setLanesLoading(true);
    setLanesError(null);
    try {
      const apiLanes = await priceListsService.listLanes();
      setLanes(Array.isArray(apiLanes) ? apiLanes.map(mapApiLaneToUiLane) : []);
    } catch (_e) {
      setLanesError(t('priceLists.error.loadFailed', 'Failed to load price lanes.'));
    } finally {
      setLanesLoading(false);
    }
  }, [t]);

  const handleImported = useCallback(async (result) => {
    await reloadLanes();
    setImportOpen(false);

    const created = result?.created ?? 0;
    const skipped = result?.skipped ?? 0;
    const errorCount = result?.errors?.length ?? 0;

    if (created > 0 && errorCount === 0) {
      toast.success(`${t('priceLists.toast.imported', 'Imported')} ${created} ${t('priceLists.import.lanes', 'lanes')}`);
    } else if (created > 0) {
      toast.success(
        `${t('priceLists.toast.imported', 'Imported')} ${created} ${t('priceLists.import.lanes', 'lanes')}. ${skipped} ${t('priceLists.import.skippedRows', 'rows skipped')}.`,
      );
    } else {
      toast.error(t('priceLists.import.nothingImported', 'No lanes were imported. Please review the file errors.'));
    }
  }, [reloadLanes, t, toast]);

  // ─── Bulk actions ───
  const handleBulkDuplicate = useCallback(() => {
    const selected = [...selectedIds]
      .map((id) => lanes.find((l) => l.id === id))
      .filter(Boolean);

    if (selected.length === 0) return;

    const first = selected[0];
    setEditLane({
      ...JSON.parse(JSON.stringify(first)),
      duplicateSourceId: first.id,
      id: undefined,
      apiId: undefined,
      status: 'inactive',
    });
    setModalMode('duplicate');
    setAddEditOpen(true);
    setSelectedIds(new Set());

    if (selected.length > 1) {
      toast.success(t('priceLists.toast.duplicateOneAtATime', 'Opened duplicate form for the first selected lane.'));
    }
  }, [selectedIds, lanes, t, toast]);

  const handleBulkArchive = useCallback(() => {
    setLanes(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, status: 'archived', updatedAt: new Date().toISOString() } : l));
    setSelectedIds(new Set());
    toast.success(t('priceLists.toast.archived', 'Archived'));
  }, [selectedIds, t, toast]);

  const handleBulkDelete = useCallback(() => {
    setConfirmDialog({
      title: t('priceLists.confirm.deleteTitle', 'Delete Forever'),
      message: t('priceLists.bulk.deleteConfirm', 'Permanently delete {{n}} lanes? This cannot be undone.').replace('{{n}}', String(selectedIds.size)),
      confirmLabel: t('priceLists.actions.deleteForever', 'Delete forever'),
      destructive: true,
      onConfirm: () => {
        setLanes(prev => prev.filter(l => !selectedIds.has(l.id)));
        setSelectedIds(new Set());
        setSelectedId(null);
        toast.success(t('priceLists.toast.deleted', 'Deleted'));
        setConfirmDialog(null);
      },
    });
  }, [selectedIds, t, toast]);

  // ─── Page title ───
  const pageTitle = isGreek
    ? toUpperGreek(t('priceLists.title', 'Price Lists'))
    : t('priceLists.title', 'Price Lists');

  useEffect(() => {
    reloadLanes();
  }, [reloadLanes]);

  return (
    <div className="flex flex-col h-full" style={{ background: T.bg, minHeight: 0 }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.t1, margin: 0 }}>{pageTitle}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setAuditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
            style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12, fontWeight: 500 }}>
            <ClipboardList size={14} />
            {t('priceLists.auditBtn', 'Audit Log')}
          </button>
          <button onClick={() => setCalcOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
            style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12, fontWeight: 500 }}>
            <Calculator size={14} />
            {t('priceLists.calcBtn', 'Calculator')}
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
            style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12, fontWeight: 500 }}>
            <Download size={14} />
            {t('priceLists.exportBtn', 'Export')}
          </button>
          <button onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none"
            style={{ background: T.sf, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12, fontWeight: 500 }}>
            <UploadIcon size={14} />
            {t('priceLists.importBtn', 'Import')}
          </button>
          <button onClick={() => { setEditLane(null); setAddEditOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg cursor-pointer border-none text-white"
            style={{ background: T.ac, fontSize: 12, fontWeight: 600 }}>
            <Plus size={14} />
            {t('priceLists.addLane', 'Add Lane')}
          </button>
        </div>
      </div>

      {/* ── Forwarder Tab Bar ── */}
      {role === 'forwarder' && (
        <div className="px-5 shrink-0 flex gap-0 mb-1" style={{ borderBottom: `1px solid ${T.bd}` }}>
          {[
            { key: 'carrier', label: t('priceLists.forwarderTab.carrierPrices', 'Carrier Prices') },
            { key: 'shipper', label: t('priceLists.forwarderTab.shipperPrices', 'Shipper Prices') },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setForwarderTab(tab.key); setSelectedId(null); setActiveNode('all'); }}
              className="px-4 py-2 cursor-pointer border-none"
              style={{
                fontSize: 13, fontWeight: forwarderTab === tab.key ? 600 : 400,
                color: forwarderTab === tab.key ? T.ac : T.t2,
                background: 'transparent',
                borderBottom: forwarderTab === tab.key ? `2px solid ${T.ac}` : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="px-5 shrink-0">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* ── 3-Pane layout ── */}
      <div className="flex flex-1 min-h-0 px-5 pb-4"
        onClick={(e) => { if (e.target === e.currentTarget && selectedId) setSelectedId(null); }}>
        {lanesLoading && lanes.length === 0 && !lanesError ? (
          <PriceListsSkeleton role={viewRole} />
        ) : lanesError && lanes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
            <div className="text-center px-6 py-10">
              <p style={{ fontSize: 14, color: T.t2, marginBottom: 12 }}>{lanesError}</p>
              <button
                type="button"
                onClick={() => reloadLanes()}
                className="px-4 py-2 rounded-lg cursor-pointer border-none text-white"
                style={{ background: T.ac, fontSize: 13, fontWeight: 600 }}
              >
                {t('priceLists.error.retry', 'Try again')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 gap-3">
            {/* Left: Directory */}
            <div
              className="shrink-0 rounded-xl overflow-y-auto"
              style={{ width: 230, background: T.sf, border: `1px solid ${T.bd}`, opacity: lanesLoading ? 0.6 : 1 }}
            >
              <DirectoryPane
                lanes={lanes}
                activeNode={activeNode}
                onNodeClick={handleNodeClick}
              />
            </div>

            {/* Center: Table */}
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden flex flex-col" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
              <ListPane
                lanes={filteredLanes}
                selectedId={selectedId}
                onSelectLane={setSelectedId}
                role={viewRole}
                onAction={handleAction}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
                loading={lanesLoading}
                isEmptyCatalog={lanes.length === 0 && !hasActiveFilters && activeNode === 'all'}
              />
            </div>

            {/* Right: Detail */}
            <div
              className="shrink-0 rounded-xl overflow-y-auto overflow-x-hidden transition-all duration-300"
              style={{
                width: selectedLane ? 420 : 0,
                opacity: selectedLane ? 1 : 0,
                background: T.sf,
                border: selectedLane ? `1px solid ${T.bd}` : 'none',
              }}
            >
              {selectedLane && (
                <DetailPane
                  lane={selectedLane}
                  onClose={() => setSelectedId(null)}
                  role={viewRole}
                  auditLog={auditLog}
                  onAction={handleAction}
                  allLanes={lanes}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmDialog && (
        <ConfirmDialog
          open={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.destructive ? 'danger' : 'primary'}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}

      {/* ── Add/Edit Lane Modal ── */}
      <AddEditLaneModal
        open={addEditOpen}
        onClose={() => { setAddEditOpen(false); setEditLane(null); setModalMode('add'); }}
        onSave={handleSaveLane}
        lane={editLane}
        mode={modalMode}
        role={role}
        allLanes={lanes}
        forwarderTab={forwarderTab}
        isSaving={savingLane}
      />

      {/* ── Import Modal ── */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
        existingLanes={lanes}
      />

      {/* ── Quote Calculator ── */}
      <QuoteCalculator
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        lanes={lanes}
      />

      {/* ── Audit Log Panel ── */}
      <AuditLogPanel
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        auditLog={auditLog}
      />

      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onDuplicate={handleBulkDuplicate}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

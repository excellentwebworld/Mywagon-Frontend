import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { productMasterService, ApiError } from '../../../api';
import type { Category, ProductType, SKU } from '../../../context/AppContext';
import {
  EMPTY_NEW_SKU,
  type NewSkuForm,
  type SelectedKind,
  type SortOption,
  type ViewMode,
} from '../types';
import { getCategoryName } from '../utils/productUtils';

const SEARCH_DEBOUNCE_MS = 250;
const DEFAULT_PAGE_SIZE = 12;

export function useProductMaster() {
  const { lang, t } = useTranslation();
  const { showToast } = useApp();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('skus');
  const [activeCat, setActiveCat] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<SKU | ProductType | null>(null);
  const [selectedKind, setSelectedKind] = useState<SelectedKind>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [filterActive, setFilterActive] = useState('');
  const [filterUnmapped, setFilterUnmapped] = useState(false);
  const [kpiFilter, setKpiFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [isSkuOpen, setIsSkuOpen] = useState(false);
  const [editSkuMode, setEditSkuMode] = useState(false);
  const [newSku, setNewSku] = useState<NewSkuForm>(EMPTY_NEW_SKU);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [typeMappedSkus, setTypeMappedSkus] = useState<SKU[]>([]);
  const [typeSkusLoading, setTypeSkusLoading] = useState(false);
  const [deactivateConfirmSku, setDeactivateConfirmSku] = useState<SKU | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCat, activeType, filterActive, filterUnmapped, sortBy, perPage, kpiFilter]);

  const handleApiError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setSubscriptionBlocked(true);
          setError(err.message);
          showToast(err.message, 'error');
          return err.message;
        }
        if (err.fieldErrors) {
          const first = Object.values(err.fieldErrors)[0]?.[0];
          showToast(first ?? err.message, 'error');
          return first ?? err.message;
        }
        showToast(err.message, 'error');
        return err.message;
      }
      showToast(fallback, 'error');
      return fallback;
    },
    [showToast]
  );

  const listParams = useMemo(() => {
    let status = filterActive;
    let unmapped = filterUnmapped;
    if (kpiFilter === 'inactive') status = 'inactive';
    if (kpiFilter === 'unmapped') unmapped = true;
    if (kpiFilter === 'active' || kpiFilter === 'total') status = 'active';

    return productMasterService.buildListParams(
      activeCat,
      activeType,
      status,
      unmapped,
      debouncedSearch,
      currentPage,
      perPage,
      sortBy
    );
  }, [activeCat, activeType, filterActive, filterUnmapped, debouncedSearch, currentPage, perPage, sortBy, kpiFilter]);

  const summaryQuery = useQuery({
    queryKey: ['product-master', 'summary'],
    queryFn: () => productMasterService.getSummary(),
    retry: false,
  });

  const referenceQuery = useQuery({
    queryKey: ['product-master', 'reference'],
    queryFn: () => productMasterService.getReferenceCategories(),
    retry: false,
  });

  const skusQuery = useQuery({
    queryKey: ['product-master', 'skus', listParams],
    queryFn: () => productMasterService.listSkus(listParams),
    enabled: viewMode === 'skus',
    retry: false,
  });

  const typesQuery = useQuery({
    queryKey: ['product-master', 'types'],
    queryFn: () => productMasterService.getTypesGrid(),
    enabled: viewMode === 'types',
    retry: false,
  });

  useEffect(() => {
    const err = summaryQuery.error ?? skusQuery.error ?? referenceQuery.error;
    if (err) handleApiError(err, 'Failed to load product master');
  }, [summaryQuery.error, skusQuery.error, referenceQuery.error, handleApiError]);

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['product-master'] });
  }, [queryClient]);

  const categories: Category[] = useMemo(
    () => productMasterService.mapReferenceToCategories(referenceQuery.data ?? [], lang),
    [referenceQuery.data, lang]
  );

  const productTypes: ProductType[] = useMemo(() => {
    if (viewMode === 'types' && typesQuery.data && referenceQuery.data) {
      return productMasterService.mapTypeGridToProductTypes(typesQuery.data, referenceQuery.data);
    }
    return productMasterService.mapReferenceToProductTypes(referenceQuery.data ?? []);
  }, [viewMode, typesQuery.data, referenceQuery.data]);

  const skus = skusQuery.data?.items ?? [];
  const listMeta = skusQuery.data?.meta;
  const summary = summaryQuery.data;

  const totalSkusCount = summary?.total ?? 0;
  const inactiveCount = summary?.inactive ?? 0;
  const unmappedCount = summary?.unmapped ?? 0;
  const erpSyncedCount = 0;
  const manualCount = totalSkusCount;
  const syncIssuesCount = 0;

  const filteredSkus = skus;
  const filteredTypes = productTypes;

  const createSkuMutation = useMutation({
    mutationFn: (form: NewSkuForm) => productMasterService.createSku(form),
    onSuccess: async () => {
      showToast(t('created'), 'success');
      setIsSkuOpen(false);
      setNewSku(EMPTY_NEW_SKU);
      await invalidateAll();
    },
    onError: (err) => handleApiError(err, 'Failed to create SKU'),
  });

  const updateSkuMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: NewSkuForm }) => productMasterService.updateSku(id, form),
    onSuccess: async () => {
      showToast(t('updated'), 'success');
      setIsSkuOpen(false);
      setEditSkuMode(false);
      await invalidateAll();
    },
    onError: (err) => handleApiError(err, 'Failed to update SKU'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => productMasterService.toggleSkuStatus(id),
    onSuccess: async (sku) => {
      showToast(sku.active ? t('activated') : t('deactivated'), 'success');
      setSelectedItem(sku);
      await invalidateAll();
    },
    onError: (err) => handleApiError(err, 'Failed to toggle SKU'),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => productMasterService.bulkArchive(ids),
    onSuccess: async (count) => {
      showToast(`${count} ${t('archived')}`, 'success');
      setSelectedIds(new Set());
      await invalidateAll();
    },
    onError: (err) => handleApiError(err, 'Failed to archive SKUs'),
  });

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
    setSelectedKind('');
    setSelectedIds(new Set());
    setTypeMappedSkus([]);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterActive('');
    setFilterUnmapped(false);
    setKpiFilter('');
    setSearchQuery('');
    showToast(t('filtersCleared'), 'info');
  }, [showToast, t]);

  const handleKpiClick = useCallback((key: string) => {
    setKpiFilter((prev) => (prev === key ? '' : key));
    clearSelection();
  }, [clearSelection]);

  const handleSearchChange = useCallback((q: string) => setSearchQuery(q), []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) setSelectedIds(new Set(filteredSkus.map((s) => s.id)));
      else setSelectedIds(new Set());
    },
    [filteredSkus]
  );

  const handleToggleRowSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkArchive = useCallback(() => {
    if (selectedIds.size === 0) return;
    setArchiveConfirmOpen(true);
  }, [selectedIds]);

  const confirmBulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await bulkArchiveMutation.mutateAsync([...selectedIds]);
    setArchiveConfirmOpen(false);
  }, [selectedIds, bulkArchiveMutation]);

  const handleBulkToggleActive = useCallback(() => {
    showToast(t('comingSoon'), 'info');
  }, [showToast, t]);

  const openAddSku = useCallback(() => {
    setEditSkuMode(false);
    setNewSku(EMPTY_NEW_SKU);
    setIsSkuOpen(true);
    setAddDropdownOpen(false);
  }, []);

  const openEditSku = useCallback((sku: SKU) => {
    setEditSkuMode(true);
    setNewSku({
      catId: sku.catId,
      typeId: sku.typeId,
      name: sku.name,
      number: sku.number,
      barcode: sku.barcode,
      uom: sku.uom,
      weight: sku.weight,
      active: sku.active,
      tags: sku.tags.join(', '),
    });
    setIsSkuOpen(true);
  }, []);

  const handleSaveSku = useCallback(() => {
    if (!newSku.catId || !newSku.typeId || !newSku.name.trim() || !newSku.number.trim()) {
      showToast(t('fillRequired'), 'warning');
      return;
    }
    if (editSkuMode && selectedItem && selectedKind === 'sku') {
      updateSkuMutation.mutate({ id: selectedItem.id, form: newSku });
    } else {
      createSkuMutation.mutate(newSku);
    }
  }, [newSku, editSkuMode, selectedItem, selectedKind, createSkuMutation, updateSkuMutation, showToast, t]);

  const loadTypeDetail = useCallback(
    async (type: ProductType) => {
      setSelectedItem(type);
      setSelectedKind('type');
      setTypeMappedSkus([]);

      const typeId = type.id;
      if (!typeId || Number.isNaN(parseInt(typeId, 10))) {
        return;
      }

      setTypeSkusLoading(true);
      try {
        const result = await productMasterService.listSkus({
          type_id: typeId,
          status: 'active',
          page: 1,
          per_page: 100,
        });
        setTypeMappedSkus(result.items);
      } catch (err) {
        handleApiError(err, 'Failed to load mapped SKUs');
      } finally {
        setTypeSkusLoading(false);
      }
    },
    [handleApiError]
  );

  const loadSkuDetail = useCallback(
    async (sku: SKU) => {
      setDetailLoading(true);
      try {
        const detail = await productMasterService.getSku(sku.id);
        setSelectedItem(detail);
        setSelectedKind('sku');
      } catch (err) {
        handleApiError(err, 'Failed to load SKU');
      } finally {
        setDetailLoading(false);
      }
    },
    [handleApiError]
  );

  const handleToggleActive = useCallback(
    (sku: SKU) => {
      if (sku.active) {
        setDeactivateConfirmSku(sku);
      } else {
        toggleMutation.mutate(sku.id);
      }
    },
    [toggleMutation]
  );

  const confirmDeactivate = useCallback(async () => {
    if (!deactivateConfirmSku) return;
    await toggleMutation.mutateAsync(deactivateConfirmSku.id);
    setDeactivateConfirmSku(null);
  }, [deactivateConfirmSku, toggleMutation]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await productMasterService.downloadExport();
      showToast(t('exported'), 'success');
    } catch (err) {
      handleApiError(err, 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [handleApiError, showToast, t]);

  const handleCSVUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const result = await productMasterService.importFile(file);
        setImportSummary(
          `${t('imported')}: ${result.success}/${result.total} (${result.created} ${t('created')}, ${result.updated} ${t('updated')})`
        );
        setIsImportOpen(true);
        await invalidateAll();
      } catch (err) {
        handleApiError(err, 'Import failed');
      }
    },
    [handleApiError, invalidateAll, t]
  );

  const triggerCSVImport = useCallback(() => {
    document.getElementById('pm-csv-input')?.click();
  }, []);

  const downloadTemplate = useCallback(async () => {
    try {
      await productMasterService.downloadImportTemplate();
    } catch (err) {
      handleApiError(err, 'Template download failed');
    }
  }, [handleApiError]);

  const catName = useCallback((c: Category) => getCategoryName(c, lang), [lang]);

  const loading = summaryQuery.isLoading || referenceQuery.isLoading || skusQuery.isLoading;
  const saving =
    createSkuMutation.isPending ||
    updateSkuMutation.isPending ||
    toggleMutation.isPending ||
    bulkArchiveMutation.isPending;

  const getCategoryCount = useCallback(
    (catId: string) => summary?.categories.find((c) => String(c.id) === catId)?.count ?? 0,
    [summary]
  );

  const getTypeCount = useCallback(
    (catId: string, typeId: string) => {
      const cat = summary?.categories.find((c) => String(c.id) === catId);
      return cat?.types.find((t) => String(t.type_id) === typeId)?.count ?? 0;
    },
    [summary]
  );

  return {
    t,
    lang,
    showToast,
    error,
    subscriptionBlocked,
    loading,
    saving,
    detailLoading,
    exporting,
    viewMode,
    setViewMode,
    activeCat,
    setActiveCat,
    activeType,
    setActiveType,
    searchQuery,
    handleSearchChange,
    selectedItem,
    setSelectedItem,
    selectedKind,
    setSelectedKind,
    selectedIds,
    setSelectedIds,
    filterActive,
    setFilterActive,
    filterCat: '',
    setFilterCat: (_v: string) => {},
    filterUnmapped,
    setFilterUnmapped,
    kpiFilter,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    perPage,
    setPerPage,
    listMeta,
    addDropdownOpen,
    setAddDropdownOpen,
    isSkuOpen,
    setIsSkuOpen,
    editSkuMode,
    newSku,
    setNewSku,
    isImportOpen,
    setIsImportOpen,
    importSummary,
    clearSelection,
    clearFilters,
    categories,
    productTypes,
    skus,
    filteredSkus,
    filteredTypes,
    totalSkusCount,
    erpSyncedCount,
    manualCount,
    syncIssuesCount,
    unmappedCount,
    inactiveCount,
    summary,
    getCategoryCount,
    getTypeCount,
    handleKpiClick,
    handleSelectAll,
    handleToggleRowSelection,
    handleBulkToggleActive,
    handleBulkArchive,
    deactivateConfirmSku,
    setDeactivateConfirmSku,
    confirmDeactivate,
    archiveConfirmOpen,
    setArchiveConfirmOpen,
    confirmBulkArchive,
    handleSaveSku,
    handleCSVUpload,
    triggerCSVImport,
    downloadTemplate,
    handleExport,
    openAddSku,
    openEditSku,
    loadSkuDetail,
    loadTypeDetail,
    handleToggleActive,
    catName,
    typeMappedSkus,
    typeSkusLoading,
    // stubs removed from Blade — no-ops for modals still referencing
    isTypeOpen: false,
    setIsTypeOpen: () => {},
    newType: EMPTY_NEW_SKU as unknown as never,
    setNewType: () => {},
    isCatOpen: false,
    setIsCatOpen: () => {},
    newCat: { name: '', icon: '📦' },
    setNewCat: () => {},
    isRenameOpen: false,
    setIsRenameOpen: () => {},
    isMergeOpen: false,
    setIsMergeOpen: () => {},
    isBulkMapOpen: false,
    setIsBulkMapOpen: () => {},
    isSyncLogOpen: false,
    setIsSyncLogOpen: () => {},
    openAddType: openAddSku,
    openAddCategory: () => showToast(t('comingSoon'), 'info'),
    handleCreateType: () => {},
    handleCreateCategory: () => {},
    handleRenameType: () => {},
    handleMergeTypes: () => {},
    handleBulkMap: () => {},
    updateSku: () => {},
    updateProductType: () => {},
    syncLogs: [],
    secCollapsed: {},
    toggleSec: () => {},
    renameId: '',
    setRenameId: () => {},
    renameName: '',
    setRenameName: () => {},
    mergeSrc: null,
    setMergeSrc: () => {},
    mergeTarget: '',
    setBulkMapTarget: () => {},
    importData: [],
  };
}

export type ProductMasterState = ReturnType<typeof useProductMaster>;

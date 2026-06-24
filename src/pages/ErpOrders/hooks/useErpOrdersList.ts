import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyncGlobalLoader } from '../../../hooks/useSyncGlobalLoader';
import { useApp } from '../../../context/AppContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { erpOrdersService, ApiError, addressBookService, productMasterService } from '../../../api';
import { statusLabel } from '../../../api/mappers/erpOrdersMapper';
import type {
  ErpOrder,
  ErpOrderFormState,
  ErpOrderKpiFilter,
  ErpOrderSortField,
  ErpOrderTab,
  ErpOrdersFilterState,
} from '../types';
import { EMPTY_ORDER_FORM as EMPTY_FORM } from '../types';
import { isUpcoming48h } from '../erpOrderUiUtils';

const DEFAULT_FILTERS: ErpOrdersFilterState = {
  priority: [],
  noLinkedLoad: false,
  syncErrors: false,
};

const SEARCH_DEBOUNCE_MS = 250;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100];

export function useErpOrdersList() {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const queryClient = useQueryClient();

  const [kpiFilter, setKpiFilter] = useState<ErpOrderKpiFilter>('');
  const [activeTab, setActiveTabState] = useState<ErpOrderTab>('workQueue');
  const [filters, setFilters] = useState<ErpOrdersFilterState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<ErpOrderSortField>('shipDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<ErpOrderFormState>(EMPTY_FORM);
  const [isAiWizardOpen, setIsAiWizardOpen] = useState(false);

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
  }, [kpiFilter, activeTab, filters, perPage]);

  const handleApiError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        showToast(err.message, 'error');
        return err.message;
      }
      showToast(fallback, 'error');
      return fallback;
    },
    [showToast]
  );

  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['erp-orders'] });
  }, [queryClient]);

  const summaryQuery = useQuery({
    queryKey: ['erp-orders', 'summary'],
    queryFn: () => erpOrdersService.getSummary(),
    retry: false,
  });

  const listQuery = useQuery({
    queryKey: [
      'erp-orders',
      'list',
      kpiFilter,
      activeTab,
      filters,
      debouncedSearch,
      sortField,
      sortDir,
      currentPage,
      perPage,
    ],
    queryFn: () =>
      erpOrdersService.listOrdersMapped(
        kpiFilter,
        activeTab,
        filters.priority.length > 0,
        filters.noLinkedLoad,
        debouncedSearch,
        sortField,
        sortDir,
        currentPage,
        perPage
      ),
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: ['erp-orders', 'detail', selectedOrderId],
    queryFn: () => erpOrdersService.getOrder(selectedOrderId!),
    enabled: !!selectedOrderId,
    retry: false,
  });

  const companiesQuery = useQuery({
    queryKey: ['address-book', 'company-entities', 'erp-orders'],
    queryFn: () => addressBookService.listCompanyEntities(''),
    staleTime: 60_000,
  });

  const locationsQuery = useQuery({
    queryKey: ['address-book', 'locations', 'erp-orders'],
    queryFn: () => addressBookService.listAllLocations({}),
    staleTime: 60_000,
  });

  const skusQuery = useQuery({
    queryKey: ['product-master', 'skus', 'erp-orders'],
    queryFn: () => productMasterService.listAllSkus({}),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (summaryQuery.error) handleApiError(summaryQuery.error, t('erpOrdersLoadError'));
  }, [summaryQuery.error, handleApiError, t]);

  useEffect(() => {
    if (listQuery.error) handleApiError(listQuery.error, t('erpOrdersLoadError'));
  }, [listQuery.error, handleApiError, t]);

  useEffect(() => {
    if (detailQuery.error) handleApiError(detailQuery.error, t('erpOrdersLoadError'));
  }, [detailQuery.error, handleApiError, t]);

  const createMutation = useMutation({
    mutationFn: (form: ErpOrderFormState) =>
      erpOrdersService.createOrder({
        order_reference: form.orderReference,
        erp_reference: form.erpReference || null,
        company_entity_id: form.companyEntityId,
        customer_name: form.customerName,
        origin_location_id: form.originLocationId,
        dest_location_id: form.destLocationId,
        ship_date: form.shipDate || null,
        delivery_date: form.deliveryDate,
        notes: form.notes || null,
        high_priority: form.highPriority,
        lines: form.lines.map((l) => ({
          product_sku_id: l.productSkuId,
          product_name: l.productName,
          quantity: l.quantity,
          unit: l.unit,
          weight: l.weight,
          weight_unit: l.weightUnit,
        })),
      }),
    onSuccess: () => {
      invalidateOrders();
      setIsFormOpen(false);
      setOrderForm(EMPTY_FORM);
      showToast(t('erpOrdersCreateSuccess'), 'success');
    },
    onError: (err) => handleApiError(err, t('erpOrdersCreateError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: ErpOrderFormState }) =>
      erpOrdersService.updateOrder(id, {
        order_reference: form.orderReference,
        erp_reference: form.erpReference || null,
        company_entity_id: form.companyEntityId,
        customer_name: form.customerName,
        origin_location_id: form.originLocationId,
        dest_location_id: form.destLocationId,
        ship_date: form.shipDate || null,
        delivery_date: form.deliveryDate,
        notes: form.notes || null,
        high_priority: form.highPriority,
        lines: form.lines.map((l) => ({
          product_sku_id: l.productSkuId,
          product_name: l.productName,
          quantity: l.quantity,
          unit: l.unit,
          weight: l.weight,
          weight_unit: l.weightUnit,
        })),
      }),
    onSuccess: () => {
      invalidateOrders();
      setIsFormOpen(false);
      setEditingOrderId(null);
      setOrderForm(EMPTY_FORM);
      showToast(t('erpOrdersUpdateSuccess'), 'success');
    },
    onError: (err) => handleApiError(err, t('erpOrdersUpdateError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => erpOrdersService.deleteOrder(id),
    onSuccess: () => {
      invalidateOrders();
      setSelectedOrderId(null);
      showToast(t('erpOrdersDeleteSuccess'), 'success');
    },
    onError: (err) => handleApiError(err, t('erpOrdersDeleteError')),
  });

  const listLoading = listQuery.isLoading || listQuery.isFetching;
  const detailLoading = detailQuery.isLoading && !detailQuery.data;
  const mutationLoading =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  useSyncGlobalLoader(mutationLoading);

  const kpiCounts = useMemo(() => {
    const base = {
      unplanned: summaryQuery.data?.unplanned ?? 0,
      planned: summaryQuery.data?.planned ?? 0,
      on_trip: summaryQuery.data?.on_trip ?? 0,
      completed: summaryQuery.data?.completed ?? 0,
      exceptions: summaryQuery.data?.canceled ?? 0,
      upcoming48: 0,
    };
    base.upcoming48 = (listQuery.data?.orders ?? []).filter((o) => isUpcoming48h(o.shipDate)).length;
    return base;
  }, [summaryQuery.data, listQuery.data?.orders]);

  const rawOrders = listQuery.data?.orders ?? [];
  const orders = useMemo(() => {
    let result = rawOrders;
    if (kpiFilter === 'upcoming48') {
      result = result.filter((o) => isUpcoming48h(o.shipDate));
    }
    if (filters.syncErrors) {
      result = result.filter(() => false);
    }
    if (filters.priority.length > 0) {
      result = result.filter((o) => {
        if (filters.priority.includes('urgent') && o.highPriority) return true;
        if (filters.priority.includes('high') && o.highPriority) return true;
        return false;
      });
    }
    return result;
  }, [rawOrders, kpiFilter, filters.syncErrors, filters.priority]);
  const listMeta = listQuery.data?.meta ?? {
    current_page: 1,
    per_page: perPage,
    total: 0,
    last_page: 1,
  };
  const selectedOrderPreview = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );
  const selectedOrder = detailQuery.data ?? selectedOrderPreview;

  const selectKpi = useCallback((kpi: ErpOrderKpiFilter) => {
    setKpiFilter((prev) => (prev === kpi ? '' : kpi));
  }, []);

  const setActiveTab = useCallback((tab: ErpOrderTab) => {
    setActiveTabState(tab);
    setKpiFilter('');
    setCurrentPage(1);
  }, []);

  const setFiltersState = useCallback((updater: ErpOrdersFilterState | ((prev: ErpOrdersFilterState) => ErpOrdersFilterState)) => {
    setFilters(updater);
  }, []);

  const toggleHighPriorityFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority.length ? [] : ['urgent', 'high'],
    }));
  }, []);

  const toggleNoLinkedLoadFilter = useCallback(() => {
    setFilters((prev) => ({ ...prev, noLinkedLoad: !prev.noLinkedLoad }));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        orders.forEach((o) => {
          if (checked) next.add(o.id);
          else next.delete(o.id);
        });
        return next;
      });
    },
    [orders]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const goToCreateLoad = useCallback(
    (singleOrderId?: string): boolean => {
      if (singleOrderId) {
        setSelectedIds(new Set([singleOrderId]));
        setSelectedOrderId(null);
        return true;
      }
      if (selectedIds.size === 0) {
        showToast(t('erpOrdersSelectAtLeastOne'), 'warning');
        return false;
      }
      setSelectedOrderId(null);
      return true;
    },
    [selectedIds.size, showToast, t]
  );

  const handleExport = useCallback(() => {
    showToast(t('erpOrdersExportSoon'), 'info');
  }, [showToast, t]);

  const handleResync = useCallback(
    (order: ErpOrder) => {
      showToast(t('erpOrdersResyncTriggered', { id: order.orderReference }), 'info');
    },
    [showToast, t]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setKpiFilter('');
    setActiveTabState('all');
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  const doSort = useCallback((field: ErpOrderSortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const openDrawer = useCallback((id: string) => {
    setSelectedOrderId(id);
  }, []);

  const closeDrawer = useCallback(() => {
    setSelectedOrderId(null);
  }, []);

  const openCreateOrder = useCallback(() => {
    setEditingOrderId(null);
    setOrderForm(EMPTY_FORM);
    setIsFormOpen(true);
  }, []);

  const openEditOrder = useCallback((order: ErpOrder) => {
    setEditingOrderId(order.id);
    setOrderForm({
      orderReference: order.orderReference,
      erpReference: order.erpReference,
      companyEntityId: order.companyEntityId,
      customerName: order.customerName,
      originLocationId: order.originLocationId,
      destLocationId: order.destLocationId,
      shipDate: order.shipDate,
      deliveryDate: order.deliveryDate,
      notes: order.notes,
      highPriority: order.highPriority,
      lines: order.lines.length ? order.lines : [],
    });
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingOrderId(null);
    setOrderForm(EMPTY_FORM);
  }, []);

  const submitForm = useCallback(() => {
    if (!orderForm.orderReference.trim()) {
      showToast(t('erpOrdersOrderIdRequired'), 'error');
      return;
    }
    if (!orderForm.customerName.trim()) {
      showToast(t('erpOrdersCustomerRequired'), 'error');
      return;
    }
    if (!orderForm.deliveryDate) {
      showToast(t('erpOrdersDeliveryDateRequired'), 'error');
      return;
    }
    if (editingOrderId) {
      updateMutation.mutate({ id: editingOrderId, form: orderForm });
    } else {
      createMutation.mutate(orderForm);
    }
  }, [orderForm, editingOrderId, createMutation, updateMutation, showToast, t]);

  const openAiWizard = useCallback(() => setIsAiWizardOpen(true), []);
  const closeAiWizard = useCallback(() => setIsAiWizardOpen(false), []);

  const handleAiWizardImportSuccess = useCallback(() => {
    invalidateOrders();
    closeAiWizard();
  }, [invalidateOrders, closeAiWizard]);

  const downloadImportTemplate = useCallback(async () => {
    try {
      await erpOrdersService.downloadImportTemplate();
    } catch (err) {
      handleApiError(err, t('erpOrdersTemplateError'));
    }
  }, [handleApiError, t]);

  const goToPage = useCallback((page: number) => setCurrentPage(page), []);
  const setPageSize = useCallback((size: number) => setPerPage(size), []);

  const hasActiveFilters = !!(
    searchQuery ||
    kpiFilter ||
    filters.priority.length ||
    filters.noLinkedLoad ||
    filters.syncErrors ||
    activeTab !== 'all'
  );

  const tabCounts = useMemo(
    () => ({
      workQueue: kpiCounts.unplanned,
      all: summaryQuery.data?.total ?? 0,
      completed: kpiCounts.completed,
      exceptions: kpiCounts.exceptions,
    }),
    [kpiCounts, summaryQuery.data?.total]
  );

  return {
    t,
    kpiCounts,
    kpiFilter,
    selectKpi,
    activeTab,
    setActiveTab,
    tabCounts,
    filters,
    setFilters: setFiltersState,
    highPriorityFilter: filters.priority.length > 0,
    toggleHighPriorityFilter,
    noLinkedLoadFilter: filters.noLinkedLoad,
    toggleNoLinkedLoadFilter,
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    goToCreateLoad,
    handleExport,
    handleResync,
    searchQuery,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
    sortField,
    sortDir,
    doSort,
    orders,
    listMeta,
    listLoading,
    currentPage,
    perPage,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    goToPage,
    setPageSize,
    selectedOrderId,
    selectedOrder,
    detailLoading,
    openDrawer,
    closeDrawer,
    isFormOpen,
    editingOrderId,
    orderForm,
    setOrderForm,
    openCreateOrder,
    openEditOrder,
    closeForm,
    submitForm,
    formSaving: createMutation.isPending || updateMutation.isPending,
    deleteOrder: (id: string) => deleteMutation.mutate(id),
    isAiWizardOpen,
    openAiWizard,
    closeAiWizard,
    handleAiWizardImportSuccess,
    downloadImportTemplate,
    companies: companiesQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    skus: skusQuery.data ?? [],
    statusLabel,
    summarySubtitle: summaryQuery.data?.total ?? 0,
  };
}

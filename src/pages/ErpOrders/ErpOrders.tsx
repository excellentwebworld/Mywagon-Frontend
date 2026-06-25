import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import '../../styles/erp-orders.css';
import '../../styles/ai-wizard.css';
import { useErpOrdersList } from './hooks/useErpOrdersList';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../api';
import { productMasterService } from '../../api/services/productMasterService';
import { ProductMasterSkuModal } from '../../components/ProductMaster/ProductMasterSkuModal';
import type { NewSkuForm } from '../ProductMaster/types';
import {
  ErpOrdersHeader,
  ErpOrdersKpiStrip,
  ErpOrdersFilterBar,
  ErpOrdersTable,
  OrderDetailDrawer,
  CreateEditOrderModal,
  OrdersAiWizardModal,
} from '../../components/ErpOrders';
import { CreateLocationModal } from '../../components/AddressBook/CreateLocationModal';
import { CreateCompanyModal } from '../../components/AddressBook/CreateCompanyModal';
import { EMPTY_COMPANY_DATA, EMPTY_CREATE_DATA } from '../../pages/AddressBook/types';
import type { CreateLocationData, CompanyFormData } from '../../pages/AddressBook/types';
import { validateCreateAll } from '../../pages/AddressBook/validation/locationCreateValidation';
import { checkLocationDuplicate, DUPLICATE_LOCATION_MESSAGE } from '../../pages/AddressBook/validation/locationDuplicateValidation';
import { applyTemplate } from '../../pages/AddressBook/utils/locationUtils';
import { addressBookService } from '../../api';
import type { ApiCompanyLookup } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { LocationItem } from '../../context/AppContext';
import { ErpOrdersDeferredViews } from './ErpOrdersDeferredViews';
import type { ViewMode } from './types';
import { EMPTY_ORDER_LINE } from './types';
import type { SKU } from '../../context/AppContext';

type LocationTarget = 'origin' | 'dest';

export const ErpOrders: React.FC = () => {
  const state = useErpOrdersList();
  const { showToast } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationTarget, setLocationTarget] = useState<LocationTarget>('origin');
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuLineIndex, setSkuLineIndex] = useState(0);
  const [skuSaving, setSkuSaving] = useState(false);

  const { user } = useAuth();
  const [createStep, setCreateStep] = useState(1);
  const [createData, setCreateData] = useState<CreateLocationData>(EMPTY_CREATE_DATA);
  const [companyQuery, setCompanyQuery] = useState('');
  const [apiCompanies, setApiCompanies] = useState<ApiCompanyLookup[]>([]);
  const [potentialDuplicates, setPotentialDuplicates] = useState<LocationItem[]>([]);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyFormData>(EMPTY_COMPANY_DATA);
  const [savingLocation, setSavingLocation] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);

  const filteredCompanies = useMemo(() => apiCompanies, [apiCompanies]);

  useEffect(() => {
    if (!locationModalOpen) return;
    const q = companyQuery.trim();
    const timer = setTimeout(() => {
      addressBookService
        .listCompanies(q || undefined)
        .then(setApiCompanies)
        .catch(() => setApiCompanies([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [companyQuery, locationModalOpen]);

  const queryClient = useQueryClient();

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (locationModalOpen) setLocationModalOpen(false);
        else if (skuModalOpen) setSkuModalOpen(false);
        else if (state.isFormOpen) state.closeForm();
        else if (state.isAiWizardOpen) state.closeAiWizard();
        else if (state.selectedOrderId) state.closeDrawer();
        else if (viewMode !== 'orders') setViewMode('orders');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state, viewMode, locationModalOpen, skuModalOpen]);

  const handleCreateLoad = (singleOrderId?: string) => {
    if (state.goToCreateLoad(singleOrderId)) {
      setViewMode('create');
    }
  };

  const handleLocationCreated = useCallback((locationId: number) => {
    state.refreshLocations();
    state.setOrderForm((f) => ({
      ...f,
      ...(locationTarget === 'origin'
        ? { originLocationId: locationId }
        : { destLocationId: locationId }),
    }));
  }, [locationTarget, state]);

  const openLocationModal = (target: LocationTarget) => {
    setLocationTarget(target);
    setCreateStep(1);
    const defaultRole = target === 'origin' ? 'pickup' : 'delivery';
    setCreateData(applyTemplate('retail', { ...EMPTY_CREATE_DATA, context: 'my', role: defaultRole }));
    setLocationModalOpen(true);
  };

  const openSkuModal = (lineIndex: number) => {
    state.setOrderForm((f) => {
      const lines = [...f.lines];
      while (lines.length <= lineIndex) {
        lines.push({ ...EMPTY_ORDER_LINE });
      }
      return lines.length === f.lines.length ? f : { ...f, lines };
    });
    setSkuLineIndex(lineIndex);
    setSkuModalOpen(true);
  };

  const submitNewLocation = useCallback(async () => {
    const payload: CreateLocationData = {
      ...createData,
      company:
        createData.context === 'customer'
          ? createData.company
          : user?.company_name?.trim() || createData.company || 'My Company',
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
      handleLocationCreated(Number(created.id));
      setLocationModalOpen(false);
      showToast(state.t('erpOrdersLocationCreated') || `"${created.name}" created`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create location';
      showToast(message, 'error');
    } finally {
      setSavingLocation(false);
    }
  }, [createData, user?.company_name, showToast, state.t, handleLocationCreated]);

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

      setCreateData((prev) => ({
        ...prev,
        companyEntityId: created.id,
        company: created.name,
        companyVat: created.vat_number,
      }));
      setIsCompanyOpen(false);
      showToast(`Company "${created.name}" created`, 'success');

      const updatedCompanies = await addressBookService.listCompanies(companyQuery.trim() || undefined);
      setApiCompanies(updatedCompanies);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create company';
      showToast(message, 'error');
    } finally {
      setCompanySaving(false);
    }
  }, [companyQuery, showToast]);

  const selectExistingDuplicate = useCallback(async (loc: LocationItem) => {
    handleLocationCreated(Number(loc.id));
    setLocationModalOpen(false);
  }, [handleLocationCreated]);

  const handleSkuCreated = (sku: SKU) => {
    const skuId = Number(sku.id);
    state.setOrderForm((f) => {
      const duplicate = f.lines.some(
        (line, i) => i !== skuLineIndex && line.productSkuId != null && Number(line.productSkuId) === skuId
      );
      if (duplicate) {
        showToast(state.t('erpOrdersDuplicateProduct'), 'warning');
        return f;
      }
      const lines = [...f.lines];
      while (lines.length <= skuLineIndex) {
        lines.push({ ...EMPTY_ORDER_LINE });
      }
      lines[skuLineIndex] = {
        ...lines[skuLineIndex],
        productSkuId: skuId,
        productName: sku.name,
        sku: sku.number,
      };
      return { ...f, lines };
    });
  };

  const handleCreateSku = async (values: NewSkuForm) => {
    setSkuSaving(true);
    try {
      const created = await productMasterService.createSku(values);
      state.prependSku(created);
      showToast(state.t('erpOrdersProductCreated'), 'success');
      handleSkuCreated(created);
      setSkuModalOpen(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : state.t('erpOrdersProductCreateError');
      showToast(message, 'error');
    } finally {
      setSkuSaving(false);
    }
  };

  if (viewMode !== 'orders') {
    return <ErpOrdersDeferredViews viewMode={viewMode} setViewMode={setViewMode} />;
  }

  return (
    <div className="erp-wrap">
      <ErpOrdersHeader
        t={state.t}
        summarySubtitle={state.summarySubtitle}
        selectedCount={state.selectedCount}
        openCreateOrder={state.openCreateOrder}
        openAiWizard={state.openAiWizard}
        onExport={state.handleExport}
        exporting={state.exporting}
        onCreateLoad={() => handleCreateLoad()}
      />

      <ErpOrdersKpiStrip
        t={state.t}
        kpiCounts={state.kpiCounts}
        kpiFilter={state.kpiFilter}
        selectKpi={state.selectKpi}
      />

      <ErpOrdersFilterBar
        t={state.t}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        highPriorityFilter={state.filters.highPriority}
        toggleHighPriorityFilter={state.toggleHighPriorityFilter}
        hasActiveFilters={state.hasActiveFilters}
        clearFilters={state.clearFilters}
      />

      <div className="erp-panes">
        <ErpOrdersTable
          t={state.t}
          orders={state.orders}
          listLoading={state.listLoading}
          sortField={state.sortField}
          sortDir={state.sortDir}
          doSort={state.doSort}
          openDrawer={state.openDrawer}
          statusLabel={state.statusLabel}
          selectedIds={state.selectedIds}
          selectedOrderId={state.selectedOrderId}
          toggleSelect={state.toggleSelect}
          toggleSelectAll={state.toggleSelectAll}
          clearSelection={state.clearSelection}
          onCreateLoad={() => handleCreateLoad()}
          listMeta={state.listMeta}
          currentPage={state.currentPage}
          perPage={state.perPage}
          pageSizeOptions={state.pageSizeOptions}
          goToPage={state.goToPage}
          setPageSize={state.setPageSize}
        />
      </div>

      <OrderDetailDrawer
        t={state.t}
        order={state.selectedOrder}
        loading={state.detailLoading}
        open={!!state.selectedOrderId}
        onClose={state.closeDrawer}
        onEdit={(order) => {
          state.closeDrawer();
          state.openEditOrder(order);
        }}
        onCreateLoad={(orderId) => {
          state.closeDrawer();
          handleCreateLoad(orderId);
        }}
        onResync={state.handleResync}
        statusLabel={state.statusLabel}
      />

      <CreateEditOrderModal
        t={state.t}
        isOpen={state.isFormOpen}
        isEdit={!!state.editingOrderId}
        form={state.orderForm}
        setForm={state.setOrderForm}
        onClose={state.closeForm}
        onSubmit={state.submitForm}
        saving={state.formSaving}
        companies={state.companies}
        locations={state.locations}
        skus={state.skus}
        onAddLocationOrigin={() => openLocationModal('origin')}
        onAddLocationDest={() => openLocationModal('dest')}
        onAddProduct={openSkuModal}
      />

      <CreateLocationModal
        isCreateOpen={locationModalOpen}
        closeCreateModal={() => setLocationModalOpen(false)}
        createStep={createStep}
        setCreateStep={setCreateStep}
        createData={createData}
        setCreateData={setCreateData}
        submitNewLocation={submitNewLocation}
        potentialDuplicates={potentialDuplicates}
        selectExistingDuplicate={selectExistingDuplicate}
        saving={savingLocation}
        filteredCompanies={filteredCompanies}
        setCompanyQuery={setCompanyQuery}
        setIsCompanyOpen={setIsCompanyOpen}
        handleApplyTemplate={(tpl) => setCreateData((prev) => applyTemplate(tpl, prev))}
        t={state.t}
      />

      <CreateCompanyModal
        isCompanyOpen={isCompanyOpen}
        closeCompanyModal={() => setIsCompanyOpen(false)}
        companyData={companyData}
        setCompanyData={setCompanyData}
        handleApplyCompany={handleApplyCompany}
      />

      <ProductMasterSkuModal
        isOpen={skuModalOpen}
        onClose={() => setSkuModalOpen(false)}
        onSubmit={handleCreateSku}
        saving={skuSaving}
        title={state.t('erpOrdersAddProduct')}
      />

      <OrdersAiWizardModal
        isOpen={state.isAiWizardOpen}
        onClose={state.closeAiWizard}
        onImportSuccess={state.handleAiWizardImportSuccess}
        downloadTemplate={state.downloadImportTemplate}
        showToast={showToast}
        companies={state.companies}
        locations={state.locations}
        skus={state.skus}
        t={state.t}
      />
    </div>
  );
};

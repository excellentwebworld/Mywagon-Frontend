import React, { useEffect, useState } from 'react';
import '../../styles/erp-orders.css';
import '../../styles/ai-wizard.css';
import { useErpOrdersList } from './hooks/useErpOrdersList';
import { useApp } from '../../context/AppContext';
import {
  ErpOrdersHeader,
  ErpOrdersKpiStrip,
  ErpOrdersFilterBar,
  ErpOrdersTable,
  OrderDetailDrawer,
  CreateEditOrderModal,
  OrdersAiWizardModal,
  ErpOrderQuickLocationModal,
  ErpOrderQuickSkuModal,
} from '../../components/ErpOrders';
import { ErpOrdersDeferredViews } from './ErpOrdersDeferredViews';
import type { ViewMode } from './types';

type LocationTarget = 'origin' | 'dest';

export const ErpOrders: React.FC = () => {
  const state = useErpOrdersList();
  const { showToast } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationTarget, setLocationTarget] = useState<LocationTarget>('origin');
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuLineIndex, setSkuLineIndex] = useState(0);

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

  const openLocationModal = (target: LocationTarget) => {
    setLocationTarget(target);
    setLocationModalOpen(true);
  };

  const openSkuModal = (lineIndex: number) => {
    setSkuLineIndex(lineIndex);
    setSkuModalOpen(true);
  };

  const handleLocationCreated = (locationId: number) => {
    state.refreshLocations();
    state.setOrderForm((f) => ({
      ...f,
      ...(locationTarget === 'origin'
        ? { originLocationId: locationId }
        : { destLocationId: locationId }),
    }));
  };

  const handleSkuCreated = (sku: { id: number; name: string; number: string }) => {
    state.refreshSkus();
    state.setOrderForm((f) => {
      const lines = [...f.lines];
      const line = lines[skuLineIndex] ?? { productSkuId: null, productName: '', quantity: null, unit: 'Pallets', weight: null, weightUnit: 'Kg' };
      lines[skuLineIndex] = {
        ...line,
        productSkuId: sku.id,
        productName: sku.name,
        sku: sku.number,
      };
      return { ...f, lines };
    });
  };

  if (viewMode !== 'orders') {
    return <ErpOrdersDeferredViews viewMode={viewMode} setViewMode={setViewMode} />;
  }

  return (
    <div className="erp-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <ErpOrdersHeader
        t={state.t}
        summarySubtitle={state.summarySubtitle}
        selectedCount={state.selectedCount}
        openCreateOrder={state.openCreateOrder}
        openAiWizard={state.openAiWizard}
        onExport={state.handleExport}
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

      <ErpOrderQuickLocationModal
        t={state.t}
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        companies={state.companies}
        defaultCompanyEntityId={state.orderForm.companyEntityId}
        onCreated={handleLocationCreated}
        showToast={showToast}
      />

      <ErpOrderQuickSkuModal
        t={state.t}
        isOpen={skuModalOpen}
        onClose={() => setSkuModalOpen(false)}
        onCreated={handleSkuCreated}
        showToast={showToast}
      />

      <OrdersAiWizardModal
        isOpen={state.isAiWizardOpen}
        onClose={state.closeAiWizard}
        onImportSuccess={state.handleAiWizardImportSuccess}
        downloadTemplate={state.downloadImportTemplate}
        showToast={showToast}
        t={state.t}
      />
    </div>
  );
};

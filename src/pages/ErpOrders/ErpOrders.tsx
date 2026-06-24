import React, { useEffect, useState } from 'react';
import '../../styles/erp-orders.css';
import '../../styles/ai-wizard.css';
import { useErpOrdersList } from './hooks/useErpOrdersList';
import { useApp } from '../../context/AppContext';
import {
  ErpOrdersHeader,
  ErpOrdersKpiStrip,
  ErpOrdersTabs,
  ErpOrdersFilterBar,
  ErpOrdersTable,
  OrderDetailDrawer,
  CreateEditOrderModal,
  OrdersAiWizardModal,
} from '../../components/ErpOrders';
import { ErpOrdersDeferredViews } from './ErpOrdersDeferredViews';
import type { ViewMode } from './types';

const TAB_CONFIG = [
  { key: 'workQueue' as const, labelKey: 'erpOrdersTabWork' },
  { key: 'all' as const, labelKey: 'erpOrdersTabAll' },
  { key: 'completed' as const, labelKey: 'erpOrdersTabCompleted' },
  { key: 'exceptions' as const, labelKey: 'erpOrdersTabExceptions' },
];

export const ErpOrders: React.FC = () => {
  const state = useErpOrdersList();
  const { showToast } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('orders');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state.isFormOpen) state.closeForm();
        else if (state.isAiWizardOpen) state.closeAiWizard();
        else if (state.selectedOrderId) state.closeDrawer();
        else if (viewMode !== 'orders') setViewMode('orders');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state, viewMode]);

  const handleCreateLoad = (singleOrderId?: string) => {
    if (state.goToCreateLoad(singleOrderId)) {
      setViewMode('create');
    }
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

      <ErpOrdersTabs
        t={state.t}
        tabs={TAB_CONFIG.map((tab) => ({ ...tab, count: state.tabCounts[tab.key] }))}
        activeTab={state.activeTab}
        setActiveTab={state.setActiveTab}
      />

      <ErpOrdersFilterBar
        t={state.t}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        filters={state.filters}
        setFilters={state.setFilters}
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
        onAddLocation={() => showToast(state.t('erpOrdersAddAddressHint'), 'info')}
        onAddProduct={() => showToast(state.t('erpOrdersAddProductHint'), 'info')}
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

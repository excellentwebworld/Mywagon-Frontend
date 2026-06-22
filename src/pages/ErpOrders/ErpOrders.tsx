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
  ErpOrdersPagination,
  OrderDetailDrawer,
  CreateEditOrderModal,
  OrdersAiWizardModal,
} from '../../components/ErpOrders';
import { ErpOrdersDeferredViews } from './ErpOrdersDeferredViews';
import type { ViewMode } from './types';

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

  if (viewMode !== 'orders') {
    return <ErpOrdersDeferredViews viewMode={viewMode} setViewMode={setViewMode} />;
  }

  return (
    <div className="erp-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="anim" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <ErpOrdersHeader
          t={state.t}
          summarySubtitle={state.summarySubtitle}
          openCreateOrder={state.openCreateOrder}
          openAiWizard={state.openAiWizard}
          downloadImportTemplate={state.downloadImportTemplate}
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
          highPriorityFilter={state.highPriorityFilter}
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
        />

        <ErpOrdersPagination
          t={state.t}
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

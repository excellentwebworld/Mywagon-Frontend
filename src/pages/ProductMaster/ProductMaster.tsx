import React from 'react';
import {
  FacetPane,
  FilterBar,
  KpiStrip,
  ProductDetailPanel,
  ProductList,
  ProductMasterHeader,
  ProductMasterModals,
  AiWizardModal,
} from '../../components/ProductMaster';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { useProductMaster } from './hooks/useProductMaster';
import '../../styles/product-master.css';
import '../../styles/ai-wizard.css';

export const ProductMaster: React.FC = () => {
  const pm = useProductMaster();

  return (
    <div className="pm-container anim">
      <ProductMasterHeader
        showToast={pm.showToast}
        addDropdownOpen={pm.addDropdownOpen}
        setAddDropdownOpen={pm.setAddDropdownOpen}
        openAddSku={pm.openAddSku}
        openAiWizard={pm.openAiWizard}
        handleCSVUpload={pm.handleCSVUpload}
        handleExport={pm.handleExport}
        exporting={pm.exporting}
        downloadTemplate={pm.downloadTemplate}
        t={pm.t}
      />

      {pm.subscriptionBlocked && (
        <div className="ab-subscription-banner" role="alert">
          {pm.error ?? 'Product Master access requires an active subscription.'}
        </div>
      )}

      {pm.error && !pm.loading && !pm.subscriptionBlocked && (
        <div className="ab-error-banner" role="alert">
          {pm.error}
        </div>
      )}

      <KpiStrip
        t={pm.t}
        kpiFilter={pm.kpiFilter}
        handleKpiClick={pm.handleKpiClick}
        totalSkusCount={pm.totalSkusCount}
        unmappedCount={pm.unmappedCount}
        inactiveCount={pm.inactiveCount}
      />

      <FilterBar
        categories={pm.categories}
        catName={pm.catName}
        searchQuery={pm.searchQuery}
        handleSearchChange={pm.handleSearchChange}
        filterActive={pm.filterActive}
        setFilterActive={pm.setFilterActive}
        filterCat={pm.filterCat}
        setFilterCat={pm.setFilterCat}
        filterUnmapped={pm.filterUnmapped}
        setFilterUnmapped={pm.setFilterUnmapped}
        clearFilters={pm.clearFilters}
        clearSelection={pm.clearSelection}
      />

      <div className="panes">
        <FacetPane
          categories={pm.categories}
          productTypes={pm.productTypes}
          totalSkusCount={pm.totalSkusCount}
          getCategoryCount={pm.getCategoryCount}
          getTypeCount={pm.getTypeCount}
          viewMode={pm.viewMode}
          setViewMode={pm.setViewMode}
          activeCat={pm.activeCat}
          setActiveCat={pm.setActiveCat}
          activeType={pm.activeType}
          setActiveType={pm.setActiveType}
          unmappedCount={pm.unmappedCount}
          catName={pm.catName}
          loadTypeDetail={pm.loadTypeDetail}
          clearSelection={pm.clearSelection}
        />

        <ProductList
          viewMode={pm.viewMode}
          sortBy={pm.sortBy}
          setSortBy={pm.setSortBy}
          filteredSkus={pm.filteredSkus}
          filteredTypes={pm.filteredTypes}
          categories={pm.categories}
          productTypes={pm.productTypes}
          catName={pm.catName}
          selectedIds={pm.selectedIds}
          selectedItem={pm.selectedItem}
          selectedKind={pm.selectedKind}
          loadSkuDetail={pm.loadSkuDetail}
          loadTypeDetail={pm.loadTypeDetail}
          handleSelectAll={pm.handleSelectAll}
          handleToggleRowSelection={pm.handleToggleRowSelection}
          handleBulkArchive={pm.handleBulkArchive}
          loading={pm.loading}
          currentPage={pm.currentPage}
          setCurrentPage={pm.setCurrentPage}
          perPage={pm.perPage}
          setPerPage={pm.setPerPage}
          listMeta={pm.listMeta}
        />

        <ProductDetailPanel
          categories={pm.categories}
          productTypes={pm.productTypes}
          catName={pm.catName}
          selectedItem={pm.selectedItem}
          selectedKind={pm.selectedKind}
          detailLoading={pm.detailLoading}
          typeMappedSkus={pm.typeMappedSkus}
          typeSkusLoading={pm.typeSkusLoading}
          clearSelection={pm.clearSelection}
          openEditSku={pm.openEditSku}
          handleToggleActive={pm.handleToggleActive}
          loadSkuDetail={pm.loadSkuDetail}
        />
      </div>

      <ProductMasterModals {...pm} />

      <AiWizardModal
        isOpen={pm.isAiWizardOpen}
        onClose={pm.closeAiWizard}
        onImportSuccess={pm.handleAiWizardImportSuccess}
        downloadTemplate={pm.downloadTemplate}
        t={pm.t}
      />

      {/* Deactivate SKU Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!pm.deactivateConfirmSku}
        onClose={() => pm.setDeactivateConfirmSku(null)}
        onConfirm={pm.confirmDeactivate}
        title={pm.t('deactivateSkuTitle')}
        type="danger"
        confirmText={pm.t('deactivate')}
        cancelText={pm.t('cancel')}
        confirmLoading={pm.saving}
        message={
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {pm.t('deactivateSkuQuestion', { name: pm.deactivateConfirmSku?.name || '' })}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
              {pm.t('deactivateSkuWarning')}
            </p>
          </>
        }
      />

      {/* Bulk Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={pm.archiveConfirmOpen}
        onClose={() => pm.setArchiveConfirmOpen(false)}
        onConfirm={pm.confirmBulkArchive}
        title={pm.t('archive') || 'Archive'}
        type="danger"
        confirmText={pm.t('archive') || 'Archive'}
        cancelText={pm.t('cancel')}
        confirmLoading={pm.saving}
        message={
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {pm.t('bulkArchiveConfirm')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
              {pm.t('bulkArchiveWarning')}
            </p>
          </>
        }
      />
    </div>
  );
};

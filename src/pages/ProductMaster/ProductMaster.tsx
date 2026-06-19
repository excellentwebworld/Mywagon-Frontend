import React from 'react';
import {
  FacetPane,
  FilterBar,
  KpiStrip,
  ProductDetailPanel,
  ProductList,
  ProductMasterHeader,
  ProductMasterModals,
} from '../../components/ProductMaster';
import { useProductMaster } from './hooks/useProductMaster';
import '../../styles/product-master.css';

export const ProductMaster: React.FC = () => {
  const pm = useProductMaster();

  return (
    <div className="pm-container anim">
      <ProductMasterHeader
        showToast={pm.showToast}
        addDropdownOpen={pm.addDropdownOpen}
        setAddDropdownOpen={pm.setAddDropdownOpen}
        openAddSku={pm.openAddSku}
        handleCSVUpload={pm.handleCSVUpload}
        handleExport={pm.handleExport}
        exporting={pm.exporting}
        downloadTemplate={pm.downloadTemplate}
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
    </div>
  );
};

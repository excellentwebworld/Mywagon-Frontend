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
        openAddType={pm.openAddType}
        openAddSku={pm.openAddSku}
        openAddCategory={pm.openAddCategory}
        handleCSVUpload={pm.handleCSVUpload}
        setIsSyncLogOpen={pm.setIsSyncLogOpen}
      />

      <KpiStrip
        t={pm.t}
        kpiFilter={pm.kpiFilter}
        handleKpiClick={pm.handleKpiClick}
        totalSkusCount={pm.totalSkusCount}
        erpSyncedCount={pm.erpSyncedCount}
        manualCount={pm.manualCount}
        syncIssuesCount={pm.syncIssuesCount}
        unmappedCount={pm.unmappedCount}
        inactiveCount={pm.inactiveCount}
      />

      <FilterBar
        categories={pm.categories}
        catName={pm.catName}
        searchQuery={pm.searchQuery}
        handleSearchChange={pm.handleSearchChange}
        filterSource={pm.filterSource}
        setFilterSource={pm.setFilterSource}
        filterSync={pm.filterSync}
        setFilterSync={pm.setFilterSync}
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
          skus={pm.skus}
          viewMode={pm.viewMode}
          setViewMode={pm.setViewMode}
          activeCat={pm.activeCat}
          setActiveCat={pm.setActiveCat}
          activeType={pm.activeType}
          setActiveType={pm.setActiveType}
          unmappedCount={pm.unmappedCount}
          catName={pm.catName}
          setSelectedItem={pm.setSelectedItem}
          setSelectedKind={pm.setSelectedKind}
          clearSelection={pm.clearSelection}
          setIsCatOpen={pm.setIsCatOpen}
        />

        <ProductList
          viewMode={pm.viewMode}
          sortBy={pm.sortBy}
          setSortBy={pm.setSortBy}
          filteredSkus={pm.filteredSkus}
          filteredTypes={pm.filteredTypes}
          categories={pm.categories}
          productTypes={pm.productTypes}
          skus={pm.skus}
          catName={pm.catName}
          selectedIds={pm.selectedIds}
          setSelectedIds={pm.setSelectedIds}
          selectedItem={pm.selectedItem}
          selectedKind={pm.selectedKind}
          setSelectedItem={pm.setSelectedItem}
          setSelectedKind={pm.setSelectedKind}
          handleSelectAll={pm.handleSelectAll}
          handleToggleRowSelection={pm.handleToggleRowSelection}
          handleBulkToggleActive={pm.handleBulkToggleActive}
          handleBulkArchive={pm.handleBulkArchive}
          setIsBulkMapOpen={pm.setIsBulkMapOpen}
          setBulkMapTarget={pm.setBulkMapTarget}
        />

        <ProductDetailPanel
          categories={pm.categories}
          productTypes={pm.productTypes}
          skus={pm.skus}
          catName={pm.catName}
          selectedItem={pm.selectedItem}
          selectedKind={pm.selectedKind}
          clearSelection={pm.clearSelection}
          secCollapsed={pm.secCollapsed}
          toggleSec={pm.toggleSec}
          openEditSku={pm.openEditSku}
          updateSku={pm.updateSku}
          setSelectedItem={pm.setSelectedItem}
          setSelectedKind={pm.setSelectedKind}
          setRenameId={pm.setRenameId}
          setRenameName={pm.setRenameName}
          setIsRenameOpen={pm.setIsRenameOpen}
          setMergeSrc={pm.setMergeSrc}
          setMergeTarget={pm.setMergeTarget}
          setIsMergeOpen={pm.setIsMergeOpen}
          updateProductType={pm.updateProductType}
          showToast={pm.showToast}
        />
      </div>

      <ProductMasterModals {...pm} />
    </div>
  );
};

import React from 'react';
import {
  AddressBookHeader,
  CreateCompanyModal,
  CreateLocationModal,
  DirectoryPane,
  EditLocationModal,
  FilterBar,
  LocationDetailPanel,
  LocationList,
} from '../../components/AddressBook';
import { useAddressBook } from './hooks/useAddressBook';
import '../../styles/address-book.css';

export const AddressBook: React.FC = () => {
  const ab = useAddressBook();

  return (
    <div className="ab-wrap anim">
      <AddressBookHeader
        lang={ab.lang}
        t={ab.t}
        exportExcel={ab.exportExcel}
        exporting={ab.exporting}
        openCreateModal={ab.openCreateModal}
      />

      {ab.subscriptionBlocked && (
        <div className="ab-subscription-banner" role="alert">
          {ab.error ?? 'Address Book access requires an active subscription.'}
        </div>
      )}

      {ab.error && !ab.loading && !ab.subscriptionBlocked && (
        <div className="ab-error-banner" role="alert">
          {ab.error}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => ab.refreshLocations()}>
            Retry
          </button>
        </div>
      )}

      <FilterBar lang={ab.lang} searchQuery={ab.searchQuery} handleSearchChange={ab.handleSearchChange} />

      <div className="ab-panes">
        <DirectoryPane lang={ab.lang} summary={ab.summary} activeNode={ab.activeNode} selectNode={ab.selectNode} />

        <LocationList
          activeDirectoryName={ab.activeDirectoryName}
          activeNode={ab.activeNode}
          sortBy={ab.sortBy}
          setSortBy={ab.setSortBy}
          filteredLocations={ab.filteredLocations}
          selectedLoc={ab.selectedLoc}
          setSelectedLoc={ab.setSelectedLoc}
          loading={ab.loading}
          saving={ab.saving}
          listMeta={ab.listMeta}
          currentPage={ab.currentPage}
          setCurrentPage={ab.setCurrentPage}
          perPage={ab.perPage}
          setPerPage={ab.setPerPage}
          pageStart={ab.pageStart}
          pageEnd={ab.pageEnd}
          openEditModal={ab.openEditModal}
          handleArchive={ab.handleArchive}
          handleRestore={ab.handleRestore}
          t={ab.t}
          showToast={ab.showToast}
          lang={ab.lang}
        />

        <LocationDetailPanel
          selectedLoc={ab.selectedLoc}
          setSelectedLoc={ab.setSelectedLoc}
          detailLoading={ab.detailLoading}
          saving={ab.saving}
          t={ab.t}
          showToast={ab.showToast}
          handleCopy={ab.handleCopy}
          handleDuplicate={ab.handleDuplicate}
          openEditModal={ab.openEditModal}
          handleArchive={ab.handleArchive}
          handleRestore={ab.handleRestore}
          goToCreateShipment={ab.goToCreateShipment}
        />
      </div>

      <CreateLocationModal
        isCreateOpen={ab.isCreateOpen}
        closeCreateModal={ab.closeCreateModal}
        createStep={ab.createStep}
        setCreateStep={ab.setCreateStep}
        createData={ab.createData}
        setCreateData={ab.setCreateData}
        handleApplyTemplate={ab.handleApplyTemplate}
        submitNewLocation={ab.submitNewLocation}
        potentialDuplicates={ab.potentialDuplicates}
        selectExistingDuplicate={ab.selectExistingDuplicate}
        saving={ab.saving}
        amenities={ab.amenities}
        showToast={ab.showToast}
        filteredCompanies={ab.filteredCompanies}
        setCompanyQuery={ab.setCompanyQuery}
        companyDropdownOpen={ab.companyDropdownOpen}
        setCompanyDropdownOpen={ab.setCompanyDropdownOpen}
        setIsCompanyOpen={ab.setIsCompanyOpen}
      />

      <EditLocationModal
        editData={ab.editData}
        setEditData={ab.setEditData}
        isEditOpen={ab.isEditOpen}
        closeEditModal={ab.closeEditModal}
        saveEditedLocation={ab.saveEditedLocation}
        saving={ab.saving}
        amenities={ab.amenities}
      />

      <CreateCompanyModal
        isCompanyOpen={ab.isCompanyOpen}
        closeCompanyModal={ab.closeCompanyModal}
        companyData={ab.companyData}
        setCompanyData={ab.setCompanyData}
        handleApplyCompany={ab.handleApplyCompany}
      />
    </div>
  );
};

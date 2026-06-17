import React, { useEffect } from 'react';
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
  const { setIconPickerOpen } = ab;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.icon-picker-wrap')) {
        setIconPickerOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [setIconPickerOpen]);

  return (
    <div className="ab-wrap anim">
      <AddressBookHeader lang={ab.lang} t={ab.t} showToast={ab.showToast} openCreateModal={ab.openCreateModal} />

      <FilterBar
        lang={ab.lang}
        t={ab.t}
        searchQuery={ab.searchQuery}
        handleSearchChange={ab.handleSearchChange}
        activeFilters={ab.activeFilters}
        toggleFilter={ab.toggleFilter}
        clearFilters={ab.clearFilters}
      />

      <div className="ab-panes">
        <DirectoryPane
          lang={ab.lang}
          locations={ab.locations}
          directories={ab.directories}
          activeNode={ab.activeNode}
          selectNode={ab.selectNode}
          deleteDirectory={ab.deleteDirectory}
          addingDir={ab.addingDir}
          setAddingDir={ab.setAddingDir}
          newDirName={ab.newDirName}
          setNewDirName={ab.setNewDirName}
          newDirIcon={ab.newDirIcon}
          setNewDirIcon={ab.setNewDirIcon}
          iconPickerOpen={ab.iconPickerOpen}
          setIconPickerOpen={ab.setIconPickerOpen}
          saveNewDir={ab.saveNewDir}
        />

        <LocationList
          activeDirectory={ab.activeDirectory}
          sortBy={ab.sortBy}
          setSortBy={ab.setSortBy}
          filteredLocations={ab.filteredLocations}
          selectedLoc={ab.selectedLoc}
          setSelectedLoc={ab.setSelectedLoc}
          t={ab.t}
          showToast={ab.showToast}
          lang={ab.lang}
        />

        <LocationDetailPanel
          selectedLoc={ab.selectedLoc}
          setSelectedLoc={ab.setSelectedLoc}
          t={ab.t}
          showToast={ab.showToast}
          handleCopy={ab.handleCopy}
          handleDuplicate={ab.handleDuplicate}
          openEditModal={ab.openEditModal}
          handleArchive={ab.handleArchive}
          handleRestore={ab.handleRestore}
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
      />

      <CreateCompanyModal
        isCompanyOpen={ab.isCompanyOpen}
        closeCompanyModal={ab.closeCompanyModal}
        companyData={ab.companyData}
        setCompanyData={ab.setCompanyData}
        handleCreateCompany={ab.handleCreateCompany}
      />
    </div>
  );
};

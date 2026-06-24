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
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { useAddressBook } from './hooks/useAddressBook';
import '../../styles/address-book.css';

export const AddressBook: React.FC = () => {
  const ab = useAddressBook();

  return (
    <div className="ab-wrap anim">
      <AddressBookHeader
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

      <FilterBar searchQuery={ab.searchQuery} handleSearchChange={ab.handleSearchChange} />

      <div className="ab-panes">
        <DirectoryPane summary={ab.summary} activeNode={ab.activeNode} selectNode={ab.selectNode} />

        <LocationList
          activeDirectoryName={ab.activeDirectoryName}
          activeNode={ab.activeNode}
          sortField={ab.sortField}
          sortDir={ab.sortDir}
          toggleSort={ab.toggleSort}
          filteredLocations={ab.filteredLocations}
          selectedLoc={ab.selectedLoc}
          setSelectedLoc={ab.setSelectedLoc}
          loading={ab.loading}
          listFetching={ab.listFetching}
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
        />

        <LocationDetailPanel
          selectedLoc={ab.selectedLoc}
          setSelectedLoc={ab.setSelectedLoc}
          detailLoading={ab.detailLoading}
          saving={ab.saving}
          t={ab.t}
          handleCopy={ab.handleCopy}
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
        submitNewLocation={ab.submitNewLocation}
        potentialDuplicates={ab.potentialDuplicates}
        selectExistingDuplicate={ab.selectExistingDuplicate}
        saving={ab.saving}
        filteredCompanies={ab.filteredCompanies}
        setCompanyQuery={ab.setCompanyQuery}
        setIsCompanyOpen={ab.setIsCompanyOpen}
        handleApplyTemplate={ab.handleApplyTemplate}
        t={ab.t}
      />

      <EditLocationModal
        editData={ab.editData}
        isEditOpen={ab.isEditOpen}
        closeEditModal={ab.closeEditModal}
        saveEditedLocation={ab.saveEditedLocation}
        saving={ab.saving}
        t={ab.t}
      />

      <CreateCompanyModal
        isCompanyOpen={ab.isCompanyOpen}
        closeCompanyModal={ab.closeCompanyModal}
        companyData={ab.companyData}
        setCompanyData={ab.setCompanyData}
        handleApplyCompany={ab.handleApplyCompany}
      />

      <ConfirmationModal
        isOpen={!!ab.archiveConfirmLoc}
        onClose={() => ab.setArchiveConfirmLoc(null)}
        onConfirm={ab.confirmArchive}
        title={ab.t('archiveLocation')}
        type="danger"
        confirmText={ab.t('archive') || 'Archive'}
        cancelText={ab.t('cancel') || 'Cancel'}
        confirmLoading={ab.saving}
        message={
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {ab.t('archiveLocationQuestion', { name: ab.archiveConfirmLoc?.name || '' })}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
              {ab.t('archiveLocationWarning')}
            </p>
          </>
        }
      />
    </div>
  );
};

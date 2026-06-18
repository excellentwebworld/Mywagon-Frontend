import React, { useEffect } from 'react';
import '../../styles/partners.css';
import { usePartners } from './hooks/usePartners';
import {
  PartnersHeader,
  PartnersKpiStrip,
  PartnersFilterBar,
  PartnersFacetPane,
  PartnersList,
  PartnerDetailPanel,
  InvitePartnerModal,
  PartnersGenericModal,
} from '../../components/Partners';

const Partners: React.FC = () => {
  const state = usePartners();

  // Close dropdowns on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        state.closeInviteModal();
        state.closeGenericModal();
        state.closeDetailPanel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.closeInviteModal, state.closeGenericModal, state.closeDetailPanel]);

  return (
    <div className="ptn-wrap">
      {/* Header */}
      <PartnersHeader
        t={state.t}
        showToast={state.showToast}
        openInviteModal={state.openInviteModal}
        openGenericModal={state.openGenericModal}
        exportCsv={state.exportCsv}
      />

      {/* KPI Strip */}
      <PartnersKpiStrip
        t={state.t}
        kpiCounts={state.kpiCounts}
        kpiFilter={state.kpiFilter}
        selectKpi={state.selectKpi}
      />

      {/* Filter Bar */}
      <PartnersFilterBar
        t={state.t}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        activeFilters={state.activeFilters}
        toggleBarFilter={state.toggleBarFilter}
        clearAllFilters={state.clearAllFilters}
        openFilterDropdown={state.openFilterDropdown}
        toggleFilterDropdown={state.toggleFilterDropdown}
        rName={state.rName}
        closeDetailPanel={state.closeDetailPanel}
      />

      {/* 3-Pane layout */}
      <div className="ptn-panes">
        {/* Left: Facet Navigation */}
        <PartnersFacetPane
          t={state.t}
          facetFilter={state.facetFilter}
          selectFacet={state.selectFacet}
          facetCounts={state.facetCounts}
          rName={state.rName}
        />

        {/* Center: Partner List */}
        <PartnersList
          t={state.t}
          filteredPartners={state.filteredPartners}
          sortBy={state.sortBy}
          setSortBy={state.setSortBy}
          facetFilter={state.facetFilter}
          selectedPartner={state.selectedPartner}
          expandedRowId={state.expandedRowId}
          openDetailPanel={state.openDetailPanel}
          rName={state.rName}
          showToast={state.showToast}
        />

        {/* Right: Detail Panel */}
        <PartnerDetailPanel
          t={state.t}
          selectedPartner={state.selectedPartner}
          openSections={state.openSections}
          closeDetailPanel={state.closeDetailPanel}
          toggleSection={state.toggleSection}
          suspendPartner={state.suspendPartner}
          reactivatePartner={state.reactivatePartner}
          permanentlyRemovePartner={state.permanentlyRemovePartner}
          deleteContractLane={state.deleteContractLane}
          openGenericModal={state.openGenericModal}
          saveNote={state.saveNote}
          showToast={state.showToast}
          rName={state.rName}
        />
      </div>

      {/* Modals */}
      <InvitePartnerModal
        t={state.t}
        isInviteOpen={state.isInviteOpen}
        inviteForm={state.inviteForm}
        setInviteForm={state.setInviteForm}
        closeInviteModal={state.closeInviteModal}
        sendInvite={state.sendInvite}
        openGenericModal={state.openGenericModal}
      />

      <PartnersGenericModal
        t={state.t}
        selectedPartner={state.selectedPartner}
        genericModal={state.genericModal}
        closeGenericModal={state.closeGenericModal}
        saveCapability={state.saveCapability}
        capTruckType={state.capTruckType}
        setCapTruckType={state.setCapTruckType}
        laneOrigin={state.laneOrigin}
        setLaneOrigin={state.setLaneOrigin}
        laneDest={state.laneDest}
        setLaneDest={state.setLaneDest}
        laneUnit={state.laneUnit}
        setLaneUnit={state.setLaneUnit}
        lanePrice={state.lanePrice}
        setLanePrice={state.setLanePrice}
        saveContractLane={state.saveContractLane}
        bankIban={state.bankIban}
        setBankIban={state.setBankIban}
        bankBeneficiary={state.bankBeneficiary}
        setBankBeneficiary={state.setBankBeneficiary}
        saveBankDetails={state.saveBankDetails}
        custName={state.custName}
        setCustName={state.setCustName}
        custCompany={state.custCompany}
        setCustCompany={state.setCustCompany}
        custEmail={state.custEmail}
        setCustEmail={state.setCustEmail}
        custPhone={state.custPhone}
        setCustPhone={state.setCustPhone}
        custVat={state.custVat}
        setCustVat={state.setCustVat}
        custRegion={state.custRegion}
        setCustRegion={state.setCustRegion}
        saveCustomer={state.saveCustomer}
        showToast={state.showToast}
        rName={state.rName}
      />
    </div>
  );
};

export default Partners;

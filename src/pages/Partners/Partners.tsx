import React, { useEffect, useMemo } from 'react';
import '../../styles/partners.css';
import { usePartners } from './hooks/usePartners';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        state.closeInviteModal();
        state.closeGenericModal();
        state.closeDetailPanel();
        state.setConfirmAction(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.closeInviteModal, state.closeGenericModal, state.closeDetailPanel, state.setConfirmAction]);

  const confirmConfig = useMemo(() => {
    if (!state.confirmAction) return null;
    const { type, partner } = state.confirmAction;
    const name = partner.name;
    switch (type) {
      case 'suspend':
        return { title: state.t('confirmSuspendPartner'), message: name, confirmLabel: state.t('partnerSuspend'), variant: 'danger' as const };
      case 'reactivate':
        return { title: state.t('confirmReactivatePartner'), message: name, confirmLabel: state.t('partnerReactivate'), variant: 'primary' as const };
      case 'remove':
        return { title: state.t('confirmRemovePartner'), message: `Remove request to ` + name, confirmLabel: state.t('partnerRemove'), variant: 'danger' as const };
      case 'decline':
        return { title: state.t('confirmDeclinePartner'), message: name, confirmLabel: state.t('decline'), variant: 'danger' as const };
      case 'deleteLane':
        return { title: state.t('confirmRemoveLane'), message: '', confirmLabel: state.t('partnerRemove'), variant: 'danger' as const };
      default:
        return null;
    }
  }, [state.confirmAction, state.t]);

  return (
    <div className="ptn-wrap">
      {state.subscriptionBlocked && state.error && (
        <div className="ptn-subscription-banner" role="alert">
          {state.error}
        </div>
      )}

      <PartnersHeader t={state.t} openInviteModal={state.openInviteModal} />

      <PartnersKpiStrip
        t={state.t}
        kpiCounts={state.kpiCounts}
        kpiFilter={state.kpiFilter}
        selectKpi={state.selectKpi}
      />

      <PartnersFilterBar
        t={state.t}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        activeFilters={state.activeFilters}
        toggleBarFilter={state.toggleBarFilter}
        clearAllFilters={state.clearAllFilters}
        openFilterDropdown={state.openFilterDropdown}
        toggleFilterDropdown={state.toggleFilterDropdown}
        truckCategories={state.truckCategories}
        closeDetailPanel={state.closeDetailPanel}
        subscriptionBlocked={state.subscriptionBlocked}
      />

      <div className="ptn-panes">
        <PartnersFacetPane
          t={state.t}
          facetFilter={state.facetFilter}
          selectFacet={state.selectFacet}
          facetCounts={state.facetCounts}
        />

        <PartnersList
          t={state.t}
          filteredPartners={state.filteredPartners}
          sortBy={state.sortBy}
          setSortBy={state.setSortBy}
          facetFilter={state.facetFilter}
          selectedPartner={state.selectedPartner}
          openDetailPanel={state.openDetailPanel}
          listMeta={state.listMeta}
          listLoading={state.listLoading}
          currentPage={state.currentPage}
          perPage={state.perPage}
          pageSizeOptions={state.pageSizeOptions}
          goToPage={state.goToPage}
          setPageSize={state.setPageSize}
          acceptPartner={state.acceptPartner}
          declinePartner={state.declinePartner}
        />

        <PartnerDetailPanel
          t={state.t}
          selectedPartner={state.selectedPartner}
          detailLoading={state.detailLoading}
          openSections={state.openSections}
          closeDetailPanel={state.closeDetailPanel}
          toggleSection={state.toggleSection}
          suspendPartner={state.suspendPartner}
          reactivatePartner={state.reactivatePartner}
          permanentlyRemovePartner={state.permanentlyRemovePartner}
          cancelInvite={state.cancelInvite}
          acceptPartner={state.acceptPartner}
          declinePartner={state.declinePartner}
          togglePreferred={state.togglePreferred}
          deleteContractLane={state.deleteContractLane}
          openGenericModal={state.openGenericModal}
          saveNote={state.saveNote}
          saveTags={state.saveTags}
        />
      </div>

      <InvitePartnerModal
        t={state.t}
        isInviteOpen={state.isInviteOpen}
        inviteForm={state.inviteForm}
        setInviteForm={state.setInviteForm}
        closeInviteModal={state.closeInviteModal}
        sendInvite={state.sendInvite}
        inviteLoading={state.inviteLoading}
      />

      <PartnersGenericModal
        t={state.t}
        genericModal={state.genericModal}
        closeGenericModal={state.closeGenericModal}
        laneOrigin={state.laneOrigin}
        setLaneOrigin={state.setLaneOrigin}
        laneDest={state.laneDest}
        setLaneDest={state.setLaneDest}
        laneUnit={state.laneUnit}
        setLaneUnit={state.setLaneUnit}
        lanePrice={state.lanePrice}
        setLanePrice={state.setLanePrice}
        saveContractLane={state.saveContractLane}
      />

      {confirmConfig && (
        <ConfirmationModal
          isOpen={!!state.confirmAction}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmLabel}
          cancelText={state.t('cancel')}
          type={confirmConfig.variant === 'primary' ? 'success' : 'danger'}
          onConfirm={state.executeConfirm}
          onClose={() => state.setConfirmAction(null)}
        />
      )}
    </div>
  );
};

export default Partners;

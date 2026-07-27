import React from 'react';
import {
  BulkBar,
  CancelShipmentModal,
  FilterChips,
  FilterModal,
  InviteCarrierModal,
  KpiStrip,
  ListToolbar,
  LoadsDirectionToggle,
  Pagination,
  ShipmentTable,
  SortModal,
  StatusTabs,
} from '../../components/ManageShipments';
import { KpiStripSkeleton } from '../../components/skeletons/ManageShipmentsSkeleton';
import { useManageShipments } from './hooks/useManageShipments';
import '../../styles/manage.css';

export const ManageShipments: React.FC = () => {
  const m = useManageShipments();

  return (
    <div className="mgmt-page">
      <h1 className="pg-title">{m.t('shipmentsTitle') || 'Shipments'}</h1>

      <LoadsDirectionToggle direction={m.direction} onChange={m.setDirection} t={m.t} />

      {m.error && (
        <div style={{ marginBottom: 12, color: 'var(--danger)' }}>
          {m.t(m.error) !== m.error ? m.t(m.error) : m.error}
        </div>
      )}

      {m.loading ? (
        <KpiStripSkeleton />
      ) : (
        <KpiStrip counts={m.kpiCounts} activeKpi={m.activeKpi} onKpiClick={m.setActiveKpi} t={m.t} />
      )}

      <ListToolbar
        searchQuery={m.searchQuery}
        onSearchChange={m.setSearchQuery}
        onOpenFilter={() => m.setIsFilterOpen(true)}
        onOpenSort={() => m.setIsSortOpen(true)}
        onExport={m.handleExport}
        sortActive={Boolean(m.sortKey)}
        filterActive={m.filtersActive}
        exporting={m.exporting}
        t={m.t}
      />

      <StatusTabs
        statusCounts={m.statusCounts}
        activeTab={m.activeTab}
        onTabChange={m.setActiveTab}
        t={m.t}
      />

      <FilterChips
        chips={m.filterChips}
        kpiChip={m.kpiChip}
        onClearKpi={() => m.setActiveKpi(null)}
        onClearChip={m.handleClearFilterChip}
        onClearAll={m.handleClearAllFilters}
        t={m.t}
      />

      <div className="tbl-block">
        <div className="tbl-wrap">
          <ShipmentTable
            loading={m.loading}
            shipments={m.pagination.items}
            activeTab={m.activeTab}
            selectedIds={m.selectedIds}
            expandedId={m.expandedId}
            detailLoadingIds={m.detailLoadingIds}
            detailRefreshingIds={m.detailRefreshingIds}
            isDetailCached={m.isDetailCached}
            resolveShipment={m.mergedShipment}
            emptyReason={m.filtersActive ? 'filters' : 'default'}
            onClearFilters={m.handleClearAllFilters}
            onSelectAll={m.handleSelectAll}
            onSelectRow={m.handleSelectRow}
            onToggleExpand={m.handleToggleExpand}
            onRefreshDetail={m.handleRefreshExpanded}
            onCopyId={m.handleCopyId}
            onDelete={m.handleDeleteRequest}
            onEdit={m.handleEdit}
            onViewNewTab={m.handleViewNewTab}
            onMessage={m.handleMessage}
            onAcceptOffer={m.handleAcceptOffer}
            onRejectOffer={m.handleRejectOffer}
            onCounterOffer={m.handleCounterOffer}
            onRemindInvitee={m.handleRemindInvitee}
            onRemoveInvitee={m.handleRemoveInvitee}
            onInviteMore={m.handleInviteMore}
            onEditBlocked={m.handleEditBlocked}
            t={m.t}
          />
        </div>
        <Pagination
          page={m.pagination.page}
          totalPages={m.pagination.totalPages}
          total={m.pagination.total}
          perPage={m.perPage}
          onPageChange={m.setPage}
          t={m.t}
        />
      </div>

      <BulkBar
        count={m.selectedIds.size}
        onCancel={() => m.handleBulkAction('cancel')}
        onExport={() => m.handleBulkAction('export')}
        onClose={m.clearSelection}
        t={m.t}
      />

      <InviteCarrierModal
        open={m.isInviteOpen}
        carriers={m.invitePartners}
        loading={m.invitePartnersLoading}
        error={m.invitePartnersError}
        query={m.inviteQuery}
        selected={m.invitedCarriers}
        alreadyInvitedIds={m.alreadyInvitedPartnerIds}
        targetLoadCount={m.inviteTargetIds.length || 1}
        onQueryChange={m.setInviteQuery}
        onToggle={m.handleToggleInviteCarrier}
        onClose={m.closeInviteModal}
        onSend={m.handleSendInvites}
        t={m.t}
      />

      <FilterModal
        open={m.isFilterOpen}
        filters={m.appliedFilters}
        transporterOptions={m.filterTransporterOptions}
        customerOptions={m.filterCustomerOptions}
        onClose={() => m.setIsFilterOpen(false)}
        onApply={m.handleApplyFilters}
        t={m.t}
      />

      <SortModal
        open={m.isSortOpen}
        sortKey={m.sortKey}
        onClose={() => m.setIsSortOpen(false)}
        onApply={m.handleApplySort}
        t={m.t}
      />

      <CancelShipmentModal
        open={Boolean(m.cancelTarget) || Boolean(m.bulkCancelIds?.length)}
        shipment={m.cancelTarget}
        shipmentIds={m.bulkCancelIds}
        onClose={() => {
          m.setCancelTarget(null);
          m.setBulkCancelIds(null);
        }}
        onCancelled={m.bulkCancelIds?.length ? m.handleBulkCancelled : m.handleCancelled}
        t={m.t}
      />
    </div>
  );
};

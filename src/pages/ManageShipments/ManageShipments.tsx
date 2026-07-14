import React from 'react';
import {
  BulkBar,
  FilterChips,
  FilterModal,
  InviteCarrierModal,
  KpiStrip,
  ListToolbar,
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

      {m.error && <div style={{ marginBottom: 12, color: 'var(--danger)' }}>{m.error}</div>}

      {m.loading && m.pagination.total === 0 ? (
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
        onClearChip={m.handleClearFilterChip}
        onClearAll={m.handleClearAllFilters}
        t={m.t}
      />

      <div className="tbl-wrap">
        <ShipmentTable
          loading={m.loading}
          shipments={m.pagination.items}
          selectedIds={m.selectedIds}
          expandedId={m.expandedId}
          onSelectAll={m.handleSelectAll}
          onSelectRow={m.handleSelectRow}
          onToggleExpand={m.handleToggleExpand}
          onCopyId={m.handleCopyId}
          onAward={m.handleAward}
          onInvite={() => m.setIsInviteOpen(true)}
          onClone={m.handleClone}
          t={m.t}
        />
        <Pagination
          page={m.pagination.page}
          totalPages={m.pagination.totalPages}
          total={m.pagination.total}
          perPage={10}
          onPageChange={m.setPage}
          t={m.t}
        />
      </div>

      <BulkBar
        count={m.selectedIds.size}
        onCancel={() => m.handleBulkAction('cancel')}
        onInvite={() => m.handleBulkAction('invite')}
        onExtend={() => m.handleBulkAction('extend')}
        onExport={() => m.handleBulkAction('export')}
        onClose={m.clearSelection}
        t={m.t}
      />

      <InviteCarrierModal
        open={m.isInviteOpen}
        carriers={m.carriers}
        query={m.inviteQuery}
        selected={m.invitedCarriers}
        onQueryChange={m.setInviteQuery}
        onToggle={m.handleToggleInviteCarrier}
        onClose={() => m.setIsInviteOpen(false)}
        onSend={m.handleSendInvites}
        t={m.t}
      />

      <FilterModal
        open={m.isFilterOpen}
        filters={m.appliedFilters}
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
    </div>
  );
};

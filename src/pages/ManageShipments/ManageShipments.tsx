import React from 'react';
import {
  BulkBar,
  FilterBar,
  InviteCarrierModal,
  KpiStrip,
  Pagination,
  SavedViewsBar,
  ShipmentTable,
  StatusTabs,
} from '../../components/ManageShipments';
import { useManageShipments } from './hooks/useManageShipments';
import '../../styles/manage.css';

export const ManageShipments: React.FC = () => {
  const m = useManageShipments();

  return (
    <div className="mgmt-page">
      <h1 className="pg-title">{m.t('shipmentsTitle') || 'Shipments'}</h1>

      {m.loading && <div style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>{m.t('loading')}</div>}
      {m.error && <div style={{ marginBottom: 12, color: 'var(--danger)' }}>{m.error}</div>}

      <KpiStrip counts={m.kpiCounts} activeKpi={m.activeKpi} onKpiClick={m.setActiveKpi} t={m.t} />

      <SavedViewsBar activeView={m.activeView} onViewChange={m.handleViewChange} t={m.t} />

      <FilterBar
        searchQuery={m.searchQuery}
        onSearchChange={(v) => {
          m.setSearchQuery(v);
          m.setPage(1);
        }}
        filters={m.filters}
        onFilterChange={m.handleFilterChange}
        onClearAll={m.handleClearAll}
        t={m.t}
      />

      <StatusTabs
        shipments={m.shipments}
        activeTab={m.activeTab}
        onTabChange={(tab) => {
          m.setActiveTab(tab);
          m.setPage(1);
        }}
        t={m.t}
      />

      <div className="tbl-wrap">
        <ShipmentTable
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
    </div>
  );
};

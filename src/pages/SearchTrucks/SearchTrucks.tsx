import React from 'react';
import {
  BookingDrawer,
  FilterBar,
  KpiStrip,
  ResultsTable,
  SortControls,
} from '../../components/SearchTrucks';
import { useApp } from '../../context/AppContext';
import '../../styles/search-trucks.css';
import { useSearchTrucks } from './hooks/useSearchTrucks';

export const SearchTrucks: React.FC = () => {
  const m = useSearchTrucks();
  const { showToast } = useApp();

  return (
    <div className="sat-page">
      <h1 className="pg-title">
        {m.t('satPageTitle')}
        <span className="nb" style={{ background: 'var(--accent)', fontSize: 10 }}>
          BETA
        </span>
      </h1>
      <p className="pg-sub">{m.t('satPageSubtitle')}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" className="sat-btn sat-btn-sm" onClick={m.handleSavedViews}>
          💾 {m.t('satSavedViews')}
        </button>
        <button type="button" className="sat-btn sat-btn-sm" onClick={m.handleExport}>
          📥 {m.t('satExport')}
        </button>
      </div>

      <KpiStrip
        counts={m.kpiCounts}
        activeKpi={m.activeKpi}
        onKpiClick={m.handleKpiClick}
        t={m.t}
      />

      <FilterBar
        activeTab={m.activeTab}
        onTabChange={m.handleTabChange}
        searchQuery={m.searchQuery}
        onSearchChange={m.setSearchQuery}
        activePills={m.activePills}
        onTogglePill={m.togglePill}
        onClearAll={m.clearFilters}
        t={m.t}
      />

      <SortControls
        sortKey={m.sortKey}
        onSortChange={m.setSortKey}
        groupRecurring={m.groupRecurring}
        onToggleGroup={m.handleToggleGroup}
        t={m.t}
      />

      <ResultsTable
        trucks={m.pageItems}
        expandedId={m.expandedId}
        page={m.page}
        totalPages={m.totalPages}
        total={m.filtered.length}
        perPage={m.perPage}
        onToggleExpand={m.handleToggleExpand}
        onBook={m.openDrawer}
        onPageChange={m.setPage}
        onMessage={(carrier) =>
          showToast(m.t('satMessageSent', { carrier }) || `Message sent to ${carrier}`, 'success')
        }
        onProfile={() => showToast(m.t('satViewingProfile') || 'Viewing profile', 'info')}
        onClearFilters={m.clearFilters}
        t={m.t}
      />

      <BookingDrawer
        open={m.drawerOpen}
        step={m.drawerStep}
        onStepChange={m.setDrawerStep}
        mode={m.drawerMode}
        onModeChange={m.setDrawerMode}
        truck={m.selectedTruck}
        pending={m.pending}
        selectedPendingIdx={m.selectedPendingIdx}
        onSelectPending={m.setSelectedPendingIdx}
        draft={m.draft}
        onDraftChange={m.updateDraft}
        onClose={m.closeDrawer}
        onConfirm={m.confirmBooking}
        t={m.t}
      />
    </div>
  );
};

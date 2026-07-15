import React from 'react';
import {
  AvailabilityList,
  AvailabilityMap,
  BookingDrawer,
  QuickFilterBar,
  SearchPill,
} from '../../components/SearchTrucks';
import { useApp } from '../../context/AppContext';
import '../../styles/search-trucks.css';
import { useSearchTrucks } from './hooks/useSearchTrucks';

export const SearchTrucks: React.FC = () => {
  const m = useSearchTrucks();
  const { showToast } = useApp();

  return (
    <div className="sat-page">
      {m.subscriptionBlocked && m.error && (
        <div className="sat-subscription-banner" role="alert">
          {m.error}
        </div>
      )}

      {m.error && !m.subscriptionBlocked && !m.loading && (
        <div className="sat-error-banner" role="alert">
          {m.error}
        </div>
      )}

      <div className="sat-page-top">
        <div className="sat-page-title-row">
          <h1>{m.t('satPageTitle')}</h1>
          <span className="nb" style={{ background: 'var(--accent)', fontSize: 10 }}>
            BETA
          </span>
          <div className="sat-page-actions">
            <button type="button" className="sat-btn sat-btn-sm" onClick={m.handleExport}>
              📥 {m.t('satExport')}
            </button>
          </div>
        </div>

        <SearchPill
          criteria={m.criteria}
          onChange={m.setCriteria}
          onSearch={m.applySearch}
          t={m.t}
        />

        <QuickFilterBar
          visibility={m.visibility}
          onVisibilityChange={m.setVisibility}
          searchQuery={m.searchQuery}
          onSearchChange={m.setSearchQuery}
          quickFilters={m.quickFilters}
          onToggleFilter={m.toggleQuickFilter}
          onClearAll={m.clearFilters}
          showMobileMapBtn
          onOpenMobileMap={() => m.setMobileMapOpen(true)}
          t={m.t}
        />
      </div>

      {m.loading ? (
        <div className="sat-loading">{m.t('satLoading')}</div>
      ) : (
        <div className="sat-split">
          <AvailabilityList
            trucks={m.pageItems}
            total={m.total}
            page={m.page}
            totalPages={m.totalPages}
            perPage={m.perPage}
            sortKey={m.sortKey}
            onSortChange={m.setSortKey}
            groupRecurring={m.groupRecurring}
            onToggleGroup={m.handleToggleGroup}
            hoveredId={m.hoveredId}
            selectedId={m.selectedId}
            selectedTruck={m.selectedTruckInList}
            onHover={m.setHoveredId}
            onSelect={m.selectTruck}
            onBook={m.openDrawer}
            onPageChange={m.setPage}
            onMessage={(carrier) =>
              showToast(m.t('satMessageSent', { carrier }) || `Message sent to ${carrier}`, 'success')
            }
            onProfile={() => showToast(m.t('satViewingProfile') || 'Viewing profile', 'info')}
            onClearFilters={m.clearFilters}
            mapExpanded={m.mapExpanded}
            onCollapseMap={() => m.setMapExpanded(false)}
            t={m.t}
          />

          <AvailabilityMap
            trucks={m.mapTrucks}
            hoveredId={m.hoveredId}
            selectedId={m.selectedId}
            mapExpanded={m.mapExpanded}
            onSelect={m.selectTruck}
            onToggleExpand={() => m.setMapExpanded(!m.mapExpanded)}
            t={m.t}
          />
        </div>
      )}

      {m.mobileMapOpen && (
        <AvailabilityMap
          trucks={m.mapTrucks}
          hoveredId={m.hoveredId}
          selectedId={m.selectedId}
          mapExpanded
          onSelect={m.selectTruck}
          onToggleExpand={() => m.setMobileMapOpen(false)}
          onCloseMobile={() => m.setMobileMapOpen(false)}
          isMobileOverlay
          t={m.t}
        />
      )}

      <BookingDrawer
        open={m.drawerOpen}
        step={m.drawerStep}
        onStepChange={m.setDrawerStep}
        mode={m.drawerMode}
        onModeChange={m.setDrawerMode}
        truck={m.selectedTruck}
        pending={m.pending}
        pendingLoading={m.pendingLoading}
        confirming={m.confirming}
        selectedPendingIdx={m.selectedPendingIdx}
        onSelectPending={m.setSelectedPendingIdx}
        draft={m.draft}
        onDraftChange={m.updateDraft}
        onClose={m.closeDrawer}
        onConfirm={() => void m.confirmBooking()}
        onGoCreateShipment={() => void m.goToCreateShipment()}
        t={m.t}
      />
    </div>
  );
};

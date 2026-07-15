import React from 'react';
import {
  AvailabilityList,
  AvailabilityMap,
  BookingDrawer,
  QuickFilterBar,
  SearchPill,
  SubscriptionGateModal,
} from '../../components/SearchTrucks';
import { useApp } from '../../context/AppContext';
import '../../styles/search-trucks.css';
import { useSearchTrucks } from './hooks/useSearchTrucks';

export const SearchTrucks: React.FC = () => {
  const m = useSearchTrucks();
  const { showToast } = useApp();

  return (
    <div className="sat-page">
      {m.subscriptionBlocked && (
        <div className="sat-subscription-banner" role="alert">
          <span className="sat-subscription-banner__text">{m.error || m.t('satUpgradeBody')}</span>
          <a
            className="sat-btn sat-btn-sm sat-btn-pr"
            href={m.upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {m.t('satUpgradeNow')}
          </a>
        </div>
      )}

      {m.error && !m.subscriptionBlocked && !m.loading && (
        <div className="sat-error-banner" role="alert">
          <span>{m.error}</span>
          <button type="button" className="sat-btn sat-btn-sm" onClick={m.retryLoad}>
            {m.t('satRetry')}
          </button>
        </div>
      )}

      <div className="sat-page-top">
        <div className="sat-page-title-row">
          <h1>{m.t('satPageTitle')}</h1>
          <span className="nb" style={{ background: 'var(--accent)', fontSize: 10 }}>
            BETA
          </span>
          <div className="sat-page-actions">
            <button
              type="button"
              className="sat-btn sat-btn-sm"
              onClick={m.handleExport}
              disabled={m.subscriptionBlocked || m.loading}
            >
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

      <div className={`sat-split ${m.subscriptionBlocked ? 'sat-split--blocked' : ''}`}>
        <AvailabilityList
          trucks={m.pageItems}
          total={m.subscriptionBlocked ? 0 : m.total}
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
          onMessage={(carrier) =>
            showToast(m.t('satMessageSent', { carrier }) || `Message sent to ${carrier}`, 'success')
          }
          onProfile={() => showToast(m.t('satViewingProfile') || 'Viewing profile', 'info')}
          onClearFilters={m.clearFilters}
          mapExpanded={m.mapExpanded}
          onCollapseMap={() => m.setMapExpanded(false)}
          loading={m.loading}
          fetchingMore={m.fetchingMore}
          hasNextPage={m.hasNextPage}
          onLoadMore={m.fetchNextPage}
          creatingShipment={Boolean(
            m.creatingShipment && m.creatingShipmentId && m.selectedId === m.creatingShipmentId
          )}
          subscriptionBlocked={m.subscriptionBlocked}
          t={m.t}
        />

        <AvailabilityMap
          trucks={m.subscriptionBlocked ? [] : m.mapTrucks}
          hoveredId={m.hoveredId}
          selectedId={m.selectedId}
          mapExpanded={m.mapExpanded}
          onSelect={m.selectTruck}
          onToggleExpand={() => m.setMapExpanded(!m.mapExpanded)}
          loading={m.mapLoading}
          pinCount={m.mapPinCount}
          pinsCapped={m.mapPinsCapped}
          mapBoundsActive={m.mapBoundsActive}
          mapBoundsDirty={m.mapBoundsDirty}
          onMapBoundsDirty={() => m.setMapBoundsDirty(true)}
          onSearchThisArea={m.applyMapBoundsSearch}
          t={m.t}
        />
      </div>

      {m.mobileMapOpen && (
        <AvailabilityMap
          trucks={m.subscriptionBlocked ? [] : m.mapTrucks}
          hoveredId={m.hoveredId}
          selectedId={m.selectedId}
          mapExpanded
          onSelect={m.selectTruck}
          onToggleExpand={() => m.setMobileMapOpen(false)}
          onCloseMobile={() => m.setMobileMapOpen(false)}
          isMobileOverlay
          loading={m.mapLoading}
          pinCount={m.mapPinCount}
          pinsCapped={m.mapPinsCapped}
          mapBoundsActive={m.mapBoundsActive}
          mapBoundsDirty={m.mapBoundsDirty}
          onMapBoundsDirty={() => m.setMapBoundsDirty(true)}
          onSearchThisArea={m.applyMapBoundsSearch}
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
        t={m.t}
      />

      <SubscriptionGateModal
        open={m.gateModalOpen && m.subscriptionBlocked}
        upgradeUrl={m.upgradeUrl}
        onRemindLater={m.dismissGateReminder}
        t={m.t}
      />
    </div>
  );
};

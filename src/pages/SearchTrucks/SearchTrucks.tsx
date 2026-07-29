import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AvailabilityList,
  AvailabilityMap,
  BookingDrawer,
  QuickFilterBar,
  SatFilterModal,
  SatSortModal,
  SearchPill,
  SubscriptionGateModal,
} from '../../components/SearchTrucks';
import { tripTypeToStops } from '../../components/SearchTrucks/SatFilterModal';
import type { SatFilterDraft } from '../../components/SearchTrucks/SatFilterModal';
import { useApp } from '../../context/AppContext';
import '../../styles/search-trucks.css';
import { useSearchTrucks } from './hooks/useSearchTrucks';
import type { AvailableTruck } from './types';

export const SearchTrucks: React.FC = () => {
  const m = useSearchTrucks();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const openProviderProfile = useCallback(
    (truck: AvailableTruck) => {
      if (truck.partnerId) {
        navigate(`/partners?partner_id=${truck.partnerId}`);
        return;
      }
      const q = truck.carrier?.trim();
      if (q && q !== '—') {
        navigate(`/partners?search=${encodeURIComponent(q)}`);
        showToast(
          m.t('satProfileNotPartnerSearch') ||
            'Provider is not linked as a partner yet — showing matching partners.',
          'info'
        );
        return;
      }
      navigate('/partners');
      showToast(
        m.t('satProfileNotPartner') || 'This provider is not in your partners yet.',
        'info'
      );
    },
    [m.t, navigate, showToast]
  );

  const filterDraft = useMemo<SatFilterDraft>(() => {
    const stops = tripTypeToStops(m.criteria.tripType);
    return {
      truckTypeIds: m.criteria.truckTypeIds ?? [],
      availableFromStart: m.criteria.availableFromStart ?? '',
      availableFromEnd: m.criteria.availableFromEnd ?? '',
      pickupCity: m.criteria.pickupCity ?? '',
      pickupLat: m.criteria.pickupLat ?? null,
      pickupLng: m.criteria.pickupLng ?? null,
      pickupRadius: m.criteria.pickupRadius ?? 100,
      dropoffCity: m.criteria.dropoffCity ?? '',
      dropoffLat: m.criteria.dropoffLat ?? null,
      dropoffLng: m.criteria.dropoffLng ?? null,
      dropoffRadius: m.criteria.dropoffRadius ?? 100,
      stopsMulti: m.criteria.stopsMulti ?? stops.stopsMulti,
      stopsDirect: m.criteria.stopsDirect ?? stops.stopsDirect,
      providerNames: m.criteria.providerNames ?? [],
      minPrice: m.criteria.minPrice ?? '',
      maxPrice: m.criteria.maxPrice ?? '',
      quickFilters: Array.from(m.quickFilters),
    };
  }, [m.criteria, m.quickFilters]);

  const filterActiveCount = useMemo(() => {
    let n = m.quickFilters.size;
    const ac = m.appliedCriteria;
    if (ac.truckTypeIds?.length) n += 1;
    if (ac.availableFromStart?.trim()) n += 1;
    if (ac.availableFromEnd?.trim()) n += 1;
    if ((ac.tripType ?? 'any') !== 'any') n += 1;
    // Default radii match emptyCriteria() (100). Do not count baseline values as active.
    if ((ac.pickupRadius ?? 100) !== 100) n += 1;
    if ((ac.dropoffRadius ?? 100) !== 100) n += 1;
    if (ac.providerNames?.length) n += 1;
    if (ac.minPrice?.trim()) n += 1;
    if (ac.maxPrice?.trim()) n += 1;
    return n;
  }, [m.appliedCriteria, m.quickFilters]);

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
          <div className="sat-page-title-group">
            <h1>{m.t('satPageTitle')}</h1>
            <span className="sat-beta-badge">BETA</span>
          </div>
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
          searchPending={m.searchPending}
          t={m.t}
        />

        {m.searchPending && (
          <div className="sat-search-pending" role="status">
            {m.t('satSearchPending') ||
              'Filters changed — click Search to update results.'}
          </div>
        )}

        <QuickFilterBar
          visibility={m.visibility}
          onVisibilityChange={m.setVisibility}
          searchQuery={m.searchQuery}
          onSearchChange={m.setSearchQuery}
          quickFilters={m.quickFilters}
          onToggleFilter={m.toggleQuickFilter}
          onClearAll={m.clearFilters}
          onOpenFilter={() => setFilterOpen(true)}
          onOpenSort={() => setSortOpen(true)}
          filterActiveCount={filterActiveCount}
          sortActive={Boolean(m.sortKey)}
          canViewBidsCount={m.canViewBidsCount}
          showMobileMapBtn
          onOpenMobileMap={() => m.setMobileMapOpen(true)}
          t={m.t}
        />
      </div>

      <div className={`sat-split ${m.subscriptionBlocked ? 'sat-split--blocked' : ''}`}>
        <AvailabilityList
          trucks={m.pageItems}
          total={m.subscriptionBlocked ? 0 : m.total}
          hoveredId={m.hoveredId}
          selectedId={m.selectedId}
          selectedTruck={m.selectedTruckInList}
          onHover={m.setHoveredId}
          onSelect={m.selectTruck}
          onBook={m.openDrawer}
          onMessage={(carrier) =>
            showToast(m.t('satMessageSent', { carrier }) || `Message sent to ${carrier}`, 'success')
          }
          onProfile={openProviderProfile}
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
          hideDetailPanel={m.mobileMapOpen}
          canViewBidsCount={m.canViewBidsCount}
          canViewBestBid={m.canViewBestBid}
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
          onSearchThisArea={m.applyMapBoundsSearch}
          searchEpoch={m.searchEpoch}
          selectedTruck={m.mapExpanded ? m.selectedTruckInList : null}
          onBook={m.openDrawer}
          onMessage={(carrier) =>
            showToast(m.t('satMessageSent', { carrier }) || `Message sent to ${carrier}`, 'success')
          }
          onProfile={openProviderProfile}
          creatingShipment={Boolean(
            m.creatingShipment && m.creatingShipmentId && m.selectedId === m.creatingShipmentId
          )}
          onClearSelection={() => m.selectTruck(null)}
          canViewBidsCount={m.canViewBidsCount}
          canViewBestBid={m.canViewBestBid}
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
          onSearchThisArea={m.applyMapBoundsSearch}
          searchEpoch={m.searchEpoch}
          selectedTruck={m.selectedTruckInList}
          onBook={m.openDrawer}
          onMessage={(carrier) =>
            showToast(m.t('satMessageSent', { carrier }) || `Message sent to ${carrier}`, 'success')
          }
          onProfile={openProviderProfile}
          creatingShipment={Boolean(
            m.creatingShipment && m.creatingShipmentId && m.selectedId === m.creatingShipmentId
          )}
          onClearSelection={() => m.selectTruck(null)}
          canViewBidsCount={m.canViewBidsCount}
          canViewBestBid={m.canViewBestBid}
          t={m.t}
        />
      )}

      <BookingDrawer
        open={m.drawerOpen}
        step={m.drawerStep}
        onStepChange={m.setDrawerStep}
        truck={m.selectedTruck}
        pending={m.pending}
        pendingLoading={m.pendingLoading}
        pendingFetchingMore={m.pendingFetchingMore}
        pendingTotal={m.pendingTotal}
        pendingPage={m.pendingPage}
        pendingLastPage={m.pendingLastPage}
        pendingSearch={m.pendingSearch}
        onPendingSearchChange={m.setPendingSearchQuery}
        onPendingPageChange={m.goToPendingPage}
        confirming={m.confirming}
        selectedPendingIdx={m.selectedPendingIdx}
        onSelectPending={m.setSelectedPendingIdx}
        onChooseShipment={(idx) => void m.choosePendingShipment(idx)}
        onCancelChoice={m.cancelPendingChoice}
        matchDetail={m.matchDetail}
        matchDetailLoading={m.matchDetailLoading}
        canViewMatchScore={m.canViewMatchScore}
        upgradeUrl={m.upgradeUrl}
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

      <SatFilterModal
        open={filterOpen}
        draft={filterDraft}
        onClose={() => setFilterOpen(false)}
        onApply={m.applyPanelFilters}
        onReset={m.resetPanelFilters}
        t={m.t}
      />

      <SatSortModal
        open={sortOpen}
        sortKey={m.sortKey}
        onClose={() => setSortOpen(false)}
        onApply={m.setSortKey}
        t={m.t}
      />
    </div>
  );
};

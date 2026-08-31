import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  ActivityLogModal,
  AuditLogCard,
  BidsCard,
  BillingCard,
  CarrierDriverCard,
  CommandHeader,
  DocumentsCard,
  IncidentsCard,
  JumpNav,
  LoadSummaryCard,
  MilestonesBar,
  NotesCard,
  PickupDelayModal,
  PickupDelayReportsCard,
  RateTripCard,
  RatingModal,
  ShareTrackingModal,
  StatusBanner,
  StopsCard,
  TrackingMapCard,
  TripSummaryCard,
} from '../../components/ShipmentDetail';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useShipment } from '../../hooks/useShipments';
import { ShipmentDetailSkeleton } from '../../components/skeletons/ShipmentDetailSkeleton';
import { buildShipmentDetailViewModel } from './detailViewModel';
import { shipmentsService } from '../../api';

const DEFAULT_SECTIONS: Record<string, boolean> = {
  bids: true,
  invited: true,
  stops: true,
  pickupDelay: true,
  carrier: true,
  load: true,
  notes: true,
  tracking: true,
  trip: true,
  rate: true,
  billing: true,
  incidents: true,
  docs: true,
  audit: true,
};

export const ShipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const { shipment, loading, error, refetch } = useShipment(id);
  const [lang, setLang] = useState<'en' | 'el'>('en');
  const [activeNav, setActiveNav] = useState('stops');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [pendingDelay, setPendingDelay] = useState<{
    location_id: number;
    location_name?: string | null;
    company_name?: string | null;
  } | null>(null);
  const [reportablePickups, setReportablePickups] = useState<
    Array<{
      location_id: number;
      location_name?: string | null;
      company_name?: string | null;
    }>
  >([]);
  const [delaySubmitting, setDelaySubmitting] = useState(false);

  const vm = useMemo(
    () => (shipment ? buildShipmentDetailViewModel(shipment) : null),
    [shipment]
  );

  const loadReportablePickups = useCallback(async () => {
    if (!id) return;
    try {
      const pending = await shipmentsService.pendingPickupDelay(id);
      setReportablePickups(pending);
    } catch {
      setReportablePickups([]);
    }
  }, [id]);

  useEffect(() => {
    void loadReportablePickups();
  }, [loadReportablePickups]);

  const toggleSection = useCallback((key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleJump = useCallback((targetId: string) => {
    setActiveNav(targetId);
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      showToast(t('copied', 'Copied to clipboard'), 'success');
    },
    [showToast, t]
  );

  const handleSubmitRating = useCallback(
    async (payload: { rating: number; review: string; delivery_on_time?: boolean }) => {
      if (!id || !vm?.carrier?.userId || !vm.carrier.userType) {
        showToast(t('ratingSubmitted', 'Rating submitted'), 'success');
        setIsRatingOpen(false);
        return;
      }
      setRatingSubmitting(true);
      try {
        await shipmentsService.submitRating(id, {
          user_id: vm.carrier.userId,
          user_type: vm.carrier.userType,
          rating: payload.rating,
          review: payload.review || undefined,
          delivery_on_time: payload.delivery_on_time,
        });
        showToast(t('ratingSubmitted', 'Rating submitted'), 'success');
        setIsRatingOpen(false);
        refetch?.();
      } catch {
        showToast(t('ratingFailed', 'Failed to submit rating'), 'error');
      } finally {
        setRatingSubmitting(false);
      }
    },
    [id, refetch, showToast, t, vm?.carrier]
  );

  const handleSubmitPickupDelay = useCallback(
    async (payload: {
      was_on_time: boolean;
      delay_bucket?: string;
      hours?: number;
      minutes?: number;
    }) => {
      if (!id || !pendingDelay) return;
      setDelaySubmitting(true);
      try {
        await shipmentsService.submitPickupDelay(id, pendingDelay.location_id, payload);
        showToast(t('pickupDelaySaved', 'Pickup delay report saved'), 'success');
        setPendingDelay(null);
        await loadReportablePickups();
        refetch?.();
      } catch {
        showToast(t('pickupDelayFailed', 'Failed to save pickup delay'), 'error');
      } finally {
        setDelaySubmitting(false);
      }
    },
    [id, loadReportablePickups, pendingDelay, refetch, showToast, t]
  );

  if (loading) {
    return <ShipmentDetailSkeleton t={t} />;
  }

  if (!shipment || !vm) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-[#18181B]">{t('shipmentNotFound', 'Shipment not found')}</h2>
        <p className="mt-2 text-sm text-[#5E5E6E]">{error || t('shipmentNotFoundDesc', 'The requested load details could not be found.')}</p>
        <Link
          to="/shipments"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#9B51E0] hover:opacity-90"
        >
          <ArrowLeft size={14} />
          <span>{t('backToShipments', 'Back to shipments')}</span>
        </Link>
      </div>
    );
  }

  const status = (vm.status || '').toLowerCase();
  const isPending = status === 'pending';
  const hasCarrier = Boolean(vm.carrier && status !== 'draft' && status !== 'pending');
  const isCompleted =
    status === 'fullfilled' ||
    status === 'partially_fullfilled' ||
    status === 'delivered' ||
    status === 'not_fullfilled';

  const canShowIncidents =
    vm.incidents.length > 0 ||
    status === 'on_trip' ||
    status === 'in_progress' ||
    status === 'partially_fullfilled' ||
    status === 'not_fullfilled';

  return (
    <div className="w-full min-h-screen bg-[#F7F7FA] font-sans antialiased">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-7 py-4 pb-10 w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[12px] mb-3" style={{ color: '#8E8E9A' }}>
          <Link
            to="/shipments"
            className="flex items-center gap-1 font-medium transition-colors hover:underline"
            style={{ color: '#9B51E0' }}
          >
            <ArrowLeft size={12} />
            <span>{t('manageShipments', 'Manage shipments')}</span>
          </Link>
          <span>›</span>
          <span>{t('loadDetails', 'Load details')}</span>
        </div>

        {/* Status banner (Cancelled / Unfulfilled / Past Due) */}
        <StatusBanner
          status={vm.status}
          reason={vm.status === 'not_fullfilled' ? vm.unfulfilledReason : vm.cancellationReason}
          date={vm.status === 'not_fullfilled' ? vm.unfulfilledDate : vm.cancellationDate}
          details={vm.cancellationDetails}
        />

        {/* Command Header */}
        <CommandHeader
          vm={vm}
          lang={lang}
          onLangChange={setLang}
          onCopyId={() => handleCopy(vm.displayId)}
          onShare={() => setIsShareOpen(true)}
          onAuditLog={() => handleJump('audit')}
          onToast={(msg) => showToast(msg, 'info')}
          t={t}
        />

        {/* Jump Navigation */}
        <JumpNav
          active={activeNav}
          availableSectionIds={vm.availableNavSections}
          onJump={handleJump}
          t={t}
        />

        {/* Milestones Bar */}
        <MilestonesBar
          vm={vm}
          lang={lang}
          onExceptionClick={handleJump}
        />

        {/* Two-Column Responsive Flex Container (≥1024px: 2 columns, <1024px: single column) */}
        <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
          {/* Left Column (flex-1 min-w-0) */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-0">
            {/* 1. Bids Section (Pending status only) */}
            {isPending && (
              <BidsCard
                interestedPartners={vm.interestedPartners}
                invitedPartners={vm.invitedPartners}
                expandedInterested={sections.bids}
                expandedInvited={sections.invited}
                onToggleInterested={() => toggleSection('bids')}
                onToggleInvited={() => toggleSection('invited')}
                onAcceptBid={(bid) => {
                  showToast(`${t('bidAccepted', 'Bid accepted from')} ${bid.name}`, 'success');
                  refetch?.();
                }}
                onRejectBid={(bid) => {
                  showToast(`${t('bidDeclined', 'Bid declined for')} ${bid.name}`, 'info');
                }}
                onCancelInvite={(p) => {
                  showToast(`${t('inviteCancelled', 'Invite cancelled for')} ${p.name}`, 'info');
                }}
                onInvitePartners={() => showToast(t('invitePartners', 'Invite partners modal opening…'), 'info')}
                t={t}
              />
            )}

            {/* 2. Stops & Appointments */}
            <StopsCard
              stops={vm.stops}
              expanded={sections.stops}
              onToggle={() => toggleSection('stops')}
              onCopy={handleCopy}
              onToast={(msg) => showToast(msg, 'info')}
              onReportDelay={(stop) =>
                setPendingDelay({ location_id: stop.id, location_name: stop.location })
              }
              t={t}
            />

            {/* 3. Pickup Delay Reports Card */}
            <PickupDelayReportsCard
              pickups={reportablePickups}
              expanded={sections.pickupDelay}
              onToggle={() => toggleSection('pickupDelay')}
              onReport={setPendingDelay}
              t={t}
            />

            {/* 4. Carrier & Driver (when assigned) */}
            {hasCarrier && (
              <CarrierDriverCard
                carrier={vm.carrier}
                driver={vm.assignedDriver}
                expanded={sections.carrier}
                onToggle={() => toggleSection('carrier')}
                onToast={(msg) => showToast(msg, 'info')}
                onRate={() => setIsRatingOpen(true)}
                onOpenProfile={() => showToast(vm.carrier?.name || 'Carrier', 'info')}
                t={t}
              />
            )}

            {/* 5. Load Summary */}
            <LoadSummaryCard
              loadSummary={vm.loadSummary}
              expanded={sections.load}
              onToggle={() => toggleSection('load')}
              onCopy={handleCopy}
              t={t}
            />

            {/* 6. Notes & Instructions */}
            <NotesCard
              notes={vm.notes}
              expanded={sections.notes}
              onToggle={() => toggleSection('notes')}
              onAddNote={() => {
                showToast(t('noteAdded', 'Note saved'), 'success');
              }}
              onToast={(msg) => showToast(msg, 'info')}
              t={t}
            />
          </div>

          {/* Right Column (w-full lg:w-[380px] xl:w-[420px] shrink-0) */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-0">
            {/* 1. Live Tracking (on-trip) OR Route Map (other statuses) */}
            <TrackingMapCard
              status={vm.status}
              tracking={vm.tracking}
              trip={vm.trip}
              expanded={sections.tracking}
              onToggle={() => toggleSection('tracking')}
              onShare={() => setIsShareOpen(true)}
              t={t}
            />

            {/* 2. Trip Summary */}
            <TripSummaryCard
              trip={vm.trip}
              expanded={sections.trip}
              onToggle={() => toggleSection('trip')}
              t={t}
            />

            {/* 3. Rate this trip (fulfilled, partially_fulfilled, unfulfilled, delivered) */}
            {isCompleted && (
              <RateTripCard
                carrierName={vm.carrier?.name || 'Transmed Logistics'}
                expanded={sections.rate}
                onToggle={() => toggleSection('rate')}
                submitting={ratingSubmitting}
                isAlreadyRated={vm.isAlreadyRated}
                onSubmitRating={handleSubmitRating}
                t={t}
              />
            )}

            {/* 4. Billing Card */}
            <BillingCard
              billing={vm.billing}
              expanded={sections.billing}
              onToggle={() => toggleSection('billing')}
              onMarkPaid={() => showToast(t('invoiceMarkedPaid', 'Marked as paid'), 'success')}
              t={t}
            />

            {/* 5. Incidents & Exceptions (if applicable) */}
            {canShowIncidents && (
              <IncidentsCard
                incidents={vm.incidents}
                expanded={sections.incidents}
                onToggle={() => toggleSection('incidents')}
                onReportIncident={() => showToast(t('reportIncidentModal', 'Opening incident report…'), 'info')}
                t={t}
              />
            )}

            {/* 6. Documents & Attachments */}
            <DocumentsCard
              documents={vm.documents}
              expanded={sections.docs}
              onToggle={() => toggleSection('docs')}
              onUpload={() => showToast(t('uploadDocument', 'Upload document dialog…'), 'info')}
              onDownload={(doc) => showToast(`${t('downloading', 'Downloading')} ${doc.name}…`, 'success')}
              onToast={(msg) => showToast(msg, 'info')}
              t={t}
            />
          </div>
        </div>

        {/* Full-Width Bottom Section: Audit Log / Activity Timeline */}
        <AuditLogCard
          entries={vm.auditEntries}
          expanded={sections.audit}
          onToggle={() => toggleSection('audit')}
          t={t}
        />
      </div>

      {/* Modals */}
      <ShareTrackingModal
        open={isShareOpen}
        groups={vm.shareGroups}
        onClose={() => setIsShareOpen(false)}
        onSend={() => {
          showToast(t('trackingLinkShared', 'Tracking link shared'), 'success');
          setIsShareOpen(false);
        }}
        t={t}
      />

      <ActivityLogModal
        open={isLogOpen}
        entries={vm.auditEntries}
        onClose={() => setIsLogOpen(false)}
        t={t}
      />

      <RatingModal
        open={isRatingOpen}
        carrierName={vm.carrier?.name || ''}
        showDeliveryOnTime={vm.carrier?.showDeliveryOnTime !== false}
        submitting={ratingSubmitting}
        onClose={() => setIsRatingOpen(false)}
        onSubmit={handleSubmitRating}
        t={t}
      />

      <PickupDelayModal
        open={Boolean(pendingDelay)}
        locationLabel={pendingDelay?.location_name || pendingDelay?.company_name}
        submitting={delaySubmitting}
        onClose={() => setPendingDelay(null)}
        onSubmit={handleSubmitPickupDelay}
        t={t}
      />
    </div>
  );
};

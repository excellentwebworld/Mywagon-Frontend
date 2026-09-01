import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, AlertTriangle, GitCompare, Sparkles, History } from 'lucide-react';
import {
  ActivityLogModal,
  AuditLogCard,
  BidsCard,
  BidsHistoryModal,
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
  UploadDocumentModal,
  ViewPodModal,
  CounterOfferModal,
} from '../../components/ShipmentDetail';
import type { PhysicalStop } from '../../components/ShipmentDetail/StopsCard';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useShipment } from '../../hooks/useShipments';
import { ShipmentDetailSkeleton } from '../../components/skeletons/ShipmentDetailSkeleton';
import { buildShipmentDetailViewModel, type DetailNote, type DetailDocument, type PartnerBidItem } from './detailViewModel';
import { shipmentsService } from '../../api';
import { CancelShipmentModal } from '../../components/ManageShipments/CancelShipmentModal';

const DEFAULT_SECTIONS: Record<string, boolean> = {
  bids: true,
  stops: true,
  pickupDelay: true,
  carrier: true,
  rate: true,
  load: true,
  notes: true,
  docs: true,
  tracking: true,
  trip: true,
  billing: true,
  incidents: true,
  audit: true,
};

export const ShipmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const { shipment, loading, error, refetch } = useShipment(id);
  const [lang, setLang] = useState<'en' | 'el'>('en');
  const [activeNav, setActiveNav] = useState('stops');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isBidsHistoryOpen, setIsBidsHistoryOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [viewPodStop, setViewPodStop] = useState<PhysicalStop | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    id: number;
    type: 'carrier' | 'driver';
    name: string;
  } | null>(null);
  const [pendingDelay, setPendingDelay] = useState<{
    location_id: number;
    location_name?: string | null;
    company_name?: string | null;
  } | null>(null);
  const [pendingCounterBid, setPendingCounterBid] = useState<PartnerBidItem | null>(null);
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [reportablePickups, setReportablePickups] = useState<
    Array<{
      location_id: number;
      location_name?: string | null;
      company_name?: string | null;
    }>
  >([]);
  const [delaySubmitting, setDelaySubmitting] = useState(false);

  // Button loading states
  const [requestingPodStopId, setRequestingPodStopId] = useState<string | number | null>(null);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [decliningBidId, setDecliningBidId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<number | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | number | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | number | null>(null);
  const [submittingOnTime, setSubmittingOnTime] = useState(false);

  const [itineraryViewMode, setItineraryViewMode] = useState<'updated' | 'old'>('old');

  const vm = useMemo(
    () => (shipment ? buildShipmentDetailViewModel(shipment) : null),
    [shipment]
  );

  const displayedStops = useMemo(() => {
    if (!vm) return [];
    if (vm.hasUpdatedItinerary) {
      if (itineraryViewMode === 'updated' && vm.updatedStops && vm.updatedStops.length > 0) {
        return vm.updatedStops;
      }
      if (vm.oldStops && vm.oldStops.length > 0) {
        return vm.oldStops;
      }
    }
    return vm.stops || [];
  }, [vm, itineraryViewMode]);

  const timelineShipment = useMemo(() => {
    if (!shipment) return null;
    return { ...shipment, stops: displayedStops };
  }, [shipment, displayedStops]);

  const [localNotes, setLocalNotes] = useState<DetailNote[]>([]);
  const [localDocs, setLocalDocs] = useState<DetailDocument[]>([]);

  useEffect(() => {
    if (vm?.notes) {
      setLocalNotes(vm.notes);
    }
  }, [vm?.notes]);

  useEffect(() => {
    if (vm?.documents) {
      setLocalDocs(vm.documents);
    }
  }, [vm?.documents]);

  const handleUploadDocument = useCallback(
    async (formData: FormData) => {
      if (!id) return;
      const created = await shipmentsService.uploadDocument(id, formData);
      const newDocItem: DetailDocument = {
        id: created.id,
        name: created.name,
        description: created.description,
        fileName: created.file_name,
        fileType: created.file_type,
        fileSize: created.file_size,
        url: created.url,
        uploadedBy: created.uploaded_by,
        createdAt: created.created_at,
      };
      setLocalDocs((prev) => [newDocItem, ...prev]);
      showToast(t('documentUploadedSuccess', 'Document uploaded successfully'), 'success');
    },
    [id, showToast, t]
  );

  const handleDownloadDocument = useCallback(
    async (doc: DetailDocument) => {
      if (!id) return;
      setDownloadingDocId(doc.id);
      try {
        await shipmentsService.downloadDocument(id, doc.id, doc.fileName);
      } catch {
        if (doc.url) {
          window.open(doc.url, '_blank');
        } else {
          showToast(t('downloadFailed', 'Failed to download document'), 'error');
        }
      } finally {
        setDownloadingDocId(null);
      }
    },
    [id, showToast, t]
  );

  const handleDeleteDocument = useCallback(
    async (doc: DetailDocument) => {
      if (!id) return;
      setDeletingDocId(doc.id);
      try {
        await shipmentsService.deleteDocument(id, doc.id);
        setLocalDocs((prev) => prev.filter((d) => d.id !== doc.id));
        showToast(t('documentDeleted', 'Document deleted successfully'), 'success');
      } catch {
        showToast(t('deleteFailed', 'Failed to delete document'), 'error');
      } finally {
        setDeletingDocId(null);
      }
    },
    [id, showToast, t]
  );

  const handleAddNote = useCallback(
    async (body: string, visibility: 'internal' | 'carrier') => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const authorName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user as any)?.name || vm?.owner || 'You';
      const optimisticNote: DetailNote = {
        id: `note-${Date.now()}`,
        author: authorName,
        timestamp: `${day}/${month}/${year} ${hours}:${minutes}`,
        body,
        visibility,
      };

      setLocalNotes((prev) => [optimisticNote, ...prev]);

      if (id) {
        try {
          const res = await shipmentsService.addNote(id, { body, visibility });
          if (res?.id) {
            setLocalNotes((prev) =>
              prev.map((n) =>
                n.id === optimisticNote.id
                  ? {
                      ...n,
                      id: res.id,
                      timestamp: res.timestamp || n.timestamp,
                      author: res.author || n.author,
                    }
                  : n
              )
            );
          }
        } catch {
          // Note is still stored in local optimistic state
        }
      }

      showToast(t('noteAdded', 'Note added successfully'), 'success');
    },
    [id, user, vm?.owner, showToast, t]
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

  const handleSubmitPickupDelay = useCallback(
    async (data: {
      was_on_time: boolean;
      delay_bucket?: string;
      hours?: number;
      minutes?: number;
    }) => {
      if (!id || !pendingDelay) return;
      setDelaySubmitting(true);
      try {
        await shipmentsService.submitPickupDelay(id, pendingDelay.location_id, data);
        showToast(
          data.was_on_time
            ? t('pickupOnTimeRecorded', 'Recorded driver was on time for pickup')
            : t('pickupDelayReported', 'Pickup delay reported successfully'),
          'success'
        );
        setPendingDelay(null);
        await loadReportablePickups();
        refetch?.();
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : t('pickupDelayFailed', 'Failed to report delay'),
          'error'
        );
      } finally {
        setDelaySubmitting(false);
      }
    },
    [id, pendingDelay, loadReportablePickups, refetch, showToast, t]
  );

  const toggleSection = useCallback((key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleJump = useCallback((targetId: string) => {
    setActiveNav(targetId);
    const lookupId = targetId === 'invited' ? 'bids' : targetId;
    const el = document.getElementById(lookupId);
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
      const target = ratingTarget || {
        id: vm?.carrier?.userId || 0,
        type: (vm?.carrier?.userType === 'driver' ? 'driver' : 'carrier') as 'carrier' | 'driver',
        name: vm?.carrier?.name || 'Transporter',
      };
      if (!id || !target.id) {
        showToast(t('ratingSubmitted', 'Rating submitted'), 'success');
        setIsRatingOpen(false);
        return;
      }
      setRatingSubmitting(true);
      try {
        await shipmentsService.submitRating(id, {
          user_id: target.id,
          user_type: target.type,
          rating: payload.rating,
          review: payload.review || undefined,
          delivery_on_time: payload.delivery_on_time,
        });
        showToast(t('ratingSubmitted', 'Rating submitted successfully'), 'success');
        setIsRatingOpen(false);
        setRatingTarget(null);
        refetch?.();
      } catch {
        showToast(t('ratingFailed', 'Failed to submit rating'), 'error');
      } finally {
        setRatingSubmitting(false);
      }
    },
    [id, ratingTarget, refetch, showToast, t, vm?.carrier]
  );

  const handleAcceptBid = useCallback(async (bid: PartnerBidItem) => {
    if (!id) return;
    setAcceptingBidId(bid.id);
    try {
      await shipmentsService.acceptOffer(id, bid.id);
      showToast(`${t('bidAccepted', 'Bid accepted from')} ${bid.name}`, 'success');
      refetch?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('bidAcceptFailed', 'Failed to accept bid'), 'error');
    } finally {
      setAcceptingBidId(null);
    }
  }, [id, refetch, showToast, t]);

  const handleRejectBid = useCallback(async (bid: PartnerBidItem) => {
    if (!id) return;
    setDecliningBidId(bid.id);
    try {
      await shipmentsService.rejectOffer(id, bid.id);
      showToast(`${t('bidDeclined', 'Bid declined for')} ${bid.name}`, 'info');
      refetch?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('bidRejectFailed', 'Failed to decline bid'), 'error');
    } finally {
      setDecliningBidId(null);
    }
  }, [id, refetch, showToast, t]);

  const handleSendCounterBid = useCallback(
    async (amount: number, notes?: string) => {
      if (!id || !pendingCounterBid) return;
      setCounterSubmitting(true);
      try {
        await shipmentsService.counterOffer(id, pendingCounterBid.id, { amount, notes });
        showToast(
          `${t('counterBidSentSuccess', 'Counter-bid sent successfully to')} ${pendingCounterBid.name}`,
          'success'
        );
        setPendingCounterBid(null);
        refetch?.();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : t('counterOfferFailed', 'Failed to send counter offer'),
          'error'
        );
      } finally {
        setCounterSubmitting(false);
      }
    },
    [id, pendingCounterBid, refetch, showToast, t]
  );

  const handleCancelInvite = useCallback(async (partner: PartnerBidItem) => {
    if (!id || !partner.userId) return;
    setCancellingInviteId(partner.userId);
    try {
      await shipmentsService.removeInvite(id, partner.userId);
      showToast(`${t('inviteCancelled', 'Invite cancelled for')} ${partner.name}`, 'info');
      refetch?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('cancelInviteFailed', 'Failed to cancel invite'), 'error');
    } finally {
      setCancellingInviteId(null);
    }
  }, [id, refetch, showToast, t]);

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
          cancelledBy={vm.cancelledBy}
          notes={vm.cancellationNotes}
        />

        {/* Command Header */}
        <CommandHeader
          vm={vm}
          lang={lang}
          onLangChange={setLang}
          onCopyId={() => handleCopy(vm.displayId)}
          onEdit={() => {
            if (vm.status === 'draft') {
              navigate(`/create-shipment?draftId=${vm.id}`);
            } else {
              navigate(`/create-shipment?editId=${vm.id}`);
            }
          }}
          onMessage={() => navigate('/messages')}
          onShare={() => setIsShareOpen(true)}
          onAuditLog={() => setIsLogOpen(true)}
          onBidsHistory={() => setIsBidsHistoryOpen(true)}
          onCancelShipment={() => setIsCancelOpen(true)}
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

        {/* Manually Executed Trip Warning Banner */}
        {vm.isManualTrip && (
          <div
            className="flex items-center gap-3.5 mb-4 px-5 py-3.5 rounded-xl transition-all"
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE047',
            }}
            role="alert"
          >
            <AlertTriangle size={20} className="text-[#D97706] shrink-0" />
            <div>
              <div className="font-semibold text-[13px] md:text-[14px] text-[#92400E]">
                {t('manuallyExecutedTrip', 'Manually Executed Trip')}
              </div>
              <p className="text-[12px] text-[#B45309] mt-0.5 m-0 leading-normal">
                {t(
                  'manuallyExecutedTripDesc',
                  'Live GPS tracking and actual route data are not available.'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Milestones Bar (Events that already happened / in progress) */}
        {timelineShipment && (
          <MilestonesBar
            shipment={timelineShipment}
            t={t}
            lang={lang}
          />
        )}

        {/* Modern React Itinerary Version Switcher */}
        {vm.hasUpdatedItinerary && (
          <div className="bg-white border border-[#E4E4E8] rounded-2xl p-3 sm:p-3.5 mb-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#9B51E0]/10 flex items-center justify-center text-[#9B51E0] shrink-0">
                <GitCompare size={19} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#18181B]">
                    {t('itineraryVersions', 'Itinerary Versions')}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#9B51E0]/10 text-[#9B51E0]">
                    {itineraryViewMode === 'updated' ? t('viewingUpdated', 'Updated Active') : t('viewingOriginal', 'Original')}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#8E8E9A] truncate mt-0.5">
                  {t('itineraryCompareDesc', 'Compare the modified stops and schedule with the original booking.')}
                </p>
              </div>
            </div>

            <div className="inline-flex p-1 bg-[#F4F4F6] rounded-xl border border-[#E4E4E8]/80 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setItineraryViewMode('updated')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  itineraryViewMode === 'updated'
                    ? 'bg-[#9B51E0] text-white shadow-xs'
                    : 'text-[#5E5E6E] hover:text-[#18181B] hover:bg-white/60'
                }`}
              >
                <Sparkles size={13} className={itineraryViewMode === 'updated' ? 'text-white' : 'text-[#9B51E0]'} />
                <span>{t('updatedShipment', 'Updated Shipment')}</span>
              </button>
              <button
                type="button"
                onClick={() => setItineraryViewMode('old')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  itineraryViewMode === 'old'
                    ? 'bg-[#18181B] text-white shadow-xs'
                    : 'text-[#5E5E6E] hover:text-[#18181B] hover:bg-white/60'
                }`}
              >
                <History size={13} className={itineraryViewMode === 'old' ? 'text-white' : 'text-[#8E8E9A]'} />
                <span>{t('oldShipment', 'Old Shipment')}</span>
              </button>
            </div>
          </div>
        )}

        {/* If Shipment is being edited / Update Request active */}
        {vm.isEditingRequested && !vm.hasUpdatedItinerary && (
          <div
            className="rounded-2xl p-4 mb-4 flex items-start gap-3"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            <AlertCircle size={18} className="text-[#2563EB] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-bold text-[#1E40AF]">
                {t('updateRequestPending', 'Carrier update request pending review')}
              </div>
              <div className="text-[#1E40AF] mt-0.5">
                {vm.editingRequestDetails || t('carrierRequestedScheduleChange', 'The transporter has requested an itinerary adjustment.')}
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Responsive Flex Container (≥1024px: 2 columns, <1024px: single column) */}
        <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
          {/* Left Column (flex-1 min-w-0) */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-0">
            {/* 1. Bids Section (Pending status only) */}
            {isPending && (
              <BidsCard
                shipmentId={id}
                isPrivateLoad={vm.isPrivateLoad}
                startingPrice={vm.startingPrice}
                partners={vm.partners}
                expanded={sections.bids}
                onToggle={() => toggleSection('bids')}
                onAcceptBid={handleAcceptBid}
                acceptingBidId={acceptingBidId}
                onRejectBid={handleRejectBid}
                decliningBidId={decliningBidId}
                onCounterBid={(bid) => setPendingCounterBid(bid)}
                onCancelInvite={handleCancelInvite}
                cancellingInviteId={cancellingInviteId}
                onViewHistory={() => setIsBidsHistoryOpen(true)}
                onChat={() => navigate('/messages')}
                onInviteMore={() => showToast(t('invitePartners', 'Invite partners modal opening…'), 'info')}
                t={t}
              />
            )}

            {/* 2. Stops & Appointments (White Pickup, Black Dropoff, Collapsible Orders, Inline POD Request) */}
            <StopsCard
              stops={displayedStops}
              expanded={sections.stops}
              onToggle={() => toggleSection('stops')}
              onCopy={handleCopy}
              onToast={(msg) => showToast(msg, 'info')}
              onViewPod={(stop) => setViewPodStop(stop)}
              onRequestPod={async (stop) => {
                if (!id) return;
                setRequestingPodStopId(stop.id);
                try {
                  await shipmentsService.requestPod(id, stop.id);
                  showToast(t('podRequestedSent', 'Push notification sent to driver requesting POD'), 'success');
                } catch (err: any) {
                  showToast(err?.message || t('errorRequestingPod', 'Failed to request POD'), 'error');
                } finally {
                  setRequestingPodStopId(null);
                }
              }}
              requestingPodStopId={requestingPodStopId}
              t={t}
            />

            {/* 3. Pickup Delay Reports Card (PDS-938) */}
            <PickupDelayReportsCard
              pickups={reportablePickups}
              expanded={sections.pickupDelay}
              onToggle={() => toggleSection('pickupDelay')}
              onReport={setPendingDelay}
              t={t}
            />

            {/* 4. Transporter (Carrier / Driver / Freelancer) */}
            {hasCarrier && (
              <CarrierDriverCard
                carrier={vm.carrier}
                driver={vm.assignedDriver}
                status={vm.status}
                isPaid={vm.isPaid}
                isCarrierRated={vm.isCarrierRated}
                isDriverRated={vm.isDriverRated}
                expanded={sections.carrier}
                onToggle={() => toggleSection('carrier')}
                onToast={(msg) => showToast(msg, 'info')}
                onRateCarrier={(c) => {
                  setRatingTarget({
                    id: c.userId ?? 0,
                    type: c.userType === 'driver' ? 'driver' : 'carrier',
                    name: c.name,
                  });
                  setIsRatingOpen(true);
                }}
                onRateDriver={(d) => {
                  setRatingTarget({
                    id: d.userId ?? 0,
                    type: 'driver',
                    name: d.name,
                  });
                  setIsRatingOpen(true);
                }}
                onChatCarrier={(c) => {
                  navigate('/messages', {
                    state: {
                      userId: c.userId,
                      userType: c.userType === 'driver' ? 'driver' : 'carrier',
                      userName: c.name,
                      userAvatar: c.avatar,
                      sid: id,
                    },
                  });
                }}
                onChatDriver={(d) => {
                  navigate('/messages', {
                    state: {
                      userId: d.userId,
                      userType: 'driver',
                      userName: d.name,
                      userAvatar: d.avatar,
                      sid: id,
                    },
                  });
                }}
                t={t}
              />
            )}

            {/* 5. Delivery Performance (Delivered on time question under Transporter) */}
            {isCompleted && (
              <RateTripCard
                carrierName={vm.carrier?.name || 'Transporter'}
                expanded={sections.rate}
                onToggle={() => toggleSection('rate')}
                initialOnTime={vm.ratingDeliveryOnTime}
                isAlreadyReported={vm.isAlreadyRated}
                submitting={submittingOnTime}
                onSelectOnTime={async (onTime) => {
                  if (!id) return;
                  setSubmittingOnTime(true);
                  try {
                    const targetId = vm.carrier?.userId || vm.assignedDriver?.userId || 0;
                    const targetType = vm.carrier?.userType === 'driver' ? 'driver' : 'carrier';
                    if (targetId) {
                      await shipmentsService.submitRating(id, {
                        user_id: targetId,
                        user_type: targetType,
                        rating: 5,
                        delivery_on_time: onTime,
                      });
                    }
                    showToast(
                      onTime
                        ? t('deliveryRecordedOnTime', 'Delivery recorded as on schedule')
                        : t('deliveryRecordedDelayed', 'Delivery recorded as delayed'),
                      'success'
                    );
                    refetch?.();
                  } catch {
                    showToast(
                      onTime
                        ? t('deliveryRecordedOnTime', 'Delivery recorded as on schedule')
                        : t('deliveryRecordedDelayed', 'Delivery recorded as delayed'),
                      'info'
                    );
                  } finally {
                    setSubmittingOnTime(false);
                  }
                }}
                t={t}
              />
            )}

            {/* 6. Load Summary */}
            <LoadSummaryCard
              loadSummary={vm.loadSummary}
              expanded={sections.load}
              onToggle={() => toggleSection('load')}
              t={t}
            />
          </div>

          {/* Right Column (w-full lg:w-[380px] xl:w-[420px] shrink-0) */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-0">
            {/* 1. Live Tracking (on-trip) OR Route Map (other statuses) */}
            <TrackingMapCard
              stops={displayedStops}
              status={vm.status}
              tracking={vm.tracking}
              trip={vm.trip}
              isDelayed={vm.isDelayed}
              delayText={vm.delayText}
              actualRouteCoordinates={vm.actualRouteCoordinates}
              hasActualRoute={vm.hasActualRoute}
              expanded={sections.tracking}
              onToggle={() => toggleSection('tracking')}
              onShare={() => setIsShareOpen(true)}
              onReportDelay={() => {
                if (reportablePickups.length > 0) {
                  setPendingDelay(reportablePickups[0]);
                } else if (vm.stops.length > 0) {
                  const firstStop = vm.stops.find((s) => s.type === 'pickup') || vm.stops[0];
                  setPendingDelay({ location_id: firstStop.id, location_name: firstStop.location });
                }
              }}
              t={t}
            />

            {/* 2. Trip Summary */}
            <TripSummaryCard
              trip={vm.trip}
              expanded={sections.trip}
              onToggle={() => toggleSection('trip')}
              t={t}
            />

            {/* 3. Notes & Instructions (Positioned below Trip Summary) */}
            <NotesCard
              notes={localNotes}
              expanded={sections.notes}
              onToggle={() => toggleSection('notes')}
              onAddNote={handleAddNote}
              onToast={(msg) => showToast(msg, 'info')}
              t={t}
            />

            {/* 4. Documents & Attachments (Positioned below Notes in Right Column) */}
            <DocumentsCard
              documents={localDocs}
              expanded={sections.docs}
              onToggle={() => toggleSection('docs')}
              onUpload={() => setIsUploadDocOpen(true)}
              onDownload={handleDownloadDocument}
              downloadingDocId={downloadingDocId}
              onDelete={handleDeleteDocument}
              deletingDocId={deletingDocId}
              onToast={(msg) => showToast(msg, 'info')}
              t={t}
            />
          </div>
        </div>

        {/* Full-Width Bottom Section: Audit Log (All, Bidding, Operations) */}
        {(vm.auditEntries.length > 0 || (vm.shipmentLogs && vm.shipmentLogs.length > 0) || (vm.bidsHistory && vm.bidsHistory.length > 0)) && (
          <AuditLogCard
            entries={vm.auditEntries}
            shipmentLogs={vm.shipmentLogs}
            bidsHistory={vm.bidsHistory}
            expanded={sections.audit}
            onToggle={() => toggleSection('audit')}
            t={t}
          />
        )}
      </div>

      {/* Share Tracking Modal (Laravel Panel Tracking Links Table) */}
      <ShareTrackingModal
        open={isShareOpen}
        stops={displayedStops}
        groups={vm.shareGroups}
        isPickedUp={vm.isPickedUp}
        onClose={() => setIsShareOpen(false)}
        onSend={async (emails) => {
          if (!id) return;
          try {
            await shipmentsService.saveTrackingLinks(id, emails);
            showToast(t('trackingLinkShared', 'Tracking links sent successfully'), 'success');
            setIsShareOpen(false);
            void refetch();
          } catch (err: any) {
            showToast(err?.message || t('errorSavingTracking', 'Failed to save tracking links'), 'error');
          }
        }}
        t={t}
      />

      {/* Shipment Logs Modal */}
      <ActivityLogModal
        open={isLogOpen}
        logs={vm.shipmentLogs}
        entries={vm.auditEntries}
        onClose={() => setIsLogOpen(false)}
        t={t}
      />

      {/* Bids History Modal */}
      <BidsHistoryModal
        open={isBidsHistoryOpen}
        bids={vm.bidsHistory}
        onClose={() => setIsBidsHistoryOpen(false)}
        t={t}
      />

      {/* Pickup Delay Modal */}
      <PickupDelayModal
        open={Boolean(pendingDelay)}
        locationLabel={pendingDelay?.location_name || pendingDelay?.company_name}
        submitting={delaySubmitting}
        onClose={() => setPendingDelay(null)}
        onSubmit={handleSubmitPickupDelay}
        t={t}
      />

      {/* Cancel Shipment Modal */}
      <CancelShipmentModal
        open={isCancelOpen}
        shipment={shipment}
        onClose={() => setIsCancelOpen(false)}
        onCancelled={() => {
          setIsCancelOpen(false);
          showToast(t('shipmentCancelledSuccess', 'Shipment cancelled successfully'), 'success');
          refetch?.();
        }}
        t={t}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        onUpload={handleUploadDocument}
        t={t}
      />

      {/* View Proof of Delivery (POD) Modal */}
      <ViewPodModal
        open={Boolean(viewPodStop)}
        stop={viewPodStop}
        onClose={() => setViewPodStop(null)}
        t={t}
      />

      {/* Carrier / Driver Rating Modal */}
      <RatingModal
        open={isRatingOpen}
        targetName={ratingTarget?.name || vm?.carrier?.name || 'Transporter'}
        targetType={ratingTarget?.type || 'carrier'}
        submitting={ratingSubmitting}
        onClose={() => {
          setIsRatingOpen(false);
          setRatingTarget(null);
        }}
        onSubmit={handleSubmitRating}
        t={t}
      />

      {/* Counter-Offer / Negotiation Modal */}
      <CounterOfferModal
        open={Boolean(pendingCounterBid)}
        bid={pendingCounterBid}
        submitting={counterSubmitting}
        onClose={() => setPendingCounterBid(null)}
        onSubmit={handleSendCounterBid}
        t={t}
      />
    </div>
  );
};

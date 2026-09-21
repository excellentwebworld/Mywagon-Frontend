import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, AlertTriangle, Sparkles, History } from 'lucide-react';
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
  RatingModal,
  ShareTrackingModal,
  StatusBanner,
  StopsCard,
  TrackingMapCard,
  TripPerformanceReportsCard,
  TripSummaryCard,
  UploadDocumentModal,
  ViewPodModal,
  CounterOfferModal,
} from '../../components/ShipmentDetail';
import type { PhysicalStop } from '../../components/ShipmentDetail/StopsCard';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useRequireSignupComplete } from '../../hooks/useRequireSignupComplete';
import { useShipment } from '../../hooks/useShipments';
import { ShipmentDetailSkeleton } from '../../components/skeletons/ShipmentDetailSkeleton';
import { buildShipmentDetailViewModel, type DetailNote, type DetailDocument, type PartnerBidItem } from './detailViewModel';
import { shipmentsService } from '../../api';
import { CancelShipmentModal } from '../../components/ManageShipments/CancelShipmentModal';

const DEFAULT_SECTIONS: Record<string, boolean> = {
  bids: true,
  stops: true,
  tripPerformance: true,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const { requireSignupComplete } = useRequireSignupComplete();
  const { shipment, loading, error, refetch } = useShipment(id);
  const [lang, setLang] = useState<'en' | 'el'>('en');
  const [activeNav, setActiveNav] = useState('stops');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isBidsHistoryOpen, setIsBidsHistoryOpen] = useState(false);
  const [selectedPartnerForHistory, setSelectedPartnerForHistory] = useState<PartnerBidItem | null>(null);
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

  const [itineraryViewMode, setItineraryViewMode] = useState<'updated' | 'old'>('old');

  const vm = useMemo(
    () => (shipment ? buildShipmentDetailViewModel(shipment) : null),
    [shipment]
  );

  const navigateToChat = useCallback((
    partner?: {
      userId?: number | string | null;
      name?: string;
      avatar?: string | null;
      userType?: string | null;
    } | null,
    userType?: 'carrier' | 'driver',
    options?: { shipmentScoped?: boolean }
  ) => {
    const shipmentScoped = options?.shipmentScoped === true;
    const primaryId = shipmentScoped && shipment?.id != null ? String(shipment.id) : '';
    const autoId = shipmentScoped
      ? (shipment?.autoId || (/^SID-/i.test(String(vm?.displayId || '')) ? String(vm?.displayId) : ''))
      : '';
    const params = new URLSearchParams();
    if (primaryId) params.set('sid', primaryId);
    if (autoId) params.set('autoId', autoId);

    const resolvedType = userType || (partner?.userType === 'driver' ? 'driver' : 'carrier');
    if (partner?.userId) params.set('userId', String(partner.userId));
    if (partner?.name) params.set('name', partner.name);
    if (partner?.userId || partner?.name) params.set('userType', resolvedType);
    if (partner?.avatar) params.set('avatar', partner.avatar);

    navigate(`/messages?${params.toString()}`, {
      state: {
        ...(partner?.userId || partner?.name
          ? {
              userId: partner.userId,
              userType: resolvedType,
              userName: partner.name,
              userAvatar: partner.avatar,
            }
          : {}),
        ...(shipmentScoped ? { sid: primaryId, autoId } : {}),
      },
    });
  }, [navigate, shipment?.id, shipment?.autoId, vm?.displayId]);

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
  const [updatingNoteId, setUpdatingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

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
                      body: res.body || n.body,
                      visibility:
                        res.visibility === 'carrier' ? 'carrier' : 'internal',
                    }
                  : n
              )
            );
          }
        } catch {
          setLocalNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id));
          showToast(t('noteAddFailed', 'Failed to add note'), 'error');
          return;
        }
      }

      showToast(t('noteAdded', 'Note added successfully'), 'success');
    },
    [id, user, vm?.owner, showToast, t]
  );

  const handleUpdateNote = useCallback(
    async (noteId: string, body: string, visibility: 'internal' | 'carrier') => {
      if (!id) return;
      setUpdatingNoteId(noteId);
      try {
        const res = await shipmentsService.updateNote(id, noteId, { body, visibility });
        setLocalNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  id: res.id || n.id,
                  body: res.body ?? body,
                  visibility:
                    res.visibility === 'carrier' || res.visibility === 'internal'
                      ? res.visibility
                      : visibility,
                  author: res.author || n.author,
                  timestamp: res.timestamp || n.timestamp,
                }
              : n
          )
        );
        showToast(t('noteUpdated', 'Note updated successfully'), 'success');
      } catch {
        showToast(t('noteUpdateFailed', 'Failed to update note'), 'error');
        throw new Error('note update failed');
      } finally {
        setUpdatingNoteId(null);
      }
    },
    [id, showToast, t]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      if (!id) return;
      setDeletingNoteId(noteId);
      try {
        await shipmentsService.deleteNote(id, noteId);
        setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast(t('noteDeleted', 'Note deleted successfully'), 'success');
      } catch {
        showToast(t('noteDeleteFailed', 'Failed to delete note'), 'error');
        throw new Error('note delete failed');
      } finally {
        setDeletingNoteId(null);
      }
    },
    [id, showToast, t]
  );

  const loadReportableDelays = useCallback(async () => {
    if (!id) return;
    try {
      const pickups = await shipmentsService.pendingPickupDelay(id);
      setReportablePickups(pickups);
    } catch {
      setReportablePickups([]);
    }
  }, [id]);

  useEffect(() => {
    void loadReportableDelays();
  }, [loadReportableDelays]);

  const handleOpenDelayReport = useCallback(
    (location: {
      location_id: number;
      location_name?: string | null;
      company_name?: string | null;
    }) => {
      setPendingDelay(location);
    },
    []
  );

  const handleSubmitDelay = useCallback(
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
        await loadReportableDelays();
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
    [id, pendingDelay, loadReportableDelays, refetch, showToast, t]
  );

  const toggleSection = useCallback((key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleJump = useCallback((targetId: string) => {
    setActiveNav(targetId);

    const sectionKeyMap: Record<string, string> = {
      invited: 'bids',
      bids: 'bids',
      stops: 'stops',
      carrier: 'carrier',
      tripPerformance: 'tripPerformance',
      'trip-performance': 'tripPerformance',
      load: 'load',
      tracking: 'tracking',
      map: 'tracking',
      trip: 'trip',
      tripSummary: 'trip',
      notes: 'notes',
      docs: 'docs',
      audit: 'audit',
    };

    const sectionKey = sectionKeyMap[targetId] || targetId;
    setSections((prev) => ({ ...prev, [sectionKey]: true }));

    const lookupMap: Record<string, string[]> = {
      invited: ['bids'],
      bids: ['bids'],
      stops: ['stops'],
      carrier: ['carrier'],
      tripPerformance: ['tripPerformance', 'trip-performance'],
      'trip-performance': ['tripPerformance', 'trip-performance'],
      load: ['load'],
      tracking: ['tracking', 'map'],
      trip: ['trip', 'tripSummary', 'trip-summary'],
      tripSummary: ['trip', 'tripSummary', 'trip-summary'],
      notes: ['notes'],
      docs: ['docs'],
      audit: ['audit'],
    };

    const candidates = lookupMap[targetId] || [targetId];
    let el: HTMLElement | null = null;
    for (const id of candidates) {
      el = document.getElementById(id);
      if (el) break;
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (!focus || loading || !vm) return;

    const section = focus === 'invited' ? 'bids' : focus;
    setSections((prev) => ({ ...prev, [section]: true, tracking: true }));
    setActiveNav(section);

    const performJump = () => {
      handleJump(section);
      const next = new URLSearchParams(window.location.search);
      if (next.has('focus')) {
        next.delete('focus');
        const query = next.toString();
        const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      }
    };

    // Staged jump attempts so dynamic maps/cards have rendered and DOM element exists
    const t1 = window.setTimeout(performJump, 120);
    const t2 = window.setTimeout(performJump, 350);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [searchParams, loading, vm, handleJump]);

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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('shipmentNotFound', 'Shipment not found')}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error || t('shipmentNotFoundDesc', 'The requested load details could not be found.')}</p>
        <Link
          to="/shipments"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#9B51E0] hover:opacity-90 shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>{t('backToShipments', 'Back to shipments')}</span>
        </Link>
      </div>
    );
  }

  const status = (vm.status || '').toLowerCase();
  const isPending = status === 'pending' || status === 'draft';
  const hasCarrier = Boolean(vm.carrier && status !== 'draft' && status !== 'pending');
  const isCompleted =
    status === 'fullfilled' ||
    status === 'partially_fullfilled' ||
    status === 'delivered' ||
    status === 'not_fullfilled';

  // Delivery performance (Yes/No) lives inside Trip Performance Reports for On Trip + completed.
  // After the shipper submits, the result is shown in that same card.
  const showDeliveryPerformance =
    status === 'on_trip' ||
    status === 'in_progress' ||
    isCompleted;

  const canShowIncidents =
    vm.incidents.length > 0 ||
    status === 'on_trip' ||
    status === 'in_progress' ||
    status === 'partially_fullfilled' ||
    status === 'not_fullfilled';

  return (
    <div className="mv-themed-page w-full min-h-screen bg-[var(--bg)] font-sans antialiased text-slate-900 dark:text-white">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-7 py-4 pb-10 w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[12px] mb-3 text-slate-500 dark:text-slate-400">
          <Link
            to="/shipments"
            className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400 hover:underline"
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
          cancelledByType={vm.cancelledByType}
          notes={vm.cancellationNotes}
          t={t}
        />

        {/* Command Header */}
        <CommandHeader
          vm={vm}
          lang={lang}
          onLangChange={setLang}
          onCopyId={() => handleCopy(vm.displayId)}
          onEdit={() => {
            if (!requireSignupComplete()) return;
            if (vm.status === 'draft') {
              navigate(`/shipments/create/step/1?id=${vm.id}`);
            } else {
              navigate(`/shipments/create/step/1?editId=${vm.id}`);
            }
          }}
          onMessage={() => {
            const driver = vm.assignedDriver;
            const carrier = vm.carrier;
            const partner = driver || carrier;
            const resolvedType = driver ? 'driver' : (carrier?.userType === 'driver' ? 'driver' : 'carrier');
            navigateToChat(partner, partner ? resolvedType : undefined);
          }}
          onShare={() => setIsShareOpen(true)}
          onAuditLog={() => setIsLogOpen(true)}
          onBidsHistory={() => {
            setSelectedPartnerForHistory(null);
            setIsBidsHistoryOpen(true);
          }}
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
            className="flex items-start gap-3.5 mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-amber-500/[0.08] dark:from-amber-500/15 dark:via-amber-500/10 dark:to-amber-500/15 border border-amber-300/80 dark:border-amber-500/30 shadow-xs transition-all"
            role="alert"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-200/80 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 shrink-0 shadow-xs">
              <AlertTriangle size={19} className="stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm sm:text-base text-amber-950 dark:text-amber-100 tracking-tight">
                {t('manuallyExecutedTrip', 'Manually Executed Trip')}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 m-0 leading-normal">
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

        {/* Load edit pending — itinerary version switcher */}
        {vm.hasUpdatedItinerary && (
          <div className="rounded-xl py-2.5 px-4 mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300/90 dark:border-amber-700/60 shadow-xs flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-6 text-center transition-all">
            <div className="flex items-center justify-center gap-2 min-w-0">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shrink-0">
                <AlertTriangle size={15} className="stroke-[2.2]" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 ring-1 ring-white dark:ring-slate-900"></span>
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 tracking-tight">
                {t('loadEditPendingAcceptance', 'Load Edit Pending Transporter Acceptance')}
              </span>
            </div>

            <div className="inline-flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-amber-300/90 dark:border-slate-700 shadow-sm gap-1 shrink-0 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={() => setItineraryViewMode('old')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                  itineraryViewMode === 'old'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <History
                  size={14}
                  className={`shrink-0 ${
                    itineraryViewMode === 'old'
                      ? 'text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span>{t('viewOriginalShipment', 'View original shipment')}</span>
              </button>

              <button
                type="button"
                onClick={() => setItineraryViewMode('updated')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                  itineraryViewMode === 'updated'
                    ? 'bg-purple-600 dark:bg-purple-600 text-white shadow-xs ring-1 ring-purple-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles
                  size={14}
                  className={`shrink-0 ${
                    itineraryViewMode === 'updated'
                      ? 'text-amber-200'
                      : 'text-purple-600 dark:text-purple-400'
                  }`}
                />
                <span>{t('viewUpdatedShipment', 'View updated shipment')}</span>
              </button>
            </div>
          </div>
        )}

        {/* If Shipment is being edited / Update Request active */}
        {vm.isEditingRequested && !vm.hasUpdatedItinerary && (
          <div className="rounded-2xl p-4 sm:p-5 mb-5 flex items-start gap-3.5 bg-gradient-to-r from-blue-500/[0.08] via-blue-500/[0.04] to-blue-500/[0.08] dark:from-blue-500/15 dark:via-blue-500/10 dark:to-blue-500/15 border border-blue-300/80 dark:border-blue-500/30 shadow-xs transition-all">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 border border-blue-200/80 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 shrink-0 shadow-xs">
              <AlertCircle size={20} className="stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm sm:text-base text-blue-950 dark:text-blue-100 tracking-tight">
                {t('updateRequestPending', 'Carrier update request pending review')}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 m-0 leading-normal">
                {vm.editingRequestDetails ||
                  t(
                    'carrierRequestedScheduleChange',
                    'The transporter has requested an itinerary adjustment.'
                  )}
              </p>
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
                isNegotiable={vm.isNegotiable}
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
                onViewHistory={(partner) => {
                  setSelectedPartnerForHistory(partner);
                  setIsBidsHistoryOpen(true);
                }}
                onChat={(partner) => {
                  const resolvedType =
                    partner.userType === 'driver' ||
                    partner.transporterType === 'freelancer' ||
                    partner.transporterType === 'driver'
                      ? 'driver'
                      : 'carrier';
                  navigateToChat(partner, resolvedType, { shipmentScoped: true });
                }}
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
              shipmentStatus={vm.status}
              reportablePickups={reportablePickups}
              onReportDelay={handleOpenDelayReport}
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
                  const resolvedType = c.userType === 'driver' ? 'driver' : 'carrier';
                  navigateToChat(c, resolvedType, { shipmentScoped: true });
                }}
                onChatDriver={(d) => {
                  navigateToChat(d, 'driver', { shipmentScoped: true });
                }}
                t={t}
              />
            )}

            {/* Trip Performance Reports */}
            <TripPerformanceReportsCard
              performance={vm.tripPerformance}
              expanded={sections.tripPerformance}
              onToggle={() => toggleSection('tripPerformance')}
              t={t}
            />

            {/* 6. Load Summary */}
            <LoadSummaryCard
              loadSummary={vm.loadSummary}
              notes={vm.notes}
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
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              updatingNoteId={updatingNoteId}
              deletingNoteId={deletingNoteId}
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
        status={vm.status}
        onClose={() => setIsShareOpen(false)}
        onToast={(msg, type) => showToast(msg, type || 'info')}
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
        partner={selectedPartnerForHistory}
        onClose={() => {
          setIsBidsHistoryOpen(false);
          setSelectedPartnerForHistory(null);
        }}
        t={t}
      />

      {/* Pickup Delay Modal */}
      <PickupDelayModal
        open={Boolean(pendingDelay)}
        locationLabel={pendingDelay?.location_name || pendingDelay?.company_name}
        submitting={delaySubmitting}
        onClose={() => setPendingDelay(null)}
        onSubmit={handleSubmitDelay}
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

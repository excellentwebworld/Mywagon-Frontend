import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import {
  Bell,
  Search,
  CheckCheck,
  CheckCircle2,
  Archive,
  SlidersHorizontal,
  Truck,
  Gavel,
  Activity,
  XCircle,
  FileText,
  CreditCard,
  Users,
  ChevronRight,
  ExternalLink,
  Clock,
  ArrowRight,
  X,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { notificationService } from '../../api/services/notificationService';
import type {
  ApiNotification,
  NotificationMeta,
  NotificationAction,
  NotificationCategory,
} from '../../api/services/notificationService';
import NotificationsSection from '../Settings/sections/NotificationsSection';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  severity: ApiNotification['severity'];
  title: string;
  body: string;
  chips: string[];
  action: NotificationAction;
  action_id: string;
  external_url?: string | null;
  redirect_slug?: string | null;
  read: boolean;
  archived: boolean;
  created_at: string;
  relative_time: string;
}

// ─── i18n dictionary ─────────────────────────────────────────────────────────

const DICT: Record<string, { en: string; el: string }> = {
  pgTitle:            { en: 'Notifications', el: 'Ειδοποιήσεις' },
  pgSub:              { en: 'Triage, act on, and audit all operational alerts across your shipments', el: 'Διαχείριση και ενέργεια σε όλες τις ειδοποιήσεις λειτουργίας' },
  btnMarkAll:         { en: 'Mark all as read', el: 'Σήμανση όλων ως αναγνωσμένα' },
  btnSettings:        { en: 'Settings', el: 'Ρυθμίσεις' },
  filterAll:          { en: 'All', el: 'Όλα' },
  filterUnread:       { en: 'Unread', el: 'Μη αναγνωσμένα' },
  filterToday:        { en: 'Today', el: 'Σήμερα' },
  filterNewAvail:     { en: 'New Availability', el: 'Νέα Διαθεσιμότητα' },
  filterBookingBid:   { en: 'Booking Bidding', el: 'Κρατήσεις & Προσφορές' },
  filterShipProgress: { en: 'Shipment Progress', el: 'Πρόοδος Αποστολής' },
  filterCancellation: { en: 'Cancellation', el: 'Ακύρωση' },
  filterArchived:     { en: 'Archived', el: 'Αρχειοθετημένα' },
  searchPlaceholder:  { en: 'Search by title, SID, order, invoice…', el: 'Αναζήτηση ανά τίτλο, SID, παραγγελία…' },
  settingsTitle:      { en: 'Notification Settings', el: 'Ρυθμίσεις Ειδοποιήσεων' },
  emptyTitle:         { en: 'No notifications found', el: 'Δεν βρέθηκαν ειδοποιήσεις' },
  emptyDesc:          { en: "You're all caught up! When new alerts arrive, they will appear here.", el: 'Είστε πλήρως ενημερωμένοι! Όταν φτάσουν νέες ειδοποιήσεις, θα εμφανιστούν εδώ.' },
  searchTrucks:       { en: 'Search Trucks', el: 'Αναζήτηση Φορτηγών' },
  viewPartners:       { en: 'View Partners', el: 'Δείτε Συνεργάτες' },
  viewLoad:           { en: 'View Load', el: 'Δείτε Φορτίο' },
  manageShipments:    { en: 'Manage Shipments', el: 'Διαχείριση Αποστολών' },
  viewOrder:          { en: 'View Order', el: 'Δείτε Παραγγελία' },
  viewBids:           { en: 'View Bids', el: 'Δείτε Προσφορές' },
  viewInvoice:        { en: 'View Invoice', el: 'Δείτε Τιμολόγιο' },
  viewDocs:           { en: 'View Docs', el: 'Δείτε Έγγραφα' },
  viewSubscription:   { en: 'View Subscription', el: 'Δείτε Συνδρομή' },
  openSupport:        { en: 'Open Support', el: 'Υποστήριξη' },
  viewProfile:        { en: 'View Profile', el: 'Προφίλ' },
  viewUsers:          { en: 'User Management', el: 'Διαχείριση Χρηστών' },
  viewAddressBook:    { en: 'Address Book', el: 'Βιβλίο Διευθύνσεων' },
  viewProducts:       { en: 'Product Master', el: 'Προϊόντα' },
  viewTutorials:      { en: 'Tutorials', el: 'Εκπαιδευτικά Βίντεο' },
  openLink:           { en: 'Open Link', el: 'Άνοιγμα Συνδέσμου' },
  viewDetails:        { en: 'View Details', el: 'Προβολή Λεπτομερειών' },
  viewDashboard:      { en: 'View Dashboard', el: 'Δείτε Ταμπλό' },
  createShipment:     { en: 'Create Shipment', el: 'Δημιουργία Αποστολής' },
  viewNotifications:  { en: 'View Notifications', el: 'Δείτε Ειδοποιήσεις' },
  viewPrivacy:        { en: 'Privacy Policy', el: 'Πολιτική Απορρήτου' },
  viewTerms:          { en: 'Terms & Conditions', el: 'Όροι & Προϋποθέσεις' },
  viewOrganization:   { en: 'Company Info', el: 'Στοιχεία Εταιρείας' },




  markRead:           { en: 'Mark read', el: 'Αναγνωσμένο' },
  archive:            { en: 'Archive', el: 'Αρχείο' },
  unarchive:          { en: 'Unarchive', el: 'Επαναφορά' },
  relatedObjects:     { en: 'Related Objects', el: 'Σχετικά Αντικείμενα' },
  fullMessage:        { en: 'Full Message', el: 'Πλήρες Μήνυμα' },
  activity:           { en: 'Activity Timeline', el: 'Χρονολόγιο Δραστηριότητας' },
  showing:            { en: 'Showing', el: 'Εμφάνιση' },
  of:                 { en: 'of', el: 'από' },
  entries:            { en: 'notifications', el: 'ειδοποιήσεις' },
  perPage:            { en: 'Per page', el: 'Ανά σελίδα' },
  firstPage:          { en: 'First page', el: 'Πρώτη σελίδα' },
  prevPage:           { en: 'Previous page', el: 'Προηγούμενη σελίδα' },
  nextPage:           { en: 'Next page', el: 'Επόμενη σελίδα' },
  lastPage:           { en: 'Last page', el: 'Τελευταία σελίδα' },
  loadMore:           { en: 'Load More', el: 'Φόρτωση Περισσότερων' },
  loading:            { en: 'Loading…', el: 'Φόρτωση…' },
};

// ─── Filter Segments ─────────────────────────────────────────────────────────

const SEGMENTS = [
  { id: 'All', key: 'filterAll' },
  { id: 'Unread', key: 'filterUnread' },
  { id: 'Today', key: 'filterToday' },
  { id: 'New Availability', key: 'filterNewAvail' },
  { id: 'Booking Bidding', key: 'filterBookingBid' },
  { id: 'Shipment Progress', key: 'filterShipProgress' },
  { id: 'Cancellation', key: 'filterCancellation' },
  { id: 'Archived', key: 'filterArchived' },
];

// ─── Category Configurations ────────────────────────────────────────────────

interface CategoryVisualConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  badge: string;
  borderLeft: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryVisualConfig> = {
  'New Availability': {
    icon: Truck,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    borderLeft: '#2563eb',
  },
  'Booking Bidding': {
    icon: Gavel,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    borderLeft: '#7c3aed',
  },
  'Shipment Progress': {
    icon: Activity,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    borderLeft: '#10b981',
  },
  'Cancellation': {
    icon: XCircle,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    borderLeft: '#ef4444',
  },
  'Docs': {
    icon: FileText,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/50',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    borderLeft: '#0ea5e9',
  },
  'Billing': {
    icon: CreditCard,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/50',
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
    borderLeft: '#0d9488',
  },
  'Partners': {
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    borderLeft: '#6366f1',
  },
  'System': {
    icon: Bell,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    borderLeft: '#64748b',
  },
};

function getCategoryConfig(category?: string): CategoryVisualConfig {
  return (
    CATEGORY_CONFIGS[category || ''] || {
      icon: Bell,
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      borderLeft: '#64748b',
    }
  );
}

// ─── Timezone-aware Date Formatting ─────────────────────────────────────────

function formatRelativeTime(created_at?: string, fallback = ''): string {
  if (!created_at) return fallback;
  try {
    const d = new Date(created_at);
    if (isNaN(d.getTime())) return fallback;
    const now = new Date();
    const diff = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));

    if (diff < 45) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return fallback;
  }
}

function formatFullDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function buildPageList(current: number, last: number): number[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= last - 2) {
    pages.add(last - 1);
    pages.add(last - 2);
    pages.add(last - 3);
  }
  return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
}

// ─── Map ApiNotification to internal NotificationItem ────────────────────────

function mapApiItem(n: ApiNotification): NotificationItem {
  return {
    id:            n.id,
    category:      n.category,
    severity:      n.severity,
    title:         n.title,
    body:          n.body,
    chips:         n.chips,
    action:        n.action_type,
    action_id:     n.action_id,
    external_url:  n.external_url,
    redirect_slug: n.redirect_slug,
    read:          n.read,
    archived:      n.archived,
    created_at:    n.created_at,
    relative_time: n.relative_time || formatRelativeTime(n.created_at),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const NotificationsPage: React.FC = () => {
  const { showToast } = useApp();
  const { lang, t: tHook } = useTranslation();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(20);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<NotificationMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 20,
    unread_count: 0,
    archived_count: 0,
    all_count: 0,
  });

  const [loading, setLoading] = useState(true);

  const [activeCat, setActiveCat] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Debounce search
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const isFirstRender = useRef(true);

  // ── Scroll to Top Helper ───────────────────────────────────────────────
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const selectors = ['.page-body', '.main-content', '.app-layout'];
    selectors.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        if ('scrollTo' in el) {
          el.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          el.scrollTop = 0;
        }
      }
    });
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    scrollToTop();
  };

  // ── i18n ───────────────────────────────────────────────────────────────
  const currentLang = (lang === 'el' ? 'el' : 'en') as 'en' | 'el';
  const loc = (key: string): string => {
    if (DICT[key]) return DICT[key][currentLang];
    return tHook(key) || key;
  };

  // ── Fetch helper ───────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (
    category: string,
    search: string,
    page: number,
    pageSize: number,
  ) => {
    try {
      setLoading(true);

      const res = await notificationService.list({
        tab: 'all',
        category: category !== 'All' ? category : undefined,
        search: search.trim() || undefined,
        page,
        per_page: pageSize,
      });

      const items = res.data.map(mapApiItem);
      setNotifications(items);
      setMeta(res.meta);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Reset page to 1 when filters change ────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCat, debouncedSearch]);

  // ── Scroll to top on page change ───────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToTop();
  }, [currentPage, scrollToTop]);

  // ── Reload data when activeCat, debouncedSearch, currentPage or perPage changes ───
  useEffect(() => {
    void fetchNotifications(activeCat, debouncedSearch, currentPage, perPage);
  }, [activeCat, debouncedSearch, currentPage, perPage, fetchNotifications]);

  // ── Search debounce ────────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery]);

  // ── Escape key ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNotif(null);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setMeta(prev => ({ ...prev, unread_count: 0 }));
      showToast(loc('btnMarkAll') + ' ✓', 'success');
    } catch {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const handleMarkOneRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? mapApiItem(updated) : n));
      setMeta(prev => ({ ...prev, unread_count: Math.max(0, prev.unread_count - 1) }));
    } catch {
      showToast('Failed to mark as read', 'error');
    }
  };

  const handleArchive = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = notifications.find(n => n.id === id);
    const wasArchived = item?.archived ?? (activeCat === 'Archived');

    try {
      await notificationService.archive(id);
      void fetchNotifications(activeCat, debouncedSearch, currentPage, perPage);
      if (selectedNotif?.id === id) {
        setSelectedNotif(null);
      }
      showToast(wasArchived ? (loc('unarchive') + ' ✓') : (loc('archive') + ' ✓'), 'info');
    } catch {
      showToast('Failed to update archive status', 'error');
    }
  };

  const handleOpenDrawer = async (item: NotificationItem) => {
    setSelectedNotif(item);
    if (!item.read) {
      await handleMarkOneRead(item.id);
    }
  };

  const handleActionNavigate = (itemOrAction: NotificationAction | NotificationItem, chip?: string) => {
    let action: NotificationAction = null;
    let actionId: string | undefined;
    let externalUrl: string | undefined | null;
    let redirectSlug: string | undefined | null;

    if (typeof itemOrAction === 'object' && itemOrAction !== null) {
      action = itemOrAction.action;
      actionId = itemOrAction.action_id;
      externalUrl = itemOrAction.external_url;
      redirectSlug = itemOrAction.redirect_slug;

      if (!actionId && itemOrAction.chips && itemOrAction.chips.length > 0) {
        const sidChip = itemOrAction.chips.find(c => c.startsWith('SID-'));
        if (sidChip) {
          actionId = sidChip.replace('SID-', '');
        }
      }
    } else {
      action = itemOrAction;
    }

    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Extract ID from chip if passed (e.g. "SID-10263" -> "10263")
    if (chip) {
      const cleaned = chip.replace(/^SID-|^ORD-|^INV-|^AVL-/, '');
      if (cleaned) {
        actionId = cleaned;
      }
    }

    let target = redirectSlug ? (redirectSlug.startsWith('/') ? redirectSlug : `/${redirectSlug}`) : '/notifications';

    if (action === 'manageShipments') {
      target = '/shipments';
    } else if (action === 'viewDashboard') {
      target = '/dashboard';
    } else if (action === 'createShipment') {
      target = '/shipments/create';
    } else if (action === 'searchTrucks') {
      target = '/search-trucks';
    } else if (action === 'viewPartners') {
      target = '/partners';
    } else if (action === 'viewLoad' || action === 'viewBids' || action === 'viewDocs') {
      target = actionId ? `/shipments/${actionId}` : '/shipments';

    } else if (action === 'viewInvoice') {
      target = actionId ? `/billing?invoice=${actionId}` : '/billing';
    } else if (action === 'viewOrder') {
      target = actionId ? `/erp-orders?id=${actionId}` : '/erp-orders';
    } else if (action === 'viewSubscription') {
      target = '/subscription';
    } else if (action === 'openSupport') {
      target = '/support';
    } else if (action === 'viewProfile') {
      target = '/settings/personal';
    } else if (action === 'viewOrganization') {
      target = '/settings/organization';
    } else if (action === 'viewUsers') {
      target = '/settings/users';
    } else if (action === 'viewPrivacy') {
      target = '/settings/privacy';
    } else if (action === 'viewTerms') {
      target = '/settings/terms';
    } else if (action === 'viewAddressBook') {
      target = '/address-book';
    } else if (action === 'viewProducts') {
      target = '/product-master';
    } else if (action === 'viewTutorials') {
      target = '/tutorials';
    } else if (action === 'viewNotifications') {
      target = '/notifications';
    }


    setSelectedNotif(null);
    navigate(target);
  };

  const total = meta.total ?? 0;
  const lastPage = Math.max(meta.last_page ?? 1, 1);
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);
  const pageList = useMemo(() => buildPageList(currentPage, lastPage), [currentPage, lastPage]);

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loc('pgTitle')}
            </h1>
            {meta.unread_count > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {meta.unread_count} new
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {loc('pgSub')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{loc('btnMarkAll')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>{loc('btnSettings')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {SEGMENTS.map((s) => {
            const isAll = s.id === 'All';
            const isArchived = s.id === 'Archived';
            const isUnread = s.id === 'Unread';
            const count = isArchived
              ? (meta.archived_count ?? 0)
              /* : isAll
              ? (meta.all_count ?? meta.total ?? 0)
              : isUnread
              ? (meta.unread_count ?? 0) */
              : null;
            const isActive = activeCat === s.id;




            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveCat(s.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{loc(s.key)}</span>
                {count !== null && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-950'
                        : isUnread && count > 0
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={loc('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((k) => (
              <div
                key={k}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-3/4" />
                  </div>
                </div>
                <div className="w-24 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3.5">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {loc('emptyTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {loc('emptyDesc')}
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const config = getCategoryConfig(n.category);
            const CatIcon = config.icon;

            return (
              <div
                key={n.id}
                onClick={() => handleOpenDrawer(n)}
                className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-150 cursor-pointer ${
                  !n.read
                    ? 'bg-indigo-50/25 dark:bg-indigo-950/15 border-indigo-200/90 dark:border-indigo-900/60 shadow-xs hover:shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md'
                }`}
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: config.borderLeft,
                }}
              >
                {/* Left Column */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${config.bg}`}
                  >
                    <CatIcon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {n.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight ${config.badge}`}
                      >
                        {n.category}
                      </span>
                      {!n.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950 animate-pulse" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>

                    <div className="flex items-center gap-3 pt-0.5 flex-wrap text-slate-400">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {n.relative_time}
                      </span>

                      {n.chips && n.chips.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {n.chips.map((chip) => (
                            <span
                              key={chip}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div
                  className="flex items-center gap-1.5 self-end md:self-center flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {n.action && (
                    <button
                      type="button"
                      onClick={() => handleActionNavigate(n, n.chips[0])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>{loc(n.action) || loc('viewDetails')}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}


                  {!n.read && (
                    <button
                      type="button"
                      title={loc('markRead')}
                      onClick={(e) => void handleMarkOneRead(n.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-900 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    title={n.archived ? loc('unarchive') : loc('archive')}
                    onClick={(e) => void handleArchive(n.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              {loc('showing')} <strong className="text-slate-900 dark:text-white font-bold">{start}–{end}</strong> {loc('of')} <strong className="text-slate-900 dark:text-white font-bold">{total}</strong> {loc('entries')}
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 text-[11px]">
                {loc('perPage')}:
              </span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  handlePageChange(1);
                }}
                disabled={loading}
                aria-label={loc('perPage')}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-indigo-500 transition-all"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / {loc('perPage')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(1)}
              title={loc('firstPage')}
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              «
            </button>
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              title={loc('prevPage')}
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              ‹
            </button>

            {pageList.map((p, idx) => {
              const prev = pageList[idx - 1];
              const gap = prev !== undefined && p - prev > 1;
              return (
                <React.Fragment key={p}>
                  {gap && (
                    <span className="w-6 h-8 flex items-center justify-center text-xs text-slate-400 font-semibold select-none">
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handlePageChange(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                      p === currentPage
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= lastPage || loading}
              onClick={() => handlePageChange(Math.min(lastPage, currentPage + 1))}
              title={loc('nextPage')}
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              ›
            </button>
            <button
              type="button"
              disabled={currentPage >= lastPage || loading}
              onClick={() => handlePageChange(lastPage)}
              title={loc('lastPage')}
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Slide-out Detail Drawer */}
      {selectedNotif &&
        createPortal(
          <div className="fixed inset-0 z-[99999] overflow-hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setSelectedNotif(null)}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 h-full">
              <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4 flex-shrink-0 bg-white dark:bg-slate-900">
                  <div className="space-y-1.5 min-w-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        getCategoryConfig(selectedNotif.category).badge
                      }`}
                    >
                      {selectedNotif.category}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {selectedNotif.title}
                    </h2>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedNotif.relative_time}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNotif(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {loc('fullMessage')}
                    </h4>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                      {selectedNotif.body}
                    </div>
                  </div>

                  {selectedNotif.chips.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        {loc('relatedObjects')}
                      </h4>
                      <div className="space-y-2">
                        {selectedNotif.chips.map((chip) => (
                          <div
                            key={chip}
                            onClick={() => {
                              setSelectedNotif(null);
                              handleActionNavigate(selectedNotif, chip);
                            }}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              <ExternalLink className="w-4 h-4" />
                              <span>{chip}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => void handleArchive(selectedNotif.id, e)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedNotif.archived ? loc('unarchive') : loc('archive')}</span>
                  </button>

                  {selectedNotif.action && (
                    <button
                      type="button"
                      onClick={() => {
                        const chip = selectedNotif.chips[0];
                        setSelectedNotif(null);
                        handleActionNavigate(selectedNotif, chip);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    >
                      <span>{loc(selectedNotif.action) || loc('viewDetails')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Settings Modal */}
      {settingsOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] overflow-y-auto flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setSettingsOpen(false)}
            />

            <div
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[90vh] flex flex-col z-10 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {loc('settingsTitle')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <NotificationsSection />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default NotificationsPage;


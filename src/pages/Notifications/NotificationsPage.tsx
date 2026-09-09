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
import { useTheme } from '../../hooks/useTheme';
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
  viewProfile:        { en: 'View Compliance', el: 'Συμμόρφωση KYC' },
  viewCompliance:     { en: 'View Compliance', el: 'Συμμόρφωση KYC' },
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
  new:                { en: 'new', el: 'νέες' },
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
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.1)',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    borderLeft: '#2563EB',
  },
  'Booking Bidding': {
    icon: Gavel,
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.1)',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    borderLeft: '#7C3AED',
  },
  'Shipment Progress': {
    icon: Activity,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    borderLeft: '#10B981',
  },
  'Cancellation': {
    icon: XCircle,
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    borderLeft: '#EF4444',
  },
  'Docs': {
    icon: FileText,
    color: '#0EA5E9',
    bg: 'rgba(14, 165, 233, 0.1)',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    borderLeft: '#0EA5E9',
  },
  'Billing': {
    icon: CreditCard,
    color: '#0D9488',
    bg: 'rgba(13, 148, 136, 0.1)',
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
    borderLeft: '#0D9488',
  },
  'Partners': {
    icon: Users,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.1)',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    borderLeft: '#6366F1',
  },
  'System': {
    icon: Bell,
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.12)',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    borderLeft: '#64748B',
  },
};

function getCategoryConfig(category?: string): CategoryVisualConfig {
  return (
    CATEGORY_CONFIGS[category || ''] || {
      icon: Bell,
      color: '#64748B',
      bg: 'rgba(100, 116, 139, 0.12)',
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      borderLeft: '#64748B',
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

type NotificationsPageProps = {
  /** When true, render inside Settings chrome (no full-page padding). */
  embedded?: boolean;
};

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ embedded = false }) => {
  const { showToast } = useApp();
  const { lang, t: tHook } = useTranslation();
  const { T, isDark } = useTheme();
  const navigate = useNavigate();

  // ── State (Default 10 items per page) ───────────────────────────────────
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<NotificationMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
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

    const selectors = ['.page-body', '.main-content', '.app-layout', '.settings-content'];
    selectors.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        el.scrollTop = 0;
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

      if (!actionId && itemOrAction.chips && itemOrAction.chips.length > 0 && (itemOrAction as any).action_type !== 'viewBids') {
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

    let target = redirectSlug ? (redirectSlug.startsWith('/') ? redirectSlug : `/${redirectSlug}`) : '/settings/notifications';

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
      const base = actionId ? `/shipments/${actionId}` : '/shipments';
      if (action === 'viewBids') {
        target = `${base}?focus=bids`;
      } else if (action === 'viewDocs') {
        target = `${base}?focus=docs`;
      } else {
        target = base;
      }
    } else if (action === 'viewInvoice') {
      target = actionId ? `/billing?invoice=${actionId}` : '/billing';
    } else if (action === 'viewOrder') {
      target = actionId ? `/erp-orders?id=${actionId}` : '/erp-orders';
    } else if (action === 'viewSubscription') {
      target = '/subscription';
    } else if (action === 'openSupport') {
      target = '/support';
    } else if (action === 'viewProfile' || action === 'viewCompliance') {
      target = '/settings/compliance';
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
      target = '/products';
    } else if (action === 'viewTutorials') {
      target = '/tutorials';
    } else if (action === 'viewNotifications') {
      target = '/settings/notifications';
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
    <div
      className={
        embedded
          ? 'mv-themed-page w-full space-y-4'
          : 'mv-themed-page min-h-screen bg-[var(--bg)] p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto'
      }
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              className={`${embedded ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold tracking-tight`}
              style={{ color: T.t1 }}
            >
              {loc('pgTitle')}
            </h1>
            {meta.unread_count > 0 && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: '#EDE9FE',
                  color: '#7C3AED',
                  border: '1px solid #DDD6FE',
                }}
              >
                {meta.unread_count} {loc('new')}
              </span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: T.t3 }}>
            {loc('pgSub')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
            style={{
              background: T.sf,
              border: `1px solid ${T.bd}`,
              color: T.t1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.sa;
              e.currentTarget.style.borderColor = '#7C3AED';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.sf;
              e.currentTarget.style.borderColor = T.bd;
            }}
          >
            <CheckCheck className="w-4 h-4 text-[#7C3AED]" />
            <span>{loc('btnMarkAll')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs"
            style={{
              background: T.sf,
              border: `1px solid ${T.bd}`,
              color: T.t1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.sa;
              e.currentTarget.style.borderColor = '#7C3AED';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.sf;
              e.currentTarget.style.borderColor = T.bd;
            }}
          >
            <SlidersHorizontal className="w-4 h-4" style={{ color: T.t3 }} />
            <span>{loc('btnSettings')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar — pills left, search right (no horizontal scroll) */}
      <div
        className="flex flex-wrap items-center gap-2 p-3 rounded-2xl shadow-xs"
        style={{
          background: T.sf,
          border: `1px solid ${T.bd}`,
        }}
      >
        {/* Pills — wrap; leave room for search on the right */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {SEGMENTS.map((s) => {
            const isArchived = s.id === 'Archived';
            const isUnread = s.id === 'Unread';
            const count = isArchived
              ? (meta.archived_count ?? 0)
              : isUnread
              ? (meta.unread_count ?? 0)
              : null;
            const isActive = activeCat === s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveCat(s.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer"
                style={{
                  background: isActive ? '#7C3AED' : T.sa,
                  color: isActive ? '#FFFFFF' : T.t2,
                  border: `1px solid ${isActive ? '#7C3AED' : T.bd}`,
                  boxShadow: isActive ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#C4B5FD';
                    e.currentTarget.style.color = T.t1;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = T.bd;
                    e.currentTarget.style.color = T.t2;
                  }
                }}
              >
                <span>{loc(s.key)}</span>
                {count !== null && count > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                    style={{
                      background: isActive ? 'rgba(255, 255, 255, 0.25)' : isUnread ? '#FEE2E2' : T.sf,
                      color: isActive ? '#FFFFFF' : isUnread ? '#EF4444' : T.t3,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search — right side (highlighted area) */}
        <div className="relative w-full sm:w-[260px] lg:w-[280px] flex-shrink-0 sm:ml-auto">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
          <input
            type="text"
            placeholder={loc('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs outline-none transition-all"
            style={{
              background: T.sa,
              border: `1px solid ${T.bd}`,
              color: T.t1,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#7C3AED';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = T.bd;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full cursor-pointer border-none bg-transparent"
              style={{ color: T.t3 }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((k) => (
              <div
                key={k}
                className="p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse"
                style={{ background: T.sf, border: `1px solid ${T.bd}` }}
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-10 h-10 rounded-xl" style={{ background: T.sa }} />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 rounded-md w-1/3" style={{ background: T.sa }} />
                    <div className="h-3 rounded-md w-3/4" style={{ background: T.sa, opacity: 0.7 }} />
                  </div>
                </div>
                <div className="w-24 h-8 rounded-xl" style={{ background: T.sa }} />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div
            className="text-center py-16 px-4 rounded-2xl shadow-xs"
            style={{ background: T.sf, border: `1px solid ${T.bd}` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}
            >
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold" style={{ color: T.t1 }}>
              {loc('emptyTitle')}
            </h3>
            <p className="text-xs max-w-md mx-auto mt-1" style={{ color: T.t3 }}>
              {loc('emptyDesc')}
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const config = getCategoryConfig(n.category);
            const CatIcon = config.icon;
            const isUnread = !n.read;

            return (
              <div
                key={n.id}
                onClick={() => handleOpenDrawer(n)}
                className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl transition-all duration-150 cursor-pointer overflow-hidden"
                style={{
                  background: isUnread ? (isDark ? 'rgba(124, 58, 237, 0.08)' : '#FAF8FF') : T.sf,
                  border: `1px solid ${isUnread ? (isDark ? 'rgba(124, 58, 237, 0.4)' : '#DDD6FE') : T.bd}`,
                  boxShadow: isUnread ? '0 2px 10px rgba(124, 58, 237, 0.06)' : '0 1px 3px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7C3AED';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isUnread ? (isDark ? 'rgba(124, 58, 237, 0.4)' : '#DDD6FE') : T.bd;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isUnread ? '0 2px 10px rgba(124, 58, 237, 0.06)' : '0 1px 3px rgba(0,0,0,0.03)';
                }}
              >
                {/* Left accent color bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ background: config.borderLeft }}
                />

                {/* Left Column */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1 pl-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: config.bg }}
                  >
                    <CatIcon className="w-5 h-5" style={{ color: config.color }} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold leading-tight truncate" style={{ color: T.t1 }}>
                        {n.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold tracking-tight ${config.badge}`}
                      >
                        {n.category}
                      </span>
                      {isUnread && (
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{
                            background: '#7C3AED',
                            boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.25)',
                          }}
                        />
                      )}
                    </div>

                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: T.t2 }}>
                      {n.body}
                    </p>

                    <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: T.t3 }}>
                        <Clock className="w-3.5 h-3.5" />
                        {n.relative_time}
                      </span>

                      {n.chips && n.chips.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {n.chips.map((chip) => (
                            <span
                              key={chip}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold"
                              style={{
                                background: T.sa,
                                color: '#7C3AED',
                                border: `1px solid ${T.bd}`,
                              }}
                            >
                              <ExternalLink className="w-3 h-3 opacity-70" />
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
                  className="flex items-center gap-2 self-end md:self-center flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {n.action && (
                    <button
                      type="button"
                      onClick={() => handleActionNavigate(n, n.chips[0])}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs hover:shadow-md active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap border-none"
                      style={{
                        background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                      }}
                    >
                      <span>{loc(n.action) || loc('viewDetails')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isUnread && (
                    <button
                      type="button"
                      title={loc('markRead')}
                      onClick={(e) => void handleMarkOneRead(n.id, e)}
                      className="p-1.5 rounded-lg cursor-pointer transition-colors border-none bg-transparent"
                      style={{ color: T.t3 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#7C3AED';
                        e.currentTarget.style.background = '#EDE9FE';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = T.t3;
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    title={n.archived ? loc('unarchive') : loc('archive')}
                    onClick={(e) => void handleArchive(n.id, e)}
                    className="p-1.5 rounded-lg cursor-pointer transition-colors border-none bg-transparent"
                    style={{ color: T.t3 }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = T.t1;
                      e.currentTarget.style.background = T.sa;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = T.t3;
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination (Default 10 items per page) */}
      {!loading && total > 0 && (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl shadow-xs text-xs"
          style={{
            background: T.sf,
            border: `1px solid ${T.bd}`,
            color: T.t3,
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              {loc('showing')}{' '}
              <strong style={{ color: T.t1, fontWeight: 700 }}>{start}–{end}</strong>{' '}
              {loc('of')}{' '}
              <strong style={{ color: T.t1, fontWeight: 700 }}>{total}</strong>{' '}
              {loc('entries')}
            </span>

            <div
              className="flex items-center gap-1.5 pl-3"
              style={{ borderLeft: `1px solid ${T.bd}` }}
            >
              <span className="text-[11px]" style={{ color: T.t3 }}>
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
                className="px-2.5 py-1 rounded-lg text-xs font-semibold outline-none cursor-pointer transition-all"
                style={{
                  background: T.sa,
                  border: `1px solid ${T.bd}`,
                  color: T.t1,
                }}
              >
                {[10, 20, 50, 100].map((n) => (
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
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: T.sf,
                border: `1px solid ${T.bd}`,
                color: T.t1,
              }}
            >
              «
            </button>
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              title={loc('prevPage')}
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: T.sf,
                border: `1px solid ${T.bd}`,
                color: T.t1,
              }}
            >
              ‹
            </button>

            {pageList.map((p, idx) => {
              const prev = pageList[idx - 1];
              const gap = prev !== undefined && p - prev > 1;
              const isCurrent = p === currentPage;

              return (
                <React.Fragment key={p}>
                  {gap && (
                    <span className="w-6 h-8 flex items-center justify-center text-xs font-semibold select-none" style={{ color: T.t3 }}>
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handlePageChange(p)}
                    className="w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: isCurrent ? '#7C3AED' : T.sf,
                      color: isCurrent ? '#FFFFFF' : T.t1,
                      border: isCurrent ? 'none' : `1px solid ${T.bd}`,
                      boxShadow: isCurrent ? '0 2px 6px rgba(124, 58, 237, 0.4)' : 'none',
                    }}
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
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: T.sf,
                border: `1px solid ${T.bd}`,
                color: T.t1,
              }}
            >
              ›
            </button>
            <button
              type="button"
              disabled={currentPage >= lastPage || loading}
              onClick={() => handlePageChange(lastPage)}
              title={loc('lastPage')}
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: T.sf,
                border: `1px solid ${T.bd}`,
                color: T.t1,
              }}
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
              className="mv-modal-bg absolute inset-0 transition-opacity duration-300"
              style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)' }}
              onClick={() => setSelectedNotif(null)}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 h-full">
              <div
                className="mv-drawer-panel w-screen max-w-md shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
                style={{
                  background: T.sf,
                  borderLeft: `1px solid ${T.bd}`,
                }}
              >
                {/* Drawer Header */}
                <div
                  className="p-5 flex items-start justify-between gap-4 flex-shrink-0"
                  style={{
                    background: T.sf,
                    borderBottom: `1px solid ${T.bd}`,
                  }}
                >
                  <div className="space-y-1.5 min-w-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        getCategoryConfig(selectedNotif.category).badge
                      }`}
                    >
                      {selectedNotif.category}
                    </span>
                    <h2 className="text-base font-bold leading-snug" style={{ color: T.t1 }}>
                      {selectedNotif.title}
                    </h2>
                    <p className="text-[11px] flex items-center gap-1" style={{ color: T.t3 }}>
                      <Clock className="w-3.5 h-3.5" />
                      {selectedNotif.relative_time}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNotif(null)}
                    className="p-1.5 rounded-xl cursor-pointer border-none bg-transparent"
                    style={{ color: T.t3 }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="mv-drawer-body flex-1 overflow-y-auto p-5 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.t3 }}>
                      {loc('fullMessage')}
                    </h4>
                    <div
                      className="p-4 rounded-xl text-xs leading-relaxed"
                      style={{
                        background: T.sa,
                        border: `1px solid ${T.bd}`,
                        color: T.t1,
                      }}
                    >
                      {selectedNotif.body}
                    </div>
                  </div>

                  {selectedNotif.chips.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.t3 }}>
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
                            className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group"
                            style={{
                              background: T.sf,
                              border: `1px solid ${T.bd}`,
                            }}
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-[#7C3AED]">
                              <ExternalLink className="w-4 h-4" />
                              <span>{chip}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-all" style={{ color: T.t3 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer Footer */}
                <div
                  className="p-4 flex items-center justify-between gap-3 flex-shrink-0"
                  style={{
                    background: T.sf,
                    borderTop: `1px solid ${T.bd}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => void handleArchive(selectedNotif.id, e)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    style={{
                      background: T.sf,
                      border: `1px solid ${T.bd}`,
                      color: T.t1,
                    }}
                  >
                    <Archive className="w-3.5 h-3.5" style={{ color: T.t3 }} />
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs cursor-pointer border-none"
                      style={{
                        background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                      }}
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
              className="mv-modal-bg fixed inset-0 transition-opacity"
              style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)' }}
              onClick={() => setSettingsOpen(false)}
            />

            <div
              className="mv-modal relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col z-10 animate-in zoom-in-95 duration-150"
              style={{
                background: T.sf,
                border: `1px solid ${T.bd}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="mv-modal-header px-6 py-4 flex items-center justify-between flex-shrink-0"
                style={{
                  background: T.sf,
                  borderBottom: `1px solid ${T.bd}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#EDE9FE', color: '#7C3AED' }}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: T.t1 }}>
                    {loc('settingsTitle')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="p-1.5 rounded-xl cursor-pointer border-none bg-transparent"
                  style={{ color: T.t3 }}
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

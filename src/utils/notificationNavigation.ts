import type { ApiNotification } from '../api/services/notificationService';

export type NotificationNavInput = Pick<
  ApiNotification,
  'action_type' | 'action_id' | 'chips' | 'redirect_slug' | 'external_url'
>;

/**
 * Resolve shipment / entity id for routing.
 *
 * Same as Laravel Blade: route('shipper.manage-shipment.show', type_id).
 * SID-* chips are display-only (auto_id). Never override action_id with a SID chip.
 */
export function resolveNotificationActionId(
  n: Pick<ApiNotification, 'action_id' | 'chips' | 'action_type'>
): string {
  const fromApi = String(n.action_id ?? '').trim();
  if (fromApi) {
    return fromApi.replace(/^SID-/i, '').replace(/^SHP-/i, '');
  }

  // Fallback only when API omitted action_id.
  const chips = n.chips ?? [];
  const shipmentActions = n.action_type === 'viewLoad'
    || n.action_type === 'viewBids'
    || n.action_type === 'viewDocs';

  if (shipmentActions || !n.action_type) {
    const sid = chips.find((c) => /^SID-/i.test(c));
    if (sid) {
      return sid.replace(/^SID-/i, '');
    }
  }

  const ord = chips.find((c) => /^ORD-/i.test(c));
  if (ord && n.action_type === 'viewOrder') {
    return ord.replace(/^ORD-/i, '');
  }

  const inv = chips.find((c) => /^INV-/i.test(c));
  if (inv && n.action_type === 'viewInvoice') {
    return inv.replace(/^INV-/i, '');
  }

  return '';
}

/**
 * Resolve in-app navigation for inbox/dropdown/page (API-enriched action_type).
 */
export function resolveNotificationPath(n: NotificationNavInput): string | null {
  if (n.external_url) {
    return null;
  }

  const actionId = resolveNotificationActionId(n);

  let target = n.redirect_slug
    ? n.redirect_slug.startsWith('/')
      ? n.redirect_slug
      : `/${n.redirect_slug}`
    : '/settings/notifications';

  if (n.action_type === 'manageShipments') {
    target = '/shipments';
  } else if (n.action_type === 'viewDashboard') {
    target = '/dashboard';
  } else if (n.action_type === 'createShipment') {
    target = '/shipments/create';
  } else if (n.action_type === 'searchTrucks') {
    target = '/search-trucks';
  } else if (n.action_type === 'viewPartners') {
    target = '/partners';
  } else if (n.action_type === 'viewLoad' || n.action_type === 'viewBids' || n.action_type === 'viewDocs') {
    // Laravel: manage-shipment.show(type_id). React keeps optional focus for bids/docs UX.
    const base = actionId ? `/shipments/${actionId}` : '/shipments';
    if (n.action_type === 'viewBids') {
      target = `${base}?focus=bids`;
    } else if (n.action_type === 'viewDocs') {
      target = `${base}?focus=docs`;
    } else {
      target = base;
    }
  } else if (n.action_type === 'viewInvoice') {
    target = actionId ? `/billing?invoice=${actionId}` : '/billing';
  } else if (n.action_type === 'viewOrder') {
    target = actionId ? `/erp-orders?id=${actionId}` : '/erp-orders';
  } else if (n.action_type === 'viewSubscription') {
    target = '/subscription';
  } else if (n.action_type === 'openSupport') {
    target = '/support';
  } else if (n.action_type === 'viewProfile' || n.action_type === 'viewCompliance') {
    target = '/settings/compliance';
  } else if (n.action_type === 'viewOrganization') {
    target = '/settings/organization';
  } else if (n.action_type === 'viewUsers') {
    target = '/settings/users';
  } else if (n.action_type === 'viewPrivacy') {
    target = '/settings/privacy';
  } else if (n.action_type === 'viewTerms') {
    target = '/settings/terms';
  } else if (n.action_type === 'viewAddressBook') {
    target = '/address-book';
  } else if (n.action_type === 'viewProducts') {
    target = '/products';
  } else if (n.action_type === 'viewTutorials') {
    target = '/tutorials';
  } else if (n.action_type === 'openChat') {
    target = actionId
      ? `/messages?userId=${encodeURIComponent(actionId)}`
      : '/messages';
  } else if (n.action_type === 'viewNotifications') {
    target = '/settings/notifications';
  }

  return target;
}

export function openNotificationTarget(
  n: NotificationNavInput,
  navigate: (path: string) => void
): void {
  if (n.external_url) {
    window.open(n.external_url, '_blank', 'noopener,noreferrer');
    return;
  }
  const path = resolveNotificationPath(n);
  navigate(path ?? '/settings/notifications');
}

/**
 * Open a push-notification deep link with a full document load.
 *
 * Soft React Router navigation is not enough: the app QueryClient defaults to
 * refetchOnMount/refetchOnWindowFocus = false, so focusing an existing tab (or
 * navigating to the same route) leaves stale shipment/list data on screen.
 * A hard assign clears that in-memory cache and fetches latest data.
 */
export function navigateFromPushNotification(url: string): void {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return;

  let absolute: URL;
  try {
    absolute = new URL(trimmed, window.location.origin);
  } catch {
    return;
  }

  if (absolute.origin !== window.location.origin) {
    window.open(absolute.href, '_blank', 'noopener,noreferrer');
    return;
  }

  const next = `${absolute.pathname}${absolute.search}${absolute.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (current === next) {
    window.location.reload();
    return;
  }

  window.location.assign(next);
}

/**
 * Realtime / FCM click routing — mirrors Laravel
 * public/assets/shipper/assets/js/pages/firebase-push-handler.js → resolveClickAction().
 *
 * Uses payload `type` + `type_id` (shipments.id). Does not invent new backend fields.
 */
export function resolveLaravelStylePushRoute(data: {
  type?: string;
  type_id?: string;
  action_id?: string;
  external_url?: string;
  redirect_slug?: string;
}): string {
  if (data.external_url) {
    return data.external_url;
  }

  const type = String(data.type ?? '').toLowerCase();
  const id = String(data.action_id || data.type_id || '')
    .trim()
    .replace(/^SID-/i, '')
    .replace(/^SHP-/i, '');

  // Admin bulk / meta redirect_slug (same idea as Blade getShipperRouteByType)
  const slug = String(data.redirect_slug ?? '').toLowerCase();
  if (type === 'bulk_from_admin' || (slug && !slug.startsWith('/'))) {
    switch (slug) {
      case 'dashboard':
        return '/dashboard';
      case 'create_shipment':
        return '/shipments/create';
      case 'manage_shipments':
        return '/shipments';
      case 'search_available_trucks':
        return '/search-trucks';
      case 'address_book':
        return '/address-book';
      case 'product_master':
        return '/products';
      case 'partner':
        return '/partners';
      case 'subscription':
        return '/subscription';
      case 'support':
        return '/support';
      case 'chat':
        return '/messages';
      case 'notification':
        return '/settings/notifications';
      case 'profile':
        return '/settings/compliance';
      case 'user_management':
        return '/settings/users';
      case 'account_statement':
        return '/billing';
      case 'privacy_policy':
        return '/settings/privacy';
      case 'terms_and_conditions':
        return '/settings/terms';
      default:
        break;
    }
  }

  if (slug.startsWith('/')) {
    return slug;
  }

  switch (type) {
    case 'cancel_shipment':
    case 'shipment':
      // Laravel: shipper.manage-shipment.show(type_id)
      return id ? `/shipments/${id}` : '/shipments';
    case 'availibility':
    case 'availability':
    case 'truck_availability':
    case 'new_availability':
      return '/search-trucks';
    case 'invoice':
    case 'billing':
    case 'payment':
      return id ? `/billing?invoice=${encodeURIComponent(id)}` : '/billing';
    case 'kyc_accepted':
    case 'kyc_rejected':
      return '/settings/compliance';
    case 'message':
      return '/messages';
    case 'partner':
    case 'partner_accept':
    case 'partner_request':
    case 'new_shipper_partner_added_successfully':
    case 'new_carrier_partner_added_successfully':
      return '/partners';
    case 'privacy_policy':
      return '/settings/privacy';
    case 'subscription':
      return '/subscription';
    case 'terms_and_conditions':
      return '/settings/terms';
    case 'company_operations_information':
      return '/settings/organization';
    default:
      // Laravel default: shipper home — React uses dashboard; if type_id present open load
      return id ? `/shipments/${id}` : '/dashboard';
  }
}

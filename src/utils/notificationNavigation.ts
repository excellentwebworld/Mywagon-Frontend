import type { ApiNotification } from '../api/services/notificationService';

/**
 * Resolve in-app navigation target for a notification (Header + dashboard).
 * Returns null when the caller should open `external_url` instead.
 */
export function resolveNotificationPath(n: Pick<
  ApiNotification,
  'action_type' | 'action_id' | 'chips' | 'redirect_slug' | 'external_url'
>): string | null {
  if (n.external_url) {
    return null;
  }

  let actionId = n.action_id;
  if (!actionId && n.action_type !== 'viewBids' && n.chips && n.chips.length > 0) {
    const sid = n.chips.find((c) => c.startsWith('SID-'));
    if (sid) actionId = sid.replace('SID-', '');
  }

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
  } else if (n.action_type === 'viewProfile') {
    target = '/settings/personal';
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
    target = '/product-master';
  } else if (n.action_type === 'viewTutorials') {
    target = '/tutorials';
  } else if (n.action_type === 'viewNotifications') {
    target = '/settings/notifications';
  }

  return target;
}

export function openNotificationTarget(
  n: Pick<ApiNotification, 'action_type' | 'action_id' | 'chips' | 'redirect_slug' | 'external_url'>,
  navigate: (path: string) => void
): void {
  if (n.external_url) {
    window.open(n.external_url, '_blank', 'noopener,noreferrer');
    return;
  }
  const path = resolveNotificationPath(n);
  navigate(path ?? '/settings/notifications');
}

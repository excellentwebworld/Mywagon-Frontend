/**
 * Spatie permission → React routes / nav / actions (Blade route_url parity).
 * Subscription entitlements (PDS-976) are separate and still required where both apply.
 */

/** Catalog values from shipper_permissions.value */
export const SHIPPER_RBAC = {
  newShipment: 'new_shipment',
  publishPrivate: 'publish_private_shipments',
  publishPublic: 'publish_public_shipments',
  viewAllShipments: 'view_all_existing_shipments',
  editAllShipments: 'edit_all_existing_shipments',
  deleteAllShipments: 'delete_all_existing_shipments',
  bidOnPostedTruck: 'bid_on_posted_truck',
  withdrawBid: 'withdraw_bid_on_posted_truck',
  approveRejectInterest: 'approve/Reject_carrier_interest',
  approveRejectBid: 'approve/Reject_carrier_bid',
  searchPublicTrucks: 'search_public_posted_trucks',
  assignCoOwner: 'assign_load_co-Owner',
  chatWithCarrier: 'chat_with_carrier',
  viewQuotes: 'view_quotes',
  addNewPartner: 'add_new_partner',
  acceptRejectPartner: 'accept/Reject_partner_request',
  managePermissions: 'manage_permissions',
  manageSubscriptions: 'manage_subscriptions',
  viewCompanyInfo: 'view_company_account_information',
  editCompanyInfo: 'edit_company_account_information',
} as const;

export type ShipperRbacPermission =
  (typeof SHIPPER_RBAC)[keyof typeof SHIPPER_RBAC];

export type ShipperRbacNavKey =
  | 'createShipment'
  | 'manageShipments'
  | 'searchTrucks'
  | 'partners'
  | 'messages'
  | 'subscription'
  | 'users'
  | 'organization';

/** Nav item → Spatie permission(s). Any-of when array. */
export const NAV_RBAC: Record<ShipperRbacNavKey, string | string[]> = {
  createShipment: SHIPPER_RBAC.newShipment,
  manageShipments: SHIPPER_RBAC.viewAllShipments,
  searchTrucks: SHIPPER_RBAC.searchPublicTrucks,
  partners: [SHIPPER_RBAC.addNewPartner, SHIPPER_RBAC.acceptRejectPartner],
  messages: SHIPPER_RBAC.chatWithCarrier,
  subscription: SHIPPER_RBAC.manageSubscriptions,
  users: SHIPPER_RBAC.managePermissions,
  organization: SHIPPER_RBAC.viewCompanyInfo,
};

/**
 * Path prefix → required Spatie permission(s).
 * Longest matching prefix wins when resolving.
 */
export const ROUTE_RBAC: Array<{ prefix: string; permission: string | string[] }> = [
  { prefix: '/shipments/create', permission: SHIPPER_RBAC.newShipment },
  { prefix: '/shipments', permission: SHIPPER_RBAC.viewAllShipments },
  { prefix: '/search-trucks', permission: SHIPPER_RBAC.searchPublicTrucks },
  { prefix: '/messages', permission: SHIPPER_RBAC.chatWithCarrier },
  { prefix: '/partners', permission: [SHIPPER_RBAC.addNewPartner, SHIPPER_RBAC.acceptRejectPartner] },
  { prefix: '/settings/users', permission: SHIPPER_RBAC.managePermissions },
  { prefix: '/subscription', permission: SHIPPER_RBAC.manageSubscriptions },
  { prefix: '/settings/organization', permission: SHIPPER_RBAC.viewCompanyInfo },
  { prefix: '/settings/compliance', permission: SHIPPER_RBAC.viewCompanyInfo },
];

export function resolveRouteRbac(pathname: string): string | string[] | null {
  const path = pathname.replace(/\/$/, '') || '/';
  let best: { prefix: string; permission: string | string[] } | null = null;
  for (const row of ROUTE_RBAC) {
    const prefix = row.prefix.replace(/\/$/, '') || '/';
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best.prefix.length) {
        best = { prefix, permission: row.permission };
      }
    }
  }
  return best?.permission ?? null;
}

export type ShipperRbacActionKey =
  | 'publishPrivate'
  | 'publishPublic'
  | 'editShipment'
  | 'cancelShipment'
  | 'bidOnTruck'
  | 'withdrawBid'
  | 'approveRejectInterest'
  | 'approveRejectBid'
  | 'assignCoOwner'
  | 'invitePartner'
  | 'acceptDeclinePartner'
  | 'viewQuotes'
  | 'editCompanyInfo'
  | 'manageSubscriptions';

export const ACTION_RBAC: Record<ShipperRbacActionKey, string> = {
  publishPrivate: SHIPPER_RBAC.publishPrivate,
  publishPublic: SHIPPER_RBAC.publishPublic,
  editShipment: SHIPPER_RBAC.editAllShipments,
  cancelShipment: SHIPPER_RBAC.deleteAllShipments,
  bidOnTruck: SHIPPER_RBAC.bidOnPostedTruck,
  withdrawBid: SHIPPER_RBAC.withdrawBid,
  approveRejectInterest: SHIPPER_RBAC.approveRejectInterest,
  approveRejectBid: SHIPPER_RBAC.approveRejectBid,
  assignCoOwner: SHIPPER_RBAC.assignCoOwner,
  invitePartner: SHIPPER_RBAC.addNewPartner,
  acceptDeclinePartner: SHIPPER_RBAC.acceptRejectPartner,
  viewQuotes: SHIPPER_RBAC.viewQuotes,
  editCompanyInfo: SHIPPER_RBAC.editCompanyInfo,
  manageSubscriptions: SHIPPER_RBAC.manageSubscriptions,
};

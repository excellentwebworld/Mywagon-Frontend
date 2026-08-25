/**
 * auditLogData.js — audit log category catalog + sample entries.
 * Categories align with left-sidebar modules (excl. Dashboard/Tutorials;
 * Create Shipment folds into Manage Shipments) plus Settings sub-areas.
 */

export const AUDIT_CATEGORIES = [
  { key: 'shipments', icon: '📦', labelKey: 'compliance.audit.cat.shipments' },
  { key: 'searchTrucks', icon: '🚛', labelKey: 'compliance.audit.cat.searchTrucks' },
  { key: 'addressBook', icon: '📍', labelKey: 'compliance.audit.cat.addressBook' },
  { key: 'productMaster', icon: '🏷️', labelKey: 'compliance.audit.cat.productMaster' },
  { key: 'partners', icon: '🤝', labelKey: 'compliance.audit.cat.partners' },
  { key: 'priceLists', icon: '💰', labelKey: 'compliance.audit.cat.priceLists' },
  { key: 'orders', icon: '📋', labelKey: 'compliance.audit.cat.orders' },
  { key: 'subscription', icon: '⭐', labelKey: 'compliance.audit.cat.subscription' },
  { key: 'billing', icon: '💳', labelKey: 'compliance.audit.cat.billing' },
  { key: 'support', icon: '💬', labelKey: 'compliance.audit.cat.support' },
  { key: 'authentication', icon: '🔑', labelKey: 'compliance.audit.cat.authentication' },
  { key: 'profile', icon: '👤', labelKey: 'compliance.audit.cat.profile' },
  { key: 'organization', icon: '🏢', labelKey: 'compliance.audit.cat.organization' },
  { key: 'users', icon: '👥', labelKey: 'compliance.audit.cat.users' },
  { key: 'kyc', icon: '🪪', labelKey: 'compliance.audit.cat.kyc' },
  { key: 'security', icon: '🔒', labelKey: 'compliance.audit.cat.security' },
  { key: 'notifications', icon: '🔔', labelKey: 'compliance.audit.cat.notifications' },
  { key: 'import', icon: '📥', labelKey: 'compliance.audit.cat.import' },
  { key: 'export', icon: '📤', labelKey: 'compliance.audit.cat.export' },
];

export const SEVERITY_CONFIG = {
  info:     { color: '#3B82F6', bg: '#EFF6FF', label: 'Info' },
  warning:  { color: '#F59E0B', bg: '#FFFBEB', label: 'Warning' },
  critical: { color: '#EF4444', bg: '#FEF2F2', label: 'Critical' },
};

const A = {
  pavlos: { name: 'Παύλος Δημητρίου', email: 'pavlos@vikos.com', role: 'Admin', ip: '192.168.1.45', device: 'Chrome · macOS', city: 'Athens', country: 'GR' },
  maria:  { name: 'Σταματία Μαάλη', email: 's.maali@vikos.com', role: 'Finance', ip: '192.168.2.12', device: 'Safari · macOS', city: 'Athens', country: 'GR' },
  paulos: { name: 'Παύλος Σταμούλης', email: 'p.stamoulis@vikos.com', role: 'Dispatcher', ip: '192.168.3.80', device: 'Chrome · Windows', city: 'Thessaloniki', country: 'GR' },
  andreas:{ name: 'Ανδρέας Καφαντάρης', email: 'a.kafantaris@vikos.com', role: 'Dispatcher', ip: '192.168.4.22', device: 'Firefox · Windows', city: 'Athens', country: 'GR' },
  system: { name: 'System', email: 'system@myvagon.com', role: 'System', ip: '—', device: '—', city: '—', country: '—' },
};

// Date helpers
const now = new Date('2026-05-09T16:00:00Z');
const d = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();

export const AUDIT_LOG_ENTRIES = [
  // ── TODAY (10) ──
  { id: 'A001', ts: d(0.5), actor: A.pavlos, category: 'orders', action: 'Order created', severity: 'info', target: 'ORD-0021 · Athens → Thessaloniki', details: 'Manual order, 3 line items, 28 pallets, normal priority.', changes: null },
  { id: 'A002', ts: d(1), actor: A.pavlos, category: 'searchTrucks', action: 'Bid on truck', severity: 'info', target: 'AVL-120 · Athens → Thessaloniki', details: 'Availability bid placed on posted truck.', changes: null },
  { id: 'A003', ts: d(2), actor: A.andreas, category: 'shipments', action: 'Shipment created', severity: 'info', target: 'SHP-4521 · Athens → Rotterdam', details: 'FCL 40ft, 18 tonnes, electronics.', changes: null },
  { id: 'A004', ts: d(3), actor: A.pavlos, category: 'authentication', action: 'Login', severity: 'info', target: 'pavlos@vikos.com', details: 'Successful login from Chrome · Athens, GR.', changes: null },
  { id: 'A005', ts: d(3.5), actor: A.maria, category: 'billing', action: 'Invoice downloaded', severity: 'info', target: 'INV-2026-0089', details: 'Downloaded PDF invoice for March 2026.', changes: null },
  { id: 'A006', ts: d(4), actor: A.paulos, category: 'orders', action: 'Order edited', severity: 'info', target: 'ORD-0019 · Ioannina → Athens', details: 'Weight updated, delivery date changed.', changes: [{ field: 'Weight', from: '12t', to: '14t' }, { field: 'Delivery', from: '10 May', to: '12 May' }] },
  { id: 'A007', ts: d(5), actor: A.pavlos, category: 'partners', action: 'Partner invited', severity: 'info', target: 'OceanLine Maritime Ltd', details: 'Invitation sent to info@oceanline.gr.', changes: null },
  { id: 'A008', ts: d(5.5), actor: A.pavlos, category: 'users', action: 'User invited', severity: 'info', target: 'Ολίβια Κύρου (o.kyrou@vikos.com)', details: 'Invited as Viewer.', changes: null },
  { id: 'A009', ts: d(6), actor: A.andreas, category: 'addressBook', action: 'Address created', severity: 'info', target: 'Piraeus Port Terminal B', details: 'New warehouse address added to Address Book.', changes: null },
  { id: 'A010', ts: d(7), actor: A.pavlos, category: 'support', action: 'Support ticket created', severity: 'info', target: 'SUP-1042', details: 'Reported billing question for March invoice.', changes: null },

  // ── YESTERDAY (8) ──
  { id: 'A011', ts: d(20), actor: A.pavlos, category: 'users', action: 'Role changed', severity: 'warning', target: 'Ελένη Δημητρίου', details: 'Changed from Dispatcher to Viewer.', changes: [{ field: 'Role', from: 'Dispatcher', to: 'Viewer' }] },
  { id: 'A012', ts: d(22), actor: A.maria, category: 'priceLists', action: 'Lane edited', severity: 'info', target: 'LP-005 Athens → Patras', details: 'Price and effective date updated.', changes: [{ field: 'Price', from: '€420', to: '€450' }, { field: 'Effective to', from: '—', to: '30 Jun 2026' }] },
  { id: 'A013', ts: d(23), actor: A.paulos, category: 'shipments', action: 'Load published', severity: 'info', target: 'LD-0089 · Ioannina → Athens', details: '2 orders consolidated, 18 pallets.', changes: null },
  { id: 'A014', ts: d(24), actor: A.pavlos, category: 'kyc', action: 'Section resubmitted', severity: 'info', target: 'Proof of Address', details: 'Uploaded new utility bill (May 2026).', changes: null },
  { id: 'A015', ts: d(25), actor: A.pavlos, category: 'subscription', action: 'Plan viewed', severity: 'info', target: 'Professional plan', details: 'Opened subscription details page.', changes: null },
  { id: 'A016', ts: d(26), actor: A.andreas, category: 'shipments', action: 'Quote accepted', severity: 'info', target: 'SHP-4518 · QT-892', details: 'Accepted quote from ForwardCo at €1,450.', changes: null },
  { id: 'A017', ts: d(27), actor: A.pavlos, category: 'searchTrucks', action: 'Availability bid', severity: 'info', target: 'AVL-088 · Patras → Athens', details: 'Bid placed on posted truck availability.', changes: null },
  { id: 'A018', ts: d(28), actor: A.maria, category: 'authentication', action: 'Login', severity: 'info', target: 's.maali@vikos.com', details: 'Successful login from Safari · Athens, GR.', changes: null },

  // ── THIS WEEK (10) ──
  { id: 'A019', ts: d(50), actor: A.pavlos, category: 'users', action: 'User suspended', severity: 'warning', target: 'Μιχάλης Τζιάλας', details: 'Reason: Policy violation review.', changes: null },
  { id: 'A020', ts: d(55), actor: A.pavlos, category: 'profile', action: 'Profile updated', severity: 'info', target: 'pavlos@vikos.com', details: 'Updated display name and phone.', changes: null },
  { id: 'A021', ts: d(60), actor: A.system, category: 'authentication', action: 'Failed login', severity: 'critical', target: 'm.tzialas@vikos.com', details: '3 failed attempts from Sofia, BG (94.156.x.x).', changes: null },
  { id: 'A022', ts: d(65), actor: A.pavlos, category: 'orders', action: 'Orders grouped', severity: 'info', target: 'GRP-012', details: '4 orders grouped: ORD-0015, ORD-0016, ORD-0017, ORD-0018.', changes: null },
  { id: 'A023', ts: d(70), actor: A.paulos, category: 'searchTrucks', action: 'Bid withdrawn', severity: 'warning', target: 'AVL-055', details: 'Withdrawn bid on posted truck.', changes: null },
  { id: 'A024', ts: d(72), actor: A.maria, category: 'priceLists', action: 'Lane created', severity: 'info', target: 'LP-012 Thessaloniki → Istanbul', details: 'New international lane, €680 base rate.', changes: null },
  { id: 'A025', ts: d(75), actor: A.andreas, category: 'shipments', action: 'Document uploaded', severity: 'info', target: 'CMR_SHP4510.pdf', details: 'Uploaded to shipment SHP-4510.', changes: null },
  { id: 'A026', ts: d(80), actor: A.pavlos, category: 'users', action: 'Permissions edited', severity: 'warning', target: 'Όλγα Τσαγκάρη', details: 'Added posting.public, analytics.advanced to custom perms.', changes: [{ field: 'Custom perms', from: '3 perms', to: '5 perms' }] },
  { id: 'A027', ts: d(85), actor: A.pavlos, category: 'partners', action: 'Contract lane added', severity: 'info', target: 'ForwardCo · Athens → Piraeus', details: 'Contracted rate €180, valid until Dec 2026.', changes: null },
  { id: 'A028', ts: d(90), actor: A.maria, category: 'priceLists', action: 'CSV exported', severity: 'info', target: 'Price Lists module', details: 'Exported 42 lanes with profitability data.', changes: null },

  // ── OLDER (22) ──
  { id: 'A029', ts: d(120), actor: A.pavlos, category: 'kyc', action: 'Document uploaded', severity: 'info', target: 'Proof of Address', details: 'DEH_Bill_2023.pdf uploaded.', changes: null },
  { id: 'A030', ts: d(130), actor: A.system, category: 'kyc', action: 'Revision requested', severity: 'warning', target: 'Proof of Address', details: 'Document too old — must be within 3 months.', changes: null },
  { id: 'A031', ts: d(140), actor: A.pavlos, category: 'shipments', action: 'Shipment cancelled', severity: 'warning', target: 'SHP-4498', details: 'Cancelled by shipper before pickup.', changes: null },
  { id: 'A032', ts: d(150), actor: A.maria, category: 'billing', action: 'Payment method updated', severity: 'info', target: 'VISA ending 4521', details: 'Updated expiry date.', changes: [{ field: 'Expiry', from: '03/26', to: '03/28' }] },
  { id: 'A033', ts: d(160), actor: A.paulos, category: 'shipments', action: 'Delivery confirmed', severity: 'info', target: 'LD-0082 · Athens → Patras', details: 'POD uploaded, delivery confirmed at 14:30.', changes: null },
  { id: 'A034', ts: d(170), actor: A.pavlos, category: 'searchTrucks', action: 'Availability viewed', severity: 'info', target: 'Search Trucks · Athens radius', details: 'Searched posted trucks near Athens.', changes: null },
  { id: 'A035', ts: d(180), actor: A.pavlos, category: 'organization', action: 'Company info updated', severity: 'info', target: 'VIKOS S.A.', details: 'Trade name updated.', changes: [{ field: 'Trade name', from: 'Vikos S.A.', to: 'VIKOS S.A.' }] },
  { id: 'A036', ts: d(200), actor: A.andreas, category: 'orders', action: 'Order split', severity: 'info', target: 'ORD-0012', details: 'Split into ORD-0012A (10plt) and ORD-0012B (8plt).', changes: null },
  { id: 'A037', ts: d(220), actor: A.pavlos, category: 'security', action: 'Password changed', severity: 'info', target: 'pavlos@vikos.com', details: 'Password changed successfully.', changes: null },
  { id: 'A038', ts: d(240), actor: A.pavlos, category: 'security', action: 'MFA enabled', severity: 'info', target: 'pavlos@vikos.com', details: 'Authenticator app configured.', changes: null },
  { id: 'A039', ts: d(260), actor: A.pavlos, category: 'support', action: 'Feedback submitted', severity: 'info', target: 'Product feedback', details: 'Submitted feedback about Search Trucks beta.', changes: null },
  { id: 'A040', ts: d(280), actor: A.pavlos, category: 'subscription', action: 'Seat limit viewed', severity: 'info', target: 'Seats · 8 of 10 used', details: 'Opened subscription seat usage.', changes: null },
  { id: 'A041', ts: d(300), actor: A.pavlos, category: 'notifications', action: 'Notification preference', severity: 'info', target: 'Email notifications', details: 'Disabled marketing email notifications.', changes: null },
  { id: 'A042', ts: d(320), actor: A.system, category: 'authentication', action: 'Failed login', severity: 'critical', target: 'unknown@gmail.com', details: '5 failed attempts from Bucharest, RO.', changes: null },
  { id: 'A043', ts: d(340), actor: A.pavlos, category: 'users', action: 'Role created', severity: 'info', target: 'Finance', details: 'Created with billing + analytics permissions.', changes: null },
  { id: 'A044', ts: d(360), actor: A.pavlos, category: 'productMaster', action: 'Product edited', severity: 'info', target: 'SKU-0042 Vikos 1.5L', details: 'Updated weight and dimensions.', changes: [{ field: 'Weight', from: '1.5kg', to: '1.55kg' }] },
  { id: 'A045', ts: d(380), actor: A.paulos, category: 'partners', action: 'Invitation accepted', severity: 'info', target: 'TransEurope Logistics', details: 'Partner accepted invitation.', changes: null },
  { id: 'A046', ts: d(400), actor: A.pavlos, category: 'priceLists', action: 'Defaults updated', severity: 'warning', target: 'Company defaults', details: 'Fuel surcharge changed from 8% to 10%.', changes: [{ field: 'Fuel surcharge', from: '8%', to: '10%' }] },
  { id: 'A047', ts: d(420), actor: A.andreas, category: 'orders', action: 'Order archived', severity: 'info', target: 'ORD-0005', details: 'ERP order archived after fulfillment.', changes: null },
  { id: 'A048', ts: d(450), actor: A.pavlos, category: 'kyc', action: 'Section submitted', severity: 'info', target: 'Industry Profile', details: 'Industry sectors: beverages, fmcg, retail.', changes: null },
  { id: 'A049', ts: d(500), actor: A.pavlos, category: 'users', action: 'User reactivated', severity: 'warning', target: 'Παύλος Σταμούλης', details: 'Reactivated after temporary suspension.', changes: null },
  { id: 'A050', ts: d(550), actor: A.system, category: 'authentication', action: 'Session revoked', severity: 'critical', target: 'Μιχάλης Τζιάλας', details: 'All sessions force-revoked by admin.', changes: null },
];

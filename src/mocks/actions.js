/**
 * Mock Actions — src/mocks/actions.js
 *
 * Simulates API responses for user actions during development.
 * Each function mirrors the real API endpoint it will replace.
 *
 * PATTERN:
 *   1. Accept the same params the real API would
 *   2. Return { delay, response, toast, sideEffects }
 *   3. The page component uses the response to update local state
 *   4. During API integration, swap `mockXyz()` → `api.xyz()`
 *
 * IMPORTANT — POST-ACTION UI STATES:
 * Every mock action returns data that reveals NEW UI the user couldn't
 * see before the action. For example:
 *   - Accepting a quote → shipment status changes to "booked",
 *     other quotes show "declined" badges, new action buttons appear
 *   - Assigning a driver → driver info panel appears on shipment detail
 *   - Confirming delivery → photo upload area, rating prompt appears
 *
 * The page component MUST render all these post-action states.
 * If you only build the "before" UI, the developer will need to come
 * back later to build the "after" UI — which defeats the purpose of
 * a complete frontend handoff.
 *
 * CHECKLIST FOR EVERY PAGE:
 *   □ Initial state (page loads with data)
 *   □ Empty state (no data yet)
 *   □ Loading state (skeleton while fetching)
 *   □ Action loading (spinner on button during API call)
 *   □ Success state (what changes after the action succeeds)
 *   □ Error state (what the user sees if the action fails)
 *   □ Confirmation dialogs (if the action is destructive/irreversible)
 */

// ─── Helper: simulate network delay ───
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// SHIPMENT ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * @API: POST /api/shipments/{id}/accept-quote
 * @TRIGGER: Shipper clicks "Accept quote" on QuoteDetail
 * @POST_ACTION_UI:
 *   - Shipment status badge → "booked"
 *   - Accepted quote card → highlighted with checkmark
 *   - Other quote cards → "declined" badges, grayed out
 *   - New section appears: "Carrier & logistics details"
 *   - Action buttons change: "Track shipment" replaces "Accept/Reject"
 */
export async function mockAcceptQuote(shipmentId, quoteId) {
  await delay(800);
  return {
    success: true,
    toast: { type: 'success', key: 'quotes.acceptedToast' },
    updatedShipment: {
      id: shipmentId,
      status: 'booked',
      acceptedQuoteId: quoteId,
      bookedAt: new Date().toISOString(),
      carrier: { name: 'OceanLine Shipping', contact: 'Maria Papadaki' },
    },
    declinedQuoteIds: ['QT-102', 'QT-103'],
    redirect: `/shipments/${shipmentId}`,
  };
}

/**
 * @API: POST /api/shipments/{id}/reject-quote
 * @TRIGGER: Shipper clicks "Reject quote" on QuoteDetail
 * @POST_ACTION_UI:
 *   - Quote card → "declined" badge, grayed out, strikethrough price
 *   - Remaining active quotes count updates
 */
export async function mockRejectQuote(shipmentId, quoteId) {
  await delay(500);
  return {
    success: true,
    toast: { type: 'info', key: 'quotes.rejectedToast' },
    updatedQuote: { id: quoteId, status: 'declined' },
  };
}

/**
 * @API: POST /api/shipments
 * @TRIGGER: Shipper clicks "Submit" on CreateShipment form
 * @POST_ACTION_UI:
 *   - Success modal: "Shipment SHP-XXXX created"
 *   - Options: "View shipment" or "Create another"
 *   - Shipments list: new row appears at top with "draft" status
 */
export async function mockCreateShipment(formData) {
  await delay(1000);
  const newId = 'SHP-' + Math.floor(1000 + Math.random() * 9000);
  return {
    success: true,
    toast: { type: 'success', message: `Shipment ${newId} created` },
    shipment: {
      id: newId,
      status: 'draft',
      ...formData,
      createdAt: new Date().toISOString(),
    },
    redirect: `/shipments/${newId}`,
  };
}

/**
 * @API: PATCH /api/shipments/{id}/status
 * @TRIGGER: Carrier clicks status update button
 * @POST_ACTION_UI:
 *   - Status badge transitions (e.g., "booked" → "in_transit")
 *   - Timeline/progress bar advances to next step
 *   - If "delivered": photo proof upload area appears, rating prompt queued
 *   - Notification badge increments for other parties
 */
export async function mockUpdateShipmentStatus(shipmentId, newStatus) {
  await delay(600);
  return {
    success: true,
    toast: { type: 'success', key: `shipments.statusUpdated` },
    updatedShipment: {
      id: shipmentId,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// CARRIER ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * @API: POST /api/loads/{id}/accept
 * @TRIGGER: Carrier clicks "Accept load" on LoadBoard
 * @POST_ACTION_UI:
 *   - Load card moves from "Available" tab to "My loads" tab
 *   - Card shows "Accepted" badge, driver assignment button appears
 *   - Available loads count decrements
 */
export async function mockAcceptLoad(loadId) {
  await delay(700);
  return {
    success: true,
    toast: { type: 'success', key: 'carrier.loadAccepted' },
    updatedLoad: { id: loadId, status: 'accepted', acceptedAt: new Date().toISOString() },
  };
}

/**
 * @API: POST /api/loads/{id}/assign-driver
 * @TRIGGER: Carrier clicks "Assign driver" then selects driver from modal
 * @POST_ACTION_UI:
 *   - Driver avatar + name appears on load card
 *   - "Assign driver" button → "Change driver" button
 *   - Driver's schedule page shows the new assignment
 */
export async function mockAssignDriver(loadId, driverId) {
  await delay(500);
  return {
    success: true,
    toast: { type: 'success', key: 'carrier.driverAssigned' },
    assignment: {
      loadId,
      driver: { id: driverId, name: 'Dimitris Katsaros', phone: '+30 697 1234567', truck: 'MAN TGX 18.500' },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// FORWARDER ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * @API: POST /api/rfq/{id}/provide-quote
 * @TRIGGER: Forwarder submits quote on RFQ detail page
 * @POST_ACTION_UI:
 *   - RFQ status → "quoted"
 *   - Quote card appears in the quotes section
 *   - "Provide quote" button → "Edit quote" button
 *   - Timer shows quote validity countdown
 */
export async function mockProvideQuote(rfqId, quoteData) {
  await delay(800);
  const quoteId = 'QT-' + Math.floor(100 + Math.random() * 900);
  return {
    success: true,
    toast: { type: 'success', message: `Quote ${quoteId} submitted` },
    quote: {
      id: quoteId,
      rfqId,
      ...quoteData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

/**
 * @API: POST /api/shipments/{id}/assign-carrier
 * @TRIGGER: Forwarder selects carrier from dropdown and clicks "Assign"
 * @POST_ACTION_UI:
 *   - Carrier info panel appears on shipment detail
 *   - "Assign carrier" button → "Change carrier" button
 *   - Carrier receives notification (shown in mock notification list)
 */
export async function mockAssignCarrier(shipmentId, carrierId) {
  await delay(600);
  return {
    success: true,
    toast: { type: 'success', key: 'forwarder.carrierAssigned' },
    assignment: {
      shipmentId,
      carrier: { id: carrierId, name: 'OceanLine Shipping', contact: 'Maria Papadaki' },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SHARED ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * @API: DELETE /api/{resource}/{id}
 * @TRIGGER: User confirms deletion in ConfirmDialog
 * @POST_ACTION_UI:
 *   - Item fades out / removed from list
 *   - Total count decrements
 *   - If list is now empty → empty state appears
 */
export async function mockDelete(resourceId) {
  await delay(400);
  return {
    success: true,
    toast: { type: 'success', key: 'common.deleted' },
    deletedId: resourceId,
  };
}

/**
 * @API: PUT /api/{resource}/{id}
 * @TRIGGER: User clicks "Save" on edit form
 * @POST_ACTION_UI:
 *   - Form exits edit mode → read-only display
 *   - Updated values shown immediately
 *   - "Last updated" timestamp refreshes
 */
export async function mockSave(resourceId, data) {
  await delay(500);
  return {
    success: true,
    toast: { type: 'success', key: 'common.saved' },
    updated: { id: resourceId, ...data, updatedAt: new Date().toISOString() },
  };
}

// ═══════════════════════════════════════════════════════════════════
// ADDRESS BOOK ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * @API: POST /api/v1/locations
 * @TRIGGER: User clicks "Create location" on Step 4 of wizard
 * @POST_ACTION_UI:
 *   - Modal closes
 *   - Toast "Location created!"
 *   - New location appears in list table at appropriate position
 *   - Directory counts update (All +1, My/Customer +1 based on group)
 *   - After 200ms: detail pane auto-opens showing the new location
 *   - All fields populated from wizard data
 */
export async function mockCreateLocation(locationData) {
  await delay(600);
  const newId = `LOC-${String(Date.now()).slice(-3)}`;
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.locationCreated' },
    location: {
      id: newId,
      ...locationData,
      status: 'active',
      geoVerified: false,
      lastUsed: 'just now',
      shipments30: 0,
      shipments90: 0,
      otd: 0,
      created: new Date().toLocaleDateString('en-GB'),
    },
  };
}

/**
 * @API: PUT /api/v1/locations/:id
 * @TRIGGER: User clicks "Save changes" in Edit modal
 * @POST_ACTION_UI:
 *   - Edit modal closes
 *   - Detail pane refreshes with updated data (hours, contacts, etc.)
 *   - List table row updates if visible fields changed (name, city, role)
 *   - Toast "Location updated"
 */
export async function mockUpdateLocation(locationId, updatedData) {
  await delay(500);
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.locationUpdated' },
    location: { id: locationId, ...updatedData },
  };
}

/**
 * @API: PATCH /api/v1/locations/:id/archive
 * @TRIGGER: User confirms archive in dialog
 * @POST_ACTION_UI:
 *   - Detail pane closes
 *   - Location disappears from current directory list
 *   - "All locations" count decrements
 *   - "My/Customer" directory count decrements (based on group)
 *   - "Archived" directory count increments
 *   - Toast "Location archived"
 *   - Clicking "Archived" dir → location visible with "Restore" button
 */
export async function mockArchiveLocation(locationId) {
  await delay(400);
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.locationArchived' },
    location: { id: locationId, status: 'archived', archived_at: new Date().toISOString() },
  };
}

/**
 * @API: PATCH /api/v1/locations/:id/restore
 * @TRIGGER: User clicks "Restore" in detail pane (while viewing Archived)
 * @POST_ACTION_UI:
 *   - Location disappears from Archived list
 *   - Reappears in "All locations" and appropriate group directory
 *   - Directory counts update accordingly
 *   - Detail pane refreshes: "Restore" button gone, "Archive" button appears
 *   - Toast "Location restored"
 */
export async function mockRestoreLocation(locationId) {
  await delay(400);
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.locationRestored' },
    location: { id: locationId, status: 'active', archived_at: null },
  };
}

/**
 * @API: POST /api/v1/locations/:id/duplicate
 * @TRIGGER: User clicks "Duplicate" in detail pane
 * @POST_ACTION_UI:
 *   - New location appears in list with " (Copy)" suffix
 *   - Directory count increments by 1
 *   - After 200ms: detail pane switches to show the new copy
 *   - Toast "Location duplicated"
 */
export async function mockDuplicateLocation(locationId, originalData) {
  await delay(500);
  const newId = `LOC-${String(Date.now()).slice(-3)}`;
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.locationDuplicated' },
    location: {
      ...originalData,
      id: newId,
      name: `${originalData.name} (Copy)`,
      lastUsed: 'just now',
      created: new Date().toLocaleDateString('en-GB'),
    },
  };
}

/**
 * @API: POST /api/v1/companies
 * @TRIGGER: User clicks "Create company" in company modal
 * @POST_ACTION_UI:
 *   - Company modal (z-250) closes
 *   - Location modal (z-200) stays open on Step 1
 *   - Company field auto-fills with new company name
 *   - Toast "Company created"
 */
export async function mockCreateCompany(companyData) {
  await delay(500);
  const newId = `C-${String(Date.now()).slice(-3)}`;
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.companyCreated' },
    company: { id: newId, ...companyData },
  };
}

/**
 * @API: POST /api/v1/directories
 * @TRIGGER: User clicks "Save" in inline directory create row
 * @POST_ACTION_UI:
 *   - Inline edit row disappears
 *   - New directory appears in tree above "Archived"
 *   - Shows selected icon and "0" count badge
 *   - Toast "Directory created"
 *   - New directory is clickable and shows empty state
 */
export async function mockCreateDirectory(name, icon) {
  await delay(300);
  const newId = `custom-${Date.now()}`;
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.directoryCreated' },
    directory: { id: newId, name, icon, system: false },
  };
}

/**
 * @API: DELETE /api/v1/directories/:id
 * @TRIGGER: User confirms directory deletion
 * @POST_ACTION_UI:
 *   - Directory disappears from tree
 *   - If active directory was deleted → view resets to "All locations"
 *   - Toast "Directory deleted"
 *   - Locations remain — they don't get deleted
 */
export async function mockDeleteDirectory(directoryId) {
  await delay(300);
  return {
    success: true,
    toast: { type: 'success', key: 'addressBook.directoryDeleted' },
    deletedId: directoryId,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCT MASTER ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * @API    POST /api/v1/product-categories
 * @TRIGGER User submits the Add Category modal
 * @POST_ACTION_UI New category appears in the facet pane and in every
 *   category dropdown across the page. Toast confirms creation.
 */
export async function mockCreateCategory(data) {
  await delay();
  return {
    success: true,
    category: { id: `CAT-CUSTOM-${Date.now()}`, name: data.name, icon: data.icon },
    toast: { type: 'success', key: 'productMaster.categoryCreated' },
  };
}

/**
 * @API    POST /api/v1/product-types
 * @TRIGGER User submits the Add Product Type modal
 * @POST_ACTION_UI New type appears under its category in the facet pane
 *   with count "0". Toast confirms.
 */
export async function mockCreateType(data) {
  await delay();
  return {
    success: true,
    type: { id: `PT-${Date.now()}`, catId: data.catId, name: data.name, active: true,
      defaults: { tempRequired: data.tempRequired || false, temp: data.temp || 'Ambient', adrRequired: data.adrRequired || false, adrClass: data.adrClass || '', stackable: data.stackable || false, palletType: data.palletType, dimensions: data.dimensions || { l: '', w: '', h: '' } },
      s30: 0, s90: 0 },
    toast: { type: 'success', key: 'productMaster.typeCreated' },
  };
}

/**
 * @API    PATCH /api/v1/product-types/:id
 * @TRIGGER User submits the Rename Type modal
 * @POST_ACTION_UI Type name updates in the facet pane, the detail pane,
 *   and in all SKU rows that reference this type.
 */
export async function mockRenameType(typeId, newName) {
  await delay();
  return {
    success: true, typeId, newName,
    toast: { type: 'success', key: 'productMaster.renamed' },
  };
}

/**
 * @API    POST /api/v1/product-types/:id/merge
 * @TRIGGER User clicks Merge in the Merge Type modal
 * @POST_ACTION_UI Source type disappears from facet, its SKUs now show
 *   the target type. Target type count increases. Detail pane closes.
 */
export async function mockMergeType(sourceId, targetId) {
  await delay();
  return {
    success: true, sourceId, targetId,
    toast: { type: 'success', key: 'productMaster.mergedInto' },
  };
}

/**
 * @API    PATCH /api/v1/product-types/:id/archive
 * @TRIGGER User clicks Archive on a type (confirms if has mapped SKUs)
 * @POST_ACTION_UI Type disappears from facet. Mapped SKUs become unmapped
 *   (⚠ badge appears, unmapped KPI count increases). Detail pane closes.
 */
export async function mockArchiveType(typeId) {
  await delay();
  return {
    success: true, typeId,
    toast: { type: 'success', key: 'productMaster.typeArchived' },
  };
}

/**
 * @API    POST /api/v1/skus
 * @TRIGGER User submits the Add SKU modal (create mode)
 * @POST_ACTION_UI New SKU row appears in the list, detail pane auto-opens
 *   to show the newly created SKU. Relevant KPIs increment.
 */
export async function mockCreateSku(data) {
  await delay();
  return {
    success: true,
    sku: {
      id: `SKU-${Date.now()}`, name: data.name, number: data.number, barcode: data.barcode,
      catId: data.catId, typeId: data.typeId || '', source: 'manual', active: data.active,
      erp: { system: '', extId: '', lastSync: '—', status: '', error: '' },
      weight: data.weight, uom: data.uom,
      tags: (data.tags || '').split(',').map((x) => x.trim()).filter(Boolean),
      shipments30: 0, shipments90: 0,
    },
    toast: { type: 'success', key: 'productMaster.skuCreated' },
  };
}

/**
 * @API    PUT /api/v1/skus/:id
 * @TRIGGER User submits the Edit SKU modal
 * @POST_ACTION_UI Detail pane refreshes with new data. If an ERP-synced
 *   SKU, name/number/barcode are not editable (readonly + blue banner).
 */
export async function mockUpdateSku(data) {
  await delay();
  return {
    success: true, sku: data,
    toast: { type: 'success', key: 'productMaster.skuUpdated' },
  };
}

/**
 * @API    PATCH /api/v1/skus/:id (toggle active)
 * @TRIGGER User clicks Archive / Activate on the SKU detail pane
 * @POST_ACTION_UI Status badge flips (Active ↔ Inactive), detail pane
 *   updates, KPI counts update (Total SKUs, Inactive).
 */
export async function mockToggleSkuActive(skuId, newActive) {
  await delay();
  return {
    success: true, skuId, active: newActive,
    toast: { type: 'success', key: newActive ? 'productMaster.skuActivated' : 'productMaster.skuArchived' },
  };
}

/**
 * @API    PATCH /api/v1/skus/bulk-map
 * @TRIGGER User selects a target type in the Bulk Map modal and clicks Map
 * @POST_ACTION_UI All selected SKUs now show the target type pill,
 *   unmapped badges disappear, KPI unmapped count drops.
 */
export async function mockBulkMap(skuIds, typeId) {
  await delay();
  return {
    success: true, skuIds, typeId,
    toast: { type: 'success', key: 'productMaster.bulkMapped' },
  };
}

/**
 * @API    PATCH /api/v1/skus/bulk-toggle-active
 * @TRIGGER User clicks "Toggle active" in the bulk action bar
 * @POST_ACTION_UI All selected SKUs flip active state, status badges
 *   update, relevant KPIs recount.
 */
export async function mockBulkToggleActive(skuIds) {
  await delay();
  return {
    success: true, skuIds,
    toast: { type: 'success', key: 'productMaster.bulkToggled' },
  };
}

/**
 * @API    PATCH /api/v1/skus/bulk-archive
 * @TRIGGER User clicks "Archive" in the bulk action bar + confirms dialog
 * @POST_ACTION_UI All selected SKUs become inactive (gray badge),
 *   Inactive KPI increases, Total SKUs KPI decreases.
 */
export async function mockBulkArchive(skuIds) {
  await delay();
  return {
    success: true, skuIds,
    toast: { type: 'success', key: 'productMaster.bulkArchived' },
  };
}

/**
 * @API    POST /api/v1/skus/:id/resolve-conflict
 * @TRIGGER User clicks "Accept ERP" or "Keep MYVAGON" on conflict banner
 * @POST_ACTION_UI Conflict banner disappears, sync dot turns green,
 *   Sync Issues KPI decrements by 1.
 */
export async function mockResolveConflict(skuId, accept) {
  await delay();
  return {
    success: true, skuId, accept,
    toast: { type: 'success', key: 'productMaster.conflictResolved' },
  };
}

/**
 * @API    POST /api/v1/skus/import
 * @TRIGGER User clicks "Import N SKUs" in CSV Import modal
 * @POST_ACTION_UI Only valid rows are created (duplicates and missing-
 *   category rows skipped). List re-renders, KPIs update, toast shows count.
 */
export async function mockImportSkus(validRows) {
  await delay();
  return {
    success: true,
    created: validRows.map((row) => ({
      id: `SKU-IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...row, source: 'manual', active: true,
      erp: { system: '', extId: '', lastSync: '—', status: '', error: '' },
      tags: [], shipments30: 0, shipments90: 0,
    })),
    toast: { type: 'success', key: 'productMaster.imported' },
  };
}

// ═══════════════════════════════════════════════════════════════
// PARTNERS MASTER ACTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * @API    POST /api/v1/partners/invite
 * @TRIGGER User clicks "Send invitation" in Invite Partner modal
 * @REQUEST { mode: 'email'|'phone', contact: string, type: 'carrier_company'|'freelancer_driver'|'forwarder'|'shipper', tags: string[] }
 * @POST_ACTION_UI Modal transitions to success step; list prepends new
 *   partner with status='invited'; Invited KPI increments by 1; toast
 *   "Invitation sent".
 * @AUTH shipper | forwarder | carrier
 * @ERROR "Invalid email/phone" if contact format is wrong
 */
export async function mockInvitePartner(invite) {
  await delay();
  const id = `PR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  return {
    success: true,
    partner: {
      id, type: invite.type, status: 'invited',
      name: invite.contact, legalName: '', region: '', vat: '',
      email: invite.mode === 'email' ? invite.contact : '',
      phone: invite.mode === 'phone' ? invite.contact : '',
      tags: invite.tags || [],
      trucks: [], loads30: 0, loadsLifetime: 0,
      iban: '', bankVerified: false,
      profileCompleteness: 5, suspended: false,
    },
    toast: { type: 'success', key: 'partnersMaster.invitationSent' },
  };
}

/**
 * @API    POST /api/v1/partners/customers
 * @TRIGGER User saves Add Customer modal (or invokes Sync ERP which fills form)
 * @REQUEST { name: string (required), company?: string, email?: string, phone?: string, vat?: string, region?: string }
 * @POST_ACTION_UI Modal closes; list prepends new customer with green
 *   type pill and active status; Customers facet count increments.
 * @AUTH shipper | forwarder (NOT carrier — carriers don't see customers)
 * @ERROR "Fill required fields" if name is empty
 */
export async function mockAddCustomer(data) {
  if (!data.name?.trim()) {
    return { success: false, toast: { type: 'error', key: 'partnersMaster.cust_fillRequired' } };
  }
  await delay();
  const id = `PR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  return {
    success: true,
    partner: {
      id, type: 'customer', status: 'active',
      name: data.name.trim(), legalName: data.company || '',
      region: data.region || '', vat: data.vat || '',
      email: data.email || '', phone: data.phone || '',
      tags: [], trucks: [], loads30: 0, loadsLifetime: 0,
      iban: '', bankVerified: false, profileCompleteness: 30,
      suspended: false,
    },
    toast: { type: 'success', key: 'partnersMaster.cust_added' },
  };
}

/**
 * @API    PATCH /api/v1/partners/:id/status
 * @TRIGGER User clicks Suspend button in detail pane hero → confirms dialog
 * @REQUEST { status: 'suspended' }
 * @POST_ACTION_UI Partner disappears from All partners, type facet, and
 *   region views (only appears in Suspended). Detail pane closes. KPIs
 *   update: Suspended +1, all other counts decrement. Toast shows.
 */
export async function mockSuspendPartner(partnerId) {
  await delay();
  return {
    success: true,
    updates: { status: 'suspended', suspended: true, suspendedAt: new Date().toISOString() },
    toast: { type: 'success', key: 'partnersMaster.suspend_done' },
  };
}

/**
 * @API    PATCH /api/v1/partners/:id/status
 * @TRIGGER User clicks Reactivate button on a suspended partner → confirms
 * @REQUEST { status: 'active' }
 * @POST_ACTION_UI Partner reappears in active views. Suspended KPI -1,
 *   Active KPI +1. Toast shows.
 */
export async function mockReactivatePartner(partnerId) {
  await delay();
  return {
    success: true,
    updates: { status: 'active', suspended: false, reactivatedAt: new Date().toISOString() },
    toast: { type: 'success', key: 'partnersMaster.reactivate_done' },
  };
}

/**
 * @API    DELETE /api/v1/partners/:id
 * @TRIGGER User clicks "Remove permanently" on a suspended partner → confirms
 * @POST_ACTION_UI Partner permanently deleted from dataset. Detail pane
 *   closes. All KPIs and facet counts recompute. Toast shows.
 * @AUTH only possible when status='suspended'
 */
export async function mockRemovePartner(partnerId) {
  await delay();
  return {
    success: true,
    removedId: partnerId,
    toast: { type: 'success', key: 'partnersMaster.remove_done' },
  };
}

/**
 * @API    POST /api/v1/partners/:id/capabilities
 * @TRIGGER User clicks "Add capability" in Fleet section → saves modal
 * @REQUEST { type: TruckType, capacity: number, count: number }
 * @POST_ACTION_UI New capability card appears in Fleet section; table
 *   Capabilities column updates for this row; Capability filter count
 *   may update. Toast "Capability added".
 * @AUTH carrier_company or freelancer_driver partners only
 */
export async function mockAddCapability(partnerId, truckType, capacity, count) {
  await delay();
  return {
    success: true,
    capability: { type: truckType, capacity: Number(capacity), count: Number(count) },
    toast: { type: 'success', key: 'partnersMaster.cap_added' },
  };
}

/**
 * @API    POST /api/v1/partners/:id/contract-lanes
 * @TRIGGER User clicks "Add lane" in Contract lanes section → saves modal
 * @REQUEST { origin: string, destination: string, unit: 'per_load'|'per_pallet', price: number }
 * @POST_ACTION_UI New lane row appears in contract lanes table with
 *   status=active. Info box reminds "Contract prices override Spot Price
 *   List". Toast "Contract lane added".
 * @AUTH carrier_company partners only
 */
export async function mockAddContractLane(partnerId, lane) {
  await delay();
  return {
    success: true,
    lane: {
      id: `CL-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      origin: lane.origin, destination: lane.destination,
      unit: lane.unit, price: Number(lane.price), status: 'active',
    },
    toast: { type: 'success', key: 'partnersMaster.lane_added' },
  };
}

/**
 * @API    DELETE /api/v1/partners/:id/contract-lanes/:laneId
 * @TRIGGER User clicks × on a lane row → confirms dialog
 * @POST_ACTION_UI Lane row disappears from table; toast shows.
 */
export async function mockDeleteContractLane(partnerId, laneId) {
  await delay();
  return {
    success: true,
    removedId: laneId,
    toast: { type: 'success', key: 'partnersMaster.lane_removed' },
  };
}

/**
 * @API    PATCH /api/v1/partners/:id/bank
 * @TRIGGER User saves Edit Bank modal
 * @REQUEST { iban: string, beneficiary: string }
 * @POST_ACTION_UI Billing section refreshes with new IBAN and amber
 *   "Not verified" badge (verified flag always resets to false on manual
 *   edit). Missing bank KPI count may decrease. Toast shows.
 */
export async function mockUpdateBank(partnerId, iban, beneficiary) {
  await delay();
  return {
    success: true,
    updates: { iban, beneficiary, bankVerified: false },
    toast: { type: 'success', key: 'partnersMaster.bank_updated' },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ORDERS MASTER — mock API actions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a manual order.
 *
 * @API    POST /api/v1/orders
 * @TRIGGER  User clicks "Save" in the Create order modal
 * @POST_ACTION_UI
 *   - Modal closes
 *   - New row prepends to the orders list with ✏️ Manual badge, status='new'
 *   - Unplanned KPI increments by 1
 *   - Toast: "Order created"
 */
export async function mockCreateOrder(payload) {
  await delay(300);
  return {
    success: true,
    order: {
      id: payload.id,
      source: 'manual',
      status: 'new',
      ...payload,
      createdAt: new Date().toISOString(),
    },
    toast: { type: 'success', key: 'orders.toast.created' },
  };
}

/**
 * Split an order into N new orders.
 *
 * @API    POST /api/v1/orders/:id/split
 * @TRIGGER  User clicks "Split into N orders" in Split modal (must be balanced)
 * @POST_ACTION_UI
 *   - Original order flips to status='split', linkedLoadId cleared
 *   - N new orders with suffix letters (A, B, C...) appear at top of list,
 *     inheriting customer/locations/dates but with split quantities
 *   - Toast: "Order split into N new orders"
 */
export async function mockSplitOrder(originalId, splits) {
  await delay(400);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const newOrderIds = splits.map((_, i) => `${originalId}-${letters[i]}`);
  return {
    success: true,
    originalStatus: 'split',
    newOrderIds,
    toast: { type: 'success', key: 'orders.toast.splitDone', params: { n: splits.length } },
  };
}

/**
 * Re-sync an ERP order.
 *
 * @API    POST /api/v1/orders/:id/resync
 * @TRIGGER  Detail drawer "🔄 Re-sync" button (ERP source only)
 * @POST_ACTION_UI
 *   - Last sync timestamp resets to "Just now"
 *   - syncOk flag resets to true
 *   - Exception banner clears if present
 *   - Toast: "Order re-synced from ERP"
 */
export async function mockResyncOrder(orderId) {
  await delay(500);
  return {
    success: true,
    updates: { lastSync: 'Just now', syncOk: true, exception: null },
    toast: { type: 'success', key: 'orders.toast.resynced' },
  };
}

/**
 * Delete a manual or load-board order.
 *
 * @API    DELETE /api/v1/orders/:id
 * @TRIGGER  Detail drawer "Delete" or Row menu "Delete" (manual/load_board only)
 * @POST_ACTION_UI
 *   - Confirm dialog → on confirm, row removed from list
 *   - Drawer closes if open
 *   - Toast: "Order deleted"
 *
 * Note: ERP orders cannot be deleted — they must be re-synced from the
 * source system to reflect cancellations.
 */
export async function mockDeleteOrder(orderId) {
  await delay(250);
  return {
    success: true,
    toast: { type: 'success', key: 'orders.toast.deleted' },
  };
}

/**
 * Resolve an exception on an order.
 *
 * @API    POST /api/v1/orders/:id/resolve-exception
 * @TRIGGER  Detail drawer "Resolve exception" button (red)
 * @POST_ACTION_UI
 *   - Exception banner clears
 *   - Status flips from 'exception' → 'ready_to_plan'
 *   - syncOk flag resets to true
 *   - Exceptions KPI decrements by 1
 *   - Toast: "Exception resolved"
 */
export async function mockResolveException(orderId) {
  await delay(300);
  return {
    success: true,
    updates: { exception: null, status: 'ready_to_plan', syncOk: true },
    toast: { type: 'success', key: 'orders.toast.exceptionResolved' },
  };
}

/**
 * Export orders to CSV.
 *
 * @API    GET /api/v1/orders/export?filters=<applied filters>
 * @TRIGGER  Export button in page header
 * @POST_ACTION_UI
 *   - CSV file with UTF-8 BOM is downloaded in the browser
 *   - Respects all currently-applied filters (KPI + tab + pills + search)
 *   - Toast: "Exported N orders"
 */
export async function mockExportOrders(filters) {
  await delay(200);
  return {
    success: true,
    format: 'csv',
    encoding: 'utf-8-bom',
    toast: { type: 'success', key: 'orders.toast.exported' },
  };
}

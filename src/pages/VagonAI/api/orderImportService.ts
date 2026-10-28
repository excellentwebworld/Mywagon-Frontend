/**
 * Bulk order import from a spreadsheet or a pasted table, through the gateway.
 *
 * Two calls, the same two phases as the ERP Orders page's import wizard - and
 * the gateway forwards to the very same Laravel endpoints, so a file imports
 * identically from either place:
 *
 * 1. `previewOrderImport` maps the file and returns orders to review. Writes nothing.
 * 2. `confirmOrderImport` imports the rows the shipper accepted.
 *
 * Contract: react-integration.md, "Bulk order import".
 */
import { getStoredToken } from '../../../api/client';
import { GatewayError, gatewayFetch } from '../../../api/chatGatewayUrl';
import type { AiMappedOrder } from '../../../api/types/erpOrders';

/** Laravel's `max:10240` (KB). Checked here so a large file fails before a long upload. */
export const ORDER_IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export interface ExistingOrderState {
  order_id: number;
  /** Laravel's status: only `unplanned` orders can be updated by an import. */
  status: string;
  editable: boolean;
}

export type PreviewOrder = AiMappedOrder & { existing: ExistingOrderState | null };

export type OrderImportPreviewStatus = 'ready' | 'missing_columns' | 'rejected' | 'unavailable';

export interface OrderImportPreview {
  conversationId: string;
  status: OrderImportPreviewStatus;
  message: string | null;
  filename: string | null;
  dataRowCount: number | null;
  orders: PreviewOrder[];
  file_headers: string[];
  missing_columns: string[];
  found_columns: string[];
  existingChecked: boolean;
  orders_url: '/erp-orders';
}

export interface OrderImportResult {
  status: 'done' | 'disabled';
  message: string | null;
  total: number;
  created: number;
  updated: number;
  failed: number;
  failures: string[];
  orders_url: '/erp-orders';
}

/**
 * No React context here - this is a plain API module, not a component or hook -
 * so the two words of user-visible text it can produce are picked directly off
 * `locale` rather than through `useTranslation`.
 */
function readFileErrorMessage(locale?: string): string {
  return locale === 'el' ? 'Δεν ήταν δυνατή η ανάγνωση του αρχείου.' : 'Could not read the file.';
}

function fileToBase64(file: File, locale?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(readFileErrorMessage(locale)));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error(readFileErrorMessage(locale)));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export async function previewOrderImport(input: {
  /** Omitted on a first turn - an import is often the shipper's opening action. */
  conversationId?: string;
  text?: string;
  file?: File;
  locale?: string;
}): Promise<OrderImportPreview> {
  // Sending `conversationId: undefined` would fail the gateway's min(1) check,
  // so the key is omitted entirely and the gateway mints one and returns it.
  const body: Record<string, unknown> = {};
  if (input.conversationId) body.conversationId = input.conversationId;
  if (input.text?.trim()) body.text = input.text;
  if (input.file) {
    body.filename = input.file.name;
    body.fileBase64 = await fileToBase64(input.file, input.locale);
  }

  const response = await gatewayFetch('/chat/order-import/preview', {
    method: 'POST',
    token: getStoredToken(),
    locale: input.locale,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as OrderImportPreview;
}

export async function confirmOrderImport(input: {
  conversationId: string;
  orders: AiMappedOrder[];
  locale?: string;
}): Promise<OrderImportResult> {
  const response = await gatewayFetch('/chat/order-import/confirm', {
    method: 'POST',
    token: getStoredToken(),
    locale: input.locale,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: input.conversationId, orders: input.orders }),
  });
  return (await response.json()) as OrderImportResult;
}

// ---------------------------------------------------------------------------
// The direct import engine (gateway `ORDER_IMPORT_ENGINE=direct`).
//
// Any ERP layout: the gateway maps the columns itself, matches or creates the
// receiver companies, drop-off addresses and products, and writes the orders.
// `uploadOrderImport` answers `legacy` when the server still runs the Laravel
// engine, and the caller falls back to `previewOrderImport` above.
// ---------------------------------------------------------------------------

export type ImportFlag =
  | 'customer_pickup'
  | 'own_fleet'
  | 'blocked'
  | 'adr'
  | 'incomplete'
  | 'needs_pin'
  | 'no_pickup'
  /** MS3-369: a ship-to code that came without an address was skipped or left open. */
  | 'no_dropoff';

/** Why an order is flagged incomplete (gateway `IncompleteReason`). */
export type ImportIncompleteReason =
  | { kind: 'weight'; lines: number; of: number }
  | { kind: 'weight_unit'; unit: string }
  | { kind: 'delivery_date' };

export interface ImportMappingRow {
  field: string;
  label: string;
  column: number | null;
  header: string | null;
  confidence: number | null;
  source: 'dictionary' | 'saved' | 'ai' | 'user' | null;
}

export interface ImportPlanCounts {
  orders: number;
  /** New orders. */
  toCreate: number;
  /** Existing unplanned orders the file overwrites (MS3-368). Absent from older gateways. */
  toUpdate?: number;
  /** Existing orders already on a load, left alone (MS3-368). Absent from older gateways. */
  plannedSkipped?: number;
  /** = plannedSkipped; on an older gateway, every existing order number (all skipped). */
  duplicates: number;
  failed: number;
  incomplete: number;
  lines: number;
  newCompanies: number;
  newAddresses: number;
  newProducts: number;
  matchedCompanies: number;
  matchedAddresses: number;
  matchedProducts: number;
  flags: Partial<Record<ImportFlag, number>>;
}

/**
 * 'update': an unplanned order the file overwrites; 'planned_skip': already on a
 * load, left alone (MS3-368). An older gateway says 'duplicate' for both.
 */
export type ImportOrderStatus = 'create' | 'update' | 'planned_skip' | 'duplicate' | 'failed';

export interface ImportPreviewOrder {
  orderNumber: string;
  status: ImportOrderStatus;
  company: string;
  companyIsNew: boolean;
  dropoffIsNew: boolean;
  pickup: 'matched' | 'question' | 'none';
  lines: number;
  weightKg: number | null;
  /** The order's value from the file (lines summed). Absent from gateways older than MS3-368. */
  orderValue?: number | null;
  /** 'EUR' etc. when the file's cells name it; null when they name none. */
  currency?: string | null;
  deliveryDate: string | null;
  flags: ImportFlag[];
  /** Absent from gateways older than the reason itself. */
  incomplete?: ImportIncompleteReason[];
  errors: string[];
  warnings: string[];
}

export interface ImportCreatedRecord {
  id: number;
  label: string;
  review: string[];
}

export interface ImportSummary {
  importId: string;
  filename: string;
  status: 'done' | 'failed';
  message: string | null;
  orders: {
    total: number;
    created: number;
    /** Absent on summaries from before MS3-368. */
    updated?: number;
    plannedSkipped?: number;
    /** = plannedSkipped; before MS3-368, every existing order (skipped). */
    duplicates: number;
    failed: number;
    incomplete: number;
    lines: number;
  };
  masters: {
    companies: { created: number; matched: number };
    addresses: { created: number; matched: number; needsPin: number };
    products: { created: number; matched: number; bestGuessCategory: number };
  };
  flags: Partial<Record<ImportFlag, number>>;
  created: { companies: ImportCreatedRecord[]; addresses: ImportCreatedRecord[]; products: ImportCreatedRecord[] };
  items: {
    orderNumber: string;
    /** 'duplicate' only on summaries stored before MS3-368. */
    status: 'created' | 'updated' | 'planned_skip' | 'duplicate' | 'failed';
    orderId: number | null;
    company: string;
    flags: ImportFlag[];
    incomplete?: ImportIncompleteReason[];
    reason: string | null;
  }[];
  questions: { key: string; raw: string; orderNumbers: string[] }[];
  lineIssues: { row: number; orderNumber: string | null; message: string }[];
  links: { orders: string; addressBook: string; products: string };
}

/** The steps of an upload's analysis (MS3-367), in order. */
export const IMPORT_STAGES = ['reading', 'customers', 'products', 'locations'] as const;
export type ImportStage = (typeof IMPORT_STAGES)[number];

/** A customer, product or location the import uses (`existing`), creates (`new`) or waits on the shipper for (`input`). */
export interface ImportReviewItem {
  key: string;
  /** 'skipped': a location code the shipper chose to leave unset (MS3-369). */
  status: 'existing' | 'new' | 'input' | 'skipped';
  name: string;
  detail: string | null;
  code: string | null;
  orders: number;
  /**
   * Customers only (MS3-371): it rests on a name-only match to this existing
   * company. `choice` is null until the shipper says "same" or "new"; after
   * "new" the item is the new company and still carries it, to undo.
   */
  possibleMatch?: { id: number; name: string; vat: string | null; choice: 'same' | 'new' | null };
  /**
   * New products only (MS3-370): the type it will be created with - the model's
   * proposal ('ai'), the catch-all when it was unsure ('fallback'), or the
   * shipper's pick ('user'); null when none is known yet. Absent from older gateways.
   */
  productType?: { id: number; name: string; category: string; source: 'ai' | 'fallback' | 'user'; confidence: number } | null;
  /** New products only: what `/products` takes to change the type. */
  productRef?: string;
}

export interface ImportReviewLocation extends ImportReviewItem {
  role: 'pickup' | 'dropoff';
  /**
   * A code nothing matched (MS3-369), open (`answer: null`) or answered:
   * `/locations` takes its `key`. `candidates` are the receiver's saved
   * addresses for a drop-off; a pickup maps to `view.sites`. Absent from older gateways.
   */
  question?: {
    key: string;
    role: 'pickup' | 'dropoff';
    code: string;
    answer: 'map' | 'create' | 'skip' | null;
    candidates: { id: number; name: string; detail: string | null; code: string | null }[];
  };
}

/** MS3-369: a Places pick to create a site from. */
export interface ImportSiteInput {
  name: string;
  address: string;
  city: string;
  postcode: string;
  country: string | null;
  lat: number;
  lng: number;
}

export type LocationAnswerBody =
  | { key: string; action: 'map'; siteId: number }
  | { key: string; action: 'create'; site: ImportSiteInput }
  | { key: string; action: 'skip' };

/** Exact counts; `items` is capped by the gateway (input first, then new), `truncated` says so. */
export interface ImportReviewGroup<T extends ImportReviewItem = ImportReviewItem> {
  total: number;
  existing: number;
  new: number;
  input: number;
  /** Skipped location codes (locations). Absent from gateways older than MS3-369. */
  skipped?: number;
  /** Undecided possible matches (customers). Absent from gateways older than MS3-371. */
  possible?: number;
  items: T[];
  truncated: boolean;
}

export interface ImportReview {
  customers: ImportReviewGroup;
  products: ImportReviewGroup;
  locations: ImportReviewGroup<ImportReviewLocation>;
}

export interface ImportView {
  importId: string;
  status: 'analyzing' | 'mapping' | 'ready' | 'running' | 'done' | 'failed';
  /** While `analyzing`. Absent from a gateway older than MS3-367. */
  stage?: ImportStage | null;
  filename: string;
  sheets: { name: string; rows: number; score: number }[];
  sheet: string | null;
  headers: string[];
  mapping: ImportMappingRow[];
  /** Decided by the gateway from the headers (MS3-372); `per_unit` means weights are multiplied by quantity. */
  weightBasis: 'line_total' | 'per_unit';
  /** Always 1 from MS3-372 on; no longer drives a question. */
  weightBasisConfidence: number;
  gaps: { field: string; message: string }[];
  counts: ImportPlanCounts | null;
  /** The Customers / Products / Locations sections. Absent from a gateway older than MS3-367. */
  review?: ImportReview | null;
  questions: { key: string; raw: string; orderNumbers: string[]; answeredWith: number | null }[];
  sites: { id: number; name: string; city: string | null; code: string | null }[];
  orders: ImportPreviewOrder[];
  lineIssues: { row: number; orderNumber: string | null; message: string }[];
  truncated: boolean;
  links: { orders: string; addressBook: string; products: string };
  progress: { done: number; total: number };
  summary: ImportSummary | null;
  message: string | null;
}

export type DirectImportStatus = 'ok' | 'legacy' | 'rejected' | 'unavailable' | 'not_found' | 'disabled' | 'running' | 'busy';

export interface DirectImportResponse {
  status: DirectImportStatus;
  message: string | null;
  view: ImportView | null;
  conversationId?: string;
  total?: number;
  ordersUpdated?: string[];
}

async function directCall(path: string, init: { method: string; body?: unknown; locale?: string }): Promise<DirectImportResponse> {
  const response = await gatewayFetch(path, {
    method: init.method,
    token: getStoredToken(),
    locale: init.locale,
    ...(init.body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) }
      : {}),
  });
  return (await response.json()) as DirectImportResponse;
}

/** Step 1: upload and map. Writes no order data; `status: 'legacy'` means use `previewOrderImport`. */
export async function uploadOrderImport(input: {
  conversationId?: string;
  text?: string;
  file?: File;
  locale?: string;
  /** MS3-360: the Orders page's pop-up - the import belongs to no chat. */
  source?: 'chat' | 'orders_page';
}): Promise<DirectImportResponse> {
  const body: Record<string, unknown> = {};
  if (input.conversationId) body.conversationId = input.conversationId;
  if (input.source) body.source = input.source;
  if (input.text?.trim()) body.text = input.text;
  if (input.file) {
    body.filename = input.file.name;
    body.fileBase64 = await fileToBase64(input.file, input.locale);
  }
  try {
    return await directCall('/chat/order-import/upload', { method: 'POST', body, locale: input.locale });
  } catch (err) {
    // A gateway deployed before the direct engine has no /upload route at all,
    // so it answers 404 instead of `legacy`. That surfaced as a bare "Not Found"
    // toast on every attach (QA 2026-10-06); it means exactly what `legacy`
    // means, so the caller falls back to /preview the same way.
    if (err instanceof GatewayError && err.status === 404) {
      return { status: 'legacy', message: null, view: null };
    }
    throw err;
  }
}

export function getOrderImport(importId: string, locale?: string): Promise<DirectImportResponse> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}`, { method: 'GET', locale });
}

/**
 * The import an "Order import" chat was opened for. That chat holds no messages,
 * only the import, so re-opening it showed the empty welcome screen
 * (QA retest #2). `view` is null when the chat has no import.
 */
export async function getConversationOrderImport(conversationId: string, locale?: string): Promise<DirectImportResponse> {
  try {
    return await directCall(`/chat/order-import/latest?conversationId=${encodeURIComponent(conversationId)}`, { method: 'GET', locale });
  } catch (err) {
    // A gateway without this route: the chat simply opens as before.
    if (err instanceof GatewayError && err.status === 404) return { status: 'not_found', message: null, view: null };
    throw err;
  }
}

/**
 * "Reset to standard columns": the standard mapping back on this import, and the
 * account's remembered layout for this file's headers forgotten (QA retest #2).
 */
export function resetOrderImportMapping(importId: string, locale?: string): Promise<DirectImportResponse & { forgotten?: boolean }> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}/mapping/reset`, { method: 'POST', body: {}, locale });
}

export function updateOrderImportMapping(
  importId: string,
  change: { sheet?: string; columns?: Record<string, string | null> },
  locale?: string,
): Promise<DirectImportResponse> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}/mapping`, { method: 'PATCH', body: change, locale });
}

export function answerImportWarehouse(importId: string, value: string, locationId: number, locale?: string): Promise<DirectImportResponse> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}/warehouses`, {
    method: 'POST',
    body: { value, locationId },
    locale,
  });
}

/** MS3-371: a name-only customer match is that company ("same") or a new one. This import only, before it runs. */
export function chooseImportCompany(importId: string, companyId: number, choice: 'same' | 'new', locale?: string): Promise<DirectImportResponse> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}/companies`, {
    method: 'POST',
    body: { companyId, choice },
    locale,
  });
}

/** MS3-370: the product type a new product will be created with. This import only, before it runs. */
export function chooseImportProductType(importId: string, product: string, typeId: number, locale?: string): Promise<DirectImportResponse> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}/products`, {
    method: 'POST',
    body: { product, typeId },
    locale,
  });
}

/** MS3-369: map, create or skip a location code nothing matched. This import only, before it runs. */
export function answerImportLocation(importId: string, body: LocationAnswerBody, locale?: string): Promise<DirectImportResponse> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}/locations`, { method: 'POST', body, locale });
}

/** One run in the shared Import History (MS3-373). */
export interface ImportHistoryItem {
  importId: string;
  filename: string;
  source: 'chat' | 'orders_page';
  status: ImportView['status'];
  user: { id: number; name: string };
  createdAt: string;
  finishedAt: string | null;
  /** MS3-375: the uploaded file is kept and `downloadImportFile` saves it. Absent from older gateways. */
  hasFile?: boolean;
  counts: {
    orders: number;
    created: number;
    updated: number;
    plannedSkipped: number;
    failed: number;
    incomplete: number;
    companies: number;
    addresses: number;
    products: number;
  } | null;
}

export interface ImportHistoryPage {
  items: ImportHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  /** Set when the gateway refused (import unavailable); `items` is then empty. */
  status?: string;
  message?: string | null;
}

/** MS3-373: the account's imports that ran - chat and Orders page - newest first. */
export async function getImportHistory(page = 1, pageSize = 20, locale?: string): Promise<ImportHistoryPage> {
  const response = await gatewayFetch(`/chat/order-import/history?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    token: getStoredToken(),
    locale,
  });
  return (await response.json()) as ImportHistoryPage;
}

/**
 * MS3-375: saves the exact file an import was uploaded as. The route needs the
 * bearer token, so a plain link cannot fetch it: the bytes come through
 * `gatewayFetch` and are handed to the browser as a download - never opened
 * in the page.
 */
export async function downloadImportFile(importId: string, filename: string): Promise<void> {
  const response = await gatewayFetch(`/chat/order-import/${encodeURIComponent(importId)}/file`, {
    method: 'GET',
    token: getStoredToken(),
    download: true,
  });
  const url = URL.createObjectURL(await response.blob());
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoked after the click has been handed to the browser's download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** The write. Returns `running` at once; poll `getOrderImport` for progress and the summary. */
export function runDirectOrderImport(importId: string, conversationId?: string, locale?: string): Promise<DirectImportResponse> {
  return directCall(`/chat/order-import/${encodeURIComponent(importId)}/run`, {
    method: 'POST',
    body: conversationId ? { conversationId } : {},
    locale,
  });
}

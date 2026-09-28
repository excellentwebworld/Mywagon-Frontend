/**
 * Submits pasted table text or an Excel/CSV file to the order-intake endpoint.
 * Creates ERP Orders only — never a shipment draft.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';

export interface OrderIntakeExceptionPrefill {
  name?: string | null;
  sku?: string | null;
  addressText?: string | null;
  role?: 'origin' | 'dest' | 'customer' | null;
}

export interface OrderIntakeException {
  kind: string;
  rowNumber: number | null;
  orderReference: string | null;
  field: string | null;
  message: string;
  value: string | null;
  /** MS3-337 — widget prefill from the import row (never invented ids). */
  prefill?: OrderIntakeExceptionPrefill | null;
}

export interface OrderIntakeMasterGapItem {
  kind: 'product' | 'location' | 'customer';
  name: string;
  sku: string | null;
  role: 'origin' | 'dest' | null;
  orderReferences: string[];
  creatableViaWidget: boolean;
}

export interface OrderIntakeMasterGaps {
  products: OrderIntakeMasterGapItem[];
  locations: OrderIntakeMasterGapItem[];
  customers: OrderIntakeMasterGapItem[];
  counts: {
    products: number;
    locations: number;
    customers: number;
    creatable: number;
  };
}

export interface OrderIntakeCreated {
  order_id: string;
  reference: string;
  customer_name: string;
  delivery_date: string;
  line_count: number;
  order_url: string;
  planned: false;
}

export interface OrderIntakeResponse {
  ok: boolean;
  /** Conversation the import was audited against; minted by the gateway when absent. */
  conversationId: string;
  parsed: { source: 'tsv' | 'csv' | 'xlsx'; rowCount: number; headers: string[] };
  readyCount: number;
  created: OrderIntakeCreated[];
  exceptions: OrderIntakeException[];
  /** MS3-337 — unique unknown masters for one Review & create pass. */
  master_gaps?: OrderIntakeMasterGaps;
  deferred: string[];
  orders_url: '/orders';
}

/**
 * No React context here — this is a plain API module, not a component or hook —
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

export async function submitOrderIntake(input: {
  /** Omitted on a first turn — order intake is often the shipper's opening action. */
  conversationId?: string;
  text?: string;
  file?: File;
  locale?: string;
}): Promise<OrderIntakeResponse> {
  // Sending `conversationId: undefined` would fail the gateway's min(1) check,
  // so the key is omitted entirely and the gateway mints one and returns it.
  const body: Record<string, unknown> = {};
  if (input.conversationId) body.conversationId = input.conversationId;
  if (input.text?.trim()) body.text = input.text;
  if (input.file) {
    body.filename = input.file.name;
    body.fileBase64 = await fileToBase64(input.file, input.locale);
  }

  const response = await gatewayFetch('/chat/order-intake', {
    method: 'POST',
    token: getStoredToken(),
    locale: input.locale,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return (await response.json()) as OrderIntakeResponse;
}

/**
 * MS3-337 — build the chat prompt that starts sequenced create_* widgets.
 * PURE — kept out of the React card so unit tests need no DOM.
 */
import type { OrderIntakeMasterGapItem } from './api/orderIntakeService';

export type ReviewCreatePayload = {
  products: OrderIntakeMasterGapItem[];
  locations: OrderIntakeMasterGapItem[];
  customers: OrderIntakeMasterGapItem[];
};

export function buildReviewCreatePrompt(gaps: ReviewCreatePayload): string {
  const lines: string[] = [
    'Review & create missing masters from my order intake.',
    'Flag once — do not invent ids — keep requiresConfirmation on every create_* write.',
    'Open widgets in this order: products first, then locations. One consolidated confirmation sequence; do not interrogate me row-by-row.',
  ];
  if (gaps.products.length > 0) {
    lines.push('');
    lines.push(
      `Products (${gaps.products.length}) — call get_create_product_context / create_product with these names/SKUs prefilled (no invented ids):`,
    );
    for (const p of gaps.products) {
      lines.push(`- name: ${p.name}${p.sku ? `; sku: ${p.sku}` : ''}`);
    }
  }
  if (gaps.locations.length > 0) {
    lines.push('');
    lines.push(
      `Addresses (${gaps.locations.length}) — call get_create_location_context / create_location with these address names prefilled:`,
    );
    for (const loc of gaps.locations) {
      lines.push(`- name: ${loc.name}${loc.role ? ` (${loc.role})` : ''}`);
    }
  }
  if (gaps.customers.length > 0) {
    lines.push('');
    lines.push(
      `Customers (${gaps.customers.length}) — there is no create_customer tool. Tell me to open Partners / invite_partner for:`,
    );
    for (const c of gaps.customers) {
      lines.push(`- ${c.name}`);
    }
  }
  return lines.join('\n');
}

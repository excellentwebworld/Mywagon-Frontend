/**
 * MS3-403: an order can be created without an order number. Wherever an order
 * needs a label, show its order number, or "#<id>" when it has none - the same
 * rule as Laravel's `display_reference` (ShipperErpOrder::displayLabel()).
 */
export function orderDisplayRef(
  order:
    | { id?: string | number | null; orderReference?: string | null; displayReference?: string | null }
    | null
    | undefined
): string {
  if (!order) return '';
  const ref = String(order.orderReference ?? '').trim();
  if (ref) return ref;
  const display = String(order.displayReference ?? '').trim();
  if (display) return display;
  const id = String(order.id ?? '').trim();
  return id ? `#${id}` : '';
}

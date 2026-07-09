import type { ApiError } from '../client';

type TranslateFn = (key: string, options?: Record<string, string | number>) => string;

const FIELD_LABELS: Record<string, string> = {
  order_reference: 'Order ID',
  erp_reference: 'ERP ID',
  customer_name: 'Customer',
  company_entity_id: 'Customer',
  delivery_date: 'Delivery date',
  ship_date: 'Ship date',
  origin_location_id: 'Ship from',
  dest_location_id: 'Ship to',
  order_value: 'Order value',
  notes: 'Notes',
  quantity: 'Quantity',
  unit: 'Unit',
  weight: 'Weight',
  weight_unit: 'Weight unit',
  product_sku_id: 'Product',
  product_name: 'Product',
  high_priority: 'High priority',
};

function humanizeFieldName(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
}

function labelForFieldPath(fieldPath: string, t?: TranslateFn): string {
  const lineMatch = fieldPath.match(/^lines\.(\d+)\.([a-z_]+)$/i);
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10) + 1;
    const subField = lineMatch[2];
    const subLabel = humanizeFieldName(subField);
    return t
      ? String(t('erpOrdersLineFieldLabel', { line: lineNum, field: subLabel }))
      : `Product line ${lineNum}: ${subLabel}`;
  }

  return humanizeFieldName(fieldPath.replace(/\./g, '_').replace(/^lines_\d+_/, ''));
}

/** Converts Laravel-style validation text into user-friendly messages. */
export function formatApiValidationMessage(raw: string, t?: TranslateFn): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const ruleMatch = trimmed.match(/^The ([\w.]+) (must be .+?)\.?$/i);
  if (ruleMatch) {
    const label = labelForFieldPath(ruleMatch[1], t);
    const rule = ruleMatch[2].replace(/\.$/, '');
    return `${label} ${rule}.`;
  }

  const requiredMatch = trimmed.match(/^The ([\w.\s]+?) field is required\.?$/i);
  if (requiredMatch) {
    const fieldKey = requiredMatch[1].trim().replace(/\s+/g, '_');
    const label = labelForFieldPath(fieldKey, t);
    return t ? String(t('erpOrdersFieldRequired', { field: label })) : `${label} is required.`;
  }

  const simpleRequiredMatch = trimmed.match(/^The ([\w.]+) is required\.?$/i);
  if (simpleRequiredMatch) {
    const label = labelForFieldPath(simpleRequiredMatch[1], t);
    return t ? String(t('erpOrdersFieldRequired', { field: label })) : `${label} is required.`;
  }

  return trimmed.replace(/lines\.(\d+)\.([a-z_]+)/gi, (_, idx, field) => {
    const lineNum = parseInt(idx, 10) + 1;
    const subLabel = humanizeFieldName(field).toLowerCase();
    return `product line ${lineNum} ${subLabel}`;
  });
}

export function getApiErrorMessage(err: ApiError, fallback: string, t?: TranslateFn): string {
  if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
    const messages = Object.entries(err.fieldErrors).flatMap(([field, msgs]) =>
      (msgs ?? []).map((msg) => {
        const formatted = formatApiValidationMessage(msg, t);
        if (formatted !== msg) return formatted;
        const label = labelForFieldPath(field, t);
        const cleanMsg = msg.replace(/\.$/, '').trim();
        if (cleanMsg.toLowerCase().includes(label.toLowerCase())) return `${cleanMsg}.`;
        return `${label}: ${cleanMsg}.`;
      })
    );

    if (messages.length > 0) return messages.join(' ');
  }

  const formatted = formatApiValidationMessage(err.message, t);
  return formatted || err.message || fallback;
}

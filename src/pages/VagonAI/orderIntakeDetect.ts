/**
 * Client-side detection for tabular paste that should become order intake
 * rather than a chat sentence. Mirrors ChatBot/src/orderIntake/parse.ts
 * `looksLikeOrderTable` — kept local so the FE does not import the gateway.
 */

const HEADER_ALIASES: Record<string, string[]> = {
  order_reference: ['order ref', 'order reference', 'order id', 'po', 'po number', 'reference', 'ref'],
  customer: ['customer', 'customer name', 'company', 'company name', 'buyer', 'client'],
  product: ['product', 'product name', 'item', 'goods', 'cargo', 'sku'],
  qty: ['qty', 'quantity', 'count', 'pallets'],
  delivery_date: ['delivery date', 'due date', 'eta', 'required date'],
};

function norm(raw: string): string {
  return raw.toLowerCase().replace(/[_./\\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectDelimiter(sampleLine: string): ',' | '\t' | ';' {
  const tabs = (sampleLine.match(/\t/g) ?? []).length;
  const semis = (sampleLine.match(/;/g) ?? []).length;
  const commas = (sampleLine.match(/,/g) ?? []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return '\t';
  if (semis > commas) return ';';
  return ',';
}

function splitLine(line: string, delimiter: ',' | '\t' | ';'): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function headerHits(headers: string[]): Set<string> {
  const hits = new Set<string>();
  for (const header of headers) {
    const key = norm(header);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((a) => norm(a) === key)) hits.add(field);
    }
  }
  return hits;
}

/** True when text looks like a multi-row order table, not a chat sentence. */
export function looksLikeOrderTable(text: string): boolean {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return false;
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return false;
  const delimiter = detectDelimiter(lines[0]!);
  const cols0 = splitLine(lines[0]!, delimiter).length;
  if (cols0 < 2) return false;
  let matching = 0;
  for (const line of lines.slice(0, Math.min(lines.length, 8))) {
    if (splitLine(line, delimiter).length === cols0) matching++;
  }
  if (matching < 2) return false;
  const hits = headerHits(splitLine(lines[0]!, delimiter));
  const hasIdentity = hits.has('order_reference') || hits.has('customer');
  const hasLine = hits.has('product') || hits.has('qty') || hits.has('delivery_date');
  return hasIdentity && hasLine;
}

export const ORDER_INTAKE_ACCEPT = '.xlsx,.xls,.csv,.tsv,text/csv,text/tab-separated-values';

/**
 * Does a dropped file look like something intake can actually read?
 *
 * Derived from ORDER_INTAKE_ACCEPT rather than written out again, so the drop
 * target and the file picker can never drift apart — a drop that accepts a
 * format the picker rejects is worse than no drop target at all. Extension is
 * checked as well as MIME because Windows reports .tsv and .xls inconsistently.
 */
export function isOrderIntakeFile(file: File): boolean {
  const accepted = ORDER_INTAKE_ACCEPT.split(',').map((a) => a.trim().toLowerCase());
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accepted.some((a) => (a.startsWith('.') ? name.endsWith(a) : type === a));
}

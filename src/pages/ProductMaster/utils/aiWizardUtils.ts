const REQUIRED_COLUMNS = [
  { label: 'SKU Name', icon: '📦', desc: 'Product / item name', keywords: ['sku name', 'sku_name', 'product name', 'item name', 'productname', 'itemname', 'sku nm', 'product nm'] },
  { label: 'SKU Number', icon: '#️⃣', desc: 'Unique SKU code or product code', keywords: ['sku number', 'sku_number', 'sku no', 'sku#', 'skuno', 'sku id', 'skuid', 'item code', 'product code', 'product_code', 'item_code', 'sku code', 'sku_code'] },
  { label: 'Category', icon: '🗂️', desc: 'Product category / group', keywords: ['category', 'product category', 'item category', 'product group', 'sku category'] },
  { label: 'Product Type', icon: '🏷️', desc: 'Type of product (e.g. physical, digital)', keywords: ['product type', 'producttype', 'product_type', 'item type', 'sku type', 'sku_type'] },
];

export function parseCsvHeaderLine(line: string): string[] {
  if (!line?.trim()) return [];
  return line.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, '').toLowerCase()).filter(Boolean);
}

export function validateRequiredCsvColumns(columns: string[]): {
  valid: boolean;
  results: { label: string; icon: string; desc: string; found: boolean }[];
  missing: string[];
} {
  const results = REQUIRED_COLUMNS.map(({ label, icon, desc, keywords }) => {
    const found = keywords.some((kw) => columns.some((col) => col === kw || col.includes(kw)));
    return { label, icon, desc, found };
  });
  const missing = results.filter((r) => !r.found).map((r) => r.label);
  return { valid: missing.length === 0, results, missing };
}

export async function readCsvFirstLine(file: File): Promise<string> {
  const text = await file.slice(0, 8192).text();
  return text.split(/\r\n|\r|\n/)[0] ?? '';
}

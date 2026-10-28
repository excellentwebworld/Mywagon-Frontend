/**
 * The composer's staged files and what the shipper's message asks of them
 * (MS3-366). Kept out of React so the rules are tested without rendering.
 *
 * Attaching only stages files; a message always needs words. Sent with an
 * import-type prompt ("import these orders", "πέρασε τις παραγγελίες") each file
 * is uploaded and gets its own review card. Sent with anything else, the
 * assistant asks first whether to import them - summarising or answering
 * questions about a file is a later ticket, so nothing is guessed meanwhile.
 */

/** More than this at once is refused at staging, said in a toast. */
export const MAX_STAGED_FILES = 5;

/** Folded: lower case, no accents (Greek tonos included), final sigma as sigma. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ');
}

/**
 * Word stems that ask for an import. Matched at a word start on the folded
 * text, so "import", "imported", "importing" and "εισαγωγη", "εισαγαγε",
 * "περασε", "ανεβασε" all count. Kept narrow on purpose: a question that only
 * mentions orders ("how many orders are in this file?") is not an import.
 */
const IMPORT_STEMS = [
  'import', 'upload', 'load these', 'load the', 'add these', 'add the orders', 'add orders', 'bring in', 'create the orders', 'create orders',
  'εισαγ', 'εισαξ', 'περασ', 'ανεβασ', 'φορτωσ', 'καταχωρ', 'προσθεσ',
];

export function isImportIntent(text: string): boolean {
  const folded = ` ${fold(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  if (folded.trim() === '') return false;
  return IMPORT_STEMS.some((stem) => folded.includes(` ${stem}`));
}

/** Two picks of the same file count once - the name and size are what the shipper recognises. */
const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size;

export interface StageResult {
  files: File[];
  /** Turned away, with why - the page says it in a toast. */
  refused: { file: File; reason: 'type' | 'size' | 'count' }[];
}

/**
 * Adds `incoming` to what is staged: a wrong type or an oversized file is
 * refused now rather than after the shipper typed a note; a file already
 * staged is not staged twice; and no more than `MAX_STAGED_FILES` are kept.
 */
export function stageFiles(
  staged: File[],
  incoming: File[],
  rules: { accepts: (file: File) => boolean; maxBytes: number },
): StageResult {
  const files = [...staged];
  const refused: StageResult['refused'] = [];
  for (const file of incoming) {
    if (!rules.accepts(file)) refused.push({ file, reason: 'type' });
    else if (file.size > rules.maxBytes) refused.push({ file, reason: 'size' });
    else if (files.some((f) => sameFile(f, file))) continue;
    else if (files.length >= MAX_STAGED_FILES) refused.push({ file, reason: 'count' });
    else files.push(file);
  }
  return { files, refused };
}

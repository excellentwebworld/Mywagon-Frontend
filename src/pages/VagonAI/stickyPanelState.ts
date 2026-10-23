/**
 * The Orders panel's state rules that are not about rendering: whether it
 * starts open, and which rows lead the list when the page asks it to focus on
 * some (the orders an import just created). Kept out of StickyOrdersPanel.tsx
 * so they can be tested in vitest's node environment.
 */

/** Orders the page wants shown and selected - the ones an import just created. */
export interface StickyFocusRequest {
  ids: string[];
  token: number;
}

/**
 * Rows the page asked to focus go first, so the urgency trim cannot drop them;
 * the rest keep their urgency order.
 */
export function focusFirst<T extends { id: string }>(rows: T[], focusIds: readonly string[]): T[] {
  if (focusIds.length === 0) return rows;
  const wanted = new Set(focusIds.map(String));
  return [...rows.filter((r) => wanted.has(String(r.id))), ...rows.filter((r) => !wanted.has(String(r.id)))];
}

/** The open/closed state last shown, kept per browser. Closed until the shipper opens it. */
const OPEN_KEY = 'vai.stickyOrders.open';

export function readPanelOpen(storage: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return storage?.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function writePanelOpen(storage: Pick<Storage, 'setItem'> | null, open: boolean): void {
  try {
    storage?.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    // Private mode or blocked storage: the panel still works, it just forgets.
  }
}

export function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

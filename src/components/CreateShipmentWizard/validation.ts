import type { Conflict } from '../../hooks/useConflicts';

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function getConflictAnchor(conflict: Conflict): string {
  const { code, stopIndex, lineIndex } = conflict;

  if (stopIndex < 0) {
    return 'wizard-global';
  }

  if (['L1', 'L2', 'L4'].includes(code)) {
    return `stop-${stopIndex}-location`;
  }

  if (['D1', 'D2', 'D3', 'D4', 'D5', 'D7', 'D8', 'S1', 'S2'].includes(code)) {
    return `stop-${stopIndex}-date`;
  }

  if (code === 'C3') {
    return lineIndex >= 0 ? `stop-${stopIndex}-line-${lineIndex}-qty` : `stop-${stopIndex}-cargo`;
  }

  if (code === 'C10') {
    return lineIndex >= 0 ? `stop-${stopIndex}-line-${lineIndex}-weight` : `stop-${stopIndex}-cargo`;
  }

  if (code === 'O4' || code === 'O1') {
    return lineIndex >= 0 ? `stop-${stopIndex}-line-${lineIndex}-order` : `stop-${stopIndex}-cargo`;
  }

  if (code === 'C2' || code === 'C5') {
    return lineIndex >= 0 ? `stop-${stopIndex}-line-${lineIndex}-product` : `stop-${stopIndex}-cargo`;
  }

  if (['C1', 'C4', 'C6', 'C7', 'C8', 'C9', 'C11', 'O2', 'O3', 'S4', 'X4'].includes(code)) {
    if (lineIndex >= 0) {
      return `stop-${stopIndex}-line-${lineIndex}-product`;
    }
    return `stop-${stopIndex}-cargo`;
  }

  return `stop-${stopIndex}`;
}

export function sortConflictsForFocus(conflicts: Conflict[]): Conflict[] {
  const score = (c: Conflict) => {
    if (c.stopIndex < 0) {
      return c.code === 'X1' ? 0 : c.code === 'C11' ? 2 : 5;
    }

    let value = c.stopIndex * 1000;
    const fieldOrder: Record<string, number> = {
      L1: 10,
      L4: 11,
      D1: 20,
      D2: 21,
      D3: 22,
      D4: 23,
      D5: 24,
      D7: 26,
      S1: 25,
      C1: 30,
      O4: 30,
      C2: 31,
      C3: 32,
      C10: 33,
      C5: 34,
      C9: 40,
    };
    value += fieldOrder[c.code] ?? 100;
    value += c.lineIndex >= 0 ? c.lineIndex : 0;
    return value;
  };

  return [...conflicts].sort((a, b) => score(a) - score(b));
}

export function translateConflict(conflict: Conflict, t: TranslateFn): string {
  const key = `validationConflict${conflict.code}`;
  const params: Record<string, unknown> = {
    stop: conflict.stopIndex >= 0 ? conflict.stopIndex + 1 : undefined,
    line: conflict.lineIndex >= 0 ? conflict.lineIndex + 1 : undefined,
    product: conflict.message.match(/:\s*(.+?)\s+(has|dropped)/)?.[1],
    defaultValue: conflict.message,
  };
  const translated = t(key, params);
  return translated && translated !== key ? translated : conflict.message;
}

export function translateResolution(conflict: Conflict, t: TranslateFn): string {
  const key = `validationResolution${conflict.code}`;
  const translated = t(key, { defaultValue: conflict.resolution });
  return translated && translated !== key ? translated : conflict.resolution;
}

export function getBlockersForAnchor(blockers: Conflict[], anchor: string): Conflict[] {
  return blockers.filter((conflict) => getConflictAnchor(conflict) === anchor);
}

/** Whole-wizard checks — used on Continue, not when collapsing a single stop with Done */
const GLOBAL_STOP_DONE_EXCLUDED_CODES = new Set([
  'X1',
  'X2',
  'X3',
  'X4',
  'L3',
  'L5',
  'C4',
  'C5',
  'C6',
  'C7',
  'C8',
  'C9',
  'C11',
  'S4',
]);

/** Per-stop checks that depend on another stop's data */
const CROSS_STOP_DONE_EXCLUDED_CODES = new Set(['D3', 'D5', 'L2']);

export function getStopDoneBlockers(blockers: Conflict[], stopIndex: number): Conflict[] {
  return blockers.filter(
    (conflict) =>
      conflict.stopIndex === stopIndex &&
      conflict.severity === 'blocker' &&
      !GLOBAL_STOP_DONE_EXCLUDED_CODES.has(conflict.code) &&
      !CROSS_STOP_DONE_EXCLUDED_CODES.has(conflict.code)
  );
}

export function scrollToValidationAnchor(
  anchor: string,
  options?: { focus?: boolean; highlightClass?: string }
): HTMLElement | null {
  const el = document.querySelector(`[data-validation-anchor="${anchor}"]`) as HTMLElement | null;
  if (!el) return null;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (options?.highlightClass) {
    const highlightClass = options.highlightClass;
    el.classList.add(highlightClass);
    window.setTimeout(() => el.classList.remove(highlightClass), 2400);
  }

  if (options?.focus !== false) {
    const focusable = el.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex="0"]'
    );
    focusable?.focus({ preventScroll: true });
  }

  return el;
}

export function focusFirstConflict(
  conflicts: Conflict[],
  expandStop?: (stopIndex: number) => void
): Conflict | null {
  const sorted = sortConflictsForFocus(conflicts);
  const first = sorted[0];
  if (!first) return null;

  if (first.stopIndex >= 0) {
    expandStop?.(first.stopIndex);
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToValidationAnchor(getConflictAnchor(first), {
        focus: true,
        highlightClass: 'wizard-validation-flash',
      });
    });
  });

  return first;
}

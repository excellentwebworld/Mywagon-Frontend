/**
 * The non-component halves of `flowPrimitives`.
 *
 * Split out for one blunt reason: React Fast Refresh only works on a module whose
 * exports are all components, so a shared style object and a shared hook living
 * beside `PickRow` cost every guided flow its hot reload. Same pieces, same
 * owners, different file.
 */
import { useMemo } from 'react';
import type { ThemeTokens } from '../../utils/themes';

export const inputStyle = (
  T: ThemeTokens,
  opts?: { invalid?: boolean },
): React.CSSProperties => ({
  height: 34, padding: '0 9px', fontSize: 13, borderRadius: 8,
  border: `1px solid ${opts?.invalid ? '#DC2626' : T.bd}`,
  background: opts?.invalid ? 'rgba(220,38,38,0.06)' : T.bg,
  color: T.t1, width: '100%',
  boxShadow: opts?.invalid ? '0 0 0 1px rgba(220,38,38,0.25)' : undefined,
});

/** A searchable list, because a 200-row bundle is not a scroll. */
export function useFilter<T>(rows: T[], term: string, match: (row: T, needle: string) => boolean) {
  return useMemo(() => {
    const needle = term.trim().toLowerCase();
    const filtered = needle ? rows.filter((row) => match(row, needle)) : rows;
    return filtered.slice(0, 40);
  }, [rows, term, match]);
}

/* ---- Form errors: the pure rules (test-fix, WP3a) --------------------------------------------------------
 * flowHelpers.test.ts has specified these four functions since commit 96a1c8d; they were never written.
 * Only the pure halves exist here. A `useFormErrors` hook (attempted/touched state on top) is NOT implemented:
 * nothing in the app uses it and the test does not cover it. */

/** One thing wrong with one field, as the draft module words it. `field` is a gateway draft path, e.g. `lines[0].qty`. */
export interface FieldIssue {
  field: string;
  message: string;
}

/** What the gateway said when it refused a write: one sentence about the whole write plus the fields it named. */
export interface FieldRefusal {
  reason: string;
  missing: string[];
}

/** A DOM id for a field of a guided form. A draft path such as `lines[0].qty` is flattened so a fragment link can hold it. */
export const fieldId = (form: string, field: string): string =>
  `vai-${form}-${field.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')}`;

/** The line for a field only the server objected to: its label in the shipper's words, else the raw path. */
export const refusedMessage = (field: string, labels: Record<string, string>): string =>
  `Check ${labels[field]?.toLowerCase() ?? field}.`;

/** The message to show beside a field: the client's own specific issue first, then the server's refusal, else null. */
export const messageFor = (
  field: string,
  issues: FieldIssue[],
  refusal: FieldRefusal | null,
  labels: Record<string, string>,
): string | null => {
  const own = issues.find((issue) => issue.field === field);
  if (own) return own.message;
  return refusal?.missing.includes(field) ? refusedMessage(field, labels) : null;
};

/** Every field that needs attention, once each: the client's issues in their own order, then fields only the server named. */
export const summaryRows = (
  issues: FieldIssue[],
  refusal: FieldRefusal | null,
  labels: Record<string, string>,
): FieldIssue[] => {
  const rows: FieldIssue[] = [];
  const seen = new Set<string>();
  for (const issue of issues) {
    if (seen.has(issue.field)) continue;
    seen.add(issue.field);
    rows.push(issue);
  }
  for (const field of refusal?.missing ?? []) {
    if (seen.has(field)) continue;
    seen.add(field);
    rows.push({ field, message: refusedMessage(field, labels) });
  }
  return rows;
};

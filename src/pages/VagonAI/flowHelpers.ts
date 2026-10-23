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

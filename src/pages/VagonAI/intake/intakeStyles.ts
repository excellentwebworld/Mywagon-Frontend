/**
 * The intake cards' non-component style helpers (kept out of `intakeShell.tsx` so that file only exports components).
 * The look itself lives in `intake.css`.
 */
import type { ThemeTokens } from '../../../utils/themes';
import { TAP_LINK_CLASS } from './tap';

/** A text input / select / date box. The focus ring is drawn by `intake.css`. */
export const inputStyle = (T: ThemeTokens, opts?: { invalid?: boolean }): React.CSSProperties => ({
  height: 40, padding: '0 12px', fontSize: 14, borderRadius: 10, width: '100%',
  border: `1px solid ${opts?.invalid ? '#DC2626' : T.bf}`,
  background: opts?.invalid ? 'rgba(220,38,38,0.05)' : T.sf,
  color: T.t1,
});

/** A text link drawn by a `<button>`: accent, or quiet (Back, Discard). Keeps the 44 px phone tap height. */
export const LINK_CLASS = `vai-ik-link ${TAP_LINK_CLASS}`;
export const QUIET_LINK_CLASS = `vai-ik-link vai-ik-link--quiet ${TAP_LINK_CLASS}`;

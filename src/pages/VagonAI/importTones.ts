/**
 * Status tones for the order-import cards. They read the brand's status tokens
 * (`--st-*`, defined for both themes in mv-app-tokens.css) and fall back to the
 * light values - the cards' old hard-coded hex colours were light-mode only.
 */
import type { ImportFlag } from './api/orderImportService';

export type Tone = 'ok' | 'warn' | 'error' | 'neutral';

export const TONE: Record<Exclude<Tone, 'neutral'>, { fg: string; bg: string }> = {
  ok: { fg: 'var(--st-success-fg, #1E7A4A)', bg: 'var(--st-success-bg, #E4F5EC)' },
  warn: { fg: 'var(--st-warning-fg, #9A6508)', bg: 'var(--st-warning-bg, #FCF1DB)' },
  error: { fg: 'var(--st-danger-fg, #E03B4A)', bg: 'var(--st-danger-bg, #FBE6E8)' },
};

/** How loud each order flag is: red for what stops a load, amber for what to check. */
export const FLAG_TONE: Record<ImportFlag, Tone> = {
  blocked: 'error',
  adr: 'error',
  customer_pickup: 'warn',
  own_fleet: 'warn',
  incomplete: 'warn',
  needs_pin: 'warn',
  no_pickup: 'warn',
  no_dropoff: 'warn',
};

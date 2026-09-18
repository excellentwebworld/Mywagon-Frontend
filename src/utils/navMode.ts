import { safeLocalGet, safeLocalSet } from './safeStorage';

/** localStorage key for shipper panel navigation layout. */
export const NAV_MODE_STORAGE_KEY = 'mv_nav_mode';

/** Vertical left sidebar — default after login. */
export const DEFAULT_NAV_MODE = 'sidebar';

export const NAV_MODE_CHANGED_EVENT = 'shipper:nav-mode-changed';

export type NavMode = 'sidebar' | 'top';

export function isNavMode(value: unknown): value is NavMode {
  return value === 'sidebar' || value === 'top';
}

export function readNavModePreference(): NavMode {
  const stored = safeLocalGet(NAV_MODE_STORAGE_KEY);
  return isNavMode(stored) ? stored : DEFAULT_NAV_MODE;
}

export function setNavModePreference(mode: NavMode): void {
  safeLocalSet(NAV_MODE_STORAGE_KEY, mode);
  try {
    window.dispatchEvent(new CustomEvent(NAV_MODE_CHANGED_EVENT, { detail: mode }));
  } catch {
    /* ignore */
  }
}

/** Call after a successful login / social session start so the panel always opens vertical. */
export function applyVerticalNavOnLogin(): void {
  setNavModePreference(DEFAULT_NAV_MODE);
}

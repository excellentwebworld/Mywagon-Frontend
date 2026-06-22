import { useEffect } from 'react';
import { useLoader } from '../context/LoaderContext';

/** Mirrors Blade `showLoader()` / `hideLoader()` for mutations and heavy operations. */
export function useSyncGlobalLoader(active: boolean) {
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    if (!active) return undefined;
    showLoader();
    return () => hideLoader();
  }, [active, showLoader, hideLoader]);
}

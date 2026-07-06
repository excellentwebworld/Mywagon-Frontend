import { useEffect, useRef } from 'react';
import { useApp } from '../../../context/AppContext';

/** Loads address-book locations and SKUs once per wizard session (deduped in AppContext). */
export function useWizardMasterData() {
  const { refreshLocationsFromApi, refreshSkusFromApi } = useApp();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void refreshLocationsFromApi();
    void refreshSkusFromApi();
  }, [refreshLocationsFromApi, refreshSkusFromApi]);
}

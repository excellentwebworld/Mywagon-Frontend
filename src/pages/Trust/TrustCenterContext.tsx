/**
 * Trust Center data context — loads GET /settings/trust once for the page.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  trustSettingsService,
  type TrustCenterPayload,
} from '../../api/services/trustSettingsService';

type TrustCenterContextValue = {
  data: TrustCenterPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const TrustCenterContext = createContext<TrustCenterContextValue | null>(null);

export function TrustCenterProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TrustCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await trustSettingsService.get();
      setData(payload);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Failed to load trust center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <TrustCenterContext.Provider value={{ data, loading, error, refresh: load }}>
      {children}
    </TrustCenterContext.Provider>
  );
}

export function useTrustCenter() {
  const ctx = useContext(TrustCenterContext);
  if (!ctx) {
    throw new Error('useTrustCenter must be used within TrustCenterProvider');
  }
  return ctx;
}

import React, { useEffect, useState } from 'react';
import { registerService, type SignupReference } from '../../api/auth/registerService';

export function useRegisterReference(lang: string) {
  const [data, setData] = useState<SignupReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void registerService
      .getReference(lang)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load reference data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return { data, loading, error };
}

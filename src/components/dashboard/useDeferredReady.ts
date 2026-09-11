import { useEffect, useState } from 'react';

/** Delay below-fold dashboard widgets so the first paint does not burst every GET at once. */
export function useDeferredReady(delayMs: number): boolean {
  const [ready, setReady] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const id = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  return ready;
}

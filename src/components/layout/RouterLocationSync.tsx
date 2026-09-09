import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { router } from '../../router';

function stripBasename(pathname: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || '/';
  }
  return pathname || '/';
}

/**
 * Recovers when the browser URL advances but React Router location stays behind
 * (seen after modal dismiss + sidebar Link under React 19 / RR7 transitions).
 */
export function RouterLocationSync(): null {
  const location = useLocation();

  useEffect(() => {
    const syncIfDesynced = () => {
      const browserPath = stripBasename(window.location.pathname);
      const browserSearch = window.location.search;
      if (browserPath === location.pathname && browserSearch === location.search) {
        return;
      }
      void router.navigate(`${browserPath}${browserSearch}`, {
        replace: true,
        flushSync: true,
      });
    };

    const onClick = () => {
      // Link updates history first; React state may lag — sync on next frames.
      queueMicrotask(syncIfDesynced);
      window.requestAnimationFrame(syncIfDesynced);
      window.setTimeout(syncIfDesynced, 0);
      window.setTimeout(syncIfDesynced, 32);
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', syncIfDesynced);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', syncIfDesynced);
    };
  }, [location.pathname, location.search]);

  return null;
}

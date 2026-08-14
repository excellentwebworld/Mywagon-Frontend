import { useAuth } from '../context/AuthContext';

export function isPastDueAllowedPath(pathname: string): boolean {
  return pathname === '/billing' || pathname.startsWith('/billing/');
}

export function usePastDueLock(): boolean {
  const { user } = useAuth();
  return Boolean(user?.has_past_due);
}

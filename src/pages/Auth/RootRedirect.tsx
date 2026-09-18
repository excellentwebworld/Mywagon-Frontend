import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Amplify-safe landing for hard navigations to `/`.
 *
 * Static hosts serve `/` (index.html) but often 404 on `/login` and
 * `/auth/social/callback` without SPA rewrites. OAuth returns here with
 * query params; we client-navigate to the real screens.
 */
export const RootRedirect: React.FC<{ fallback?: string }> = ({
  fallback = '/login',
}) => {
  const [params] = useSearchParams();
  const qs = params.toString();

  if (params.get('social_error') === '1') {
    return <Navigate to={qs ? `/login?${qs}` : '/login?social_error=1'} replace />;
  }

  if (params.get('token') || params.get('two_factor') === '1') {
    return <Navigate to={qs ? `/auth/social/callback?${qs}` : '/auth/social/callback'} replace />;
  }

  return <Navigate to={fallback} replace />;
};

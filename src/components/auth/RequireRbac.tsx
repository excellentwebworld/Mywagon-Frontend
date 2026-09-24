import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useShipperPermission } from '../../hooks/useShipperPermission';
import { resolveRouteRbac } from '../../utils/shipperRbacMap';

type RequireRbacProps = {
  children: React.ReactNode;
  /** Explicit permission(s). When omitted, resolved from current path via shipperRbacMap. */
  permission?: string | string[];
  /** Where to send denied users (default: dashboard). */
  fallbackTo?: string;
};

/**
 * Route-level Spatie RBAC gate (Blade web.shipper.permission parity).
 * Subscription entitlements remain separate (SubscriptionPageGate / useSubscriptionPermission).
 */
export const RequireRbac: React.FC<RequireRbacProps> = ({
  children,
  permission,
  fallbackTo = '/dashboard',
}) => {
  const { can } = useShipperPermission();
  const location = useLocation();
  const required = permission ?? resolveRouteRbac(location.pathname);

  if (required != null && !can(required)) {
    return <Navigate to={fallbackTo} replace state={{ rbacDenied: true, from: location.pathname }} />;
  }

  return <>{children}</>;
};

/** Inline empty state when a section is denied without navigating away. */
export const RbacAccessDenied: React.FC<{ title?: string; message?: string }> = ({
  title = 'Access restricted',
  message = "You don't have permission to view this section. Contact your company admin.",
}) => (
  <div
    className="rbac-access-denied"
    role="alert"
    style={{
      padding: '2.5rem 1.5rem',
      textAlign: 'center',
      maxWidth: 480,
      margin: '3rem auto',
    }}
  >
    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h2>
    <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>{message}</p>
  </div>
);

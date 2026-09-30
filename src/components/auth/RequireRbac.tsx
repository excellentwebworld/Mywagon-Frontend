import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { useShipperPermission } from '../../hooks/useShipperPermission';
import { resolveRouteRbac } from '../../utils/shipperRbacMap';
import { toastRbacAccessDenied, RBAC_ACCESS_DENIED_DEFAULT } from '../../utils/rbacToast';

export { RBAC_ACCESS_DENIED_DEFAULT } from '../../utils/rbacToast';

type RequireRbacProps = {
  children: React.ReactNode;
  /** Explicit permission(s). When omitted, resolved from current path via shipperRbacMap. */
  permission?: string | string[];
  /** Where to send denied users (default: dashboard). */
  fallbackTo?: string;
};

/**
 * Toast then redirect when Spatie RBAC denies a route.
 * Mounted only on the deny path so the toast fires once per bounce.
 */
const RbacDeniedRedirect: React.FC<{ to: string; from: string }> = ({ to, from }) => {
  const { showToast } = useApp();
  const { t } = useTranslation();
  const toasted = useRef(false);

  useEffect(() => {
    if (toasted.current) return;
    toasted.current = true;
    toastRbacAccessDenied(
      showToast,
      t('rbac.accessDenied', { defaultValue: RBAC_ACCESS_DENIED_DEFAULT }),
    );
  }, [showToast, t]);

  return <Navigate to={to} replace state={{ rbacDenied: true, from }} />;
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
    return <RbacDeniedRedirect to={fallbackTo} from={location.pathname} />;
  }

  return <>{children}</>;
};

/** Inline empty state when a section is denied without navigating away. */
export const RbacAccessDenied: React.FC<{ title?: string; message?: string }> = ({
  title = 'Access restricted',
  message = RBAC_ACCESS_DENIED_DEFAULT,
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

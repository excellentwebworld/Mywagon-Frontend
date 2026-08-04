/**
 * /settings/:section/:tab — Users & Roles sub-tabs, or redirect stray segments.
 * Numeric /settings/users/:id (old full-page edit) redirects to the users list;
 * edit now uses the invite/edit popup on that page.
 * /settings/users/audit → /settings/audit (Audit Log moved to Admin).
 */
import { Navigate, useParams } from 'react-router-dom';
import Settings from './Settings';

const USER_SUBTABS = new Set(['roles']);

export default function SettingsSectionOrUserEdit() {
  const { section, tab } = useParams<{ section?: string; tab?: string }>();

  // Legacy: Audit Log under Users & Roles → Admin
  if (section === 'users' && tab === 'audit') {
    return <Navigate to="/settings/audit" replace />;
  }

  // Legacy full-page user edit → list (edit opens as modal there)
  if (section === 'users' && tab && /^\d+$/.test(tab)) {
    return <Navigate to="/settings/users" replace />;
  }

  if (section === 'users' && tab && USER_SUBTABS.has(tab)) {
    return <Settings />;
  }

  if (section) {
    return <Navigate to={`/settings/${section}`} replace />;
  }

  return <Navigate to="/settings/personal" replace />;
}

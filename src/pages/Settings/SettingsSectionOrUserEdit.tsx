/**
 * /settings/:section/:tab — either a Users & Roles sub-tab, a user edit page (numeric id),
 * or redirect stray segments back to /settings/:section.
 */
import { Navigate, useParams } from 'react-router-dom';
import Settings from './Settings';
import UserEditPage from './usermgmt/UserEditPage';

const USER_SUBTABS = new Set(['roles']);

export default function SettingsSectionOrUserEdit() {
  const { section, tab } = useParams<{ section?: string; tab?: string }>();

  if (section === 'users' && tab && /^\d+$/.test(tab)) {
    return <UserEditPage />;
  }

  if (section === 'users' && tab && USER_SUBTABS.has(tab)) {
    return <Settings />;
  }

  if (section) {
    return <Navigate to={`/settings/${section}`} replace />;
  }

  return <Navigate to="/settings/personal" replace />;
}

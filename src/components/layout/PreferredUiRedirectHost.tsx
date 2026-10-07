import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { redirectToClassicPanelIfNeeded } from '../../utils/preferredUiRedirect';

/**
 * After gates clear, bounce users who prefer Classic off the React panel (auto-login handoff).
 * Skips handoff/login routes and WebView paths.
 */
export function PreferredUiRedirectHost() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (attempted.current) return;

    const path = location.pathname || '';
    if (
      path.startsWith('/auth/handoff') ||
      path.startsWith('/login') ||
      path.startsWith('/webview/')
    ) {
      return;
    }

    attempted.current = true;
    void redirectToClassicPanelIfNeeded(user).then((started) => {
      if (started) return;
      // Retry only while they still prefer Classic but gates are not clear yet.
      const prefersClassic = (user.preferred_ui || 'classic') === 'classic';
      const switchOn = user.ui_switch_enabled !== false;
      if (prefersClassic && switchOn) {
        attempted.current = false;
      }
    });
  }, [isAuthenticated, user, location.pathname]);

  return null;
}

import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  needsSignupComplete,
  openSignupIncompleteModal,
} from './useSignupCompleteGate';

/**
 * Soft-gate for operational actions while social required details are incomplete.
 * Opens a professional incomplete-profile modal; Continue → settings step.
 * Normal email signup never has signup_complete=false — unaffected.
 */
export function useRequireSignupComplete(): {
  signupIncomplete: boolean;
  requireSignupComplete: () => boolean;
} {
  const { user } = useAuth();
  const signupIncomplete = needsSignupComplete(user);

  const requireSignupComplete = useCallback((): boolean => {
    if (!user) return false;
    if (!signupIncomplete) return true;
    openSignupIncompleteModal();
    return false;
  }, [user, signupIncomplete]);

  return { signupIncomplete, requireSignupComplete };
}

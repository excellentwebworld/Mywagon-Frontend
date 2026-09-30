import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  needsSignupComplete,
  openSignupIncompleteModal,
  SIGNUP_INCOMPLETE_MODAL_EVENT,
  socialProfileNextPath,
  socialProfileStep,
} from '../../hooks/useSignupCompleteGate';
import { safeLocalGet, safeLocalSet } from '../../utils/safeStorage';
import {
  SignupIncompleteAccessModal,
  type SignupIncompleteModalVariant,
} from './SignupIncompleteAccessModal';

function welcomeStorageKey(userId: number | string): string {
  return `shipper_social_welcome_shown_${userId}`;
}

/**
 * App-wide host:
 * - First social login → “Welcome to MYVAGON” (once)
 * - Feature soft-gates → “Almost there!”
 * Continue / Get Started → related settings page.
 * Normal email signup never has signup_complete=false — modal never opens.
 */
export const SignupIncompleteGateHost: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<SignupIncompleteModalVariant>('gate');

  // First-time social welcome (once per account)
  useEffect(() => {
    if (!user || !needsSignupComplete(user)) return;
    const key = welcomeStorageKey(user.id);
    if (safeLocalGet(key) === '1') return;
    setVariant('welcome');
    setOpen(true);
  }, [user]);

  // Soft-gate from menus / API
  useEffect(() => {
    const onOpen = () => {
      if (!needsSignupComplete(user)) return;
      setVariant('gate');
      setOpen(true);
    };
    window.addEventListener(SIGNUP_INCOMPLETE_MODAL_EVENT, onOpen);
    return () => window.removeEventListener(SIGNUP_INCOMPLETE_MODAL_EVENT, onOpen);
  }, [user]);

  const onOk = useCallback(() => {
    if (user && variant === 'welcome') {
      safeLocalSet(welcomeStorageKey(user.id), '1');
    }
    setOpen(false);
    if (!needsSignupComplete(user)) return;
    navigate(socialProfileNextPath(user), { replace: false });
  }, [user, navigate, variant]);

  if (!needsSignupComplete(user)) return null;

  return (
    <SignupIncompleteAccessModal
      open={open}
      variant={variant}
      step={socialProfileStep(user)}
      onOk={onOk}
    />
  );
};

/** Imperative helper used by hooks (same as openSignupIncompleteModal). */
export { openSignupIncompleteModal };

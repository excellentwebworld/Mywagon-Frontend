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
import { SignupIncompleteAccessModal } from './SignupIncompleteAccessModal';

/**
 * App-wide host: soft-gates open this modal; Continue → related settings page.
 * Normal email signup never has signup_complete=false — modal never opens.
 */
export const SignupIncompleteGateHost: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      if (!needsSignupComplete(user)) return;
      setOpen(true);
    };
    window.addEventListener(SIGNUP_INCOMPLETE_MODAL_EVENT, onOpen);
    return () => window.removeEventListener(SIGNUP_INCOMPLETE_MODAL_EVENT, onOpen);
  }, [user]);

  const onOk = useCallback(() => {
    setOpen(false);
    if (!needsSignupComplete(user)) return;
    const next = socialProfileNextPath(user);
    navigate(next, { replace: false });
  }, [user, navigate]);

  if (!needsSignupComplete(user)) return null;

  return (
    <SignupIncompleteAccessModal
      open={open}
      step={socialProfileStep(user)}
      onOk={onOk}
    />
  );
};

/** Imperative helper used by hooks (same as openSignupIncompleteModal). */
export { openSignupIncompleteModal };

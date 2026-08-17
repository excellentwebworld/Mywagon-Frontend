import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface BillingModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BillingModalPortal: React.FC<BillingModalPortalProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(children, document.body);
};

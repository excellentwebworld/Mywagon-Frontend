import React, { useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import { scrollToFirstModalError } from './scrollToModalError';

type Props = {
  modalBodySelector?: string;
};

export const ScrollToFormError: React.FC<Props> = ({ modalBodySelector = '.modal-body' }) => {
  const { errors, submitCount, isValidating } = useFormikContext();
  const formAnchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (submitCount > 0 && !isValidating && Object.keys(errors).length > 0) {
      const timer = window.setTimeout(() => {
        const form = formAnchorRef.current?.closest('form');
        if (form) {
          scrollToFirstModalError(form, modalBodySelector);
        }
      }, 50);

      return () => window.clearTimeout(timer);
    }
  }, [submitCount, isValidating, errors, modalBodySelector]);

  return <span ref={formAnchorRef} aria-hidden="true" style={{ display: 'none' }} />;
};

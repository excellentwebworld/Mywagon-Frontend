import React, { useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import { scrollToFirstModalError } from './scrollToModalError';

type Props = {
  modalBodySelector?: string;
};

export const ScrollToFormError: React.FC<Props> = ({ modalBodySelector = '.modal-body' }) => {
  const { errors, submitCount, isValidating, isSubmitting } = useFormikContext();
  const formAnchorRef = useRef<HTMLSpanElement>(null);
  const handledSubmitCountRef = useRef(0);

  useEffect(() => {
    if (submitCount === 0 || submitCount <= handledSubmitCountRef.current) return;
    if (isValidating || isSubmitting) return;
    if (Object.keys(errors).length === 0) return;

    handledSubmitCountRef.current = submitCount;

    const timer = window.setTimeout(() => {
      const form = formAnchorRef.current?.closest('form');
      if (form) {
        scrollToFirstModalError(form, modalBodySelector);
      }
    }, 50);

    return () => window.clearTimeout(timer);
  }, [submitCount, isValidating, isSubmitting, errors, modalBodySelector]);

  return <span ref={formAnchorRef} aria-hidden="true" style={{ display: 'none' }} />;
};

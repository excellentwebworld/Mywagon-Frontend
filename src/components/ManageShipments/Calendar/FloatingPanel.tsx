import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface FloatingPanelProps {
  anchor?: DOMRect | null;
  onClose: () => void;
  width?: number;
  label: string;
  children: React.ReactNode;
  recalc?: unknown;
}

/**
 * Full-viewport modal shell portaled to document.body.
 * Centering is done with flexbox (no transform on the dialog),
 * so nothing inside the calendar can clip or overlap it.
 */
export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  onClose,
  width = 420,
  label,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const dialogWidth = Math.min(width, Math.max(280, window.innerWidth - 32));

  return createPortal(
    <div className={`cal-modal-root${isMobile ? ' cal-modal-root--sheet' : ''}`} role="presentation">
      <button type="button" className="cal-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={label}
        tabIndex={-1}
        className={`cal-modal-dialog${isMobile ? ' cal-modal-dialog--sheet' : ''}`}
        style={isMobile ? undefined : { width: dialogWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <span id={titleId} className="cal-sr-only">
          {label}
        </span>
        {children}
      </div>
    </div>,
    document.body
  );
};

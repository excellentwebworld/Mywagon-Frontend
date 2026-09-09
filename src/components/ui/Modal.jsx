/**
 * Modal — Overlay dialog with backdrop, close on outside click.
 * Used by: ConfirmDialog, form modals, detail views
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function Modal({ open, onClose, title, children, size = 'md', className = '' }) {
  const { T } = useTheme();
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-full mx-4' };

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 10050 }}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className={`relative w-full ${sizes[size]} rounded-2xl shadow-2xl overflow-hidden ${className}`}
        style={{ background: T.sf, border: `1px solid ${T.bd}` }}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <h2 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg cursor-pointer border-none"
              style={{ background: 'transparent', color: T.t3 }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

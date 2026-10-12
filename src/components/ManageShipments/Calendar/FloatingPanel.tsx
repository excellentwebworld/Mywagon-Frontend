import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cls } from './calendarUtils';

interface FloatingPanelProps {
  anchor: DOMRect | null;
  onClose: () => void;
  width?: number;
  label: string;
  children: React.ReactNode;
  recalc?: unknown;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  anchor,
  onClose,
  width = 392,
  label,
  children,
  recalc,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const mobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useLayoutEffect(() => {
    if (mobile || !ref.current) return;
    const el = ref.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const m = 12;
    let left: number;
    let top: number;
    if (anchor) {
      left = anchor.right + 8;
      if (left + w > vw - m) left = anchor.left - w - 8;
      if (left < m) left = Math.min(Math.max(m, anchor.left), vw - w - m);
      top = anchor.top - 6;
      if (top + h > vh - m) top = Math.max(m, vh - h - m);
      if (top < m) top = m;
    } else {
      left = Math.max(m, (vw - w) / 2);
      top = Math.max(m, (vh - h) / 2);
    }
    setPos({ left, top });
  }, [anchor, mobile, recalc]);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onScroll = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <div className={cls('cal-scrim', mobile && 'cal-scrim--dim')} onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        className={cls('cal-floating', mobile && 'cal-floating--sheet')}
        style={
          mobile
            ? undefined
            : {
                width,
                left: pos ? pos.left : -9999,
                top: pos ? pos.top : 0,
                visibility: pos ? 'visible' : 'hidden',
              }
        }
      >
        {children}
      </div>
    </>
  );
};

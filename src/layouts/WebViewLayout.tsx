import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function resetScroll(root?: HTMLElement | null) {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (root) {
    root.scrollTop = 0;
  }

  document
    .querySelectorAll<HTMLElement>(
      '.webview-subscription-shell, .webview-subscription-main, .billing-container, .subscription-page',
    )
    .forEach((el) => {
      el.scrollTop = 0;
    });
}

export const WebViewLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resetScroll(shellRef.current);
    const timers = [0, 50, 150, 400].map((ms) =>
      window.setTimeout(() => resetScroll(shellRef.current), ms),
    );
    const raf = requestAnimationFrame(() => resetScroll(shellRef.current));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(raf);
    };
  }, [location.pathname]);

  return (
    <div ref={shellRef} className="webview-subscription-shell">
      <main className="webview-subscription-main">{children}</main>
    </div>
  );
};

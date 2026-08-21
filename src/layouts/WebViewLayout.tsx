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
      '.webview-subscription-shell, .webview-subscription-main, .billing-page, .subscription-page',
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
    const timer = window.setTimeout(() => resetScroll(shellRef.current), 0);
    const raf = requestAnimationFrame(() => resetScroll(shellRef.current));

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [location.pathname, location.search]);

  return (
    <div ref={shellRef} className="webview-subscription-shell">
      <main className="webview-subscription-main">{children}</main>
    </div>
  );
};

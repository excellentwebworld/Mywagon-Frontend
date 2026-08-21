import React, { useLayoutEffect, useRef } from 'react';
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

  useLayoutEffect(() => {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {
      /* ignore */
    }

    const run = () => resetScroll(shellRef.current);
    run();

    const timers = [0, 50, 150, 400, 800].map((ms) => window.setTimeout(run, ms));
    const onPageShow = () => run();
    const onPopState = () => run();

    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPopState);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPopState);
    };
  }, [location.pathname]);

  return (
    <div ref={shellRef} className="webview-subscription-shell">
      <main className="webview-subscription-main">{children}</main>
    </div>
  );
};

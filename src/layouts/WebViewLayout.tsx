import React from 'react';

export const WebViewLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="webview-subscription-shell">
    <main className="webview-subscription-main">{children}</main>
  </div>
);

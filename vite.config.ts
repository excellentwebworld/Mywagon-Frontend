import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const chatGatewayOrigin = (() => {
    try {
      return new URL(env.VITE_CHAT_GATEWAY_URL || 'http://localhost:8787/chat').origin;
    } catch {
      return 'http://localhost:8787';
    }
  })();

  // Chat gateway proxy entry. Two things differ from a plain prefix entry,
  // because gateway paths overlap this app's own routes:
  //  - keys are anchored regexes, since Vite matches plain keys by prefix and
  //    '/me' would otherwise swallow the /messages page;
  //  - a browser navigation (Accept: text/html) is handed back to the SPA, so
  //    refreshing /chat (a redirect route) still renders the app. Only
  //    fetch/XHR calls reach the gateway.
  const chatGateway = {
    target: chatGatewayOrigin,
    changeOrigin: true,
    bypass: (req: { url?: string; headers: { accept?: string } }) =>
      req.headers.accept?.includes('text/html') ? req.url : undefined,
  };

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_LARAVEL_URL ?? 'http://localhost:8000',
          changeOrigin: true,
        },
        '/sanctum': {
          target: env.VITE_LARAVEL_URL ?? 'http://localhost:8000',
          changeOrigin: true,
        },
        // Proxied server-side so the browser only ever talks same-origin —
        // sidesteps the chat gateway's CORS_ORIGIN allowlist entirely in dev.
        //
        // Every gateway path the Vagon AI module calls must be listed here.
        // Forgetting one does not look like a routing problem: an unproxied
        // path falls through to the SPA's index.html with a 200, so
        // `gatewayFetch` sees a healthy response and reports "returned text/html".
        '^/chat([/?]|$)': chatGateway,
        '^/me([?]|$)': chatGateway,
        '^/conversations([/?]|$)': chatGateway,
        // Scheduled bulk posting.
        '^/scheduled-posts([/?]|$)': chatGateway,
        // MS3-339 learning events (+ MS3-344 run undo, AI drafts, batch jobs).
        '^/vagon-ai([/?]|$)': chatGateway,
      },
    },
    build: {
      outDir: env.VITE_OUT_DIR || 'dist',
      emptyOutDir: true,
    },
  };
});

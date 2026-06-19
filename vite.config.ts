import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';
  const outDir = env.VITE_OUT_DIR
    ? path.resolve(process.cwd(), env.VITE_OUT_DIR)
    : 'dist';

  return {
    base,
    plugins: [react()],
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
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
    },
  };
});

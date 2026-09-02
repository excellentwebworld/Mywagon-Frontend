import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

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
      },
    },
    build: {
      outDir: env.VITE_OUT_DIR || 'dist',
      emptyOutDir: true,
    },
  };
});

/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { apiDevPlugin } from './server/devPlugin.js';

export default defineConfig(({ mode }) => {
  // Make server-only secrets from .env.local visible to the local /api bridge.
  // They are never exposed to client code (no VITE_ prefix).
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of [
    'SITE_PASSPHRASE_HASH',
    'SESSION_SECRET',
    'PRIVATE_STORAGE',
    'PRIVATE_DIR',
    'COOKIE_SECURE',
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
    build: { sourcemap: false, target: 'es2022', assetsInlineLimit: 2048 },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/unit/setup.ts'],
      include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/server/**/*.test.ts'],
    },
  };
});

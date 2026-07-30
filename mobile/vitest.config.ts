import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Vitest config for the mobile client — pure client-rule and design-system
 * tests only (cart math, streak display, theme contrast, touch-target sizes).
 * Uses fast-check for property tests (min 100 iterations).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

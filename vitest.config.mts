import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Only pure logic is covered — no jsdom, no React rendering. What is worth testing here are the
// rules that decide something (segment assembly, catalog membership, error classification, what a
// route accepts as input); the parts that stream, render or talk to Supabase are verified by
// running the app, not by mocking a model.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'app/api/**/*.test.ts'],
    environment: 'node',
  },
});

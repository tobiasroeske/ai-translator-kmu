import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Pure logic runs under Node — no jsdom, no DOM — which is what most of this suite is: rules that
// decide something (segment assembly, catalog membership, error classification, what a route
// accepts as input, prompt construction). Streaming and Supabase access are still verified by
// running the app, not by mocking a model or a database.
//
// A `.test.tsx` file opts into jsdom via a `// @vitest-environment jsdom` docblock at its top
// instead of switching the whole suite — component tests are the exception, not the default, and
// stay opt-in per file.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'app/api/**/*.test.ts', 'components/**/*.test.tsx'],
    environment: 'node',
  },
});

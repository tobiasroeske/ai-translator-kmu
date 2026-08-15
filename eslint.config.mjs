import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // ─── Imports ────────────────────────────────────────────────────────────
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '../*'],
              message: "Use '@/' path alias instead of relative imports.",
            },
          ],
        },
      ],

      // ─── TypeScript ─────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-inferrable-types': 'error',

      // ─── React ──────────────────────────────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/self-closing-comp': 'error',
      'react/no-array-index-key': 'warn',
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
      'react/no-unstable-nested-components': 'error',
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],

      // ─── General ────────────────────────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
    },
  },
  // The setup scripts are plain Node, run directly rather than through the bundler:
  // their output IS their interface, and the `@/*` alias does not exist for them.
  {
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
      'no-restricted-imports': 'off',
    },
  },
  // shadcn/ui components are vendored/generated via the CLI — not hand-maintained,
  // so they intentionally don't follow this repo's lint rules.
  // supabase/.temp holds bundled runtime code the CLI writes on `supabase start`.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'components/ui/**',
    'supabase/.temp/**',
  ]),
]);

export default eslintConfig;

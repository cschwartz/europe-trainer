import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'reference/**',
      'test-results/**',
      'playwright-report/**',
      'public/**',
      'src/data/europe.topo.json',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Only the classic hook-correctness rules: the rest of the plugin's
    // "recommended" preset targets the React Compiler's stricter subset
    // (purity/immutability/refs), which doesn't apply to plain Preact.
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'scripts/**/*.mjs', '*.config.ts', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
);

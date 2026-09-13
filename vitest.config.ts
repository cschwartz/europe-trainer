import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts: that config's viteSingleFile() plugin is a
// build-only concern with no business running during tests.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          setupFiles: ['tests/component/setup.ts'],
          include: ['tests/component/**/*.test.tsx'],
        },
      },
    ],
  },
});

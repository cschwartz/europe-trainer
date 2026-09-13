import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts: that config's viteSingleFile() plugin is a
// build-only concern with no business running during tests.
// JSX runtime/import source come from tsconfig.json (jsx: "react-jsx",
// jsxImportSource: "preact"), which Vitest's oxc transform reads automatically.
export default defineConfig({
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

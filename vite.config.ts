import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds one self-contained dist/index.html: all JS, CSS and the embedded map
// geometry are inlined, so the file runs offline from disk with no requests.
// JSX runtime/import source come from tsconfig.json (jsx: "react-jsx",
// jsxImportSource: "preact"), which Vite's oxc transform reads automatically.
export default defineConfig({
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    cssCodeSplit: false,
  },
});

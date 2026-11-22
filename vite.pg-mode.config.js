// The PostgreSQL-mode engine bundle (2026-11-22 spike): src/pg-mode/entry.js
// → public/pg-mode.js, an IIFE the app injects only when a person picks
// PostgreSQL. Kept out of app.js on purpose (tests/postgres-mode.test.js).
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src',
  publicDir: false,
  logLevel: 'warn',
  build: {
    outDir: path.resolve(__dirname, 'public'),
    emptyOutDir: false,
    sourcemap: false,
    minify: 'terser',
    lib: {
      entry: path.resolve(__dirname, 'src/pg-mode/entry.js'),
      formats: ['iife'],
      name: 'SQLQuestPgBundle',
      fileName: () => 'pg-mode.js',
    },
  },
});

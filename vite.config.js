// Vite config for SQL Quest.
//
// Replaces the Babel CLI pipeline (`--source-type script` + printf append).
// Key goals:
//   - Produce public/app.js from src/app.jsx, preserving the URL shape
//     app.html expects (`<script src="/app.js">`)
//   - React + ReactDOM stay external; app.html already loads the UMD
//     builds from unpkg and duplicating them would cost ~120KB gzipped
//   - `window.SQLQuest` stays set so the existing tryRender() loop in
//     app.html keeps working
//
// Dev mode (`npm run dev:vite`): serves src/app.html at :5173 with HMR
// against src/. data.js is synthesized on the fly from src/data/*.js.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data files that are concatenated into public/data.js by bundle-data.js
// in production. In dev, we serve the same concatenation on the fly so
// app.jsx can read window.coachGoals etc. with no code change.
const dataFiles = [
  'feature-flags.js', 'config.js', 'datasets.js', 'challenges.js',
  'exercises.js', 'lessons.js', 'daily-challenges-new.js',
  'mock-interviews.js', 'thirty-day-challenge.js', 'curriculum.js',
  'thirty-day-complete-1.js', 'thirty-day-complete-2.js',
  'skill-tracks.js', 'goals.js',
];

function inlineDataBundle() {
  return {
    name: 'sqlquest-data-bundle',
    configureServer(server) {
      server.middlewares.use('/data.js', (_req, res) => {
        const bits = dataFiles.map(fn => {
          const p = path.resolve(__dirname, 'src/data', fn);
          if (!fs.existsSync(p)) return '';
          return `\n// === ${fn} ===\n` + fs.readFileSync(p, 'utf8') + '\n';
        });
        res.setHeader('Content-Type', 'application/javascript');
        res.end('// SQL Quest data bundle (dev)\n' + bits.join(''));
      });
    },
  };
}

// Rewrite `<script src="/app.js">` → `<script type="module" src="/app.jsx">`
// at dev-server time so Vite can transform JSX on the fly. Production
// build uses the same trick at build-end (see closeBundle hook below).
function swapAppScript() {
  return {
    name: 'sqlquest-swap-app-script',
    configureServer(server) {
      server.middlewares.use('/app.html', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const htmlPath = path.resolve(__dirname, 'src/app.html');
        if (!fs.existsSync(htmlPath)) return next();
        let html = fs.readFileSync(htmlPath, 'utf8');
        html = html.replace(
          /<script src="\/app\.js(\?[^"]*)?"><\/script>/,
          '<script type="module" src="/app.jsx"></script>'
        );
        server.transformIndexHtml(req.originalUrl, html)
          .then(out => { res.setHeader('Content-Type', 'text/html'); res.end(out); })
          .catch(next);
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  // Shim Node-isms that sneak in via react-refresh / JSX runtime. Without
  // this, the production bundle throws `process is not defined` the moment
  // it touches NODE_ENV.
  define: {
    'process.env.NODE_ENV': JSON.stringify(command === 'build' ? 'production' : 'development'),
    'process.env': '{}',
    'global': 'globalThis',
  },
  root: 'src',
  // During build, outDir === public/, so turn off the publicDir copy
  // step (Vite would otherwise warn about the overlap and might try to
  // copy public/ into itself). Dev mode still needs it so favicons,
  // OG images, and static landing pages load via the dev server.
  publicDir: command === 'serve' ? path.resolve(__dirname, 'public') : false,

  plugins: [
    // Classic JSX runtime: emits `React.createElement(...)` calls directly.
    // Keeps the UMD React build working (the automatic runtime imports
    // from `react/jsx-runtime` which the UMD bundle doesn't expose).
    react({ jsxRuntime: 'classic' }),
    inlineDataBundle(),
    swapAppScript(),
  ],

  server: {
    port: 5173,
    open: '/app.html',
  },

  build: {
    outDir: path.resolve(__dirname, 'public'),
    emptyOutDir: false,
    sourcemap: true,
    minify: 'terser',
    // IIFE format: the whole bundle is wrapped in a single
    // `(function(React) { ... })(window.React)` closure. Our
    // `window.SQLQuest = SQLQuest` line at the bottom of app.jsx runs
    // inside the IIFE and publishes the component to global scope,
    // which is what app.html's tryRender() loop waits for. React stays
    // external — the globals map below tells Rollup to treat the
    // import like a function parameter sourced from window.React.
    lib: {
      entry: path.resolve(__dirname, 'src/app.jsx'),
      formats: ['iife'],
      name: 'SQLQuestBundle',
      fileName: () => 'app.js',
    },
    rollupOptions: {
      // Match every react / react-dom import variant as external — the
      // jsx-runtime subpath (`react/jsx-runtime`) is what plugin-react's
      // automatic runtime emits. Without mapping it to a global, Rollup
      // falls back to `require("react/jsx-runtime")` which the browser
      // can't resolve.
      external: (id) =>
        id === 'react' ||
        id === 'react-dom' ||
        id.startsWith('react/') ||
        id.startsWith('react-dom/'),
      output: {
        globals: (id) => {
          if (id === 'react' || id.startsWith('react/')) return 'React';
          if (id === 'react-dom' || id.startsWith('react-dom/')) return 'ReactDOM';
          return undefined;
        },
      },
    },
  },

  test: {
    globals: true,
    environment: 'node',
    // Override Vite's `root: 'src'` for tests — they live at project root
    // under tests/ and import from src/utils/.
    root: __dirname,
    include: ['tests/**/*.test.js'],
  },
}));

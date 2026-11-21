import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['src/utils/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Image: 'readonly',
        setTimeout: 'readonly',
        btoa: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        Uint8Array: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-constant-condition': 'warn',
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'eqeqeq': ['warn', 'smart'],
    },
  },
  // src/app.jsx (2026-11-22): 41,000 lines, never linted until now. A loose
  // block — only rules that mean a crash or a broken render, all errors:
  // an undeclared name is a ReferenceError at runtime (the first run found
  // two live ones: a referral check on every session load since 09-08 and
  // the guest AI-limit message), and rules-of-hooks is fragile area #1 in
  // CLAUDE.md (hooks below `if (showAuth)` / `if (!dbReady) return`).
  // Style rules stay off on purpose; tighten one at a time.
  {
    files: ['src/app.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        // Set by the classic scripts app.html loads before the bundle.
        React: 'readonly',
        ReactDOM: 'readonly',
        FF: 'readonly',
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // js.configs.recommended applies to every file; switch it off here and
      // name the few rules this file is held to.
      ...Object.fromEntries(Object.keys(js.configs.recommended.rules).map(r => [r, 'off'])),
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-const-assign': 'error',
      'no-dupe-else-if': 'error',
      'no-self-assign': 'error',
    },
  },
  {
    ignores: ['dist/', 'public/app.js', 'public/data.js', 'node_modules/'],
  },
];

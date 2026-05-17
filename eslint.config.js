import js from '@eslint/js';

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
  {
    ignores: ['dist/', 'public/app.js', 'public/data.js', 'node_modules/'],
  },
];

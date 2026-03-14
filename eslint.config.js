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
        console: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        Uint8Array: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-constant-condition': 'warn',
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'eqeqeq': ['warn', 'smart'],
    },
  },
  {
    ignores: ['dist/', 'public/app.js', 'public/data.js', 'node_modules/'],
  },
];

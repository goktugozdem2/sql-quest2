/** @type {import('tailwindcss').Config} */
// Design tokens mirror DESIGN.md. Do not add colors here without updating DESIGN.md.
module.exports = {
  content: ['./src/**/*.{html,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'sql-keyword': 'var(--sql-keyword)',
        'sql-string': 'var(--sql-string)',
        'sql-number': 'var(--sql-number)',
        'sql-comment': 'var(--sql-comment)',
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
        info: 'var(--info)',
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        num: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '10px',
      },
      transitionDuration: {
        micro: '80ms',
        short: '150ms',
        medium: '250ms',
        long: '400ms',
      },
    },
  },
  plugins: [],
};

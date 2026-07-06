/** @type {import('tailwindcss').Config} */
// Font families + accent token wired to DESIGN.md. The app previously inherited
// Tailwind's stock `ui-sans-serif` / `ui-monospace` stacks and `yellow-400`
// (#FACC15) because the theme was empty — none of the brand type system was
// applied. Overriding `sans`/`mono` here cascades to every element via preflight
// (`@tailwind base` sets `html { font-family: theme(fontFamily.sans) }`), so the
// whole app picks up Geist + JetBrains Mono with zero JSX changes. Fonts load via
// the @import at the top of src/input.css (shared styles.css, covers every entry).
module.exports = {
  content: ['./src/**/*.{html,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Body / UI — DESIGN.md primary (was Tailwind default ui-sans-serif)
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Query / code — "the query is the hero" (was ui-monospace)
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // Display / hero — Fraunces variable serif (use via `font-display`)
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        // Score / timer / XP numerals — tabular (use via `font-num`)
        num: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Remap the primary accent shade to the brand token. The app uses
        // `yellow-400` (193×) as its CTA/accent; DESIGN.md accent is #FFE34D
        // (warmer than Tailwind's default #FACC15). Nested merge keeps every
        // other yellow shade intact.
        yellow: {
          400: '#FFE34D',
        },
        // Named brand tokens for future use (dark palette, DESIGN.md §Color)
        accent: '#FFE34D',
        'accent-ink': '#0E0F13',
      },
    },
  },
  plugins: [],
};

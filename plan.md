# SQL Quest Build Improvements Plan

## Current State
- **No automated tests** — zero test files or test framework
- **No linter** — no ESLint or code quality tooling
- **Basic build pipeline** — Babel CLI for JSX, Tailwind CLI for CSS, custom Node script for data bundling
- **No source maps** — difficult to debug compiled output
- **No watch/dev mode** — must manually rebuild after every change
- **Monolithic 21,683-line app.jsx** — all components in one file

## Planned Improvements (in priority order)

### 1. Add Test Framework (Vitest) + Initial Unit Tests
- Install Vitest (faster than Jest, zero-config for modern JS)
- Write tests for pure utility functions extracted from app.jsx:
  - `formatCell()` — number formatting logic
  - `highlightSQL()` — SQL syntax highlighting
  - XP calculation logic
  - Challenge validation helpers
- Add `npm test` script to package.json
- **Why:** Foundation for preventing regressions in a 21K-line app

### 2. Add ESLint for Code Quality
- Install ESLint with React plugin
- Configure reasonable defaults (no overly strict rules)
- Add `npm run lint` script
- Fix any critical linting errors found
- **Why:** Catches bugs, enforces consistency across a large codebase

### 3. Improve Build Pipeline
- Add source map generation to Babel build for debugging
- Add concurrent build script (parallelize CSS + JSX + data builds)
- Add a `dev` watch mode that auto-rebuilds on file changes
- Add `npm run build:check` that runs lint + tests before building
- **Why:** Faster iteration, easier debugging, CI-ready

### 4. Extract Utility Functions into Separate Modules
- Move pure helper functions (formatCell, highlightSQL, sound helpers) into `src/utils/`
- Update build to handle multi-file input
- Keep app.jsx as the main component file but with cleaner imports
- **Why:** Makes code testable, reusable, and easier to maintain

### 5. Add Build Validation
- Add a post-build size check (warn if app.js exceeds threshold)
- Verify all data files are included in the bundle
- Add basic smoke test that the built files are valid JS
- **Why:** Catches build issues before deployment

# SQL Quest Architecture

SQL Quest is a static-first React application. The core product runs in the browser from files in `public/`, while optional backend capabilities live in Vercel and Supabase functions.

## System Overview

```text
Browser
  |
  | loads public/app.html
  v
React app from public/app.js
  |
  | reads bundled lesson/challenge/dataset globals
  v
public/data.js
  |
  | optional network calls
  v
Vercel API routes and Supabase Edge Functions
```

The default learning experience does not require a backend. Guest users can start the onboarding quiz, choose a dataset, and complete foundations lessons with local browser state.

## Runtime Layers

### Static Shell

- `src/app.html` is the source app shell.
- `public/app.html` is the deployable app shell.
- React and ReactDOM are loaded as browser globals.
- `vite.config.js` builds `src/app.jsx` into an IIFE bundle at `public/app.js`.

### Frontend App

- `src/app.jsx` contains the main application state, onboarding, roadmap, challenge UI, profile UI, and SQL practice flows.
- `src/components/` contains reusable React components such as the public profile and skill radar.
- `src/utils/` contains tested domain helpers for diagnostics, scoring, formatting, i18n, publishing, weekly reports, and referrals.

### Data Bundle

- Source data lives in `src/data/`.
- `scripts/data-files.js` defines bundle order.
- `scripts/bundle-data.js` concatenates and minifies the data into `public/data.js`.
- The browser app reads this data from global variables, which keeps the static deploy simple.

### SQL Execution

SQL practice is browser-first. The app loads datasets and validates learner SQL locally for the lesson and challenge flows. The current foundations path uses sector-specific sample tables such as HR `employees`, ecommerce `orders`, banking `institutions`, real estate `properties`, and manufacturing `products`.

### Local Persistence

The app uses `localStorage` for guest progress and offline-friendly state:

- first-run onboarding placement
- active foundations lesson
- lesson exercise progress
- solved challenge state
- skill tracking snapshots
- user preferences and selected dataset

Registered-user flows can sync selected state through Supabase where configured.

## Backend Integrations

Backend features are optional and should fail gracefully in local static mode.

### Vercel

- `api/chat.js` provides an API route for chat-style proxying.
- `vercel.json` configures the production static build, clean URLs, rewrites, and cache headers.

### Supabase Edge Functions

`supabase/functions/` contains functions for:

- AI tutor
- email capture and weekly digest
- referrals and referral rewards
- public profile publishing
- skill decay and reminders
- Stripe webhook handling

Local development does not require these functions unless you are working on those integrations.

## Build Pipeline

`npm run build` performs the full static build:

```text
src/input.css
  -> public/styles.css

src/app.jsx
  -> public/app.js
  -> public/app.js.map

src/data/*.js
  -> public/data.js

src/*.html and src/blog/*.html
  -> public/*.html and public/*/index.html

scripts/build-weekly.js
  -> public/weekly pages

scripts/cachebust.js
  -> cache-busted static references
```

Build validation is handled by `scripts/validate-build.js`.

## Deployment

### Vercel Production

Production is configured by `vercel.json`:

- Build command: `npm run build`
- Output directory: `public`
- Canonical domain: `https://sqlquest.app`
- Rewrite `/u/*` to `app.html` for profile routes

### GitHub Pages

GitHub Pages is intentionally not part of the default CI pipeline. Pages requires the repository owner to enable the Pages site in repository settings before Actions can deploy to it; otherwise `actions/configure-pages` fails with a repository access error. Use Vercel for production deploys unless Pages is explicitly enabled.

## Testing Strategy

The repo uses three levels of checks:

- `npm run lint` checks utility and test files.
- `npm test -- --run` runs Vitest unit coverage.
- `npm run smoke -- http://127.0.0.1:4321` drives a real browser against the static app and covers onboarding, foundations lessons, roadmap continuity, dataset switching, and legacy guest behavior.

Use `npm run build:check` before pushing source changes that affect the app.

## Change Guidelines

- Keep user-facing flow changes small and verify them with smoke tests.
- Commit generated `public/` artifacts when source changes affect the deployed app.
- Avoid committing weekly archive churn caused only by the current date unless that weekly content is the intended change.
- Backend integrations should remain optional for the core learning flow.

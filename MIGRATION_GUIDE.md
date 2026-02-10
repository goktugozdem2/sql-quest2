# SQL Quest — Vite Build Migration Guide

## What Changed & Why

### The Problem
Your app loaded **everything in the browser at runtime**:
- **Babel Standalone (~3MB)** downloaded and compiled 18,000 lines of JSX on every page load
- **12 separate script files** loaded one-by-one (network waterfall)
- **Tailwind CDN** ran a CSS compiler in the browser
- **Lucide UMD** shipped every icon, even unused ones

### The Fix
A Vite build step that **pre-compiles everything** at deploy time:

| Metric | Before (CDN/Browser) | After (Vite Build) | Improvement |
|--------|---------------------|--------------------|----|
| JS to download | ~1.5MB+ gzipped | ~294KB gzipped | **~80% smaller** |
| Babel compilation | 3-10 seconds | **0 seconds** | **Eliminated** |
| HTTP requests | 15+ blocking scripts | 7 parallel chunks | **~50% fewer** |
| CSS | Runtime compiler | Pre-built static | **Instant** |
| Icons | 379KB (all icons) | 20KB (44 used) | **95% smaller** |
| Caching | No versioning | Content-hashed filenames | **Immutable caching** |

**Estimated load time improvement: 5-10x faster on typical connections.**

---

## Project Structure

```
sql-quest/
├── index.html              # Slim HTML (no CDN scripts)
├── package.json            # Dependencies & scripts
├── vite.config.js          # Build configuration
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── vercel.json             # Vercel deployment config
├── .gitignore
├── src/
│   ├── main.jsx            # Entry point (imports everything, renders app)
│   ├── setup.js            # Bridge: sets up window globals for supabase, icons
│   ├── index.css           # Tailwind directives + custom styles
│   ├── app.jsx             # Main app (minimal changes: added import/export)
│   └── data/               # All data files (unchanged)
│       ├── config.js
│       ├── datasets.js
│       ├── challenges.js
│       ├── exercises.js
│       ├── lessons.js
│       ├── daily-challenges.js
│       ├── mock-interviews.js
│       ├── thirty-day-challenge.js
│       ├── curriculum.js
│       ├── thirty-day-complete-1.js
│       └── thirty-day-complete-2.js
├── stripe-webhook.ts       # Unchanged
├── stripe-setup.sql        # Unchanged
└── STRIPE_WEBHOOK_SETUP.md # Unchanged
```

---

## Changes to Existing Code

Only **2 lines** were added to `app.jsx`:
1. **Line 1**: `import React from 'react';` (top of file)
2. **Last line**: `export default SQLQuest;` (bottom of file)

Everything else is unchanged. The data files, stripe files, and all app logic remain identical.

---

## How to Deploy

### Option A: Deploy to Vercel (recommended)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Migrate to Vite build"
git remote add origin https://github.com/YOUR_USERNAME/sql-quest.git
git push -u origin main

# 2. Go to vercel.com → Import Project → Select your repo
# Vercel auto-detects Vite and configures everything
```

### Option B: Manual Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview locally
npm run preview

# Deploy the dist/ folder to any static host
```

---

## Local Development

```bash
# Start dev server with hot reload
npm run dev

# Opens at http://localhost:5173
# Changes to app.jsx or data files update instantly
```

---

## How the Build Works

1. **`src/main.jsx`** is the entry point
2. It imports `setup.js` which sets up `window.supabase` and `window.LucideIcons` from npm packages
3. It imports all data files (they still set `window.*` globals — no changes needed)
4. It imports and renders `app.jsx`
5. Vite compiles all JSX, bundles everything, tree-shakes unused code, and outputs optimized chunks

### Chunk Strategy
- **vendor** (React, Supabase) — changes rarely, cached long-term
- **icons** (44 Lucide icons) — changes rarely
- **data-core** (config, datasets, exercises, lessons) — your core data
- **data-challenges** (challenges, daily, interviews) — challenge content
- **data-curriculum** (curriculum, 30-day) — curriculum content
- **index** (app.jsx compiled) — your main app code

---

## Notes

- **sql.js WASM** is still loaded from CDN at runtime (WASM files are tricky to bundle and this is fine since it loads in the background)
- **Supabase credentials** are still in `config.js` — same as before
- All `window.*` globals still work — the bridge pattern ensures backward compatibility
- If you add new icons, add them to the import list in `src/setup.js`

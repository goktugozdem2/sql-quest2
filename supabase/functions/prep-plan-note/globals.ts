// The app's data modules (src/data/*.js) are browser scripts: each one
// assigns `window.challengesData = [...]` and the like, and
// sector-challenges.js appends to `window.challengesData` on load. Deno has
// no `window`, so this module gives it one BEFORE those files evaluate.
//
// Order is what makes this work: ES module evaluation is depth-first in
// import order, so `import './globals.ts'` listed ahead of the data imports in
// plan.ts is guaranteed to run first. Keep it first. Do not move the
// assignment into plan.ts's own body — static imports are hoisted and would
// evaluate before it.
;(globalThis as any).window = (globalThis as any).window || globalThis
export {}

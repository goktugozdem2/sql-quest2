// PostgreSQL mode — who sees the engine switch (2026-11-25).
// Plan: docs/plans/postgres-mode-flip-2026-11-25.md.
//
// The switch is opt-in: SQLite stays the default for everyone, and nothing
// of PGlite loads until a person picks PostgreSQL. It is shown only where a
// PostgreSQL instance fits:
//   - 768 px wide or more. Phones wait for a real-device memory read on iOS
//     Safari and a mid-range Android (the spike measured Chromium only, and
//     iOS Safari kills a tab around 1–1.5 GB). Phones are also the
//     open → first run cell that `companyDirectOpen` + `mobileRunBar` already
//     fill (orchestrator decision 2026-11-24), so the switch stays out of it.
//   - `navigator.deviceMemory` 4 GB or more, when the browser reports it
//     (Chromium does; Safari and Firefox do not, and then width decides).
//   - a fine pointer (mouse or trackpad). A touch-first device — an iPad, an
//     Android tablet — is 768 px wide or more but has a phone's tab memory
//     limits, and Safari reports no deviceMemory; it waits for the same
//     real-device read as phones. A Simulator does not model those limits.
//
// This file is NOT the engine: app.jsx may import it (it carries no PGlite
// and no translator; tests/postgres-mode.test.js pins both).

export const PG_MODE_MIN_WIDTH = 768;
export const PG_MODE_MIN_DEVICE_MEMORY_GB = 4;

export function pgModeFits({ width, deviceMemory, coarsePointer } = {}) {
  if (!Number.isFinite(width) || width < PG_MODE_MIN_WIDTH) return false;
  if (coarsePointer === true) return false;
  if (Number.isFinite(deviceMemory) && deviceMemory < PG_MODE_MIN_DEVICE_MEMORY_GB) return false;
  return true;
}

// The events `postgres_mode_use` reads (docs/agent/metrics.md). None of them
// starts with `challenge_`: a PostgreSQL verdict is never a solve.
export const PG_MODE_EVENTS = Object.freeze({
  shown: 'postgres_mode_toggle_shown', // once per page load, the first challenge the switch is on
  picked: 'postgres_mode_picked',      // the person moved the switch to PostgreSQL
  ready: 'postgres_mode_ready',        // { challengeId, loadMs, cold }
  unavailable: 'postgres_mode_unavailable', // the challenge is off the allow-list
  failed: 'postgres_mode_failed',      // { challengeId, error } — the engine or PGlite did not load
  submitted: 'postgres_mode_submitted', // { challengeId, verdict: correct | wrong | error }
  left: 'postgres_mode_left',          // back to SQLite
});

// A failure reason short enough for an event row, with no query text in it.
export function pgFailReason(message) {
  const m = String(message || '').replace(/\s+/g, ' ').trim();
  if (/integrity|digest|SRI/i.test(m)) return 'integrity';
  if (/HTTP \d{3}/.test(m)) return (m.match(/HTTP \d{3}/) || ['http'])[0];
  if (/engine (missing|did not load)/.test(m)) return 'engine_script';
  if (/memory|allocation|RangeError/i.test(m)) return 'memory';
  if (/fetch|network|Failed to fetch|Load failed/i.test(m)) return 'network';
  return 'other';
}

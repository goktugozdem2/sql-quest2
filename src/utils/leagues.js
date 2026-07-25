// Leagues — engagement-matched leaderboard divisions.
//
// WHY
// ---
// The leaderboard was a global top-20 (`leaderboard.slice(0, 20)`), seeded with
// 49 fabricated users. Measured 2026-07-26 on the 134 real users who have any
// XP: median 428, max 25,757. A global top-20 against that spread means roughly
// 19 in 20 real users can NEVER appear on the board they are being shown. It is
// demotivating by construction.
//
// The one change with the best public evidence behind it is Duolingo's move
// from a global/friend board to leagues that match people by engagement level:
// overall learning time +17%, and the number of highly engaged learners
// tripled. The mechanic is not "a leaderboard" — we had one. It is "a board you
// can actually place on".
//
// SCOPE OF THIS VERSION
// Tiers are computed from LIFETIME xp, because that is what we store. Duolingo's
// leagues run on a WEEKLY xp cycle with promotion and relegation, which is what
// makes the board move. That needs an xp-over-time record we do not keep yet —
// see the note in tests/leagues.test.js. Without the weekly reset this delivers
// the placement half of the mechanic, not the churn half.
//
// Boundaries are set from the real distribution, not invented:
//   min 10 · p20 158 · p40 380 · p60 628 · p80 1341 · p95 2924 · max 25757

export const LEAGUE_TIERS = [
  { id: 'row',       name: 'Row',       min: 0,     icon: '▪️', blurb: 'One row at a time. Everyone starts here.' },
  { id: 'table',     name: 'Table',     min: 150,   icon: '▦',  blurb: 'The shapes are starting to hold.' },
  { id: 'schema',    name: 'Schema',    min: 400,   icon: '◈',  blurb: 'You see how the pieces relate.' },
  { id: 'database',  name: 'Database',  min: 900,   icon: '⬢',  blurb: 'Real queries, real depth.' },
  { id: 'warehouse', name: 'Warehouse', min: 2000,  icon: '◆',  blurb: 'You work at scale now.' },
  { id: 'lakehouse', name: 'Lakehouse', min: 5000,  icon: '✦',  blurb: 'The top of the ladder.' },
];

export const DIVISION_SIZE = 15;

// Internal and throwaway accounts. `test2` sits at 25,757 XP — top of the whole
// board — and `sqlquest`, `test44`, `fabletest*` and friends are scattered
// through every tier. CLAUDE.md already flags that these pollute email
// campaigns; a leaderboard is worse, because a real user opens it and sees a
// stranger they can never catch who is not a person.
//
// Broader than the copy in supabase/functions/lapsed-pro, which only matches
// /^(test|demo|admin|qa)\d*$/ and so misses fabletestdb, fabletestfree,
// fabletestux, linktest348013 and internalroutine768 — all present in the live
// data on 2026-07-26.
export function isInternalAccount(username) {
  const u = String(username || '').toLowerCase();
  if (!u) return true;
  return (
    /^(test|demo|admin|qa)\d*$/.test(u) ||
    u === 'sqlquest' ||
    u.includes('fabletest') ||
    /^linktest/.test(u) ||
    /^internalroutine/.test(u)
  );
}

/** The tier a given XP total falls in. Never returns null — 0 XP is a Row. */
export function tierForXp(xp) {
  const n = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let out = LEAGUE_TIERS[0];
  for (const t of LEAGUE_TIERS) if (n >= t.min) out = t;
  return out;
}

/** The next tier up, and the XP still needed to reach it. Null at the top. */
export function nextTier(xp) {
  const cur = tierForXp(xp);
  const i = LEAGUE_TIERS.findIndex(t => t.id === cur.id);
  const next = LEAGUE_TIERS[i + 1];
  if (!next) return null;
  return { tier: next, xpToGo: Math.max(0, next.min - Math.max(0, Number(xp) || 0)) };
}

/**
 * Build the division a user actually sees: their tier, ranked, windowed around
 * them so they are never off the bottom of their own board.
 *
 * Returns { tier, rows, myRank, tierSize, next }.
 * `rows` carry `rank` (position within the TIER, not the window) so the numbers
 * stay honest when the window is scrolled to the middle of a big tier.
 */
export function buildDivision(users, currentUsername, size = DIVISION_SIZE) {
  // An internal account viewing its own board still sees itself — we only hide
  // them from everyone else's.
  const keepSelf = String(currentUsername || '').toLowerCase();
  const list = (Array.isArray(users) ? users : [])
    .filter(u => u && typeof u.username === 'string')
    .filter(u => !isInternalAccount(u.username) || u.username.toLowerCase() === keepSelf)
    .map(u => ({ ...u, xp: Math.max(0, Number(u.xp) || 0) }));

  const me = currentUsername
    ? list.find(u => u.username.toLowerCase() === keepSelf)
    : null;

  // Someone with no account yet still gets shown the entry tier rather than a
  // blank board — seeing the ladder is the point.
  const tier = tierForXp(me ? me.xp : 0);

  const inTier = list
    .filter(u => tierForXp(u.xp).id === tier.id)
    // Ties broken by name so the order is stable across reloads. A board that
    // reshuffles on refresh reads as fake.
    .sort((a, b) => b.xp - a.xp || a.username.localeCompare(b.username))
    .map((u, i) => ({ ...u, rank: i + 1 }));

  const myIdx = me ? inTier.findIndex(u => u.username === me.username) : -1;

  let rows;
  if (inTier.length <= size || myIdx < 0) {
    rows = inTier.slice(0, size);
  } else {
    // Centre the window on the user, then clamp so we never run off either end.
    let start = myIdx - Math.floor(size / 2);
    start = Math.max(0, Math.min(start, inTier.length - size));
    rows = inTier.slice(start, start + size);
  }

  return {
    tier,
    rows,
    myRank: myIdx >= 0 ? myIdx + 1 : null,
    tierSize: inTier.length,
    next: nextTier(me ? me.xp : 0),
  };
}

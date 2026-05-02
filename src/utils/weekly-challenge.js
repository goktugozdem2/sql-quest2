// Weekly Challenge — deterministic week-to-challenge selector.
//
// Goal: every visitor in the same ISO week sees the same challenge,
// without needing a server-side rotation cron. The selection rolls
// over automatically every Monday at 00:00 UTC (start of ISO week).
//
// Why deterministic instead of random/cron:
//   - No backend job to maintain.
//   - Same URL (/weekly/) serves both the marketing landing AND the
//     in-app launch link — no /weekly/ redirect endpoint needed.
//   - Past weeks are reproducible: pass a Date from any past Monday
//     and you get the same challenge that was featured then. Useful
//     for archive pages and "missed last week?" prompts.
//
// The selector picks from Easy + Medium difficulty challenges only —
// Hard ones intimidate casual visitors and hurt the viral loop.
// The pool is large enough (~70 challenges) that a single year
// of weekly rotation never repeats.

// ISO 8601 week-of-year. Returns the ISO year + week number for any
// date. ISO weeks start on Monday and the year of the week is the
// year that contains the Thursday of that week — so Jan 1 in some
// years actually belongs to week 52/53 of the previous year.
//
// We need this rather than getDay()/getMonth() arithmetic because
// getDay() returns Sunday=0 (US convention), and we need Monday=0
// (ISO convention) for week boundaries to land where users expect.
export function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // (Sunday becomes 7 in our math so it doesn't go negative)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNum };
}

// Format week as "2026-W19" — the canonical ISO 8601 short form,
// also matches how GitHub Insights, Linear, and most other tools
// display week IDs. Used in URLs, share text, and badge labels.
export function formatWeekLabel(yearWeek) {
  const w = String(yearWeek.week).padStart(2, '0');
  return `${yearWeek.year}-W${w}`;
}

// Filter the full challenges array down to the eligible pool.
// Excludes:
//   - Hard (alienates casual visitors who land on /weekly/)
//   - Sector-tagged challenges (those have their own discovery via
//     /finans-sql/ etc; weekly should pull from generic SQL pool)
//   - Anything explicitly tagged { excludeFromWeekly: true } in
//     challenges.js (escape hatch for "this one isn't great as a
//     standalone share")
export function eligibleWeeklyChallenges(allChallenges = []) {
  if (!Array.isArray(allChallenges)) return [];
  return allChallenges.filter(c => {
    if (!c || typeof c !== 'object') return false;
    const diff = String(c.difficulty || '').toLowerCase();
    if (diff !== 'easy' && diff !== 'medium') return false;
    if (Array.isArray(c.sectorTags) && c.sectorTags.length > 0) return false;
    if (c.excludeFromWeekly) return false;
    return true;
  });
}

// Pick the challenge for a given ISO week from the eligible pool.
// Deterministic hash = (year * 53 + week) modulo eligible count. The
// 53 is the max possible weeks in an ISO year, so it spreads the
// hash across distinct buckets year-to-year. Returns null if the pool
// is empty (no Easy/Medium challenges configured).
//
// The choice of *53 over a larger prime is deliberate: with 70 eligible
// challenges, *53 means consecutive weeks land in different positions
// (year*53 advances by 53 per year, which is coprime with 70), so
// users don't see correlated picks across years.
export function selectWeeklyChallenge(yearWeek, allChallenges = []) {
  const pool = eligibleWeeklyChallenges(allChallenges);
  if (pool.length === 0) return null;
  const idx = ((yearWeek.year * 53) + yearWeek.week) % pool.length;
  return pool[idx];
}

// Convenience — get this week's challenge from a full challenges
// array. Most callers want this; only tests + archive pages need
// the year/week-explicit version above.
export function currentWeeklyChallenge(allChallenges = [], now = new Date()) {
  const yw = getISOWeek(now);
  return {
    weekLabel: formatWeekLabel(yw),
    weekNumber: yw.week,
    year: yw.year,
    challenge: selectWeeklyChallenge(yw, allChallenges),
  };
}

// Build the share text for social posts. Three variants — Twitter
// gets the shortest (URL counts toward 280 chars), LinkedIn gets a
// fuller framing, and "generic" is for native share / clipboard.
//
// We deliberately keep these template strings — calls to fill in
// week label and difficulty — rather than full prose. The user
// solving the challenge will edit these in their share dialog
// anyway, so the template is just a starting point.
export function buildShareText(weekLabel, challenge, kind = 'generic') {
  const title = challenge?.title || 'this week\'s challenge';
  const diff = challenge?.difficulty || 'Medium';
  const url = 'https://sqlquest.app/weekly/';
  switch (kind) {
    case 'twitter':
      return `Just solved Week #${weekLabel.split('W')[1]} SQL Challenge on @sqlquest_app: "${title}" (${diff})\n\nBeat my time? ${url}`;
    case 'linkedin':
      return `Solved this week's SQL Challenge on SQL Quest — "${title}" (${diff} difficulty).\n\n` +
        `Each Monday SQL Quest features a fresh challenge from their 200+ practice bank. Free to try, no signup, ` +
        `runs in your browser. Useful weekly habit if you're sharpening for a data interview.\n\n${url}`;
    case 'generic':
    default:
      return `I solved Week ${weekLabel} on SQL Quest — "${title}". Try it: ${url}`;
  }
}

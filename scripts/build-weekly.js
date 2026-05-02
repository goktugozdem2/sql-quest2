// Build-time renderer for /weekly/ landing page + past-week permalinks.
//
// Generates:
//   public/weekly/index.html              — current ISO week
//   public/weekly.html                    — flat-URL twin of current
//   public/weekly/{YEAR-WNN}/index.html   — past 12 weeks (archive permalinks)
//
// Each visitor in a given ISO week sees the same challenge — the
// selection is deterministic via (year * 53 + week) % eligible-count.
// Past-week pages reproduce that pick at the same coordinates so a link
// like /weekly/2026-W17/ shows exactly what was featured during week 17.
//
// Why generate 12 weeks of permalinks at build time:
//   - Quarterly retrospective: people share "I solved Week 17!" links
//     2 months later — those links should resolve to the actual challenge
//     they solved, not whatever rotated in.
//   - SEO surface area: each archive page is independently indexable
//     under its own URL with its own title/desc/JSON-LD.
//   - Linkability without a server-side route: pure static files.
//
// 12-week window matches the practice-spaced-retrieval cadence we use
// elsewhere — past 3 months of context is what most learners care
// about. Older weeks roll off (the URL still works if Vercel caches
// it forever, but we don't keep regenerating them).
//
// The challenge title + difficulty + ID + intro are HTML-escaped before
// injection because the source is user-authored content (in challenges.js)
// and could in theory contain HTML metacharacters.

import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import {
  getISOWeek,
  formatWeekLabel,
  selectWeeklyChallenge,
  eligibleWeeklyChallenges,
} from '../src/utils/weekly-challenge.js';

const __dirname = import.meta.dirname;
const ROOT = path.resolve(__dirname, '..');

// ─────────────────────────────────────────────
// Load challenges.js into a vm sandbox
// ─────────────────────────────────────────────
const challengesSrc = fs.readFileSync(path.join(ROOT, 'src/data/challenges.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(challengesSrc, sandbox, { filename: 'challenges.js' });
const allChallenges = sandbox.window.challengesData;
if (!Array.isArray(allChallenges)) {
  console.error('[build-weekly] could not load challenges.js — sandbox returned no array');
  process.exit(1);
}

const eligibleCount = eligibleWeeklyChallenges(allChallenges).length;
const tmpl = fs.readFileSync(path.join(ROOT, 'src/weekly.html'), 'utf8');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function snippetFromDesc(desc, max = 240) {
  if (!desc) return '';
  const plain = String(desc)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max - 1).trim() + '…' : plain;
}

// Step a year-week tuple by ±1 week, handling year boundaries.
// ISO years can have 52 or 53 weeks; we use 52 as the rollback floor
// since edge cases (year boundary near W53) are vanishingly rare and
// the worst case is one duplicate challenge in the archive — not a bug
// worth the parsing complexity.
function shiftWeek(yw, delta) {
  let { year, week } = yw;
  while (delta !== 0) {
    if (delta > 0) {
      week += 1;
      if (week > 52) { week = 1; year += 1; }
      delta -= 1;
    } else {
      week -= 1;
      if (week < 1) { week = 52; year -= 1; }
      delta += 1;
    }
  }
  return { year, week };
}

// ─────────────────────────────────────────────
// Render a single week's page
// ─────────────────────────────────────────────
//
// Mode is either 'current' or 'archive'. The two share the same template
// but archive pages get an "Past Week" notice block at the top + a
// "← Back to current week" CTA, and we suppress the "next Monday"
// preview because it would be confusing on a permalink.
function renderWeekPage(yw, mode) {
  const challenge = selectWeeklyChallenge(yw, allChallenges);
  if (!challenge) {
    console.warn(`[build-weekly] no challenge for ${formatWeekLabel(yw)} — skipping`);
    return null;
  }

  const weekLabel = formatWeekLabel(yw);
  const nextWeekYW = shiftWeek(yw, 1);
  const nextChallenge = selectWeeklyChallenge(nextWeekYW, allChallenges);

  // Archive list: 4 weeks PRIOR to this one (so on /weekly/2026-W18/
  // we show W17, W16, W15, W14 with permalink hrefs).
  const archive = [];
  let cursor = { ...yw };
  for (let i = 1; i <= 4; i++) {
    cursor = shiftWeek(cursor, -1);
    const c = selectWeeklyChallenge(cursor, allChallenges);
    archive.push({
      weekLabel: formatWeekLabel(cursor),
      challenge: c,
    });
  }
  const archiveHtml = archive.map(a =>
    `        <li><a href="/weekly/${esc(a.weekLabel)}/" style="color:#cbd5e1;text-decoration:none;display:block"><strong style="color:#FFE34D;font-family:'JetBrains Mono';font-size:13px">${esc(a.weekLabel)}</strong> · ${esc(a.challenge?.title || '')} <span style="color:#64748b">(${esc(a.challenge?.difficulty || '')})</span></a></li>`
  ).join('\n');

  // Archive-only banner shown on past-week permalinks. Empty string on
  // current-week page so the template renders cleanly without conditionals.
  const archiveNotice = mode === 'archive'
    ? `<div style="max-width:760px;margin:0 auto 20px;padding:14px 18px;background:rgba(245,158,11,.08);border:1px dashed rgba(245,158,11,.3);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><span style="font-size:13px;color:#fcd34d">📅 You're viewing the archive for <strong>Week ${esc(weekLabel)}</strong>. Each week's challenge is locked deterministically — every visitor that week saw this same problem.</span><a href="/weekly/" style="font-size:12px;color:#FFE34D;font-weight:700;white-space:nowrap;text-decoration:none">→ Current week</a></div>`
    : '';

  // Suppress the "Coming Monday" teaser on archive pages — it would
  // imply an action item that doesn't apply.
  const nextWeekHtml = mode === 'archive'
    ? ''
    : null; // null = use template default (insert the teaser)

  const tokens = {
    '{{WEEK_LABEL}}':         esc(weekLabel),
    '{{WEEK_NUMBER}}':        String(yw.week),
    '{{YEAR}}':               String(yw.year),
    '{{CHALLENGE_ID}}':       String(challenge.id),
    '{{CHALLENGE_TITLE}}':    esc(challenge.title || ''),
    '{{CHALLENGE_DIFFICULTY}}': esc(challenge.difficulty || ''),
    '{{CHALLENGE_DESC_SNIPPET}}': esc(snippetFromDesc(challenge.description)),
    '{{ELIGIBLE_COUNT}}':     String(eligibleCount),
    '{{NEXT_CHALLENGE_TITLE}}': esc(nextChallenge?.title || ''),
    '{{NEXT_WEEK_LABEL}}':    esc(formatWeekLabel(nextWeekYW)),
    '{{ARCHIVE_HTML}}':       archiveHtml,
    '{{ARCHIVE_NOTICE_HTML}}': archiveNotice,
    '{{BUILD_DATE_ISO}}':     new Date().toISOString().slice(0, 10),
    '{{CANONICAL_URL}}':      mode === 'archive'
                              ? `https://sqlquest.app/weekly/${weekLabel}/`
                              : 'https://sqlquest.app/weekly/',
    // Archive permalinks are noindex,follow: useful for direct link
    // sharing ("I solved Week 17!"), not so useful in SERPs where
    // they'd dilute /weekly/'s ranking with near-duplicate content.
    '{{ROBOTS}}':             mode === 'archive' ? 'noindex, follow' : 'index, follow',
  };

  let rendered = tmpl;
  for (const [k, v] of Object.entries(tokens)) {
    rendered = rendered.split(k).join(v);
  }

  // Strip the next-week teaser block on archive pages. The block is
  // bounded by its <!-- ── Next week teaser ─── --> comment and the
  // closing </div> of its containing div.next-week.
  if (mode === 'archive') {
    rendered = rendered.replace(
      /<!-- ── Next week teaser ─{1,} -->[\s\S]*?<\/div>\s*<!-- ── Archive/,
      '<!-- ── Archive'
    );
  }

  return { weekLabel, challenge, nextChallenge, html: rendered };
}

// ─────────────────────────────────────────────
// Build current week + past 12 archive weeks
// ─────────────────────────────────────────────
const currentYW = getISOWeek(new Date());
const result = renderWeekPage(currentYW, 'current');
if (!result) {
  console.error('[build-weekly] no eligible challenge for current week — aborting');
  process.exit(1);
}

const currentDir = path.join(ROOT, 'public/weekly');
fs.mkdirSync(currentDir, { recursive: true });
fs.writeFileSync(path.join(currentDir, 'index.html'), result.html);
fs.writeFileSync(path.join(ROOT, 'public/weekly.html'), result.html);

console.log(`[build-weekly] ${result.weekLabel} (current) → "${result.challenge.title}" (${result.challenge.difficulty}, id=${result.challenge.id})`);
console.log(`[build-weekly] eligible pool: ${eligibleCount} challenges`);
console.log(`[build-weekly] next week (${formatWeekLabel(shiftWeek(currentYW, 1))}): "${result.nextChallenge?.title}"`);

// Build past 12 weeks of archive permalinks
const ARCHIVE_DEPTH = 12;
let archiveBuilt = 0;
let cursor = { ...currentYW };
for (let i = 1; i <= ARCHIVE_DEPTH; i++) {
  cursor = shiftWeek(cursor, -1);
  const r = renderWeekPage(cursor, 'archive');
  if (!r) continue;
  const archiveDir = path.join(ROOT, `public/weekly/${r.weekLabel}`);
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, 'index.html'), r.html);
  archiveBuilt += 1;
}
console.log(`[build-weekly] archive: generated ${archiveBuilt} past-week permalinks (depth ${ARCHIVE_DEPTH})`);

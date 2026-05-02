// Build-time renderer for /weekly/ landing page.
//
// Picks the current ISO week's challenge from src/data/challenges.js
// and templates it into src/weekly.html, writing the result to
// public/weekly/index.html (and public/weekly.html for flat URL access).
//
// Why build-time instead of runtime: the page is purely informational —
// hero, share buttons, "play this week's challenge" link. Computing it
// once per build keeps the page <10KB with no extra script load. The
// trade-off: the challenge only rotates when a build runs. Vercel deploys
// auto-rebuild, so as long as the user pushes weekly the rotation
// happens; if a week passes without a deploy, the same challenge stays
// (acceptable for an MVP — the page shows clearly which week it is).
//
// The challenge title + difficulty + ID + intro are HTML-escaped before
// injection because the source is user-authored content (in challenges.js)
// and could in theory contain HTML metacharacters. Better safe.

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

// Load challenges.js into a sandbox. The file does `window.challengesData = [...]`
// at the top level — we provide a fake window and read the array out.
const challengesSrc = fs.readFileSync(path.join(ROOT, 'src/data/challenges.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(challengesSrc, sandbox, { filename: 'challenges.js' });
const allChallenges = sandbox.window.challengesData;
if (!Array.isArray(allChallenges)) {
  console.error('[build-weekly] could not load challenges.js — sandbox returned no array');
  process.exit(1);
}

const yw = getISOWeek(new Date());
const challenge = selectWeeklyChallenge(yw, allChallenges);
if (!challenge) {
  console.error('[build-weekly] no eligible challenge found in pool — aborting');
  process.exit(1);
}

const weekLabel = formatWeekLabel(yw);
const eligibleCount = eligibleWeeklyChallenges(allChallenges).length;

// Pick next week's challenge for the "coming Monday" preview teaser.
const nextWeek = yw.week === 53 ? { year: yw.year + 1, week: 1 } : { year: yw.year, week: yw.week + 1 };
const nextChallenge = selectWeeklyChallenge(nextWeek, allChallenges);

// Pick last 4 weeks for the archive teaser.
const archive = [];
let cursor = { ...yw };
for (let i = 1; i <= 4; i++) {
  cursor = cursor.week === 1
    ? { year: cursor.year - 1, week: 52 }
    : { year: cursor.year, week: cursor.week - 1 };
  const c = selectWeeklyChallenge(cursor, allChallenges);
  archive.push({
    weekLabel: formatWeekLabel(cursor),
    weekNumber: cursor.week,
    challenge: c,
  });
}

// HTML-escape — minimal but covers the realistic threats.
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Truncate description for hero card. Challenges have rich-text descriptions —
// we strip markdown formatting (asterisks, backticks) for the snippet.
function snippetFromDesc(desc, max = 240) {
  if (!desc) return '';
  const plain = String(desc)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max - 1).trim() + '…' : plain;
}

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
  '{{NEXT_WEEK_LABEL}}':    esc(formatWeekLabel(nextWeek)),
  '{{ARCHIVE_HTML}}':       archive.map(a => `        <li><strong>${esc(a.weekLabel)}</strong> · ${esc(a.challenge?.title || '')} <span style="color:#64748b">(${esc(a.challenge?.difficulty || '')})</span></li>`).join('\n'),
  '{{BUILD_DATE_ISO}}':     new Date().toISOString().slice(0, 10),
};

const tmpl = fs.readFileSync(path.join(ROOT, 'src/weekly.html'), 'utf8');
let rendered = tmpl;
for (const [k, v] of Object.entries(tokens)) {
  rendered = rendered.split(k).join(v);
}

const outDir = path.join(ROOT, 'public/weekly');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), rendered);
fs.writeFileSync(path.join(ROOT, 'public/weekly.html'), rendered);

console.log(`[build-weekly] ${weekLabel} → "${challenge.title}" (${challenge.difficulty}, id=${challenge.id})`);
console.log(`[build-weekly] eligible pool: ${eligibleCount} challenges`);
console.log(`[build-weekly] next week (${formatWeekLabel(nextWeek)}): "${nextChallenge?.title}"`);

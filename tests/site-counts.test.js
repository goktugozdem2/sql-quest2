// SQL Quest — the public pages state the bank's numbers, never last quarter's
//
// THE INCIDENT (2026-09-06 → 2026-09-07)
//
// On 2026-09-06 Perplexity described SQL Quest as having "a 10-axis skill
// radar". It was quoting us. The homepage's Coach mock was still a 10-vertex
// polygon labelled with the RETIRED skill names (SELECT Basics, Filter &
// Sort, GROUP BY, JOIN Tables, CASE Statements …) five months after the
// 9-skill reshuffle shipped. The same sweep found "200+ challenges" (the
// bank held 257), "60+ free" (195), "12 company tracks" and "13 companies"
// (22 pages), "10 canonical skills" (9), and Pro at "$19/month" (the modal
// has said $29 since at least 2026-07-25) — the exact figures llms.txt had
// rotted on, repeated across the static pages that generated it.
//
// An AI assistant quotes these pages verbatim, so a stale number is a public
// claim — and the AI-recommendation channel is the only one that has produced
// a paying user. build-llms-txt.js fixed llms.txt by rendering it from the
// bank; the landing pages are hand-written prose and cannot be rendered, so
// this test does the next best thing. It reads every public page, strips HTML
// comments (an old value may survive only there), and
//
//   1. refuses each retired literal by name;
//   2. binds every "N challenges" / "N free" / "N-skill" / "N company pages"
//      claim to the count the generator computes from src/data — the same
//      helper llms.txt is rendered with, so a page and llms.txt cannot
//      disagree — and checks the radar mocks have that many axes;
//   3. reads the Pro modal in src/app.jsx (the surface that calls
//      beginCheckout — prices live there, not in any doc) and checks every
//      price a page attributes to SQL Quest / Pro against it. Narrowly: the
//      comparison pages quote competitor prices, verified on their pricing
//      pages 2026-09-07, and StrataScratch's Premium really is $19/mo. Those
//      must never be "corrected" by a guard that only knows our old price;
//   4. binds the challenge topic pages (src/challenges/<slug>.html —
//      /challenges/window-functions/, /joins/, /cte/, and from later the same
//      day /case-when/ and /subqueries/) to PREDICATES over the
//      bank: the page total, every section's count and free count, the cards
//      each section lists and their order. Until 2026-09-07 the first three were
//      hand-kept under public/ and said "30+", "20+", "15+" against 52, 64, 47.
//
// Every rule here is a pure function over a string, exercised on fixtures
// below, so the guard is verifiable even on a day every page happens to be
// clean. Failures name the file, the line and the offending text.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { collectBankFacts, loadBank } from '../scripts/build-llms-txt.js';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (...p) => fs.readFileSync(join(ROOT, ...p), 'utf8');

// ---------------------------------------------------------------------------
// The page set
//
// Everything build-static-pages.js publishes from src/ (root pages, the
// challenge topic pages in src/challenges/, and blog posts — src/weekly.html,
// the template build-weekly.js renders, is among them) and the Coach mock the
// homepage and the two variant pages embed. Sources only: public/ is build
// output, and a stale number there is the build's problem, not the page's.
// ---------------------------------------------------------------------------
const TOPIC_DIR = join('src', 'challenges');

function listPages() {
  const htmlIn = dir => fs.readdirSync(join(ROOT, dir))
    .filter(f => f.endsWith('.html'))
    .sort()
    .map(f => join(dir, f));
  return [
    ...htmlIn('src'),
    ...htmlIn(TOPIC_DIR),
    ...htmlIn(join('src', 'blog')),
    join('scripts', 'coach-mock-snippet.html'),
  ];
}

// ---------------------------------------------------------------------------
// Text helpers. Every transform keeps the string the same length, so an
// offset found in the transformed text is a line number in the source file.
// ---------------------------------------------------------------------------

// Old values may remain only inside HTML comments (the dated
// "<!-- 2026-09-07: stale count → bank figure -->" notes, and the incident
// notes that quote what a page used to say).
export function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
}

// Tags become same-length runs of NUL, except the value of a `content`
// attribute, which stays: meta / og / twitter descriptions are the first
// thing a crawler quotes, and "200+ hands-on challenges" lived in exactly
// those. A tag must look like one (`<name`, `</name`, `<!…`), so the `<` in
// inline JS (`i<n`) or SQL (`price < 100`) is left as text.
export function flatten(text) {
  return text.replace(/<(?:\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?|![^<>]*)>/g, tag => {
    let out = '\0'.repeat(tag.length);
    for (const m of tag.matchAll(/\bcontent=("[^"]*"|'[^']*')/g)) {
      const start = m.index + m[0].indexOf(m[1]) + 1;
      const val = m[1].slice(1, -1);
      out = out.slice(0, start) + val + out.slice(start + val.length);
    }
    return out;
  });
}

// A "sentence" is a run of text between tags, split further at sentence
// punctuation, at JSON / JS string boundaries (FAQ answers live in JSON-LD
// and in inline [['Q', 'A']] arrays), and at blank lines. Each carries the
// offset of its first character in `text`, the `run` (text between two tags)
// it came from, and `prev`, the sentence before it in the same run — a meta
// description reads "Is StrataScratch free? Sept 2026 pricing: $19/mo …",
// and the name that owns the second sentence's price is in the first.
const SENTENCE_CACHE = new Map();
export function sentencesOf(text) {
  if (SENTENCE_CACHE.has(text)) return SENTENCE_CACHE.get(text);
  const flat = flatten(text);
  const out = [];
  const re = /\0+|(?<=[.!?…]["')\]]*)\s+|["']\s*[,:]\s*["']|\n{2,}/g;
  let last = 0;
  let run = 0;
  const push = (from, to) => {
    if (to <= from) return;
    const prev = out.length && out[out.length - 1].run === run ? out[out.length - 1].text : '';
    out.push({ text: flat.slice(from, to), index: from, run, prev });
  };
  for (const m of flat.matchAll(re)) {
    push(last, m.index);
    if (m[0].charCodeAt(0) === 0) run++;
    last = m.index + m[0].length;
  }
  push(last, flat.length);
  SENTENCE_CACHE.set(text, out);
  return out;
}

// A price or count is somebody else's when the sentence, or the sentence
// before it in the same run, names a competitor. Ours must be named in the
// sentence itself — the narrow side of the heuristic.
const aboutCompetitor = s => namesCompetitor(s.text) || namesCompetitor(s.prev);

function lineAt(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

const decode = s => s
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ');

const squash = s => s.replace(/\s+/g, ' ').trim();

// "file:line  …the sentence…" — enough to find and fix it without opening
// the test.
function report(offenders) {
  return offenders
    .map(o => `  ${o.file}:${o.line}  ${o.why ? `[${o.why}] ` : ''}${squash(o.text).slice(0, 160)}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Attribution. The comparison pages name these; a sentence that does is
// talking about somebody else's numbers unless it also names ours.
// "Mode" is case-sensitive on purpose: "dark mode", "practice mode".
// ---------------------------------------------------------------------------
const COMPETITOR_NAMES = /stratascratch|datalemur|leetcode|hackerrank|sqlzoo|sqlbolt|w3schools|codecademy|datacamp|dataquest|udemy|coursera|kaggle|interview query|pgexercises|khan academy/i;
export const namesCompetitor = s => COMPETITOR_NAMES.test(s) || /\bMode\b/.test(s);
export const namesUs = s => /SQL Quest|\bPro\b/.test(s);

// ---------------------------------------------------------------------------
// 1. Retired literals — the figures found on 2026-09-06/07, each one a
//    number the product has not had for months. None may appear outside a
//    comment, on any page, in any context. (Yes, "200+ problems" about a
//    competitor would also fail: use the competitor's own noun, or "more
//    than"; a guard with an attribution loophole excused the exact stale
//    meta description this sweep found — "200+ challenges vs HackerRank's".)
// ---------------------------------------------------------------------------
export const RETIRED_LITERALS = [
  { re: /\b10[- ]axis\b/i, why: '"10-axis" — what Perplexity quoted back on 2026-09-06; the radar has had 9 axes since the reshuffle' },
  { re: /\b10 axes\b/i, why: '"10 axes" — the radar has 9' },
  { re: /\b10 canonical\b/i, why: '"10 canonical skills" — there are 9 (CANONICAL_SKILLS)' },
  { re: /\b10[- ]skills?\b/i, why: '"10 skills" / "10-skill radar" — 9 since the reshuffle' },
  { re: /\b10 SQL (?:categories|skills)\b/i, why: '"10 SQL skills/categories" — 9 since the reshuffle' },
  // The Turkish DataLemur karşılaştırma page: "10 eksenli yetenek radarı" (10-axis), "10 kanonik beceri" (10 canonical skills).
  { re: /\b10 eksen/i, why: '"10 eksenli" (Turkish 10-axis) — the radar has 9 axes' },
  { re: /\b10 kanonik\b/i, why: '"10 kanonik beceri" (Turkish 10 canonical skills) — there are 9' },
  // "200+ challenge" singular is how Turkish declines it ("200+ challenge'a sahip").
  { re: /\b200\+ (?:challenges?|SQL|exercises|hands-on|problems)\b/i, why: '"200+ challenges" — the bank held 257 on 2026-09-06; a floor must be a multiple of 50 within 49 of the count ("250+")' },
  { re: /\b12 company\b/i, why: '"12 company pages/tracks" — the company-page count is bound below (23 on 2026-09-07)' },
  { re: /\b12[- ]tracks?\b/i, why: '"12 tracks" / "12-track" — the crosslink paragraph on 19 company pages still said it on 2026-09-07; the count is bound below' },
  { re: /\b13 compan/i, why: '"13 companies" — the company-page count is bound below' },
  { re: /\b60 Easy\b/i, why: '"60 Easy" — the bank held 80 Easy on 2026-09-06' },
  { re: /\b60\+ free\b/i, why: '"60+ free" — 195 playable free on 2026-09-06' },
];

export function findRetiredLiterals(text) {
  const out = [];
  for (const { re, why } of RETIRED_LITERALS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) {
      const from = Math.max(0, m.index - 60);
      out.push({ index: m.index, why, text: text.slice(from, m.index + m[0].length + 60) });
    }
  }
  return out;
}

// $19 was the Pro monthly price until 2026-07-25 and outlived the change on
// the pages by six weeks. It cannot be a flat "never" like the literals
// above: StrataScratch's Premium is $19/mo (its pricing page, 2026-09-07)
// and three comparison pages quote it, in table cells and price cards where
// the sentence itself never says whose price it is. Three narrow rules,
// each one that no competitor quote on the site trips (measured 2026-09-07):
//   A. the sentence names SQL Quest / Pro and neither it nor the sentence
//      before it names a competitor — ours by attribution;
//   B. the page names no competitor anywhere — nobody else's price it could be;
//   C. the same sentence carries our annual or lifetime price — the stale
//      card shape "$19/mo · $99/yr · $199 lifetime".
// A bare "$19/mo" in an unlabelled card on a page that also names a
// competitor is the deliberate blind spot: that is what a competitor card
// looks like, and the pricing guard below still catches the labelled forms.
export function findStalePro19(text, modal) {
  const offenders = [];
  const pageNamesCompetitor = namesCompetitor(text);
  const oursAnnualOrLifetime = new RegExp(`\\$(?:${modal.Annual}|${modal.Lifetime})(?!\\d)`);
  for (const s of sentencesOf(text)) {
    for (const m of s.text.matchAll(/\$19(?:\/| per | a )/g)) {
      let why = null;
      if (namesUs(s.text) && !aboutCompetitor(s)) why = 'A: sentence names SQL Quest / Pro and no competitor';
      else if (!pageNamesCompetitor) why = 'B: page names no competitor whose price this could be';
      else if (oursAnnualOrLifetime.test(s.text)) why = `C: sits beside our $${modal.Annual} / $${modal.Lifetime}`;
      if (why) offenders.push({ index: s.index + m.index, why, text: s.text });
    }
  }
  return offenders;
}

// ---------------------------------------------------------------------------
// 2. Positive binding to the bank
// ---------------------------------------------------------------------------

// "N challenges" (or "N exercises", the /sql-exercises/ vocabulary — never
// "problems", which is how the pages describe LeetCode's bank). Up to three
// words may sit between: "257 hands-on SQL challenges". A digit between
// ("195 of 257 challenges") stops the shorter match, so 257 is the claim.
// Only N ≥ 100 is a bank-size claim; "12 fraud challenges" is a track.
const COUNT_CLAIM = /(?<![\w$.,-])(\d+)(\+?)(?=(?:[\s-]+[A-Za-z][\w'+-]*){0,3}[\s-]+(?:challenges?|exercises)\b)/g;
const FREE_CLAIM = /(?<![\w$.,-])(\d+)(\+?) free\b/g;

const floor50 = n => Math.floor(n / 50) * 50;
const isFloorOf = (n, count) => n % 50 === 0 && n <= count && n > count - 50;

// A claim is fine when it is a number the bank actually has — the total, the
// free count, the core (non-sector) count, Easy+Medium ("every Easy and
// Medium challenge") or a single difficulty — or a true rounded floor: a multiple of 50 no more than
// 49 below the total, written "N+" (or "over N" / "more than N"). A floor of
// the FREE count is accepted only in a sentence that says "free", so that
// "150+ challenges" cannot pass as a floor of 195 while reading as a floor of
// the bank. Returns null when acceptable, else the reason.
export function challengeClaimVerdict(n, plus, sentence, facts) {
  const exact = {
    total: facts.challengeCount,
    free: facts.freeChallengeCount,
    core: facts.coreChallengeCount,
    'Easy+Medium': facts.easyCount + facts.mediumCount,
    Easy: facts.easyCount,
    Medium: facts.mediumCount,
    Hard: facts.hardCount,
  };
  if (!plus) {
    if (Object.values(exact).includes(n)) return null;
    return `${n} is none of ${Object.entries(exact).map(([k, v]) => `${k} ${v}`).join(' / ')}`;
  }
  if (isFloorOf(n, facts.challengeCount)) return null;
  if (/\bfree\b/i.test(sentence) && isFloorOf(n, facts.freeChallengeCount)) return null;
  return `${n}+ is not a multiple of 50 within 49 of the total ${facts.challengeCount} — write "${floor50(facts.challengeCount)}+" or the exact count`;
}

export function freeClaimVerdict(n, plus, facts) {
  const free = facts.freeChallengeCount;
  if (!plus) return n === free ? null : `${n} free — the bank has ${free} playable free`;
  return isFloorOf(n, free) ? null : `${n}+ free is not a multiple of 50 within 49 of ${free}`;
}

const plusLike = (m, sentence) =>
  m[2] === '+' || /(?:over|more than|above|beyond)\s*$/i.test(sentence.slice(Math.max(0, m.index - 12), m.index));

export function findChallengeClaims(text, facts) {
  const offenders = [];
  for (const s of sentencesOf(text)) {
    for (const m of s.text.matchAll(COUNT_CLAIM)) {
      const n = Number(m[1]);
      if (n < 100) continue;
      const why = challengeClaimVerdict(n, plusLike(m, s.text), s.text, facts);
      if (why) offenders.push({ index: s.index + m.index, why, text: s.text });
    }
    for (const m of s.text.matchAll(FREE_CLAIM)) {
      // "195 of 257 free challenges": the free claim is the first number and
      // the second must be the total.
      const ofTotal = /(\d+) of\s*$/.exec(s.text.slice(Math.max(0, m.index - 12), m.index));
      if (ofTotal) {
        const free = Number(ofTotal[1]);
        const total = Number(m[1]);
        if (free < 100 && total < 100) continue;
        if (free !== facts.freeChallengeCount || total !== facts.challengeCount) {
          offenders.push({ index: s.index + m.index, why: `"${free} of ${total} free" — the bank has ${facts.freeChallengeCount} of ${facts.challengeCount}`, text: s.text });
        }
        continue;
      }
      const n = Number(m[1]);
      if (n < 100) continue;
      const why = freeClaimVerdict(n, plusLike(m, s.text), facts);
      if (why) offenders.push({ index: s.index + m.index, why, text: s.text });
    }
  }
  return offenders;
}

// "9-skill radar", "9-axis", "9 axes", "9 canonical skills" always name the
// radar. Plain "N skills" is bound only in a sentence that also says radar /
// canonical / axis, so a blog post may still say "the 3 skills interviewers
// test" — the retired-literal check above catches "10 skills" regardless.
const SKILL_CLAIMS = [
  /(?<![\w-])(\d+)-skill\b/gi,
  /(?<![\w-])(\d+)[- ]ax[ei]s\b/gi,
  /(?<![\w-])(\d+) canonical (?:SQL )?skills?\b/gi,
  /(?<![\w-])(\d+) eksenli\b/gi,      // Turkish: "9 eksenli yetenek radarı"
  /(?<![\w-])(\d+) kanonik\b/gi,      // Turkish: "9 kanonik beceri"
];
const SKILL_LOOSE = /(?<![\w-])(\d+) (?:SQL )?skills\b/gi;

export function findSkillClaims(text, skillCount) {
  const offenders = [];
  for (const s of sentencesOf(text)) {
    const res = /radar|canonical|ax[ei]s/i.test(s.text) ? [...SKILL_CLAIMS, SKILL_LOOSE] : SKILL_CLAIMS;
    for (const re of res) {
      for (const m of s.text.matchAll(re)) {
        if (Number(m[1]) !== skillCount) {
          offenders.push({ index: s.index + m.index, why: `"${m[0]}" — the radar has ${skillCount} skills`, text: s.text });
        }
      }
    }
  }
  return offenders;
}

// "22 company pages / company tracks / company-specific landings / company
// interview pages"; "22 tracks" in a sentence about companies or FAANG (a
// "3 sector tracks" never has the number adjacent); "22 companies" where the
// sentence is about company TAGS — the only way the pages count companies.
const COMPANY_CLAIMS = [
  { re: /(?<![\w-])(\d+)\+?[- ]compan(?:y|ies)[- ](?:specific[- ])?(?:pages?|tracks?|landings?|interview)/gi },
  { re: /(?<![\w-])(\d+)\+? tracks\b/gi, when: /compan|FAANG/i },
  { re: /(?<![\w-])(\d+)\+? companies\b/gi, when: /\btag/i },
];

export function findCompanyClaims(text, companyPageCount) {
  const offenders = [];
  for (const s of sentencesOf(text)) {
    for (const { re, when } of COMPANY_CLAIMS) {
      if (when && !when.test(s.text)) continue;
      for (const m of s.text.matchAll(re)) {
        if (Number(m[1]) !== companyPageCount) {
          offenders.push({ index: s.index + m.index, why: `"${m[0]}" — there are ${companyPageCount} company pages`, text: s.text });
        }
      }
    }
  }
  return offenders;
}

// Sector tracks. On 2026-09-07 the homepage said "20 challenges on FDIC
// BankFind data" while learn-sql said 32 for the same track, and nothing
// caught it: the rules above only bind bank-size claims (N ≥ 100). Each
// dataset phrase binds to the count the generator computes per sector and
// per dataset — the finans track is 27 FDIC challenges plus 5 on a synthetic
// fraud ledger, and the pages quote 32, 27 and 5. Small counts are exact;
// no "N+" floors here. "N challenges on real interview questions" is the
// bank, not a sector, and is left to the challenge-count rule.
const SECTOR_CLAIMS = [
  { re: /(?<![\w-])(\d+)(?: (?:SQL|hands-on))? challenges? on(?: (?:real|the|actual))? FDIC\b/gi, key: 'FDIC' },
  { re: /(?<![\w-])(\d+) on(?: (?:real|the))? FDIC\b/gi, key: 'FDIC' },
  { re: /(?<![\w-])(\d+)(?: (?:SQL|hands-on))? challenges? on(?: (?:real|the|actual))? NYC OpenData\b/gi, key: 'NYC' },
  { re: /(?<![\w-])(\d+)(?: (?:SQL|hands-on))? challenges? on(?: (?:real|the|actual))? UCI\b/gi, key: 'UCI' },
  { re: /(?<![\w-])(\d+) on a synthetic\b/gi, key: 'fraud' },
  { re: /(?<![\w-])(\d+) (?:industry|sector)(?:-track)? challenges\b/gi, key: 'all' },
  { re: /industry tracks \((\d+) challenges\)/gi, key: 'all' },
];

// Which numbers each phrase may carry: the sector total or its dataset alone
// for FDIC (one sector, two datasets), the single dataset for the others.
export function sectorAllowed(facts) {
  const bySector = Object.fromEntries(facts.sectors.map(s => [s.id, s.challengeCount]));
  const d = facts.datasets;
  return {
    FDIC: [bySector.finans, d.finans_banking],
    NYC: [bySector.gayrimenkul, d.gayrimenkul_nyc],
    UCI: [bySector.uretim, d.uretim_industrial],
    fraud: [d.finans_fraud],
    all: [facts.sectorChallengeCount],
  };
}

export function findSectorClaims(text, allowed) {
  const offenders = [];
  for (const s of sentencesOf(text)) {
    for (const { re, key } of SECTOR_CLAIMS) {
      for (const m of s.text.matchAll(re)) {
        const n = Number(m[1]);
        if (!allowed[key].includes(n)) {
          offenders.push({ index: s.index + m.index, why: `"${m[0]}" — the ${key} figure is ${allowed[key].join(' or ')}`, text: s.text });
        }
      }
    }
  }
  return offenders;
}

// The radar mock: `<svg class="cm-radar">` with one polygon per grid ring plus
// the data polygon, one spoke per axis, and a legend of `.cm-lg-row` labels.
// Every polygon must have one vertex per canonical skill and every legend
// label must BE a canonical skill (the legend shows a subset — that is fine;
// a retired name is not).
export function inspectRadars(text, skills) {
  const problems = [];
  for (const svg of text.matchAll(/<svg class="cm-radar"[\s\S]*?<\/svg>/g)) {
    const polygons = [...svg[0].matchAll(/<polygon[^>]*\bpoints="([^"]*)"/g)];
    if (!polygons.length) problems.push({ index: svg.index, why: 'radar has no <polygon>', text: '' });
    for (const p of polygons) {
      const vertices = p[1].trim().split(/\s+/).filter(Boolean).length;
      if (vertices !== skills.length) {
        problems.push({ index: svg.index + p.index, why: `polygon has ${vertices} vertices, the radar has ${skills.length} axes`, text: p[0] });
      }
    }
    const spokes = (svg[0].match(/<line\b/g) || []).length;
    if (spokes !== skills.length) {
      problems.push({ index: svg.index, why: `${spokes} spokes, the radar has ${skills.length} axes`, text: '' });
    }
  }
  for (const row of text.matchAll(/<div class="cm-lg-row">[\s\S]*?<\/span>([^<]+)<span class="cm-lg-val">/g)) {
    const label = decode(row[1]).trim();
    if (!skills.includes(label)) {
      problems.push({ index: row.index, why: `legend label "${label}" is not a canonical skill`, text: row[0] });
    }
  }
  return problems;
}

// The retired 10-skill vocabulary (CLAUDE.md: never author a new reference).
// Names that are also ordinary words or SQL syntax (Aggregation, Subqueries,
// GROUP BY) cannot be checked by string; these four can.
export const RETIRED_SKILL_NAMES = ['SELECT Basics', 'Filter & Sort', 'Filter &amp; Sort', 'JOIN Tables', 'CASE Statements'];

export function findRetiredSkillNames(text) {
  const out = [];
  for (const name of RETIRED_SKILL_NAMES) {
    let i = text.indexOf(name);
    while (i >= 0) {
      out.push({ index: i, why: `retired skill name "${decode(name)}"`, text: text.slice(Math.max(0, i - 60), i + name.length + 60) });
      i = text.indexOf(name, i + name.length);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Pricing guard
//
// A price counts as OURS when its sentence names SQL Quest or Pro and neither
// it nor the sentence before it (same text run) names a competitor. That is
// deliberately narrow: "Pro ($29/mo)" and "SQL Quest Pro is $29/month" are
// caught; a head-to-head sentence naming both sides is skipped rather than
// guessed at, and a competitor's card is never touched.
// Monthly may also be the annual plan's per-month equivalent, which the
// modal itself prints ("$99/yr ($8.25/mo)"). Turkish units (/ay, /yıl) are
// the DataLemur karşılaştırma page.
// ---------------------------------------------------------------------------
const PRICE_RE = /\$(\d+(?:\.\d+)?)(?:(\s*\/\s*(?:mo|month|ay)\b|\s+(?:per|a) month\b)|(\s*\/\s*(?:yr|year|yıl)\b|\s+(?:per|a) year\b)|(\s+(?:lifetime|one-time|once)\b))/gi;

export function findPriceOffences(text, modal) {
  const offenders = [];
  const monthly = Number(modal.Monthly);
  const annual = Number(modal.Annual);
  const lifetime = Number(modal.Lifetime);
  const annualPerMonth = Math.round((annual / 12) * 100) / 100;
  for (const s of sentencesOf(text)) {
    if (!namesUs(s.text) || aboutCompetitor(s)) continue;
    for (const m of s.text.matchAll(PRICE_RE)) {
      const amount = Number(m[1]);
      let why = null;
      if (m[2] && amount !== monthly && Math.abs(amount - annualPerMonth) > 0.005) {
        why = `"${m[0]}" — the Pro modal says $${modal.Monthly}/month (or $${annualPerMonth}/mo billed yearly)`;
      } else if (m[3] && amount !== annual) {
        why = `"${m[0]}" — the Pro modal says $${modal.Annual}/year`;
      } else if (m[4] && amount !== lifetime) {
        why = `"${m[0]}" — the Pro modal says $${modal.Lifetime} lifetime`;
      }
      if (why) offenders.push({ index: s.index + m.index, why, text: s.text });
    }
  }
  return offenders;
}

// The price cards in the Pro modal: a tabular-nums <div>$N</div> followed by
// its plan label. Same read as tests/llms-txt.test.js.
export function readProModal(appSource) {
  const modal = {};
  const re = /className="text-2xl font-bold"[^>]*>\$(\d+)<\/div>\s*<div[^>]*>(Monthly|Annual|Lifetime)<\/div>/g;
  for (const m of appSource.matchAll(re)) modal[m[2]] = m[1];
  return modal;
}


// ---------------------------------------------------------------------------
// 4. Challenge topic pages — src/challenges/<slug>.html
//
// Each page's population and each of its sections is a PREDICATE over the
// bank, never a literal: the skill pages use challengeMatchesSkill, the same
// matcher the Coach and the drills use; sections are tag matches inside the
// population; the CTE page counts reference solutions that use WITH — the
// method its 47 / 13 / 3 were written with, and the figure
// /blog/sql-cte-tutorial/ quotes (the CTE *tag* covers 37; eleven sector
// solutions reach for WITH without carrying it). The population is the FULL
// bank — sector challenges sit in the same list the app shows everyone, and
// /sql-exercises/ already sends people here with the full-bank count.
// "free" is Easy + Medium + Hard freePreview, the collectBankFacts rule.
//
// What a page must then satisfy (each a pure function, fixtures below):
//   - <title>, og:title and the H1 agree and carry "N Challenges (M Free)";
//   - every section id exists; its H2 states its count and free count; its
//     cards are exactly the predicate's challenges, one /app.html?challenge=id
//     link and one Free / Free preview / Pro tag each, in Easy → Medium → Hard
//     order with previews before Pro inside Hard (CLAUDE.md, the raw-array
//     trap: a list in id order is a bug, not a default);
//   - every small "N challenges" / "N free" / "N Easy" claim in the prose is a
//     number the bank gives this page (population, split, previews, a
//     section) or another topic page's total — and never an "N+" floor.
// ---------------------------------------------------------------------------
const tagsOf = c => [...(c.skills || []), c.category].filter(Boolean);
const hasTag = re => c => tagsOf(c).some(t => re.test(t));
const solutionOf = c => String(c.solution || '');
const solutionUsesWith = c => /\bWITH\b/i.test(solutionOf(c));
// CTEs a solution declares — "WITH a AS (…), b AS (…)" is two.
export const cteDeclarations = c => (solutionUsesWith(c) ? (solutionOf(c).match(/\bAS\s*\(/gi) || []).length : 0);

// The CASE WHEN page (2026-09-07): the population is the radar's Conditional
// Logic skill, the same matcher as the joins / window pages; the sections are
// where the CASE sits in the reference solution. A CASE that no aggregate
// opens on is a label or a bucket column — a row label when the query has no
// GROUP BY (#labels), a bucket that is then grouped when it has one
// (#bucketing); SUM / COUNT / AVG / MIN / MAX opening on CASE is conditional
// aggregation, the pivot (#conditional-aggregation). Two Easy calculated-
// column challenges carry the skill without a CASE and sit in no section.
// CASE in ORDER BY (2 in the bank) and nested CASE (0) were too thin.
export const AGG_OVER_CASE = /\b(?:SUM|COUNT|AVG|MIN|MAX)\s*\(\s*(?:DISTINCT\s+)?CASE\b/i;
export const BARE_CASE = /(?<!\b(?:SUM|COUNT|AVG|MIN|MAX)\s*\(\s*(?:DISTINCT\s+)?)\bCASE\b/i;
// The subqueries page (2026-09-07): a parenthesised SELECT that is not a CTE
// body ("AS ("), read from the solution for the CTE page's reason — the
// Subquery tag misses seven solutions that reach for a derived table or a
// scalar without carrying it (27, 74, 126, 217, 219, 239, 259) and includes
// four that never open a subquery (19 and 134 are LEFT JOIN / NOT IN against a
// literal list; 72 and 238 use only CTEs). Sections: a "(SELECT" that does not
// follow FROM / JOIN / EXISTS is a value or a list — after a comparison,
// inside an expression, after IN (#scalar-and-in); the Correlated tag or an
// EXISTS (SELECT (#correlated); FROM (SELECT / JOIN (SELECT (#derived-tables).
export const NON_CTE_SUBQUERY = /(?<!\bAS\s*)\(\s*SELECT\b/i;
export const SCALAR_OR_IN_SUBQUERY = /(?<!\b(?:AS|FROM|JOIN|EXISTS)\s*)\(\s*SELECT\b/i;
export const EXISTS_SUBQUERY = /\bEXISTS\s*\(\s*SELECT\b/i;
export const DERIVED_TABLE = /\b(?:FROM|JOIN)\s*\(\s*SELECT\b/i;

export const TOPIC_PAGES = {
  'window-functions': {
    population: c => challengeMatchesSkill(c, 'Window Functions'),
    sections: {
      ranking: hasTag(/^(?:ROW_NUMBER|RANK|DENSE_RANK|NTILE|PERCENT_RANK)$/),
      'lag-lead': hasTag(/\b(?:LAG|LEAD)\b/),
      'running-total': hasTag(/Running Total|Frame Clause|ROWS BETWEEN/i),
    },
  },
  joins: {
    population: c => challengeMatchesSkill(c, 'Joins'),
    sections: {
      'left-join': hasTag(/\bLEFT JOIN\b/),
      'self-join': hasTag(/self[- ]join/i),
    },
  },
  cte: {
    population: solutionUsesWith,
    sections: {
      'multiple-ctes': c => cteDeclarations(c) >= 2,
      recursive: c => /\bWITH\s+RECURSIVE\b/i.test(solutionOf(c)),
    },
  },
  'case-when': {
    population: c => challengeMatchesSkill(c, 'Conditional Logic'),
    sections: {
      labels: c => BARE_CASE.test(solutionOf(c)) && !/\bGROUP BY\b/i.test(solutionOf(c)),
      bucketing: c => BARE_CASE.test(solutionOf(c)) && /\bGROUP BY\b/i.test(solutionOf(c)),
      'conditional-aggregation': c => AGG_OVER_CASE.test(solutionOf(c)),
    },
  },
  subqueries: {
    population: c => NON_CTE_SUBQUERY.test(solutionOf(c)),
    sections: {
      'scalar-and-in': c => SCALAR_OR_IN_SUBQUERY.test(solutionOf(c)),
      correlated: c => hasTag(/correlated/i)(c) || EXISTS_SUBQUERY.test(solutionOf(c)),
      'derived-tables': c => DERIVED_TABLE.test(solutionOf(c)),
    },
  },
};

const isPlayableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);

function tally(list) {
  const t = { count: list.length, free: 0, previews: 0, Easy: 0, Medium: 0, Hard: 0, items: [] };
  for (const c of list) {
    t[c.difficulty] = (t[c.difficulty] || 0) + 1;
    if (isPlayableFree(c)) t.free++;
    if (isFreePreview(c)) t.previews++;
    t.items.push({ id: c.id, difficulty: c.difficulty, free: isPlayableFree(c), preview: isFreePreview(c) });
  }
  return t;
}

export function topicFacts(challenges, spec) {
  const population = challenges.filter(spec.population);
  const out = tally(population);
  out.sections = {};
  for (const [id, pred] of Object.entries(spec.sections)) out.sections[id] = tally(population.filter(pred));
  return out;
}

// The numbers a page may state: its own population, split, previews and
// sections, plus every topic page's total and free count (the pages
// cross-link each other with those).
export function topicAllowedNumbers(facts, allTopics) {
  const allowed = new Set([facts.count, facts.free, facts.previews, facts.Easy, facts.Medium, facts.Hard]);
  for (const s of Object.values(facts.sections)) { allowed.add(s.count); allowed.add(s.free); }
  for (const t of Object.values(allTopics)) { allowed.add(t.count); allowed.add(t.free); }
  allowed.delete(0);
  return allowed;
}

const textOf = html => squash(decode(html.replace(/<[^>]+>/g, ' ')));

export function topicHeadProblems(text, facts) {
  const problems = [];
  const want = `${facts.count} Challenges (${facts.free} Free)`;
  const title = /<title>([^<]*)<\/title>/i.exec(text);
  if (!title) problems.push({ index: 0, why: 'no <title>', text: '' });
  else if (!decode(title[1]).includes(want)) problems.push({ index: title.index, why: `<title> does not carry "${want}"`, text: title[1] });
  const og = /<meta property="og:title" content="([^"]*)"/.exec(text);
  if (!og) problems.push({ index: 0, why: 'no og:title', text: '' });
  else if (title && decode(og[1]) !== decode(title[1])) problems.push({ index: og.index, why: 'og:title differs from <title>', text: og[1] });
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(text);
  if (!h1) problems.push({ index: 0, why: 'no <h1>', text: '' });
  else if (!textOf(h1[1]).includes(want)) problems.push({ index: h1.index, why: `<h1> does not carry "${want}"`, text: textOf(h1[1]) });
  return problems;
}

const DIFF_RANK = { Easy: 0, Medium: 1, Hard: 2 };
// Easy → Medium → Hard; inside Hard the free previews come first. Never id order.
const cardRank = (difficulty, preview) => DIFF_RANK[difficulty] * 2 + (difficulty === 'Hard' && !preview ? 1 : 0);

export function topicSectionProblems(text, facts) {
  const problems = [];
  for (const [id, want] of Object.entries(facts.sections)) {
    const open = new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`).exec(text);
    if (!open) { problems.push({ index: 0, why: `no <section id="${id}">`, text: '' }); continue; }
    const at = open.index;
    const close = text.indexOf('</section>', at);
    const body = text.slice(at, close < 0 ? text.length : close);
    const h2 = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(body);
    const heading = h2 ? textOf(h2[1]) : '';
    if (!new RegExp(`\\b${want.count} (?:[\\w-]+ ){0,3}challenges\\b`).test(heading)) {
      problems.push({ index: at, why: `#${id} heading does not say "${want.count} challenges"`, text: heading });
    }
    const freeWord = want.free > 0 ? `${want.free} free` : 'all Pro';
    if (!new RegExp(`\\b${freeWord}\\b`, 'i').test(heading)) {
      problems.push({ index: at, why: `#${id} heading does not say "${freeWord}"`, text: heading });
    }
    const byId = new Map(want.items.map(i => [i.id, i]));
    const cards = [...body.matchAll(/<div class="q-card">([\s\S]*?)<\/div>/g)];
    const seen = [];
    let lastRank = -1;
    for (const card of cards) {
      const idx = at + card.index;
      const diff = [...card[1].matchAll(/class="tag (easy|medium|hard)"/g)].map(m => m[1]);
      const access = [...card[1].matchAll(/class="tag (free|pro)">([^<]*)</g)];
      const links = [...card[1].matchAll(/\?challenge=(\d+)/g)].map(m => Number(m[1]));
      if (diff.length !== 1 || access.length !== 1 || links.length !== 1) {
        problems.push({ index: idx, why: `#${id} card needs one difficulty tag, one Free/Pro tag and one ?challenge= link`, text: card[1] });
        continue;
      }
      const cid = links[0];
      seen.push(cid);
      const item = byId.get(cid);
      if (!item) { problems.push({ index: idx, why: `#${id} lists challenge ${cid}, which the predicate does not select`, text: card[1] }); continue; }
      const difficulty = diff[0][0].toUpperCase() + diff[0].slice(1);
      if (difficulty !== item.difficulty) problems.push({ index: idx, why: `#${id} challenge ${cid} is tagged ${difficulty}, the bank says ${item.difficulty}`, text: card[1] });
      const label = item.preview ? 'Free preview' : item.free ? 'Free' : 'Pro';
      if (access[0][1] !== (item.free ? 'free' : 'pro') || decode(access[0][2]).trim() !== label) {
        problems.push({ index: idx, why: `#${id} challenge ${cid} should be tagged "${label}"`, text: card[1] });
      }
      const rank = cardRank(item.difficulty, item.preview);
      if (rank < lastRank) problems.push({ index: idx, why: `#${id} is out of order at challenge ${cid}: Easy → Medium → Hard, previews before Pro — never id order`, text: card[1] });
      lastRank = Math.max(lastRank, rank);
    }
    const missing = want.items.map(i => i.id).filter(i => !seen.includes(i));
    if (missing.length) problems.push({ index: at, why: `#${id} is missing challenge${missing.length > 1 ? 's' : ''} ${missing.join(', ')}`, text: heading });
    const dupes = seen.filter((v, i) => seen.indexOf(v) !== i);
    if (dupes.length) problems.push({ index: at, why: `#${id} lists ${dupes.join(', ')} twice`, text: heading });
  }
  return problems;
}

// "52 hands-on challenges", "18 are free", "40 Hard", "13 chained-CTE
// challenges", "3 are recursive", "6 free Hard previews": a small number
// followed within three words by a counting noun. Percentages ("70%"),
// hyphenated names ("7-Day", "3-Sigma") and SQL ("6 PRECEDING") do not match.
const TOPIC_CLAIM = /(?<![\w$.,%-])(\d+)(\+?)\s+(?:[\w-]+\s+){0,3}(?:challenges?|exercises|free|Free|Easy|Medium|Hard|recursive|chain\w*|previews?)\b/g;

export function topicNumberProblems(text, allowed) {
  const problems = [];
  for (const s of sentencesOf(text)) {
    for (const m of s.text.matchAll(TOPIC_CLAIM)) {
      const n = Number(m[1]);
      if (m[2]) {
        problems.push({ index: s.index + m.index, why: `"${squash(m[0])}" — no "N+" floors on a topic page; state the exact count`, text: s.text });
      } else if (!allowed.has(n)) {
        problems.push({ index: s.index + m.index, why: `"${squash(m[0])}" — ${n} is not a number the bank gives this page (${[...allowed].sort((a, b) => a - b).join(', ')})`, text: s.text });
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Fixtures — the rules, verified on strings whose verdict is known, so a
// weakened regex fails here even on a day the pages are clean.
// ---------------------------------------------------------------------------
const FIXTURE_FACTS = {
  challengeCount: 257, freeChallengeCount: 195, coreChallengeCount: 185,
  easyCount: 80, mediumCount: 109, hardCount: 68,
};
const FIXTURE_MODAL = { Monthly: '29', Annual: '99', Lifetime: '199' };

describe('helpers (fixtures)', () => {
  it('stripComments blanks a comment but keeps every line where it was', () => {
    const src = 'a\n<!-- 200+ challenges\n10-axis -->\nb <b>250+ challenges</b>';
    const out = stripComments(src);
    expect(out.split('\n').length).toBe(src.split('\n').length);
    expect(out.length).toBe(src.length);
    expect(out).not.toContain('200+');
    expect(out).toContain('250+ challenges');
  });

  it('flatten keeps meta content, drops tags, and does not mistake JS/SQL "<" for a tag', () => {
    const src = '<meta name="description" content="257 challenges"><p>x</p><script>if(i<n){y}</script>';
    const flat = flatten(src);
    expect(flat.length).toBe(src.length);
    expect(flat).toContain('257 challenges');
    expect(flat).toContain('if(i<n){y}');
    expect(flat).not.toContain('<p>');
  });

  it('sentencesOf splits at tags, punctuation and JSON string boundaries, keeping offsets', () => {
    const src = '<td>$19/mo</td><td>SQL Quest Pro $29/mo</td> {"name": "Is it free?", "text": "Yes. 195 free."}';
    const s = sentencesOf(src).map(x => x.text.trim()).filter(Boolean);
    expect(s).toContain('$19/mo');
    expect(s).toContain('SQL Quest Pro $29/mo');
    expect(s).toContain('Is it free?');
    expect(s.some(x => x.startsWith('195 free.'))).toBe(true);
    for (const x of sentencesOf(src)) expect(src.slice(x.index, x.index + x.text.length)).toBe(x.text);
  });

  it('retired literals: each pattern fires on its incident text and not on the bank figure', () => {
    const stale = [
      '10-axis skill radar', '10 axis radar', '10 canonical skills', '10 skills', '10-skill radar',
      '10 SQL skills', '10 SQL categories', '200+ challenges', '200+ SQL challenges', '200+ exercises',
      '200+ hands-on challenges', '200+ problems', '12 company tracks', '12 tracks', '13 companies',
      '60 Easy', '60+ free', "200+ challenge'a sahip", '10 eksenli yetenek radarı', '10 kanonik beceri',
    ];
    for (const s of stale) expect(findRetiredLiterals(s).length, s).toBeGreaterThan(0);
    const fine = [
      '9-axis skill radar', '9 canonical skills', '9-skill radar', '257 challenges', '250+ challenges',
      '22 company pages', '22 tracks', '80 Easy', '195 free', '110 skills', '1200+ challenges',
      '9 eksenli yetenek radarı', '9 kanonik beceri',
    ];
    for (const s of fine) expect(findRetiredLiterals(s), s).toEqual([]);
  });

  it('$19 rules A, B, C — ours is caught, a competitor quote is not', () => {
    const page = (...parts) => parts.join('\n');
    // A: attributed to us in the sentence
    expect(findStalePro19(page('<p>SQL Quest Pro is $19/month.</p><p>StrataScratch is $19/mo.</p>'), FIXTURE_MODAL).map(o => o.why[0])).toEqual(['A']);
    // B: no competitor anywhere on the page
    expect(findStalePro19(page('<p>Upgrade</p><p>$19/mo</p>'), FIXTURE_MODAL).map(o => o.why[0])).toEqual(['B']);
    // C: beside our annual/lifetime price, even on a competitor page
    expect(findStalePro19(page('<p>StrataScratch</p><p>$19/mo · $99/yr · $199 lifetime</p>'), FIXTURE_MODAL).map(o => o.why[0])).toEqual(['C']);
    // A competitor's card on a comparison page: sentence unlabelled, page names them, their own annual price
    expect(findStalePro19(page('<p>StrataScratch</p><p>$19/mo · $97.30/yr · $202.30 lifetime</p>'), FIXTURE_MODAL)).toEqual([]);
    // Head-to-head sentence naming both sides is not guessed at
    expect(findStalePro19(page('<p>StrataScratch Premium is $19/mo; SQL Quest Pro is $29/mo.</p>'), FIXTURE_MODAL)).toEqual([]);
    // Competitor named one sentence earlier in the same run: theirs
    expect(findStalePro19(page('<meta content="Is StrataScratch free? Pricing: $19/mo vs SQL Quest.">'), FIXTURE_MODAL)).toEqual([]);
    // $199 is not $19
    expect(findStalePro19(page('<p>SQL Quest Pro: $199 lifetime, $199/yr equivalent.</p>'), FIXTURE_MODAL)).toEqual([]);
  });

  it('challenge claims: exact bank numbers and true 50-floors pass, everything else fails', () => {
    const ok = [
      '257 challenges', '257 hands-on SQL challenges', '250+ challenges', 'over 250 challenges',
      'more than 250 challenges', '195 free challenges', '195 challenges', '185 core challenges',
      '189 Easy and Medium challenges', '195 of 257 challenges', '150+ free challenges', '257 exercises',
      '12 fraud challenges', '68 Hard challenges', '257-challenge bank', '250+ hands-on SQL exercises',
      '109 exercises, all free', '80 Easy challenges',
    ];
    for (const s of ok) expect(findChallengeClaims(s, FIXTURE_FACTS), s).toEqual([]);
    const bad = [
      '200+ challenges', '250 challenges', '257+ challenges', '150+ challenges', '120 Easy and Medium challenges',
      '300+ challenges', '125+ hands-on challenges', '150+ gamified challenges', '100 challenges', '200+ exercises',
      '120 challenges',
    ];
    for (const s of bad) expect(findChallengeClaims(s, FIXTURE_FACTS).length, s).toBe(1);
    // "problems" is LeetCode's noun on these pages and is not bound.
    expect(findChallengeClaims('LeetCode has ~250 problems', FIXTURE_FACTS)).toEqual([]);
  });

  it('free claims: the free count or a 50-floor of it', () => {
    for (const s of ['195 free', '150+ free', '257 challenges (195 free)', '6 free Hard previews', '75+ free questions', '195 of 257 free challenges', "SQL Quest's 195 of 257 free"]) {
      expect(findChallengeClaims(s, FIXTURE_FACTS), s).toEqual([]);
    }
    for (const s of ['120 free', '100+ free', '200+ free', '195+ free', '150 of 257 free challenges', '195 of 239 free challenges']) {
      expect(findChallengeClaims(s, FIXTURE_FACTS).length, s).toBeGreaterThan(0);
    }
  });

  it('skill claims: hyphenated / canonical / axis forms always; plain "N skills" only in a radar sentence', () => {
    for (const s of ['9-skill radar', '9-axis', '9 axes', '9 canonical skills', '9 canonical SQL skills', 'a radar over 9 skills', 'the 3 skills interviewers test', '9 eksenli radar', '9 kanonik beceri']) {
      expect(findSkillClaims(s, 9), s).toEqual([]);
    }
    for (const s of ['10-skill radar', '10-axis radar', '10 axes', '10 canonical skills', 'a radar over 10 skills', '8-axis', '10 eksenli radar', '10 kanonik beceri']) {
      expect(findSkillClaims(s, 9).length, s).toBe(1);
    }
  });

  it('company claims: pages / tracks / tagged companies bind; sector tracks and unrelated companies do not', () => {
    // 2026-09-07: three company pages still said "22-company interview guide" (hyphenated) after the count moved to 23.
    expect(findCompanyClaims('the 22-company interview guide', 23)).toHaveLength(1);
    expect(findCompanyClaims('the 23-company interview guide', 23)).toEqual([]);
    for (const s of ['22 company pages', '22 company-specific landings', '22 company interview pages', '22 tracks (FAANG, fintech)', 'company tags across 22 companies', '3 sector tracks', 'questions from tier-1 companies', 'used at 500 companies']) {
      expect(findCompanyClaims(s, 22), s).toEqual([]);
    }
    for (const s of ['12 company tracks', '13 company pages', '12 tracks (FAANG, marketplaces)', 'company-tagged for 13 companies']) {
      expect(findCompanyClaims(s, 22).length, s).toBe(1);
    }
  });

  it('sector claims: the per-sector / per-dataset count exactly; the bank total is not a sector claim', () => {
    const allowed = sectorAllowed({
      sectors: [
        { id: 'finans', challengeCount: 32 },
        { id: 'gayrimenkul', challengeCount: 20 },
        { id: 'uretim', challengeCount: 20 },
      ],
      datasets: { finans_banking: 27, finans_fraud: 5, gayrimenkul_nyc: 20, uretim_industrial: 20 },
      sectorChallengeCount: 72,
    });
    for (const s of [
      '32 challenges on FDIC BankFind data and a fraud-transactions ledger', '32 SQL challenges on real FDIC BankFind public data',
      '27 on FDIC BankFind data', '32 challenges — 27 on real FDIC data and 5 on a synthetic fraud-transactions ledger',
      '20 challenges on NYC OpenData', '20 SQL challenges on UCI AI4I 2020', 'All 72 industry challenges',
      'three industry tracks (72 challenges)', '257 challenges on real interview questions', 'FDIC data on 200 US banks',
    ]) expect(findSectorClaims(s, allowed), s).toEqual([]);
    for (const s of [
      '20 challenges on FDIC BankFind data', '20 SQL challenges on real FDIC BankFind public data', '20 on FDIC data',
      '15 challenges on NYC OpenData', '25 challenges on UCI AI4I 2020', 'All 60 industry challenges',
      'three industry tracks (60 challenges)', '4 on a synthetic fraud ledger',
    ]) expect(findSectorClaims(s, allowed).length, s).toBe(1);
  });

  it('radar inspection: vertex count, spoke count and legend labels bind to the skill list', () => {
    const skills = ['A', 'B', 'C'];
    const svg = (pts, spokes) => `<svg class="cm-radar"><polygon points="${pts}"/>${'<line/>'.repeat(spokes)}</svg>`;
    const legend = label => `<div class="cm-lg-row"><span class="cm-dot-s"></span>${label}<span class="cm-lg-val">1</span></div>`;
    expect(inspectRadars(svg('1,1 2,2 3,3', 3) + legend('A') + legend('B'), skills)).toEqual([]);
    expect(inspectRadars(svg('1,1 2,2 3,3 4,4', 3), skills).map(p => p.why)).toEqual(['polygon has 4 vertices, the radar has 3 axes']);
    expect(inspectRadars(svg('1,1 2,2 3,3', 4), skills).map(p => p.why)).toEqual(['4 spokes, the radar has 3 axes']);
    expect(inspectRadars(legend('SELECT Basics'), skills).map(p => p.why)).toEqual(['legend label "SELECT Basics" is not a canonical skill']);
    expect(inspectRadars(legend('Subqueries &amp; CTEs'), ['Subqueries & CTEs'])).toEqual([]);
  });

  it('pricing guard: ours must match the modal; competitor sentences and mixed sentences are skipped', () => {
    for (const s of [
      'Pro ($29/mo, $99/yr, $199 lifetime) unlocks Hard.', 'SQL Quest Pro is $29/month or $199 one-time.',
      'Pro is $8.25/mo billed yearly.', 'Pro: $29/ay, $99/yıl, $199 lifetime.', 'StrataScratch is $19/month.',
      'DataLemur Premium $15/month vs SQL Quest Pro $29/month.', 'Pro at $29 a month.',
      // the competitor is named one sentence earlier in the same meta description
      '<meta content="Is StrataScratch free? Sept 2026 pricing: $19/mo, $97.30/yr vs SQL Quest\'s 195 free.">',
      // …but a tag boundary ends the run: this $19 is ours again
      '<p>StrataScratch is $19/mo.</p><p>SQL Quest Pro is $29/mo.</p>',
    ]) expect(findPriceOffences(s, FIXTURE_MODAL), s).toEqual([]);
    for (const s of [
      'SQL Quest Pro is $19/month.', 'Pro ($19/mo, $99/yr, $199 lifetime)', 'Pro is $35 per month.',
      'SQL Quest: $29/month, $89/year.', 'Pro is $149 lifetime.', 'Pro for $299 one-time.',
      '<p>StrataScratch is $19/mo.</p><p>SQL Quest Pro is $19/mo.</p>',
    ]) expect(findPriceOffences(s, FIXTURE_MODAL).length, s).toBe(1);
  });
});


describe('topic-page helpers (fixtures)', () => {
  const item = (id, difficulty, preview = false) => ({ id, difficulty, free: difficulty !== 'Hard' || preview, preview });
  const FACTS = {
    count: 5, free: 3, previews: 1, Easy: 1, Medium: 2, Hard: 2,
    sections: { s1: { count: 3, free: 2, previews: 1, Easy: 0, Medium: 1, Hard: 2, items: [item(3, 'Medium'), item(7, 'Hard', true), item(9, 'Hard')] } },
  };
  const card = (diff, access, label, id) => `<div class="q-card"><span class="tag ${diff}">${diff}</span> <span class="tag ${access}">${label}</span><h3>T</h3><a href="/app.html?challenge=${id}">Try</a></div>`;
  const M = card('medium', 'free', 'Free', 3);
  const P = card('hard', 'free', 'Free preview', 7);
  const H = card('hard', 'pro', 'Pro', 9);
  const head = (t = '5 Challenges (3 Free)', og = t, h1 = t) => `<title>X Practice — ${t}</title><meta property="og:title" content="X Practice — ${og}"><h1>X Practice — <span>${h1}</span></h1>`;
  const section = (h2, ...cards) => `<section class="sec" id="s1"><h2>${h2}</h2><div class="q-grid">${cards.join('')}</div></section>`;
  const good = head() + section('S1: 3 challenges (2 free)', M, P, H);

  it('head: title, og:title and H1 must agree and carry "N Challenges (M Free)"', () => {
    expect(topicHeadProblems(good, FACTS)).toEqual([]);
    expect(topicHeadProblems(head('4 Challenges (3 Free)', '4 Challenges (3 Free)', '4 Challenges (3 Free)'), FACTS).map(p => p.why)).toEqual([
      '<title> does not carry "5 Challenges (3 Free)"', '<h1> does not carry "5 Challenges (3 Free)"',
    ]);
    expect(topicHeadProblems(head('5 Challenges (3 Free)', '5 Challenges (2 Free)'), FACTS).map(p => p.why)).toEqual(['og:title differs from <title>']);
  });

  it('sections: heading counts, exact card set, tags from the bank, Easy → Medium → Hard with previews first', () => {
    expect(topicSectionProblems(good, FACTS)).toEqual([]);
    const why = html => topicSectionProblems(html, FACTS).map(p => p.why);
    expect(why(head())).toEqual(['no <section id="s1">']);
    expect(why(head() + section('S1: 2 challenges (2 free)', M, P, H))).toEqual(['#s1 heading does not say "3 challenges"']);
    expect(why(head() + section('S1: 3 challenges', M, P, H))).toEqual(['#s1 heading does not say "2 free"']);
    // id order (9 before 3) is the raw-array trap
    expect(why(head() + section('S1: 3 challenges (2 free)', H, M, P))).toEqual([
      '#s1 is out of order at challenge 3: Easy → Medium → Hard, previews before Pro — never id order',
      '#s1 is out of order at challenge 7: Easy → Medium → Hard, previews before Pro — never id order',
    ]);
    expect(why(head() + section('S1: 3 challenges (2 free)', M, H, P))).toEqual([
      '#s1 is out of order at challenge 7: Easy → Medium → Hard, previews before Pro — never id order',
    ]);
    expect(why(head() + section('S1: 3 challenges (2 free)', M, P))).toEqual(['#s1 is missing challenge 9']);
    expect(why(head() + section('S1: 3 challenges (2 free)', M, P, H, card('hard', 'pro', 'Pro', 11)))).toEqual(['#s1 lists challenge 11, which the predicate does not select']);
    expect(why(head() + section('S1: 3 challenges (2 free)', M, card('hard', 'free', 'Free', 7), H))).toEqual(['#s1 challenge 7 should be tagged "Free preview"']);
    expect(why(head() + section('S1: 3 challenges (2 free)', card('easy', 'free', 'Free', 3), P, H))).toEqual(['#s1 challenge 3 is tagged Easy, the bank says Medium']);
    expect(why(head() + section('S1: 3 challenges (2 free)', M, P, H, H))).toEqual(['#s1 lists 9 twice']);
    const allPro = { ...FACTS, sections: { s1: { count: 1, free: 0, previews: 0, Easy: 0, Medium: 0, Hard: 1, items: [item(9, 'Hard')] } } };
    expect(topicSectionProblems(head() + section('S1: 1 challenge (all Pro)', H), allPro).map(p => p.why)).toEqual(['#s1 heading does not say "1 challenges"']);
    expect(topicSectionProblems(head() + section('S1: 1 challenges (all Pro)', H), allPro)).toEqual([]);
  });

  it('prose numbers: only the page\'s own bank numbers, never an "N+" floor', () => {
    const allowed = topicAllowedNumbers(FACTS, { other: { count: 64, free: 42 } });
    expect([...allowed].sort((a, b) => a - b)).toEqual([1, 2, 3, 5, 42, 64]);
    for (const s of [
      '5 hands-on challenges', '3 are free to play', '1 Easy, 2 Medium, 2 Hard', '3 challenges (2 free)', '1 free Hard preview',
      '64 challenges, 42 free', '2 chained-CTE challenges', '3 are recursive', 'approximately 70% of hard questions',
      'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW', '7-Day Rolling Revenue', '3-Sigma Anomaly', 'Top 3 Salary Tiers (DENSE_RANK)',
      '© 2026 SQL Quest', 'September 2026.', 'a top-10 CTE', 'HAVING COUNT >= 3.', '5+ Transactions in 5 Minutes',
    ]) expect(topicNumberProblems(s, allowed), s).toEqual([]);
    for (const s of ['30+ challenges', '12 challenges', '4 free', '40 Hard', '20 free previews', '6 chained challenges', '12 SQL window function challenges']) {
      expect(topicNumberProblems(s, allowed).length, s).toBe(1);
    }
  });

  it('CASE / subquery predicates: an aggregate over CASE is not a bare CASE; a CTE body is not a subquery', () => {
    const agg = 'SELECT SUM(CASE WHEN x THEN 1 ELSE 0 END) FROM t';
    expect(AGG_OVER_CASE.test(agg)).toBe(true);
    expect(BARE_CASE.test(agg)).toBe(false);
    expect(BARE_CASE.test('SELECT ROUND(100.0 * SUM(\n  CASE WHEN x THEN 1 END), 1) FROM t')).toBe(false);
    expect(BARE_CASE.test('SELECT COUNT(DISTINCT CASE WHEN x THEN id END) FROM t')).toBe(false);
    expect(BARE_CASE.test('SELECT CASE WHEN x THEN 1 END AS flag FROM t')).toBe(true);
    expect(BARE_CASE.test('SELECT name FROM t ORDER BY CASE WHEN x THEN 0 ELSE 1 END')).toBe(true);
    expect(AGG_OVER_CASE.test('SELECT CASE WHEN x THEN 1 END AS flag FROM t')).toBe(false);
    expect(NON_CTE_SUBQUERY.test('WITH a AS (SELECT 1) SELECT * FROM a')).toBe(false);
    expect(NON_CTE_SUBQUERY.test('WITH a AS (\n  SELECT 1) SELECT * FROM a')).toBe(false);
    expect(NON_CTE_SUBQUERY.test('SELECT * FROM t WHERE x > (SELECT AVG(x) FROM t)')).toBe(true);
    expect(NON_CTE_SUBQUERY.test('WITH a AS (SELECT 1) SELECT * FROM a WHERE x IN (SELECT y FROM b)')).toBe(true);
    expect(SCALAR_OR_IN_SUBQUERY.test('SELECT * FROM t WHERE x IN (SELECT y FROM b)')).toBe(true);
    expect(SCALAR_OR_IN_SUBQUERY.test('SELECT * FROM (SELECT 1) d')).toBe(false);
    expect(SCALAR_OR_IN_SUBQUERY.test('SELECT * FROM t WHERE NOT EXISTS (SELECT 1 FROM b)')).toBe(false);
    expect(DERIVED_TABLE.test('SELECT * FROM t JOIN (SELECT 1) d ON 1 = 1')).toBe(true);
    expect(DERIVED_TABLE.test('SELECT * FROM t WHERE x IN (SELECT y FROM b)')).toBe(false);
    expect(EXISTS_SUBQUERY.test('SELECT * FROM t WHERE NOT EXISTS (SELECT 1 FROM b)')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The live pages
// ---------------------------------------------------------------------------
let pages;      // [{ file, raw, text }]
let facts;      // collectBankFacts()
let modal;      // { Monthly, Annual, Lifetime } from the Pro modal
let topics;     // { slug: topicFacts } for every TOPIC_PAGES entry

const collect = fn => {
  const out = [];
  for (const p of pages) {
    for (const o of fn(p)) out.push({ file: p.file, line: lineAt(p.text, o.index), why: o.why, text: o.text });
  }
  return out;
};

beforeAll(() => {
  pages = listPages().map(file => {
    const raw = read(file);
    return { file, raw, text: stripComments(raw) };
  });
  facts = collectBankFacts(ROOT);
  modal = readProModal(read('src', 'app.jsx'));
  const bank = loadBank(ROOT).challengesData;   // the FULL bank: sector-challenges.js appends itself
  topics = Object.fromEntries(Object.entries(TOPIC_PAGES).map(([slug, spec]) => [slug, topicFacts(bank, spec)]));
});

describe('page set', () => {
  it('loads the root pages, the challenge topic pages, the blog, the weekly template and the Coach mock', () => {
    const files = pages.map(p => p.file);
    expect(files.length).toBeGreaterThan(60);
    for (const f of ['src/index.html', 'src/weekly.html', 'src/blog/index.html', 'scripts/coach-mock-snippet.html']) {
      expect(files, f).toContain(f);
    }
    expect(files.filter(f => f.startsWith(TOPIC_DIR)).length).toBeGreaterThanOrEqual(3);
    expect(files.filter(f => /-sql-interview\.html$/.test(f)).length).toBe(facts.companies.length);
  });

  it('every JSON-LD block on every page parses (the FAQ answers assistants quote live there)', () => {
    const broken = [];
    let blocks = 0;
    for (const p of pages) {
      for (const m of p.raw.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
        blocks++;
        try { JSON.parse(m[1]); } catch (e) { broken.push(`  ${p.file}:${lineAt(p.raw, m.index)}  ${e.message}`); }
      }
    }
    expect(blocks).toBeGreaterThan(50);
    expect(broken, `invalid JSON-LD:\n${broken.join('\n')}`).toEqual([]);
  });
});

describe('the bank facts this test binds to', () => {
  it('are the generator\'s own, internally consistent, and the 9 canonical skills', () => {
    expect(facts.challengeCount).toBe(facts.easyCount + facts.mediumCount + facts.hardCount);
    expect(facts.freeChallengeCount).toBe(facts.easyCount + facts.mediumCount + facts.freePreviewCount);
    expect(facts.coreChallengeCount + facts.sectorChallengeCount).toBe(facts.challengeCount);
    // The per-dataset split partitions the sector bank, and every sector the
    // sector rule names has shipped (sectorAllowed would otherwise bind to
    // undefined and pass nothing).
    expect(Object.values(facts.datasets).reduce((a, b) => a + b, 0)).toBe(facts.sectorChallengeCount);
    for (const ns of Object.values(sectorAllowed(facts))) for (const n of ns) expect(n).toBeGreaterThan(0);
    expect(facts.skills).toEqual([...CANONICAL_SKILLS]);
    expect(CANONICAL_SKILLS.length).toBe(9);
    expect(facts.companies.length).toBeGreaterThan(0);
    // The floor rule below only means something while the bank is above it.
    expect(facts.challengeCount).toBeGreaterThanOrEqual(100);
  });

  it('the Pro modal in app.jsx has all three plans', () => {
    expect(Object.keys(modal).sort()).toEqual(['Annual', 'Lifetime', 'Monthly']);
    for (const v of Object.values(modal)) expect(v).toMatch(/^\d+$/);
  });
});

describe('1. retired literals — none outside an HTML comment', () => {
  it.each(RETIRED_LITERALS.map(r => [r.re.source, r]))('no page says /%s/', (_, rule) => {
    const offenders = collect(p => findRetiredLiterals(p.text).filter(o => o.why === rule.why));
    expect(offenders, `${rule.why}\n${report(offenders)}`).toEqual([]);
  });

  it('no page attributes the stale $19 monthly price to SQL Quest / Pro (rules A, B, C above)', () => {
    const offenders = collect(p => findStalePro19(p.text, modal));
    expect(offenders, `stale $19 Pro price:\n${report(offenders)}`).toEqual([]);
  });

  it('no page names a retired skill (SELECT Basics, Filter & Sort, JOIN Tables, CASE Statements)', () => {
    const offenders = collect(p => findRetiredSkillNames(p.text));
    expect(offenders, `retired 10-skill names:\n${report(offenders)}`).toEqual([]);
  });
});

describe('2. every count a page states is the bank\'s count', () => {
  it('"N challenges" (N ≥ 100) is the total, the free / core / Easy+Medium count, or a true 50-floor written "N+"', () => {
    const offenders = collect(p => findChallengeClaims(p.text, facts));
    expect(offenders, `challenge counts off the bank (total ${facts.challengeCount}, free ${facts.freeChallengeCount}):\n${report(offenders)}`).toEqual([]);
  });

  it('"N-skill" / "N-axis" / "N canonical skills" is the canonical skill count', () => {
    const offenders = collect(p => findSkillClaims(p.text, CANONICAL_SKILLS.length));
    expect(offenders, `skill counts off the radar (${CANONICAL_SKILLS.length}):\n${report(offenders)}`).toEqual([]);
  });

  it('"N company pages / tracks / tagged companies" is the company-page count', () => {
    const offenders = collect(p => findCompanyClaims(p.text, facts.companies.length));
    expect(offenders, `company counts off src/*-sql-interview.html (${facts.companies.length}):\n${report(offenders)}`).toEqual([]);
  });

  it('"N challenges on FDIC / NYC OpenData / UCI", "N on a synthetic", "N industry challenges" is the sector or dataset count', () => {
    const allowed = sectorAllowed(facts);
    const offenders = collect(p => findSectorClaims(p.text, allowed));
    expect(offenders, `sector counts off src/data/sector-challenges.js (${JSON.stringify(allowed)}):\n${report(offenders)}`).toEqual([]);
  });

  it('every radar mock has one axis per canonical skill and only canonical legend labels', () => {
    const offenders = collect(p => inspectRadars(p.text, [...CANONICAL_SKILLS]));
    expect(offenders, `radar mocks:\n${report(offenders)}`).toEqual([]);
    // The homepage and the snippet both carry the mock; if neither does, the
    // check above passed vacuously and something else moved.
    const withRadar = pages.filter(p => /<svg class="cm-radar"/.test(p.text)).map(p => p.file);
    expect(withRadar).toContain('src/index.html');
    expect(withRadar).toContain('scripts/coach-mock-snippet.html');
  });

  it('the bindings are not vacuous — the pages do state each number', () => {
    // If no page states the count, the checks above prove nothing. Each
    // number is expected in at least one sentence somewhere on the site.
    const all = pages.map(p => p.text).join('\n');
    expect(all).toMatch(new RegExp(`\\b${facts.challengeCount} (?:[\\w-]+ ){0,3}challenges\\b`));
    expect(all).toMatch(new RegExp(`\\b${facts.freeChallengeCount} free\\b`));
    expect(all).toMatch(new RegExp(`\\b${CANONICAL_SKILLS.length}-skill\\b`));
    expect(all).toMatch(new RegExp(`\\b${facts.companies.length} company (?:pages|tracks)\\b`));
    const finans = facts.sectors.find(s => s.id === 'finans').challengeCount;
    expect(all).toMatch(new RegExp(`\\b${finans} challenges on FDIC\\b`));
    expect(all).toMatch(new RegExp(`\\b${facts.sectorChallengeCount} industry challenges\\b`));
  });
});

describe('3. pricing — what a page attributes to SQL Quest / Pro is the modal price', () => {
  it('monthly / annual / lifetime figures in a SQL Quest or Pro sentence match src/app.jsx', () => {
    const offenders = collect(p => findPriceOffences(p.text, modal));
    expect(offenders, `prices off the Pro modal ($${modal.Monthly}/mo · $${modal.Annual}/yr · $${modal.Lifetime}):\n${report(offenders)}`).toEqual([]);
  });

  it('is not vacuous — the pages do quote the modal price', () => {
    const all = pages.map(p => p.text).join('\n');
    expect(all).toMatch(new RegExp(`\\$${modal.Monthly}/mo(?:nth)?\\b`));
    expect(all).toMatch(new RegExp(`\\$${modal.Lifetime} (?:lifetime|one-time)\\b`));
  });
});

describe('4. challenge topic pages — every count is the bank\'s', () => {
  const topicPages = () => pages.filter(p => p.file.startsWith(TOPIC_DIR));
  const slugOf = p => p.file.slice(TOPIC_DIR.length + 1, -'.html'.length);
  const collectTopics = fn => {
    const out = [];
    for (const p of topicPages()) {
      const t = topics[slugOf(p)];
      if (!t) continue;
      for (const o of fn(p, t)) out.push({ file: p.file, line: lineAt(p.text, o.index), why: o.why, text: o.text });
    }
    return out;
  };

  it('every src/challenges page has a TOPIC_PAGES spec, and every spec a page', () => {
    expect(topicPages().map(slugOf).sort()).toEqual(Object.keys(TOPIC_PAGES).sort());
  });

  it('the predicates select real, non-trivial sets — populations, sections, and at least one free challenge per page', () => {
    for (const [slug, t] of Object.entries(topics)) {
      expect(t.count, `${slug} population`).toBeGreaterThanOrEqual(5);
      expect(t.free, `${slug} free`).toBeGreaterThan(0);
      expect(t.count).toBe(t.Easy + t.Medium + t.Hard);
      expect(t.free).toBe(t.Easy + t.Medium + t.previews);
      expect(Object.keys(t.sections).length, `${slug} sections`).toBeGreaterThan(0);
      for (const [id, sct] of Object.entries(t.sections)) {
        expect(sct.count, `${slug}#${id}`).toBeGreaterThan(0);
        expect(sct.count, `${slug}#${id} inside the population`).toBeLessThanOrEqual(t.count);
      }
    }
  });

  it('<title>, og:title and the H1 agree and carry the population count and free count', () => {
    const offenders = collectTopics((p, t) => topicHeadProblems(p.text, t));
    expect(offenders, `topic-page heads:\n${report(offenders)}`).toEqual([]);
  });

  it('each section exists, states its count, and lists exactly the predicate\'s challenges — Easy → Medium → Hard, previews before Pro', () => {
    const offenders = collectTopics((p, t) => topicSectionProblems(p.text, t));
    expect(offenders, `topic-page sections:\n${report(offenders)}`).toEqual([]);
  });

  it('every small count in the prose is one of the bank\'s numbers for that page, never an "N+" floor', () => {
    const offenders = collectTopics((p, t) => topicNumberProblems(p.text, topicAllowedNumbers(t, topics)));
    expect(offenders, `topic-page prose:\n${report(offenders)}`).toEqual([]);
  });

  it('is not vacuous — the pages do state the counts and list the cards', () => {
    for (const p of topicPages()) {
      const t = topics[slugOf(p)];
      expect(p.text, p.file).toMatch(new RegExp(`\\b${t.count} Challenges \\(${t.free} Free\\)`));
      expect((p.text.match(/<div class="q-card">/g) || []).length, p.file).toBe(
        Object.values(t.sections).reduce((n, s) => n + s.count, 0),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Topic counts quoted on OTHER pages. The cheat sheet, the FAANG guide and
// three tutorials link the topic pages with a count in the anchor ("Browse
// 30+ JOIN challenges", "33 window function challenges") — floors and figures
// typed once and never revisited: on 2026-09-07 the joins page held 64, the
// window page 52. Rule: a number next to a topic word and "challenges /
// exercises / problems" is never an "N+" floor, and from 6 upward must be one
// of that topic's bank numbers (population, free, or a section count — the
// same set the topic page itself may state). Small hand-picked samples
// ("3 fresh Hard window-function challenges") stay allowed.
// ---------------------------------------------------------------------------
export const TOPIC_WORDS = [
  { re: /\bjoins?\b/i, slug: 'joins' },
  { re: /\bwindow\b/i, slug: 'window-functions' },
  { re: /\bCTEs?\b/, slug: 'cte' },
  { re: /\bCASE\b|\bConditional Logic\b|\bconditional-aggregation\b/, slug: 'case-when' },
  { re: /\bsubquer/i, slug: 'subqueries' },
];
const TOPIC_COUNT_RE = /\b(\d+)(\+?)\s+(?:[\w-]+\s+){0,2}?((?:JOIN|join|window|CTE|CASE|subquer|conditional-aggregation|Conditional Logic)[\w-]*)\s+(?:function\s+)?(?:challenges|exercises|problems)\b/g;

export function findTopicCountClaims(text, allTopics) {
  const offenders = [];
  const seen = [];
  TOPIC_COUNT_RE.lastIndex = 0;
  let m;
  while ((m = TOPIC_COUNT_RE.exec(text))) {
    const n = Number(m[1]);
    const word = m[3];
    const topic = TOPIC_WORDS.find(t => t.re.test(word));
    if (!topic || !allTopics[topic.slug]) continue;
    seen.push({ index: m.index, n, slug: topic.slug, text: m[0] });
    if (m[2] === '+') {
      offenders.push({ index: m.index, why: `"${m[0]}" — a floor; the ${topic.slug} page states the bank's exact numbers`, text: m[0] });
      continue;
    }
    if (n >= 6 && !topicAllowedNumbers(allTopics[topic.slug], allTopics).has(n)) {
      offenders.push({ index: m.index, why: `"${m[0]}" — ${n} is not a number the bank gives the ${topic.slug} page (total ${allTopics[topic.slug].count}, free ${allTopics[topic.slug].free})`, text: m[0] });
    }
  }
  return { offenders, seen };
}

describe('5. topic counts quoted on other pages are the topic page\'s numbers', () => {
  const otherPages = () => pages.filter(p => !p.file.startsWith(TOPIC_DIR));

  it('fixture: a floor fails, a stale figure fails, an exact bank number and a small sample pass', () => {
    const t = { joins: { count: 64, free: 42, previews: 1, Easy: 4, Medium: 37, Hard: 23, sections: { 'left-join': { count: 12, free: 10 } } } };
    expect(findTopicCountClaims('Browse 30+ JOIN challenges', t).offenders).toHaveLength(1);
    expect(findTopicCountClaims('Practice 33 join challenges', t).offenders).toHaveLength(1);
    expect(findTopicCountClaims('Browse 64 JOIN challenges and 12 LEFT JOIN exercises', t).offenders).toEqual([]);
    expect(findTopicCountClaims('3 fresh Hard join challenges', t).offenders).toEqual([]);
    expect(findTopicCountClaims('writing 30+ challenges from cold memory', t).seen).toEqual([]);
  });

  it('no page quotes a topic count that is a floor or is not the bank\'s', () => {
    const offenders = collect(p => findTopicCountClaims(p.text, topics).offenders).filter(o => !o.file.startsWith(TOPIC_DIR));
    expect(offenders, `topic counts on other pages:\n${report(offenders)}`).toEqual([]);
  });

  it('is not vacuous — the cheat sheet, the FAANG guide and the tutorials do quote topic counts', () => {
    const seen = otherPages().flatMap(p => findTopicCountClaims(p.text, topics).seen.map(s => ({ ...s, file: p.file })));
    expect(seen.length).toBeGreaterThanOrEqual(8);
    for (const f of ['src/sql-cheat-sheet.html', 'src/blog/faang-sql-interview-guide.html', 'src/blog/window-functions-tutorial.html']) {
      expect(seen.some(s => s.file === f), f).toBe(true);
    }
  });
});

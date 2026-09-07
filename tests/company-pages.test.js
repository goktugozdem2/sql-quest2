// SQL Quest — a company page may state what the bank holds, and nothing else
//
// THE INCIDENT (2026-09-07)
//
// Twenty-two of the twenty-three src/*-sql-interview.html pages asserted three
// classes of thing nobody had sourced, and they are the pages AI assistants
// quote back verbatim (Perplexity did exactly that with llms.txt on 2026-09-06):
//
//   1. format cards stating a duration and a process as fact — "60-minute SQL
//      round, typically pair-programming style", "a typical Meta SQL screen is
//      45 minutes with 2-3 SQL questions", "45-minute screen via Google Meet
//      with a shared Google Doc or CoderPad". No source, on any of them;
//   2. six invented questions per page (`const FQ`), rendered under the
//      company's own logo and name — "Calculate net new MRR split by new,
//      expansion, contraction, and churn". None corresponded to a challenge in
//      the bank, so a reader who clicked through found something else;
//   3. a percentage breakdown of that company's interview (`const TOPICS`) —
//      "35% MRR & Revenue Metrics", "25% Cohort Retention". Precise-looking,
//      entirely made up, and the worst of the three because it reads as
//      measurement.
//
// The FAQPage JSON-LD repeated all three, which is the copy an assistant
// actually reads, so a page fixed only in its visible text was not fixed.
//
// WHY THIS IS ITS OWN FILE, not another describe() in site-counts.test.js:
// that guard binds *counts* to the bank across every public page — one
// question ("is this number current?") asked of 90-odd files. This one asks a
// different question ("is this claim sourced, and does it resolve to a real
// challenge?") of one page family, needs the company tag map and the canonical
// skill map that site-counts never loads, and would push a 1,300-line file
// past the point where a failure tells you where to look. Separate file,
// separate failure output.
//
// Every rule is a pure function over a string, exercised on fixtures below, so
// the guard is verifiable on a day every page happens to be clean.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadBank, readCompanyPages } from '../scripts/build-llms-txt.js';
import { SKILL_TO_RADAR, mapTopicToSkill, CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (...p) => fs.readFileSync(join(ROOT, ...p), 'utf8');

// ---------------------------------------------------------------------------
// The one exemption, named, with its reason.
//
// Capital One is the only page that carries dated, citable sources for a
// company's screen: candidate reports on Blind (December 2021, November 2022,
// June 2025) and interview-prep guides dated August 2025 to February 2026, all
// listed on the page itself, in its FAQ and in its JSON-LD, and all phrased
// "as described publicly in September 2026 … Capital One does not publish the
// format". Because it says where every specific comes from, it — and only it —
// may state a duration and an assessment platform. Adding a second name here
// requires adding a second sources list to that page first.
// ---------------------------------------------------------------------------
export const SOURCED_PAGES = {
  'capital-one-sql-interview': 'dated Blind reports (2021-2025) + prep guides (Aug 2025 - Feb 2026), cited on the page',
};

// ---------------------------------------------------------------------------
// Text helpers.
//
// Deliberately a local copy of the three transforms site-counts.test.js uses
// rather than an import: importing another *.test.js re-registers its suites
// inside this file, and a shared tests/lib/ for thirty lines of pure string
// work buys less than it costs. Each transform keeps the string the same
// length, so an offset in the transformed text is a line number in the source.
// ---------------------------------------------------------------------------
export function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
}

// Tags become same-length runs of NUL, except the value of a `content`
// attribute: meta / og / twitter descriptions are the first thing a crawler
// quotes, and a duration claim can live in one.
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

// A "sentence" is a run between tags, split further at sentence punctuation and
// at JS/JSON string boundaries — the card text and the FAQ answers live inside
// quoted strings in a <script>, which is where most of the claims were.
export function sentencesOf(text) {
  const flat = flatten(text);
  const out = [];
  const re = /\0+|(?<=[.!?][")'\]]*)\s+|["']\s*[,:]\s*["']|\n{2,}/g;
  let last = 0;
  for (const m of flat.matchAll(re)) {
    if (m.index > last) out.push({ text: flat.slice(last, m.index), index: last });
    last = m.index + m[0].length;
  }
  if (last < flat.length) out.push({ text: flat.slice(last), index: last });
  return out;
}

const decode = s => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&rsquo;/g, '’')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const squash = s => s.replace(/\s+/g, ' ').trim();

function lineAt(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function report(offenders) {
  return offenders
    .map(o => `  ${o.file}:${o.line}  [${o.why}] ${squash(o.text).slice(0, 170)}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// 1. Unsourced format claims
//
// On a page whose entire subject is one company, an unattributed "60-minute
// SQL round" reads as that company's round — so the rule does not require the
// company name to be adjacent. Three shapes:
//
//   A. a duration in a sentence that also names a round / screen / loop;
//   B. an interview platform or process by name;
//   C. a count of rounds, screens or questions.
//
// (C) fires on "N questions" in a format sentence ("45 minutes with 2-3 SQL
// questions") AND on "N questions" that carries the company name, wherever it
// sits — "Practice 27 Airbnb Questions", "the 22 Meta-tagged SQL questions",
// "32 Google-style questions" were hero buttons and meta descriptions, and a
// count of questions attached to a company name is a claim about that
// company's interview even with no format word nearby. A count of OUR
// exercises that names nobody ("95 runnable questions") is not that claim.
//
// A duration with no format word around it is NOT a claim about an interview —
// "sessionize raw play events into 30-minute sessions" is a property of a
// dataset — so (A) needs both.
// ---------------------------------------------------------------------------
export const FORMAT_CONTEXT = /\b(?:rounds?|screens?|screening|interviews?|loops?|onsite|on-site|take-?homes?|assessments?|panels?|pair[- ]program\w*|live[- ]cod\w*|whiteboard|shared editor)\b/i;
export const DURATION = /\b\d+(?:\s*(?:-|–|—|to|or)\s*\d+)?\s*[- ]?(?:minutes?|mins?|hours?|hrs?)\b/gi;
export const PLATFORM = /\b(?:CoderPad|CodeSignal|HackerRank|Karat|Codility|HireVue|Google Meet|Google Docs?|Zoom|Snowsight|pair[- ]programming|take-?home|whiteboard|shared editor|live[- ]coding)\b/gi;
export const ROUND_COUNT = /\b(?:\d+(?:\s*(?:-|–|to)\s*\d+)?|one|two|three)\s+(?:dedicated\s+)?(?:SQL\s+)?(?:rounds?|screens?)\b/gi;
export const QUESTION_COUNT = /\b\d+(?:\s*(?:-|–|to)\s*\d+)?\s+(?:[A-Za-z][\w'&-]*\s+){0,2}questions?\b/gi;

// "Capital One" within 300 characters before a platform name is the carve-out:
// the sibling strip and the format card both point at the one page that has a
// dated source for the platform it names, and saying "the Capital One
// CodeSignal page" is a citation, not a claim about anybody else.
const CITES_SOURCED = (text, at) => /Capital One/.test(text.slice(Math.max(0, at - 300), at));

export function findFormatClaims(text, company = '') {
  const offenders = [];
  const push = (index, why, t) => offenders.push({ index, why, text: t });
  const namesCompany = company ? new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') : null;
  for (const s of sentencesOf(text)) {
    if (FORMAT_CONTEXT.test(s.text)) {
      for (const m of s.text.matchAll(DURATION)) {
        push(s.index + m.index, `unsourced duration "${squash(m[0])}" in a sentence about a round/screen`, s.text);
      }
    }
    for (const m of s.text.matchAll(ROUND_COUNT)) {
      push(s.index + m.index, `unsourced round count "${squash(m[0])}"`, s.text);
    }
    for (const m of s.text.matchAll(QUESTION_COUNT)) {
      const attributed = namesCompany && namesCompany.test(m[0]);
      if (!attributed && !FORMAT_CONTEXT.test(s.text)) continue;
      push(s.index + m.index, `"${squash(m[0])}" — a count of questions ${attributed ? 'attributed to the company' : 'in a sentence about a round/screen'}; ours are challenges, and nobody has sourced a company's question count`, s.text);
    }
  }
  // Platforms are matched on the whole text, not per sentence: the citation
  // carve-out needs to see across the tag boundary in the sibling strip.
  const flat = flatten(text);
  for (const m of flat.matchAll(PLATFORM)) {
    if (CITES_SOURCED(flat, m.index)) continue;
    push(m.index, `unsourced interview platform / process "${m[0]}"`, flat.slice(Math.max(0, m.index - 90), m.index + 90));
  }
  return offenders;
}

// ---------------------------------------------------------------------------
// 2. `const FQ` — every entry is a real challenge tagged to this company
// ---------------------------------------------------------------------------
const FQ_BLOCK = /const FQ=\[([\s\S]*?)\n\];/;
const FQ_ENTRY = /\{id:(\d+),q:'((?:[^'\\]|\\.)*)',d:'(Easy|Medium|Hard)',free:(true|false)/g;

export function parseFq(pageSource) {
  const block = FQ_BLOCK.exec(pageSource);
  if (!block) return null;
  const out = [];
  for (const m of block[1].matchAll(FQ_ENTRY)) {
    out.push({
      index: block.index + m.index,
      id: Number(m[1]),
      title: m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
      difficulty: m[3],
      free: m[4] === 'true',
    });
  }
  // An entry the parser could not read is itself a failure: a hand-edited
  // shape that no longer matches is a shape this rule cannot check.
  const entries = (block[1].match(/\{id:/g) || []).length;
  return { index: block.index, entries, parsed: out };
}

export function findFqProblems(pageSource, facts) {
  const fq = parseFq(pageSource);
  if (!fq) return [];
  const problems = [];
  if (fq.entries !== fq.parsed.length) {
    problems.push({ index: fq.index, why: `FQ has ${fq.entries} entries but only ${fq.parsed.length} match the {id,q,d,free} shape this rule reads`, text: '' });
  }
  if (fq.parsed.length > facts.n) {
    problems.push({ index: fq.index, why: `FQ lists ${fq.parsed.length} challenges but only ${facts.n} carry the tag — never pad`, text: '' });
  }
  const seen = [];
  for (const e of fq.parsed) {
    const c = facts.byId.get(e.id);
    if (!c) {
      problems.push({ index: e.index, why: `FQ #${e.id} "${e.title}" is not a challenge tagged to this company`, text: e.title });
      continue;
    }
    if (c.title !== e.title) problems.push({ index: e.index, why: `FQ #${e.id} says "${e.title}", the bank says "${c.title}"`, text: e.title });
    if (c.difficulty !== e.difficulty) problems.push({ index: e.index, why: `FQ #${e.id} is tagged ${e.difficulty}, the bank says ${c.difficulty}`, text: e.title });
    if (facts.playableFree(c) !== e.free) problems.push({ index: e.index, why: `FQ #${e.id} says free:${e.free}; the bank says ${facts.playableFree(c)}`, text: e.title });
    if (seen.includes(e.id)) problems.push({ index: e.index, why: `FQ lists #${e.id} twice`, text: e.title });
    seen.push(e.id);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// 3. `const TOPICS` — the shares are the tagged set's real composition
//
// A row is ['77%','Querying Basics','27 of the 35 · SELECT, WHERE, …','#hex'].
// The share is count/n — the portion of the tagged challenges that exercise
// the skill — so the big number and the "N of the M" beside it are the same
// fact stated twice and cannot drift apart. They do not sum to 100%: a
// challenge exercises several skills, which the section says on the page.
//
// Below MIN_FOR_PERCENT tagged challenges a percentage is theatre (one
// challenge would move a share by more than ten points), so the rule demands
// the count form instead and the page must say why. No page is under it today;
// the branch exists because a new company page starts at zero.
// ---------------------------------------------------------------------------
export const MIN_FOR_PERCENT = 10;
const TOPICS_BLOCK = /const TOPICS=\[([\s\S]*?)\n\];/;
const TOPICS_ROW = /\['([^']*)','((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)','(#[0-9a-fA-F]{3,8})'\]/g;

export function parseTopics(pageSource) {
  const block = TOPICS_BLOCK.exec(pageSource);
  if (!block) return null;
  const rows = [];
  for (const m of block[1].matchAll(TOPICS_ROW)) {
    rows.push({ index: block.index + m.index, big: m[1], skill: m[2].replace(/\\'/g, "'"), sub: m[3].replace(/\\'/g, "'") });
  }
  return { index: block.index, entries: (block[1].match(/^\s*\['/gm) || []).length, rows };
}

export function findTopicsProblems(pageSource, facts) {
  const t = parseTopics(pageSource);
  if (!t) return [{ index: 0, why: 'no `const TOPICS=[…]` block — the composition section is how the page states what it covers', text: '' }];
  const problems = [];
  if (t.entries !== t.rows.length) {
    problems.push({ index: t.index, why: `TOPICS has ${t.entries} rows but only ${t.rows.length} match the ['big','skill','sub','#hex'] shape this rule reads`, text: '' });
  }
  const want = facts.dist;
  if (t.rows.length !== want.length) {
    problems.push({ index: t.index, why: `TOPICS lists ${t.rows.length} skills; ${want.length} of the 9 canonical skills appear in the tagged set`, text: '' });
  }
  t.rows.forEach((row, i) => {
    const w = want[i];
    if (!w) { problems.push({ index: row.index, why: `TOPICS row ${i + 1} ("${row.skill}") is beyond the ${want.length} skills the set covers`, text: row.skill }); return; }
    if (!CANONICAL_SKILLS.includes(row.skill)) {
      problems.push({ index: row.index, why: `"${row.skill}" is not one of the 9 canonical skills`, text: row.skill });
    }
    if (row.skill !== w.skill) {
      problems.push({ index: row.index, why: `TOPICS row ${i + 1} is "${row.skill}"; by share the set's row ${i + 1} is "${w.skill}"`, text: row.sub });
    }
    if (facts.n >= MIN_FOR_PERCENT) {
      if (row.big !== `${w.share}%`) {
        problems.push({ index: row.index, why: `"${row.big}" for ${w.skill} — the tagged set gives ${w.share}% (${w.count} of ${facts.n})`, text: row.sub });
      }
    } else if (/%/.test(row.big)) {
      problems.push({ index: row.index, why: `${facts.n} tagged challenges is too few for a percentage; state the count ("${w.count} of ${facts.n}") and say so`, text: row.big });
    } else if (row.big !== `${w.count} of ${facts.n}`) {
      problems.push({ index: row.index, why: `"${row.big}" for ${w.skill} — the tagged set gives "${w.count} of ${facts.n}"`, text: row.sub });
    }
    if (!row.sub.startsWith(`${w.count} of the ${facts.n} `)) {
      problems.push({ index: row.index, why: `${w.skill} sub-line must open "${w.count} of the ${facts.n}" — the same fact as the share, so the two cannot drift`, text: row.sub });
    }
  });
  return problems;
}

// ---------------------------------------------------------------------------
// 4. Every ?challenge= link resolves to a challenge tagged to this company,
//    and a card that states a difficulty and a title states the bank's.
//
// This is what binds the hand-written challenge lists — Capital One's six
// cards and Meta's twenty-two — which carry no FQ array. A card is an <a>
// whose body holds a .db difficulty badge.
//
// OFF_SET_LINKS is the one deliberate exception, per page, by id: a challenge
// the page shows while saying it is NOT in the company's set. The Google
// window-functions section teaches two shapes, gives each a free Medium
// on-ramp, and then states "Google-tagged window-function challenges in the
// set · 8 of 32 · all Hard, Pro" — the on-ramps are real challenges, they are
// simply not Google-tagged, and the page says so a line later. The card rules
// below still bind them against the full bank; only the tag check is waived,
// and the suite checks each id is a real challenge so the list cannot hide a
// ghost.
// ---------------------------------------------------------------------------
export const OFF_SET_LINKS = {
  'google-sql-interview': [163, 172, 84],
};
const CARD_ANCHOR = /<a href="[^"]*[?&]challenge=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
const ANY_LINK = /[?&]challenge=(\d+)\b/g;

export function findChallengeLinkProblems(text, facts, offSet = new Set()) {
  const problems = [];
  for (const m of text.matchAll(ANY_LINK)) {
    const id = Number(m[1]);
    if (!facts.byId.has(id) && !offSet.has(id)) {
      problems.push({ index: m.index, why: `?challenge=${id} is not tagged to this company in src/data/challenge-companies.js`, text: text.slice(Math.max(0, m.index - 80), m.index + 60) });
    }
  }
  for (const m of text.matchAll(CARD_ANCHOR)) {
    const id = Number(m[1]);
    const body = m[2];
    const diff = [...body.matchAll(/class="db (dh|dm|de)"[^>]*>(Easy|Medium|Hard)</g)];
    if (!diff.length) continue;                       // a prose link, not a card
    const c = facts.byId.get(id) || facts.allById.get(id);
    if (!c) continue;                                 // already reported above
    const stated = diff[0][2];
    if (stated !== c.difficulty) {
      problems.push({ index: m.index, why: `the card for #${id} says ${stated}, the bank says ${c.difficulty}`, text: squash(body).slice(0, 120) });
    }
    if (!decode(body).includes(c.title)) {
      problems.push({ index: m.index, why: `the card for #${id} does not carry its real title "${c.title}"`, text: squash(body).slice(0, 120) });
    }
    const pro = /class="db dp"/.test(body);
    if (pro === facts.playableFree(c)) {
      problems.push({ index: m.index, why: `the card for #${id} is tagged ${pro ? 'Pro' : 'Free'}; the bank says ${facts.playableFree(c) ? 'Free' : 'Pro'}`, text: squash(body).slice(0, 120) });
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// 5. The FAQPage JSON-LD is the visible FAQ
//
// Assistants read the JSON-LD. Until this rule existed the two copies were
// hand-kept in step and a page could be fixed in one and not the other — which
// is the same page still making the claim, to the only reader that matters
// here. Both sides are normalised (entities, whitespace) and compared as sets.
// ---------------------------------------------------------------------------
const FAQ_ARRAY = /const FAQS=\[([\s\S]*?)\n\];/;
const JS_PAIR = /\n\s*\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]/g;
const unesc = s => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');

export function visibleFaq(pageSource) {
  const block = FAQ_ARRAY.exec(pageSource);
  if (!block) return null;
  const out = [];
  for (const m of block[1].matchAll(JS_PAIR)) out.push({ q: unesc(m[1]), a: unesc(m[2]) });
  return { index: block.index, entries: (block[1].match(/^\s*\['/gm) || []).length, items: out };
}

export function jsonLdFaq(rawSource) {
  for (const m of rawSource.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try { parsed = JSON.parse(m[1]); } catch { continue; }
    if (parsed['@type'] !== 'FAQPage') continue;
    return {
      index: m.index,
      items: (parsed.mainEntity || []).map(q => ({ q: q.name, a: q.acceptedAnswer && q.acceptedAnswer.text })),
    };
  }
  return null;
}

const norm = s => squash(decode(String(s == null ? '' : s)));

export function findFaqMirrorProblems(rawSource) {
  const ld = jsonLdFaq(rawSource);
  const vis = visibleFaq(stripComments(rawSource));
  const problems = [];
  if (!ld) return [{ index: 0, why: 'no FAQPage JSON-LD — the copy assistants read', text: '' }];
  if (!vis) return [{ index: 0, why: 'no `const FAQS=[…]` — the JSON-LD has no visible mirror', text: '' }];
  if (vis.entries !== vis.items.length) {
    problems.push({ index: vis.index, why: `FAQS has ${vis.entries} rows but only ${vis.items.length} match the ['Q','A'] shape this rule reads`, text: '' });
  }
  const key = i => `${norm(i.q)} ${norm(i.a)}`;
  const visKeys = vis.items.map(key);
  const ldKeys = ld.items.map(key);
  for (const i of ld.items) {
    if (!visKeys.includes(key(i))) problems.push({ index: ld.index, why: `JSON-LD answer has no identical visible FAQ entry: "${norm(i.q)}"`, text: norm(i.a).slice(0, 140) });
  }
  for (const i of vis.items) {
    if (!ldKeys.includes(key(i))) problems.push({ index: vis.index, why: `visible FAQ entry is not in the JSON-LD: "${norm(i.q)}"`, text: norm(i.a).slice(0, 140) });
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The bank side. Computed here from the same primary sources the pages are
// generated from — the tag map, the challenge bank, SKILL_TO_RADAR — so the
// test is a second implementation, not a re-read of the generator's output.
//
// CLAUDE.md, the three namespaces: challenge.skills / challenge.category are
// RAW tags ("LEFT JOIN", "ROW_NUMBER"), and must be resolved through
// SKILL_TO_RADAR before they are compared to a canonical name. Resolving is
// many-to-one, so the canonical keys are deduped per challenge — a challenge
// tagged both "JOIN" and "LEFT JOIN" is one challenge for Joins, not two.
// ---------------------------------------------------------------------------
const DIFF_RANK = { Easy: 0, Medium: 1, Hard: 2 };

export function companyFacts(bank, name) {
  const resolve = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;
  const rawTags = c => [...(c.skills || []), c.category].filter(Boolean);
  const playableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);
  const all = new Map(bank.challengesData.map(c => [c.id, c]));
  const tagged = Object.keys(bank.challengeCompanies)
    .filter(id => (bank.challengeCompanies[id] || []).some(n => n.toLowerCase() === name.toLowerCase()))
    .map(id => all.get(Number(id)))
    .filter(Boolean);

  const counts = {};
  for (const c of tagged) {
    for (const k of new Set(rawTags(c).map(resolve).filter(Boolean))) counts[k] = (counts[k] || 0) + 1;
  }
  const dist = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || CANONICAL_SKILLS.indexOf(a[0]) - CANONICAL_SKILLS.indexOf(b[0]))
    .map(([skill, count]) => ({ skill, count, share: Math.round((100 * count) / tagged.length) }));

  return {
    name,
    n: tagged.length,
    free: tagged.filter(playableFree).length,
    dist,
    playableFree,
    byId: new Map(tagged.map(c => [c.id, c])),
    allById: all,
    // Easy → Medium → Hard, free previews before Pro inside Hard, then id.
    // Never raw id order (CLAUDE.md, the raw-array trap).
    ordered: tagged.slice().sort((a, b) =>
      (DIFF_RANK[a.difficulty] * 2 + (a.difficulty === 'Hard' && !isFreePreview(a) ? 1 : 0))
      - (DIFF_RANK[b.difficulty] * 2 + (b.difficulty === 'Hard' && !isFreePreview(b) ? 1 : 0))
      || a.id - b.id),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
describe('company-page helpers (fixtures)', () => {
  it('format claims: durations beside a round word, platforms and counts fail; a dataset duration does not', () => {
    const bad = [
      '<p>60-minute SQL round, typically pair-programming style.</p>',
      '<p>Wise&rsquo;s analytics screens run 45-60 minutes.</p>',
      '<p>A typical Meta SQL screen is 45 minutes with 2-3 SQL questions.</p>',
      '<p>45-minute screen via Google Meet with a shared Google Doc or CoderPad.</p>',
      '<p>Usually 1 dedicated SQL round during the on-site loop.</p>',
      '<p>Data interviews usually include 1-2 SQL rounds.</p>',
      '<p>See all 22 Meta questions</p>',
      '<meta name="description" content="A 45-minute SQL screen, live.">',
    ];
    for (const s of bad) expect(findFormatClaims(s, 'Meta').length, s).toBeGreaterThan(0);
    // attributed to the company with no format word anywhere: still a claim
    expect(findFormatClaims('<p>Practice 27 Airbnb Questions Free</p>', 'Airbnb').length).toBe(1);
    expect(findFormatClaims('<p>the 22 Meta-tagged SQL questions</p>', 'Meta').length).toBe(1);
    // …the same count naming nobody is our own exercise count, and is not
    expect(findFormatClaims('<p>95 runnable questions</p>', 'Snowflake')).toEqual([]);
    const fine = [
      '<p>Sessionize raw play events into 30-minute listening sessions.</p>',
      '<p>SUM(amount) over a 30-day window, not 30 rows.</p>',
      '<p>How to prepare for an analytics SQL round.</p>',
      '<p>Three failures cover most of it: fan-out, NULLs and ties.</p>',
      '<p>Open all 35 Stripe-tagged challenges — 23 play free</p>',
      // the citation carve-out: the one page with dated sources, named
      '<p>The one page with dated public sources is the <a href="/capital-one-sql-interview/">Capital One CodeSignal page</a>.</p>',
      '<p>Capital One</p><p>CodeSignal screen, joins at the right grain</p>',
    ];
    for (const s of fine) expect(findFormatClaims(s, 'Meta'), s).toEqual([]);
  });

  const FACTS = {
    n: 20,
    free: 15,
    dist: [{ skill: 'Joins', count: 15, share: 75 }, { skill: 'Window Functions', count: 5, share: 25 }],
    playableFree: c => c.difficulty !== 'Hard',
    byId: new Map([
      [7, { id: 7, title: 'Real Title', difficulty: 'Medium' }],
      [9, { id: 9, title: 'Another One', difficulty: 'Hard' }],
    ]),
    allById: new Map([
      [7, { id: 7, title: 'Real Title', difficulty: 'Medium' }],
      [9, { id: 9, title: 'Another One', difficulty: 'Hard' }],
      [31, { id: 31, title: 'An On-Ramp', difficulty: 'Medium' }],
    ]),
  };
  const fq = (...rows) => `const FQ=[\n${rows.join(',\n')}\n];`;
  const GOOD_FQ = fq("  {id:7,q:'Real Title',d:'Medium',free:true,t:['JOIN']}", "  {id:9,q:'Another One',d:'Hard',free:false,t:['RANK']}");

  it('FQ: a real tagged challenge with the bank\'s title, difficulty and free state passes; anything invented fails', () => {
    expect(findFqProblems(GOOD_FQ, FACTS)).toEqual([]);
    const why = src => findFqProblems(src, FACTS).map(p => p.why);
    expect(why(fq("  {id:7,q:'Calculate net new MRR split by new, expansion, contraction, and churn',d:'Hard',free:false,t:['CASE']}")))
      .toEqual(['FQ #7 says "Calculate net new MRR split by new, expansion, contraction, and churn", the bank says "Real Title"',
        'FQ #7 is tagged Hard, the bank says Medium',
        'FQ #7 says free:false; the bank says true']);
    expect(why(fq("  {id:4242,q:'Ghost',d:'Hard',free:false,t:[]}")))
      .toEqual(['FQ #4242 "Ghost" is not a challenge tagged to this company']);
    expect(why(fq("  {id:7,q:'Real Title',d:'Medium',free:true,t:[]}", "  {id:7,q:'Real Title',d:'Medium',free:true,t:[]}")))
      .toEqual(['FQ lists #7 twice']);
    // No FQ block at all is fine — Capital One and Meta list challenges as
    // hand-written cards, which rule 4 binds instead.
    expect(findFqProblems('<p>no array here</p>', FACTS)).toEqual([]);
  });

  const topics = (...rows) => `const TOPICS=[\n${rows.join(',\n')}\n];`;
  const GOOD_TOPICS = topics(
    "  ['75%','Joins','15 of the 20 · INNER and LEFT JOIN','#3b82f6']",
    "  ['25%','Window Functions','5 of the 20 · ROW_NUMBER, RANK','#c084fc']",
  );

  it('TOPICS: the shares are the tagged set\'s; an invented percentage, a wrong order and a retired name all fail', () => {
    expect(findTopicsProblems(GOOD_TOPICS, FACTS)).toEqual([]);
    const why = src => findTopicsProblems(src, FACTS).map(p => p.why);
    expect(why(topics("  ['35%','Joins','15 of the 20 · x','#3b82f6']", "  ['25%','Window Functions','5 of the 20 · y','#c084fc']")))
      .toEqual(['"35%" for Joins — the tagged set gives 75% (15 of 20)']);
    expect(why(topics("  ['75%','Joins','14 of the 20 · x','#3b82f6']", "  ['25%','Window Functions','5 of the 20 · y','#c084fc']")))
      .toEqual(['Joins sub-line must open "15 of the 20" — the same fact as the share, so the two cannot drift']);
    expect(why(topics("  ['25%','Window Functions','5 of the 20 · y','#c084fc']", "  ['75%','Joins','15 of the 20 · x','#3b82f6']")))
      .toEqual([
        'TOPICS row 1 is "Window Functions"; by share the set\'s row 1 is "Joins"',
        '"25%" for Joins — the tagged set gives 75% (15 of 20)',
        'Joins sub-line must open "15 of the 20" — the same fact as the share, so the two cannot drift',
        'TOPICS row 2 is "Joins"; by share the set\'s row 2 is "Window Functions"',
        '"75%" for Window Functions — the tagged set gives 25% (5 of 20)',
        'Window Functions sub-line must open "5 of the 20" — the same fact as the share, so the two cannot drift',
      ]);
    expect(why(topics("  ['75%','JOIN Tables','15 of the 20 · x','#3b82f6']", "  ['25%','Window Functions','5 of the 20 · y','#c084fc']")))
      .toEqual(['"JOIN Tables" is not one of the 9 canonical skills', 'TOPICS row 1 is "JOIN Tables"; by share the set\'s row 1 is "Joins"']);
    expect(why(topics("  ['75%','Joins','15 of the 20 · x','#3b82f6']")))
      .toEqual(['TOPICS lists 1 skills; 2 of the 9 canonical skills appear in the tagged set']);
    expect(findTopicsProblems('<p>nothing</p>', FACTS).map(p => p.why)).toEqual(['no `const TOPICS=[…]` block — the composition section is how the page states what it covers']);
  });

  it('TOPICS: below MIN_FOR_PERCENT tagged challenges the count form is required', () => {
    const thin = {
      n: 4, free: 3,
      dist: [{ skill: 'Joins', count: 3, share: 75 }],
      playableFree: () => true, byId: new Map(),
    };
    expect(MIN_FOR_PERCENT).toBeGreaterThan(thin.n);
    expect(findTopicsProblems(topics("  ['75%','Joins','3 of the 4 · x','#3b82f6']"), thin).map(p => p.why))
      .toEqual(['4 tagged challenges is too few for a percentage; state the count ("3 of 4") and say so']);
    expect(findTopicsProblems(topics("  ['3 of 4','Joins','3 of the 4 · x','#3b82f6']"), thin)).toEqual([]);
  });

  it('challenge links: an untagged id fails, and a card must carry the bank\'s difficulty, title and Free/Pro', () => {
    const card = (id, dcls, dtxt, access, title) =>
      `<a href="/app/?src=x&challenge=${id}"><div class="bd"><span class="db ${dcls}">${dtxt}</span><span class="db ${access}">${access === 'dp' ? 'Pro' : 'Free'}</span></div><p>${title}</p></a>`;
    expect(findChallengeLinkProblems(card(7, 'dm', 'Medium', 'de', 'Real Title') + card(9, 'dh', 'Hard', 'dp', 'Another One'), FACTS)).toEqual([]);
    const why = src => findChallengeLinkProblems(src, FACTS).map(p => p.why);
    expect(why(card(4242, 'dm', 'Medium', 'de', 'Ghost'))).toEqual(['?challenge=4242 is not tagged to this company in src/data/challenge-companies.js']);
    expect(why(card(7, 'dh', 'Hard', 'de', 'Real Title'))).toEqual(['the card for #7 says Hard, the bank says Medium']);
    expect(why(card(7, 'dm', 'Medium', 'de', 'Made Up Title'))).toEqual(['the card for #7 does not carry its real title "Real Title"']);
    expect(why(card(7, 'dm', 'Medium', 'dp', 'Real Title'))).toEqual(['the card for #7 is tagged Pro; the bank says Free']);
    // A prose link with no badge is bound only on the id.
    expect(why('<a href="/app/?challenge=7">challenge 7</a>')).toEqual([]);
    // An off-set on-ramp skips the tag check but keeps the card check.
    expect(findChallengeLinkProblems(card(31, 'dm', 'Medium', 'de', 'An On-Ramp'), FACTS, new Set([31]))).toEqual([]);
    expect(findChallengeLinkProblems(card(31, 'dh', 'Hard', 'de', 'An On-Ramp'), FACTS, new Set([31])).map(p => p.why))
      .toEqual(['the card for #31 says Hard, the bank says Medium']);
    expect(findChallengeLinkProblems(card(31, 'dm', 'Medium', 'de', 'An On-Ramp'), FACTS).map(p => p.why))
      .toEqual(['?challenge=31 is not tagged to this company in src/data/challenge-companies.js']);
  });

  it('FAQ mirror: JSON-LD and the visible array must be the same set', () => {
    const ld = (...qs) => `<script type="application/ld+json">${JSON.stringify({ '@type': 'FAQPage', mainEntity: qs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })}</script>`;
    const js = (...qs) => `const FAQS=[\n${qs.map(([q, a]) => `  ['${q}','${a}']`).join(',\n')}\n];`;
    expect(findFaqMirrorProblems(ld(['Q1', 'A1'], ['Q2', 'A2']) + js(['Q1', 'A1'], ['Q2', 'A2']))).toEqual([]);
    // entity-encoded on one side only is still the same answer
    expect(findFaqMirrorProblems(ld(['Q1', 'A & B']) + js(['Q1', 'A &amp; B']))).toEqual([]);
    expect(findFaqMirrorProblems(ld(['Q1', 'A1'], ['Q2', 'A2']) + js(['Q1', 'A1'])).map(p => p.why))
      .toEqual(['JSON-LD answer has no identical visible FAQ entry: "Q2"']);
    // the exact failure this rule exists for: fixed in the visible copy only
    expect(findFaqMirrorProblems(ld(['Q1', 'a 45-minute screen']) + js(['Q1', 'we have no source'])).map(p => p.why))
      .toEqual(['JSON-LD answer has no identical visible FAQ entry: "Q1"', 'visible FAQ entry is not in the JSON-LD: "Q1"']);
    expect(findFaqMirrorProblems(js(['Q1', 'A1'])).map(p => p.why)).toEqual(['no FAQPage JSON-LD — the copy assistants read']);
    expect(findFaqMirrorProblems(ld(['Q1', 'A1'])).map(p => p.why)).toEqual(['no `const FAQS=[…]` — the JSON-LD has no visible mirror']);
  });
});

// ---------------------------------------------------------------------------
// The live pages
// ---------------------------------------------------------------------------
let pages;   // [{ file, slug, name, raw, text, facts }]

beforeAll(() => {
  const bank = loadBank(ROOT);
  pages = readCompanyPages(ROOT, bank.challengeCompanies).map(p => {
    const raw = read('src', `${p.slug}.html`);
    return { file: `src/${p.slug}.html`, slug: p.slug, name: p.name, raw, text: stripComments(raw), facts: companyFacts(bank, p.name) };
  });
});

const collect = (fn, only = () => true) => {
  const out = [];
  for (const p of pages) {
    if (!only(p)) continue;
    for (const o of fn(p)) out.push({ file: p.file, line: lineAt(p.text, o.index), why: o.why, text: o.text });
  }
  return out;
};

describe('the page set and the tag map it binds to', () => {
  it('is every src/*-sql-interview.html, each with a non-empty tagged set', () => {
    expect(pages.length).toBeGreaterThanOrEqual(23);
    for (const p of pages) {
      expect(p.facts.n, `${p.file} has no tagged challenges — a company page with an empty set is a doorway`).toBeGreaterThan(0);
      expect(p.facts.dist.length, `${p.file} distribution`).toBeGreaterThan(0);
      for (const d of p.facts.dist) expect(CANONICAL_SKILLS, `${p.file}: ${d.skill}`).toContain(d.skill);
    }
  });

  it('the only exempted page exists and is the only one with a sources list', () => {
    for (const slug of Object.keys(SOURCED_PAGES)) {
      const p = pages.find(x => x.slug === slug);
      expect(p, slug).toBeTruthy();
      expect(p.text, `${slug} must carry the sources it is exempted for`).toMatch(/Sources: candidate reports/);
    }
    const others = pages.filter(p => !SOURCED_PAGES[p.slug] && /Sources: candidate reports/.test(p.text));
    expect(others.map(p => p.file), 'a page carrying a sources list must be added to SOURCED_PAGES').toEqual([]);
  });
});

describe('1. no company page pairs a company with an unsourced duration, platform or round format', () => {
  it('states no duration, platform or round/question count (Capital One exempted — it cites dated sources)', () => {
    const offenders = collect(p => findFormatClaims(p.text, p.name), p => !SOURCED_PAGES[p.slug]);
    expect(offenders, `unsourced format claims:\n${report(offenders)}`).toEqual([]);
  });

  it('is not vacuous — the exempted page does state one, and says where it comes from', () => {
    const cap = pages.find(p => SOURCED_PAGES[p.slug]);
    expect(findFormatClaims(cap.text, cap.name).length, 'the sourced page should still trip the raw rule').toBeGreaterThan(0);
    expect(cap.text).toMatch(/does not publish the format/);
  });
});

describe('2. every FQ entry is a real challenge tagged to that company', () => {
  it('id, title, difficulty and free/Pro come from the bank', () => {
    const offenders = collect(p => findFqProblems(p.text, p.facts));
    expect(offenders, `FQ entries off the bank:\n${report(offenders)}`).toEqual([]);
  });

  it('is not vacuous — the pages carry FQ arrays, and they are the set\'s gentlest challenges in curriculum order', () => {
    const withFq = pages.filter(p => parseFq(p.text));
    expect(withFq.length).toBeGreaterThanOrEqual(20);
    for (const p of withFq) {
      const fq = parseFq(p.text);
      expect(fq.parsed.length, `${p.file} shows more cards than the set holds`).toBeLessThanOrEqual(p.facts.n);
      expect(fq.parsed.map(e => e.id), `${p.file} is not in Easy → Medium → Hard order`).toEqual(p.facts.ordered.slice(0, fq.parsed.length).map(c => c.id));
    }
  });
});

describe('3. every TOPICS share is the tagged set\'s real distribution', () => {
  it('the skills, their order and their shares are computed, not stated', () => {
    const offenders = collect(p => findTopicsProblems(p.text, p.facts));
    expect(offenders, `TOPICS off the tagged set:\n${report(offenders)}`).toEqual([]);
  });

  it('is not vacuous — every page carries the block, and the shares vary across pages', () => {
    const shares = new Set();
    for (const p of pages) {
      const t = parseTopics(p.text);
      expect(t, `${p.file} has no TOPICS block`).toBeTruthy();
      expect(t.rows.length, p.file).toBe(p.facts.dist.length);
      shares.add(t.rows.map(r => r.big).join('/'));
    }
    expect(shares.size, 'every page showing the same shares would mean the numbers are not computed').toBeGreaterThan(10);
  });

  it('the composition section says what the shares are and are not', () => {
    for (const p of pages) {
      expect(p.text, `${p.file} must say the shares are the practice set's, not the company's interview`)
        .toMatch(/composition of the practice set on this page, not a measurement of/);
    }
  });
});

describe('4. every ?challenge= link and every challenge card resolves to the bank', () => {
  it('the id is tagged to that company and the card states the bank\'s title, difficulty and access', () => {
    const offenders = collect(p => findChallengeLinkProblems(p.text, p.facts, new Set(OFF_SET_LINKS[p.slug] || [])));
    expect(offenders, `challenge links off the bank:\n${report(offenders)}`).toEqual([]);
  });

  it('every off-set id is a real challenge, and its page says the on-ramps are outside the set', () => {
    for (const [slug, ids] of Object.entries(OFF_SET_LINKS)) {
      const p = pages.find(x => x.slug === slug);
      expect(p, slug).toBeTruthy();
      for (const id of ids) {
        expect(p.facts.allById.has(id), `${slug}: off-set #${id} is not a challenge at all`).toBe(true);
        expect(p.facts.byId.has(id), `${slug}: off-set #${id} IS tagged — drop it from OFF_SET_LINKS`).toBe(false);
      }
      expect(p.text, `${slug} must say which challenges are in the set`).toMatch(/-tagged window-function challenges in the set/);
    }
  });

  it('is not vacuous — the hand-written lists are still there', () => {
    const withCards = pages.filter(p => /class="db d[hme]"[^>]*>(?:Easy|Medium|Hard)</.test(p.text) && /[?&]challenge=\d+/.test(p.text));
    expect(withCards.map(p => p.slug).sort()).toEqual(expect.arrayContaining(['capital-one-sql-interview', 'meta-sql-interview']));
  });
});

describe('5. the FAQPage JSON-LD and the visible FAQ are the same answers', () => {
  it('no page is fixed in one copy and not the other', () => {
    const offenders = collect(p => findFaqMirrorProblems(p.raw));
    expect(offenders, `FAQ copies out of step:\n${report(offenders)}`).toEqual([]);
  });

  it('is not vacuous — every page has an FAQ with at least three entries', () => {
    for (const p of pages) {
      const ld = jsonLdFaq(p.raw);
      expect(ld, `${p.file} has no FAQPage JSON-LD`).toBeTruthy();
      expect(ld.items.length, p.file).toBeGreaterThanOrEqual(3);
    }
  });
});

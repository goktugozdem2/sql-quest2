#!/usr/bin/env node
/**
 * Company-page challenge cards say what a question MEASURES, never how to
 * solve it (founder review, 2026-10-05: "Kullanıcı soruyu açmadan cevabı
 * okuyor. Kartta sadece soru ve hangi beceriyi ölçtüğü kalmalı.").
 *
 * The hand-written pages carried a solution-shape blurb under each card
 * title ("DENSE_RANK inside PARTITION BY…", "LEFT JOIN + IS NULL…") — 52
 * cards on Amazon, Meta, Google and Capital One. This rewrites the blurb of
 * every `/app/?…challenge=<id>` card to "Measures: <canonical skills>", from
 * the bank's own tags through SKILL_TO_RADAR. The title stays: it is the
 * question.
 *
 * Capital One is frozen until its 2026-10-12 read (SKIP_UNTIL_READ in
 * build-company-pages.mjs, the content hash in company-sections.test.js);
 * it is listed in FROZEN and rewritten the same day the freeze lifts.
 *
 * Run: node scripts/card-skill-blurbs.mjs   (idempotent; part of npm run build)
 * Guard: tests/card-skill-blurbs.test.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadQuestionBank } from './question-slugs.mjs';
import { SKILL_TO_RADAR, CANONICAL_SKILLS } from '../src/utils/skill-calc.js';

const ROOT = path.resolve(import.meta.dirname, '..');
export const FROZEN = new Set(['capital-one-sql-interview.html']);
export const BLURB_PREFIX = 'Measures: ';

export function canonicalSkillsFor(challenge) {
  const raw = [...(challenge.skills || []), challenge.category].filter(Boolean);
  const out = [];
  for (const tag of raw) {
    const c = CANONICAL_SKILLS.includes(tag) ? tag : SKILL_TO_RADAR[tag];
    if (c && !out.includes(c)) out.push(c);
  }
  // Canonical order, at most three — a card line, not a syllabus. Querying
  // Basics (SELECT, ORDER BY, LIMIT) is in nearly every tag list; it is named
  // only when it is the whole of what a question measures.
  const ordered = CANONICAL_SKILLS.filter(s => out.includes(s));
  const specific = ordered.filter(s => s !== 'Querying Basics');
  return (specific.length ? specific : ordered).slice(0, 3);
}

export function blurbFor(challenge) {
  const skills = canonicalSkillsFor(challenge);
  return `${BLURB_PREFIX}${skills.length ? skills.join(' · ') : 'Querying Basics'}`;
}

const CARD = /(<a href="\/app\/\?[^"]*challenge=(\d+)"[^>]*>[\s\S]*?<p style="font-size:15px;font-weight:700;color:#e2e8f0;">[\s\S]*?<\/p>)(<p style="font-size:13px;color:#94a3b8;margin-top:3px;">)([\s\S]*?)(<\/p>)/g;

export function rewritePage(html, bankById) {
  let n = 0;
  const out = html.replace(CARD, (whole, head, id, open, _blurb, close) => {
    const c = bankById.get(Number(id));
    if (!c) return whole;
    n++;
    return `${head}${open}${blurbFor(c)}${close}`;
  });
  return { html: out, cards: n };
}

export function companyPages() {
  return fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bank } = loadQuestionBank();
  const byId = new Map(bank.map(c => [c.id, c]));
  const changed = [];
  for (const f of companyPages()) {
    if (FROZEN.has(f)) continue;
    const p = path.join(ROOT, 'src', f);
    const before = fs.readFileSync(p, 'utf8');
    const { html, cards } = rewritePage(before, byId);
    if (html !== before) { fs.writeFileSync(p, html); changed.push(`${f} (${cards})`); }
  }
  console.log(`[card-skill-blurbs] ${changed.length ? changed.join(', ') : 'no change'}`);
}

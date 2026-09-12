// Stable URL slugs for the question pages (/questions/<slug>/), shared by the
// question-page generator, the company template and the topic pages so every
// internal link points at the same URL. A slug is the challenge title,
// lower-cased, stripped to [a-z0-9-]; when two titles collide the later id gets
// "-<id>" appended. Changing a challenge title changes its URL — keep titles
// stable, or add a vercel.json redirect in the same commit.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');

export function loadQuestionBank() {
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  for (const f of ['challenges.js', 'sector-challenges.js', 'challenge-companies.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data', f), 'utf8'), ctx);
  }
  const byId = new Map();
  for (const c of [...ctx.window.challengesData, ...(ctx.window.sectorChallengesData || [])]) byId.set(c.id, c);
  return { bank: [...byId.values()].sort((a, b) => a.id - b.id), tags: ctx.window.challengeCompanies || {} };
}

export const slugify = s => String(s).toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

export function questionSlugs(bank) {
  const out = new Map();
  const used = new Set();
  for (const c of bank.slice().sort((a, b) => a.id - b.id)) {
    let s = slugify(c.title) || `question-${c.id}`;
    if (used.has(s)) s = `${s}-${c.id}`;
    used.add(s);
    out.set(c.id, s);
  }
  return out;
}

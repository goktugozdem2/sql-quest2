// robots.txt against the upstream AI-crawler list (2026-11-24).
//
// ai-robots-txt/ai.robots.txt (MIT) is pinned at a release in
// tests/fixtures/ai-robots-txt.json (scripts/ai-robots-pin.mjs). This file
// does not decide our policy; it makes a change upstream visible:
//   - every upstream AI agent is either named in public/robots.txt or on the
//     dated reviewed list (tests/fixtures/ai-robots-reviewed.json) — so a
//     re-pin that brings a new name fails here until someone looks at it;
//   - every AI agent we name is still an upstream name (a renamed token
//     would otherwise sit in robots.txt matching nothing);
//   - no upstream AI agent is shut out of the content pages, whether it has
//     its own group or falls to `*` (the AI-recommendation channel is the one
//     that has produced payers — CLAUDE.md, "Two buyer facts").
// Which agents get their own group, or are blocked, is the founder's call.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { namedAgents } from '../scripts/ai-robots-pin.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const UPSTREAM = JSON.parse(read('tests/fixtures/ai-robots-txt.json'));
const REVIEWED = JSON.parse(read('tests/fixtures/ai-robots-reviewed.json'));
const robots = read('public/robots.txt');

// The AI agents our robots.txt names on purpose (2026-09-06 and before).
// The two search engines' groups are not AI-crawler groups.
const NOT_AI_GROUPS = new Set(['bingbot']);
const lc = s => s.toLowerCase();

// The group a crawler obeys: its own (case-insensitive product token), else `*`.
const groups = robots.split(/\n(?=User-agent:)/).filter(g => /^User-agent:/m.test(g)).map(g => ({
  agent: g.match(/^User-agent:\s*(.+?)\s*$/m)[1],
  allow: [...g.matchAll(/^Allow:\s*(\S+)/gm)].map(m => m[1]),
  disallow: [...g.matchAll(/^Disallow:\s*(\S+)/gm)].map(m => m[1]),
}));
const groupFor = agent => groups.find(g => lc(g.agent) === lc(agent)) || groups.find(g => g.agent === '*');
// Longest match wins; Allow wins a tie (RFC 9309).
function allowed(g, p) {
  const best = (list) => Math.max(-1, ...list.filter(r => p.startsWith(r)).map(r => r.length));
  return best(g.allow) >= best(g.disallow);
}

describe('robots.txt vs the upstream AI-crawler list', () => {
  it('the pin is a release, with its commit and the sha256 of what was read', () => {
    expect(UPSTREAM.source).toBe('https://github.com/ai-robots-txt/ai.robots.txt');
    expect(UPSTREAM.license).toBe('MIT');
    expect(UPSTREAM.tag).toMatch(/^v\d+\.\d+$/);
    expect(UPSTREAM.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(UPSTREAM.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(UPSTREAM)).toEqual(['source', 'license', 'tag', 'commit', 'sha256', 'pinned', 'agents']);
    expect(Object.keys(UPSTREAM.agents).length).toBeGreaterThan(100);
  });

  it('every upstream AI agent is named in robots.txt or on the dated reviewed list', () => {
    const ours = new Set(namedAgents(robots).map(lc));
    const reviewed = new Set(REVIEWED.names.map(lc));
    expect(REVIEWED.reviewed).toMatch(/^\d{4}-\d\d-\d\d$/);
    const unreviewed = Object.keys(UPSTREAM.agents).filter(a => !ours.has(lc(a)) && !reviewed.has(lc(a)));
    expect(unreviewed, `new upstream AI agents in ${UPSTREAM.tag} — review each, then name it in robots.txt (founder) or append it to tests/fixtures/ai-robots-reviewed.json with the date`).toEqual([]);
  });

  it('the reviewed list holds only names robots.txt does not name and upstream still has', () => {
    const ours = new Set(namedAgents(robots).map(lc));
    const upstream = new Set(Object.keys(UPSTREAM.agents).map(lc));
    for (const n of REVIEWED.names) {
      expect(ours.has(lc(n)), `${n} now has its own group — drop it from the reviewed list`).toBe(false);
      expect(upstream.has(lc(n)), `${n} is no longer upstream`).toBe(true);
    }
  });

  it('every AI agent robots.txt names is an upstream name', () => {
    const upstream = new Set(Object.keys(UPSTREAM.agents).map(lc));
    const ourAi = namedAgents(robots).filter(a => !NOT_AI_GROUPS.has(lc(a)));
    expect(ourAi.length).toBeGreaterThan(0);
    for (const a of ourAi) expect(upstream.has(lc(a)), `${a} is not in ${UPSTREAM.tag}`).toBe(true);
  });

  it('no upstream AI agent is shut out of a content page', () => {
    for (const a of Object.keys(UPSTREAM.agents)) {
      const g = groupFor(a);
      for (const p of ['/', '/sql-exercises/', '/questions/distinct-values/', '/blog/where-vs-having/', '/llms.txt']) {
        expect(allowed(g, p), `${a} (group ${g.agent}) ${p}`).toBe(true);
      }
    }
  });
});

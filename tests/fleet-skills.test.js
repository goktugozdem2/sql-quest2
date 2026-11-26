// The fleet's skills loop (2026-11-26): every lane brief is a versioned skill,
// every run is a ledger line, and SKILLS.md is generated from both. These are
// the structural regression tests ("04 Evaluate" in docs/agent/fleet/README.md).
// Each block was proven by a deliberate break, named in the commit.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readBriefs, readLedger, readPapercuts, buildIndex, parseFrontMatter, skillOfLane,
  REQUIRED_KEYS, OWNERS, RUNTIMES, STATUSES, OUTCOMES, FLEET_DIR,
} from '../scripts/fleet-skills-index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const briefs = readBriefs(ROOT);
const ledger = readLedger(ROOT);

// Metric names registered in docs/agent/metrics.md: every backticked name in a
// "## " or "### " heading ("## `bing_weekly_clicks` / `bing_blocked_urls`").
const METRICS = new Set(
  fs.readFileSync(path.join(ROOT, 'docs/agent/metrics.md'), 'utf8')
    .split('\n').filter(l => /^#{2,3} /.test(l))
    .flatMap(l => [...l.matchAll(/`([a-z0-9_]+)`/g)].map(m => m[1])),
);

const PRIVACY = [
  [/[\w.+-]+@[\w-]+\.[a-z]{2,}/i, 'an email address'],
  [/guest_\d+/, 'a guest_ id'],
  [/\b[0-9a-f]{12,}\b/i, 'a long hex id (aid)'],
  [/\baid [0-9a-f]{6,}/i, 'an aid'],
];

describe('skill briefs: front-matter (01 Build)', () => {
  it('finds every lane brief and nothing else', () => {
    expect(briefs.length).toBeGreaterThanOrEqual(30);
    expect(briefs.map(b => b.file)).not.toContain('SEO-loop.md');
  });

  for (const { file, fm, text } of briefs) {
    it(`${file} has valid front-matter with every key`, () => {
      expect(fm, `${file}: no front-matter`).toBeTruthy();
      for (const k of REQUIRED_KEYS) expect(fm[k], `${file}: missing ${k}`).toBeDefined();
      expect(fm.id).toBe(file.split('-')[0]);
      expect(typeof fm.name).toBe('string');
      expect(OWNERS).toContain(fm.owner);
      expect(RUNTIMES).toContain(fm.runtime);
      expect(STATUSES).toContain(fm.status);
      expect(typeof fm.cadence).toBe('string');
      expect(typeof fm.writes_code, `${file}: writes_code must be true or false`).toBe('boolean');
      expect(fm.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(fm.last_changed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it(`${file} has a changelog line for its current version`, () => {
      const log = text.slice(text.lastIndexOf('\n## Changelog'));
      expect(text.includes('\n## Changelog'), `${file}: no ## Changelog`).toBe(true);
      expect(log).toContain(`- ${fm.version} (`);
    });

    it(`${file}: every metric name exists in docs/agent/metrics.md`, () => {
      if (fm.metric === 'undefined') {
        expect(text, `${file}: an undefined metric needs a TODO`).toMatch(/^metric: undefined\s+# TODO/m);
        return;
      }
      expect(Array.isArray(fm.metric) && fm.metric.length > 0, `${file}: metric is a list or undefined`).toBe(true);
      for (const m of fm.metric) expect(METRICS.has(m), `${file}: metric ${m} is not in metrics.md`).toBe(true);
    });
  }
});

describe('skill briefs: lane status and code-lane rules', () => {
  it('C6 and C7 are paused (investor 90-day plan, A09)', () => {
    for (const id of ['C6', 'C7']) {
      const b = briefs.find(x => x.fm.id === id);
      expect(b.fm.status, id).toBe('paused');
      expect(b.text, id).toMatch(/PAUSED 2026-11-25/);
    }
  });

  it('a brief that says PAUSED at the top is marked paused', () => {
    for (const { file, fm, text } of briefs) {
      const head = text.slice(text.indexOf('\n---\n') + 5).split('\n').slice(0, 4).join('\n');
      if (/\*\*PAUSED/.test(head)) expect(fm.status, file).toBe('paused');
    }
  });

  const codeLanes = briefs.filter(b => b.fm.writes_code === true && b.fm.status !== 'paused');

  it('there are active code-writing lanes to check', () => {
    expect(codeLanes.map(b => b.fm.id)).toEqual(expect.arrayContaining(['A2', 'A4', 'B1', 'B5', 'C1', 'C5']));
  });

  for (const { file, text } of codeLanes) {
    it(`${file} carries the funnel-step ⇒ dark flag rule`, () => {
      expect(text).toMatch(/funnel-step change ⇒ dark flag/i);
      expect(text).toMatch(/stays OFF/);
    });

    it(`${file} carries the forbidden list`, () => {
      for (const s of ['git add -A', 'public/weekly/', 'GSTACK_REDACT_PREPUSH=skip', 'supabase functions deploy', 'money flags']) {
        expect(text, `${file}: missing "${s}"`).toContain(s);
      }
    });
  }
});

describe('the run ledger (03 Measure)', () => {
  it('has the backfilled November rows', () => {
    expect(ledger.length).toBeGreaterThanOrEqual(165);
  });

  it('every line parses with the right fields and types', () => {
    for (const r of ledger) {
      const at = r._src;
      expect(r.date, at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(at.startsWith(r.date.slice(0, 7)), `${at}: date ${r.date} is in the wrong month file`).toBe(true);
      expect(typeof r.lane, at).toBe('string');
      expect(RUNTIMES, at).toContain(r.runtime);
      expect(r.minutes === null || typeof r.minutes === 'number', at).toBe(true);
      expect(r.tokens === null || Number.isInteger(r.tokens), at).toBe(true);
      expect(OUTCOMES, at).toContain(r.outcome);
      expect(Array.isArray(r.prs) && r.prs.every(Number.isInteger), at).toBe(true);
      expect(Array.isArray(r.merged) && r.merged.every(n => r.prs.includes(n)), `${at}: merged ⊆ prs`).toBe(true);
      expect(typeof r.value, at).toBe('string');
      expect(Array.isArray(r.papercuts) && r.papercuts.every(p => typeof p === 'string'), at).toBe(true);
      if (r.version !== undefined) expect(r.version, at).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('carries no email, guest_ id or aid in value or papercuts', () => {
    for (const r of ledger) {
      for (const text of [r.value, ...r.papercuts]) {
        for (const [re, what] of PRIVACY) expect(re.test(text), `${r._src}: ${what} in "${text}"`).toBe(false);
      }
    }
  });

  it('credits sub-lanes to their brief and nothing else', () => {
    expect(skillOfLane('B1')).toBe('B1');
    expect(skillOfLane('B1-followup')).toBe('B1');
    expect(skillOfLane('C2/G1-ai-era')).toBe('C2');
    expect(skillOfLane('AN')).toBe('AN');
    expect(skillOfLane('A01-scorecard')).toBe(null);
    expect(skillOfLane('orchestrator')).toBe(null);
  });
});

describe('papercuts (05 Improve)', () => {
  const cuts = readPapercuts(ROOT);
  it('every row has a lane, a fix, an owner and an open/fixed status', () => {
    expect(cuts.length).toBeGreaterThanOrEqual(10);
    for (const c of cuts) {
      expect(c.lane && c.papercut && c.fix, c.papercut).toBeTruthy();
      expect(OWNERS, c.papercut).toContain(c.owner);
      expect(c.status, c.papercut).toMatch(/^(open|fixed)\b/);
      for (const [re, what] of PRIVACY) expect(re.test(c.papercut), `${what} in a papercut`).toBe(false);
    }
  });
});

describe('SKILLS.md (the marketplace)', () => {
  it('is up to date with the generator (npm run fleet:index)', () => {
    const committed = fs.readFileSync(path.join(ROOT, FLEET_DIR, 'SKILLS.md'), 'utf8');
    expect(committed).toBe(buildIndex(ROOT));
  });

  it('lists every brief once', () => {
    const md = buildIndex(ROOT);
    for (const { fm, file } of briefs) expect(md.split(`| [${fm.id}](${file}) |`).length - 1, fm.id).toBe(1);
  });
});

describe('parseFrontMatter', () => {
  it('reads lists, quoted strings, booleans and strips comments', () => {
    const fm = parseFrontMatter('---\nid: X1\nname: "A: b # c"\nmetric: [a_b, c]  # note\nwrites_code: true\nversion: 1.2.3\n---\n# body\n');
    expect(fm).toEqual({ id: 'X1', name: 'A: b # c', metric: ['a_b', 'c'], writes_code: true, version: '1.2.3' });
  });

  it('refuses a line it does not understand', () => {
    expect(() => parseFrontMatter('---\nid: X1\n  - nested\n---\n')).toThrow(/not understood/);
  });
});

// Guard on .github/workflows/links.yml, the weekly outbound link check
// (lychee, 2026-11-24). What it must keep doing: run weekly and by hand, check
// ONLY external links in the committed src/*.html + src/blog/** pages (internal
// links are scripts/seo-audit.mjs's job), skip the hosts that block bots,
// accept 429, run a pinned action, and on failure touch one issue labelled
// link-check. Same shape as tests/uiux-daily-workflow.test.js.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../.github/workflows/links.yml', import.meta.url), 'utf8');
// Comments explain; the guard reads what runs.
const code = src.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
const ignore = fs.readFileSync(new URL('../.lycheeignore', import.meta.url), 'utf8')
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => new RegExp(l));
const args = /args: >-\n([\s\S]*?)\n\n/.exec(code)?.[1] ?? '';
const excludes = [...args.matchAll(/--exclude '([^']+)'/g)].map(m => new RegExp(m[1]));
const skipped = url => [...excludes, ...ignore].some(re => re.test(url));

describe('links.yml — the weekly outbound link check', () => {
  it('runs on Mondays and by hand, never on push or PR', () => {
    expect(code).toMatch(/schedule:\s*\n\s*- cron: '\d{1,2} \d{1,2} \* \* 1'/);
    expect(code).toMatch(/\n\s*workflow_dispatch:/);
    expect(code).not.toMatch(/\n\s*(push|pull_request|workflow_run):/);
  });

  it('runs lychee-action pinned to a commit, and fails the job on a dead link', () => {
    expect(code).toMatch(/uses: lycheeverse\/lychee-action@[0-9a-f]{40}\n/);
    expect(code).toMatch(/lycheeVersion: v\d+\.\d+\.\d+/);
    expect(code).toMatch(/fail: true/);
  });

  it('reads only the static pages: src/*.html and src/blog/**', () => {
    const inputs = [...args.matchAll(/^\s*'([^-'][^']*)'\s*$/gm)].map(m => m[1]);
    expect(inputs).toEqual(['src/*.html', 'src/blog/**/*.html']);
  });

  it('is external-only: http(s) schemes, local links resolve onto sqlquest.app, and sqlquest.app is excluded', () => {
    expect(args).toMatch(/--scheme https --scheme http\b/);
    expect(args).toMatch(/--base-url https:\/\/sqlquest\.app\//);
    for (const u of ['https://sqlquest.app/', 'https://sqlquest.app/app/?src=x', 'https://www.sqlquest.app/sql-exercises/', 'http://sqlquest.app']) {
      expect(skipped(u), `${u} should be excluded (internal)`).toBe(true);
    }
    for (const u of ['https://datalemur.com/', 'https://notsqlquest.app/', 'https://sqlquest.app.evil.com/', 'https://www.postgresql.org/docs/']) {
      expect(skipped(u), `${u} should still be checked (external)`).toBe(false);
    }
  });

  it('skips the hosts that block or rate-limit bots — and nothing broader', () => {
    for (const u of ['https://www.linkedin.com/in/someone', 'https://x.com/someone', 'https://twitter.com/someone', 'https://www.glassdoor.com/Interview/x.htm', 'https://www.glassdoor.co.uk/x']) {
      expect(skipped(u), `${u} should be skipped`).toBe(true);
    }
    for (const u of ['https://box.com/', 'https://dropbox.com/x', 'https://notlinkedin.co/', 'https://www.tryexponent.com/']) {
      expect(skipped(u), `${u} must not be swallowed by an ignore pattern`).toBe(false);
    }
  });

  it('accepts 429 (a rate limit is not a dead link) on top of 2xx', () => {
    expect(args).toMatch(/--accept '[^']*\b200\.\.=299\b[^']*\b429\b[^']*'/);
  });

  it('on failure, comments on the open link-check issue or opens one', () => {
    const step = /- name: Report the failure as an issue\n([\s\S]*)$/.exec(code)?.[1] ?? '';
    expect(step).toMatch(/if: failure\(\)/);
    expect(step).toMatch(/gh label create link-check/);
    expect(step).toMatch(/gh issue list --label link-check --state open/);
    expect(step).toMatch(/gh issue comment "\$existing"/);
    expect(step).toMatch(/gh issue create [^\n]*--label link-check/);
    expect(step).toMatch(/GH_TOKEN: \$\{\{ github\.token \}\}/);
  });

  it('least permissions, no secrets, no writes to the repo', () => {
    expect(code).toMatch(/permissions:\s*\n\s*contents: read\s*\n\s*issues: write\s*\n/);
    expect([...code.matchAll(/\$\{\{\s*secrets\./g)]).toEqual([]);
    expect(code).not.toMatch(/git push|contents: write|vercel|supabase/i);
  });
});

// Guards for the content funnel (2026-11-22, B2):
//   1. scripts/content-funnel.sql selects aggregates only — no PII column;
//   2. the view migration carries the SQL file's exact body;
//   3. the report mails the numbers and never logs them (the repo is public);
//   4. the workflow runs on schedule, echoes no secret, writes nothing back.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildReport, renderMarkdown, run, pageForPath, recentPages, KILL_MIN_LANDING,
} from '../scripts/content-funnel-report.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL_FILE = 'scripts/content-funnel.sql';
const MIGRATION = 'supabase/migrations/20261123180100_content_funnel_crawlers.sql';
const WORKFLOW = '.github/workflows/content-funnel.yml';
const REPORT = 'scripts/content-funnel-report.mjs';

export function body(text) {
  const a = text.indexOf('-- content_funnel:begin');
  const b = text.indexOf('-- content_funnel:end');
  if (a < 0 || b < a) throw new Error('content_funnel markers missing');
  return text.slice(a, b + '-- content_funnel:end'.length);
}

const stripComments = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** The output columns of the statement's final top-level SELECT. */
export function finalSelectColumns(sql) {
  const s = stripComments(sql);
  let depth = 0, inStr = false, lastSelect = -1;
  const top = []; // positions at depth 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "'") inStr = false; continue; }
    if (c === "'") { inStr = true; continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0) {
      top.push(i);
      if (/^select\b/i.test(s.slice(i, i + 7)) && !/\w/.test(s[i - 1] || ' ')) lastSelect = i;
    }
  }
  if (lastSelect < 0) throw new Error('no top-level SELECT');
  // the matching top-level FROM after it
  let from = -1;
  depth = 0; inStr = false;
  for (let i = lastSelect + 6; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "'") inStr = false; continue; }
    if (c === "'") { inStr = true; continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && /^from\b/i.test(s.slice(i, i + 5)) && /\s/.test(s[i - 1])) { from = i; break; }
  }
  if (from < 0) throw new Error('no FROM after the final SELECT');
  const list = s.slice(lastSelect + 6, from);
  const items = [];
  let cur = ''; depth = 0; inStr = false;
  for (const c of list) {
    if (inStr) { cur += c; if (c === "'") inStr = false; continue; }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) { items.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) items.push(cur.trim());
  return items.map(expr => {
    const m = expr.match(/\bas\s+("?)([a-z_][a-z0-9_]*)\1\s*$/i);
    const name = m ? m[2] : (expr.match(/([a-z_][a-z0-9_]*)\s*$/i) || [])[1];
    return { expr, name: (name || '').toLowerCase() };
  });
}

const ALLOWED = [
  'window_days', 'page', 'landing_people', 'app_opened', 'first_run', 'first_solve', 'solves_3',
  'signup', 'modal_shown', 'plan_click', 'trials', 'purchases', 'trial_or_purchase',
];
const PII = /(^|_)(aid|pid|user(name)?|email|e_?mail|ip|token|ua|ref|referrer|tz|name|address|stripe|session)(_|$)/;

describe('content-funnel.sql: aggregates only', () => {
  const cols = finalSelectColumns(body(read(SQL_FILE)));

  it('selects exactly the funnel columns', () => {
    expect(cols.map(c => c.name)).toEqual(ALLOWED);
  });

  it('selects no PII column, no star, and every number is a count', () => {
    for (const c of cols) {
      expect(c.name, c.expr).not.toMatch(PII);
      expect(c.expr).not.toMatch(/\*\s*$|\.\*/);
      if (!['window_days', 'page'].includes(c.name)) expect(c.expr, c.name).toMatch(/^count\(/i);
    }
  });

  it('groups by page and window, so no row is a person', () => {
    expect(stripComments(body(read(SQL_FILE)))).toMatch(/GROUP BY s\.window_days, s\.page\s*$/);
  });

  it('the parser catches a PII column (self-check)', () => {
    const bad = finalSelectColumns('WITH x AS (SELECT 1) SELECT s.page, s.pid AS aid, count(*) AS n FROM s GROUP BY 1');
    expect(bad.map(c => c.name)).toEqual(['page', 'aid', 'n']);
    expect(bad.some(c => PII.test(c.name))).toBe(true);
    expect(finalSelectColumns('SELECT a.username FROM a').map(c => c.name)).toEqual(['username']);
  });

  it('keeps the exclusions the brief and metrics.md name', () => {
    const sql = body(read(SQL_FILE));
    for (const s of ['fabletest', 'linktest', 'internalroutine', 'sqlquest$', 'elena$', "m->>'bot'",
      'tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'ref:aocr.org', 'verify-test', 'email_link',
      "reason = 'stripe_webhook'", "COALESCE(m->>'aid', username)", "'landing_engaged'"]) {
      expect(sql, s).toContain(s);
    }
  });
});

describe('the view is the SQL file', () => {
  it('migration body equals scripts/content-funnel.sql between the markers', () => {
    expect(body(read(MIGRATION))).toBe(body(read(SQL_FILE)));
  });

  it('is closed to the browser key and invoker-scoped', () => {
    const m = read(MIGRATION);
    expect(m).toMatch(/create or replace view public\.content_funnel with \(security_invoker = true\)/);
    expect(m).toMatch(/revoke all on public\.content_funnel from public, anon, authenticated;/);
    expect(m).not.toMatch(/grant [^;]*content_funnel[^;]* to [^;]*\b(anon|authenticated)\b/);
    expect(fs.existsSync(path.join(ROOT, 'supabase/manual/20261122_content_funnel_view_rollback.sql'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'supabase/manual/20261122_content_funnel_view_probe.sql'))).toBe(true);
  });
});

const ROWS = [
  { window_days: 28, page: 'revolut-sql-interview', landing_people: 120, app_opened: 40, first_run: 30, first_solve: 20, solves_3: 9, signup: 6, modal_shown: 8, plan_click: 4, trials: 2, purchases: 1, trial_or_purchase: 3 },
  { window_days: 28, page: 'blog/new-guide', landing_people: 17, app_opened: 3, first_run: 2, first_solve: 1, solves_3: 0, signup: 0, modal_shown: 0, plan_click: 0, trials: 0, purchases: 0, trial_or_purchase: 0 },
  { window_days: 60, page: 'sql-exercises', landing_people: 777, app_opened: 500, first_run: 300, first_solve: 200, solves_3: 90, signup: 50, modal_shown: 60, plan_click: 11, trials: 0, purchases: 0, trial_or_purchase: 0 },
  { window_days: 60, page: 'revolut-sql-interview', landing_people: 301, app_opened: 90, first_run: 70, first_solve: 50, solves_3: 20, signup: 10, modal_shown: 12, plan_click: 5, trials: 3, purchases: 1, trial_or_purchase: 4 },
  { window_days: 7, page: 'revolut-sql-interview', landing_people: '31', app_opened: '10', first_run: '7', first_solve: '5', solves_3: '2', signup: '1', modal_shown: '2', plan_click: '1', trials: '1', purchases: '0', trial_or_purchase: '1' },
];
const MANIFEST = { pages: {
  '/blog/new-guide/': { hash: 'x', lastmod: '2026-11-20' },
  '/old-page/': { hash: 'y', lastmod: '2026-09-01' },
  '/': { hash: 'z', lastmod: '2026-11-22' },
} };

describe('the report', () => {
  const rep = buildReport({ rows: ROWS, manifest: MANIFEST, today: '2026-11-22' });

  it('names pages the way the tracker does', () => {
    expect(pageForPath('/')).toBe('home');
    expect(pageForPath('/blog/x/')).toBe('blog/x');
    expect(pageForPath('/sql-exercises/')).toBe('sql-exercises');
    expect(recentPages(MANIFEST, '2026-11-22').map(p => p.page)).toEqual(['blog/new-guide', 'home']);
  });

  it('ranks by trials, lists new pages with zeros when nobody landed, and finds kill candidates', () => {
    expect(rep.topByTrials.map(x => x.page)).toEqual(['revolut-sql-interview']);
    expect(rep.recent.map(x => x.page)).toEqual(['blog/new-guide', 'home']);
    expect(rep.recent[1].landing_people).toBe(0);
    expect(rep.kill.map(x => x.page)).toEqual(['sql-exercises']);
    expect(KILL_MIN_LANDING).toBe(300);
    expect(rep.totals.find(t => t.window_days === 7).landing_people).toBe(31);
    const md = renderMarkdown(rep);
    expect(md).toContain('| revolut-sql-interview | 120 | 40 | 30 | 20 | 9 | 6 | 8 | 4 | 3 | 25.0 |');
    expect(md).toContain('Kill-rule candidates');
  });

  it('mails the numbers and logs none of them, and never writes a step summary', async () => {
    const logs = [];
    const calls = [];
    const summary = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cf-')), 'summary.md');
    const fetchImpl = async (url, opts = {}) => {
      calls.push({ url, opts });
      if (url.includes('/rest/v1/')) return { ok: true, status: 200, json: async () => ROWS };
      return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
    };
    const env = {
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJsecret-key',
      RESEND_API_KEY: 're_secret', REPORT_TO: 'founder@example.com', GITHUB_STEP_SUMMARY: summary,
    };
    await run({ env, fetchImpl, log: (s) => logs.push(String(s)), argv: [], now: new Date('2026-11-22T08:00:00Z'), root: ROOT });

    const logged = logs.join('\n');
    expect(logged).not.toMatch(/revolut|sql-exercises|blog\/new-guide/);
    expect(logged).not.toMatch(/\b(120|777|301)\b/);
    expect(logged).not.toContain('secret');
    expect(fs.existsSync(summary)).toBe(false);

    const rest = calls.find(c => c.url.includes('/rest/v1/'));
    expect(rest.url).toBe('https://example.supabase.co/rest/v1/content_funnel?select=*');
    expect(rest.url).not.toContain('secret');
    const mail = calls.find(c => c.url === 'https://api.resend.com/emails');
    const sent = JSON.parse(mail.opts.body);
    expect(sent.to).toEqual(['founder@example.com']);
    expect(sent.text).toContain('revolut-sql-interview');
    expect(sent.text).toContain('777');
  });

  it('fails without the key, and names the table only when the view is missing', async () => {
    await expect(run({ env: {}, log: () => {} })).rejects.toThrow(/SUPABASE_URL/);
    const fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}) });
    const env = { SUPABASE_URL: 'https://e.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };
    await expect(run({ env, fetchImpl, log: () => {} })).rejects.toThrow(/^GET content_funnel → HTTP 404 \(is migration/);
  });

  it('source never prints the Markdown or touches the step summary', () => {
    const src = read(REPORT);
    expect(src).not.toMatch(/GITHUB_STEP_SUMMARY\s*\)|appendFileSync/);
    expect(src).not.toMatch(/log\(\s*md\b|console\.log\(\s*md\b|console\.table/);
  });
});

describe('the workflow', () => {
  const wf = read(WORKFLOW);
  const runLines = wf.split('\n').filter(l => /^\s*run:/.test(l)).map(l => l.trim());

  it('runs Mondays and Thursdays 07:50 UTC and by hand', () => {
    expect(wf).toMatch(/- cron: '50 7 \* \* 1,4'/);
    expect(wf).toMatch(/\n {2}workflow_dispatch:/);
    for (const s of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'REPORT_TO']) {
      expect(wf).toContain(`${s}: \${{ secrets.${s} }}`);
    }
  });

  // The first push of this file failed to parse on GitHub: a plain `run:`
  // value held "Script: …", and ": " inside a plain scalar is a YAML error.
  // No YAML parser is in the dependencies, so check the rule that bit us.
  it('every plain scalar value parses: no ": " or " #" inside an unquoted value', () => {
    for (const line of wf.split('\n')) {
      const m = line.match(/^\s*(?:- )?[A-Za-z_][\w-]*:\s+(.+)$/);
      if (!m) continue;
      const v = m[1];
      if (/^['"|>]/.test(v)) continue;
      expect(v, line).not.toMatch(/: | #/);
    }
  });

  it('echoes no secret and prints nothing it reads', () => {
    expect(wf).not.toMatch(/\becho\b|\bprintf\b|\bcat\b/);
    expect(wf).not.toMatch(/GITHUB_STEP_SUMMARY|set-output|GITHUB_OUTPUT/);
    for (const l of runLines) expect(l, l).not.toMatch(/\$\{\{\s*secrets\./);
  });

  it('writes nothing to the repo and posts no numbers to an issue', () => {
    expect(wf).toMatch(/permissions:\n {2}contents: read\n {2}issues: write\n/);
    expect(wf).not.toMatch(/contents:\s*write|git (commit|push)|create-pull-request|upload-artifact/);
    expect(runLines).toEqual([
      'run: node scripts/content-funnel-report.mjs',
      'run: bash scripts/gsc/notify-failure.sh "Content funnel report failed" "$RUN_URL" "$HINT"',
    ]);
    const hint = wf.match(/^ {10}HINT: '([^']*)'$/m);
    expect(hint, 'HINT is a single-quoted literal').not.toBe(null);
    expect(hint[1]).not.toMatch(/\$|`/);
    expect(wf).not.toMatch(/gh issue|gh api|steps\.[a-z_-]+\.outputs/);
  });
});

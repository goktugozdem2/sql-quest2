// The smoke bot (docs/plans/smoke-bot-rollback-2026-09-21.md): the workflow's
// triggers and gates, the DB check's thresholds, the migration's grants, and
// the pure halves of every script. No network, no Chrome: fake fetch only.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { classifyRun, touchesBackend, HERMETIC_PREAMBLE, chromeArgs, CLASSES, FIRST_SCREEN_KEY, FIRST_SCREEN_ARMS as SMOKE_ARMS, firstScreenArmPreamble } from '../scripts/smoke/lib.mjs';
import { FIRST_SCREEN_STORAGE_KEY, FIRST_SCREEN_ARMS, firstScreenDecision } from '../src/utils/first-screen.js';
import * as tutor from '../scripts/smoke/tutor-health.mjs';
import { changedUrls, sitemapLastmods, waitForSitemap, run as runIndexNow } from '../scripts/smoke/indexnow-after-deploy.mjs';
import { MIN_MEAN_MS, MIN_CALLS, WINDOW_HOURS, RPC, offendersOf, run as runDb } from '../scripts/smoke/db-slow-queries.mjs';
import { BUDGET_MS, judgeStatic, probeStatic } from '../scripts/smoke/interactive.mjs';
import { committedAppHash, hashOf, waitForDeploy, CEILING_MS } from '../scripts/smoke/wait-for-deploy.mjs';
import { newFailures, subjectFor, markerFor, markersIn, renderBody, sendMail } from '../scripts/smoke/alert.mjs';
import { pickPrevious, rollback, readProjectIds } from '../scripts/smoke/vercel-rollback.mjs';
import { judge, JUDGES, SCENARIOS } from '../scripts/smoke/pro-mock-checks.mjs';
import { batteryResult } from '../scripts/smoke/record.mjs';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const wf = read('.github/workflows/smoke.yml');
const migration = read('supabase/migrations/20260929120000_ops_query_stats_daily.sql');
const res = (status, body, text) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => text ?? JSON.stringify(body), arrayBuffer: async () => Buffer.from(typeof body === 'string' ? body : ''), });

describe('the workflow file', () => {
  it('runs daily at 07:00 UTC and by hand', () => {
    expect(wf).toContain("cron: '0 7 * * *'");
    expect(wf).toContain('workflow_dispatch:');
  });

  it('runs after a push to main that touches the deployed surface only', () => {
    const push = wf.slice(wf.indexOf('push:'), wf.indexOf('permissions:'));
    expect(push).toContain('branches: [main]');
    for (const p of ["'src/**'", "'public/**'", "'vercel.json'", "'api/**'"]) expect(push).toContain(`- ${p}`);
  });

  it('waits for the deploy marker after a push, with a ceiling', () => {
    expect(wf).toMatch(/Wait for the deploy to be live[\s\S]*if: github\.event_name == 'push'[\s\S]*wait-for-deploy\.mjs/);
    expect(CEILING_MS).toBe(10 * 60_000);
  });

  it('runs the five checks, the battery hermetic, each with continue-on-error so all five report', () => {
    for (const s of ['scripts/smoke/interactive.mjs', 'scripts/smoke-test.js', 'scripts/smoke/pro-mock-checks.mjs', 'scripts/smoke/db-slow-queries.mjs', 'scripts/smoke/tutor-health.mjs']) expect(wf).toContain(s);
    expect(wf.match(/continue-on-error: true/g)).toHaveLength(5);
    expect(wf).toMatch(/SMOKE_HERMETIC: '1'[\s\S]*smoke-test\.js/);
    expect(wf).toContain('record.mjs --verdict');
    // Every check runs before the verdict reads smoke-out/.
    const verdictAt = wf.indexOf('record.mjs --verdict');
    for (const s of ['interactive.mjs', 'smoke-test.js', 'pro-mock-checks.mjs', 'db-slow-queries.mjs', 'tutor-health.mjs']) {
      expect(wf.indexOf(`node scripts/${s === 'smoke-test.js' ? '' : 'smoke/'}${s}`)).toBeGreaterThan(0);
      expect(wf.indexOf(`node scripts/${s === 'smoke-test.js' ? '' : 'smoke/'}${s}`)).toBeLessThan(verdictAt);
    }
  });

  it('the battery counts: nothing in the workflow is advisory', () => {
    // 28/28 on 2026-09-30, locally and hermetically against production. The
    // flag may come back only for one named check with a written reason —
    // and then this line changes with it.
    expect(wf).not.toContain('SMOKE_BATTERY_ADVISORY');
    expect(wf).not.toMatch(/advisory/i);
  });

  it('never submits to IndexNow from the smoke workflow (it has a schedule)', () => {
    expect(wf).not.toMatch(/indexnow/i);
  });

  it('the rollback job is gated on the class AND the path guard AND the push AND the token', () => {
    const job = wf.slice(wf.indexOf('  rollback:'), wf.indexOf('  alert:'));
    const cond = job.match(/if: (.*)/)[1];
    expect(cond).toContain("needs.smoke.outputs.frontend_dead == 'true'");
    expect(cond).toContain("needs.smoke.outputs.backend_touched == 'false'");
    expect(cond).toContain("github.event_name == 'push'");
    expect(job).toContain('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}');
    expect(job).toMatch(/if \[ -z "\$VERCEL_TOKEN" \]; then\s*\n\s*echo "rollback skipped: VERCEL_TOKEN not set"/);
    expect(job).toContain('vercel-rollback.mjs');
    // The path guard is computed from the pushed diff, on supabase/ and api/.
    expect(wf).toMatch(/grep -Eq '\^\(supabase\/\|api\/\)'/);
    expect(wf).toMatch(/!= "push" \]; then\s*\n\s*echo "backend_touched=unknown"/);
  });

  it('alerts on failure only, through the deduplicating script, after the rollback decision', () => {
    const job = wf.slice(wf.indexOf('  alert:'));
    expect(job).toContain('needs: [smoke, rollback]');
    expect(job).toContain("if: always() && needs.smoke.result == 'failure'");
    expect(job).toContain('scripts/smoke/alert.mjs');
    for (const s of ['RESEND_API_KEY', 'REPORT_TO', 'GH_TOKEN']) expect(job).toContain(`${s}: \${{ secrets.`);
    expect(job).toContain('ROLLBACK_RESULT: ${{ needs.rollback.outputs.result }}');
  });

  it('secrets stay in the environment', () => {
    expect(wf).not.toMatch(/echo[^\n]*secrets\./);
  });
});

describe('the run classification (lib)', () => {
  it('frontend_dead only when a failing check says so; a business failure never is', () => {
    expect(classifyRun([{ check: 'a', ok: true }, { check: 'db', ok: false, class: 'business' }])).toEqual({ failed: ['db'], advisory: [], frontendDead: false, classes: ['business'] });
    expect(classifyRun([{ check: 'interactive', ok: false, class: 'frontend_dead' }, { check: 'pro-mock', ok: false, class: 'business' }]).frontendDead).toBe(true);
    expect(classifyRun([{ check: 'interactive', ok: false, class: 'slow' }]).frontendDead).toBe(false);
    expect(classifyRun([]).failed).toEqual([]);
  });

  it('an advisory failure is shown but never counts: not failed, not dead', () => {
    const r = classifyRun([{ check: 'smoke-battery', ok: false, class: 'advisory' }, { check: 'interactive', ok: true }]);
    expect(r).toEqual({ failed: [], advisory: ['smoke-battery'], frontendDead: false, classes: [] });
  });

  it('pins the first-screen arm with the app\'s own stored assignment', () => {
    // Bound to the module: a renamed key or arm would otherwise leave the
    // battery tossing the A/B coin again without a single check noticing.
    expect(FIRST_SCREEN_KEY).toBe(FIRST_SCREEN_STORAGE_KEY);
    expect([...SMOKE_ARMS]).toEqual(FIRST_SCREEN_ARMS);
    for (const arm of FIRST_SCREEN_ARMS) {
      const store = {};
      new Function('localStorage', firstScreenArmPreamble(arm))({ setItem: (k, v) => { store[k] = v; } });
      const stored = JSON.parse(store[FIRST_SCREEN_STORAGE_KEY]);
      expect(stored.arm).toBe(arm);
      // What the app does with that record on the start screen, whatever the aid hashes to.
      for (const aid of ['a', 'b', 'c', 'd']) {
        expect(firstScreenDecision({ flagOn: true, onStartScreen: true, stored, aid })).toEqual({ assign: false, arm, act: arm === 'challenge' });
      }
    }
    expect(() => firstScreenArmPreamble('coin')).toThrow(/unknown first-screen arm/);
    const battery = read('scripts/smoke-test.js');
    expect(battery).toMatch(/await pinFirstScreenArm\('quiz'\);\s*\n\s*await cdp\(tab, 'Page\.navigate'/);
    expect(battery.match(/pinFirstScreenArm\('challenge'\)/g)).toHaveLength(1);
    // The query goes into CodeMirror, never its hidden textarea.
    expect(battery).not.toMatch(/HTMLTextAreaElement\.prototype, 'value'\)\.set;\s*\n\s*ta\.focus/);
    expect(battery).toMatch(/\.CodeMirror'\)\?\.CodeMirror/);
  });

  it('the path guard: supabase/** and api/** are backend; src/ and public/ are not', () => {
    expect(touchesBackend(['src/app.jsx', 'public/app.js'])).toBe(false);
    expect(touchesBackend(['src/app.jsx', 'supabase/migrations/x.sql'])).toBe(true);
    expect(touchesBackend(['api/u.js'])).toBe(true);
    expect(touchesBackend([])).toBe(false);
  });

  it('the hermetic preamble answers the backend in-page and re-emits the muted analytics line', () => {
    expect(HERMETIC_PREAMBLE).toMatch(/supabase\|functions/);
    expect(HERMETIC_PREAMBLE).toContain("console.debug('[sqlquest] analytics muted on localhost:'");
    expect(HERMETIC_PREAMBLE).toContain('rpc\\/sq_save_user');
    expect(HERMETIC_PREAMBLE).toContain('navigator.sendBeacon = () => true');
  });

  it('a clean profile: fresh user-data-dir, extensions off, headless', () => {
    const args = chromeArgs(9999, '/tmp/x');
    expect(args).toContain('--disable-extensions');
    expect(args).toContain('--headless=new');
    expect(args).toContain('--user-data-dir=/tmp/x');
  });
});

describe('interactive within 10 s', () => {
  it('the budget is 10 seconds', () => { expect(BUDGET_MS).toBe(10_000); });

  it('classifies the static probe: a dead front end is visible without a browser', () => {
    expect(judgeStatic({ pageStatus: 200, hasAppTag: true, appJsStatus: 200, appJsBytes: 500_000 })).toBeNull();
    expect(judgeStatic({ pageStatus: 500, hasAppTag: false })).toMatch(/HTTP 500/);
    expect(judgeStatic({ pageStatus: 200, hasAppTag: false })).toMatch(/no \/app\.js/);
    expect(judgeStatic({ pageStatus: 200, hasAppTag: true, appJsStatus: 404 })).toMatch(/app\.js answered HTTP 404/);
    expect(judgeStatic({ pageStatus: 200, hasAppTag: true, appJsStatus: 200, appJsBytes: 12 })).toMatch(/stub/);
  });

  it('probes /app/ then the exact app.js the page names', async () => {
    const urls = [];
    const html = '<script src="/app.js?v=42d4a302"></script>';
    const fetchImpl = async (u) => { urls.push(u); return u.endsWith('/app/') ? res(200, html, html) : res(200, 'x'.repeat(10)); };
    const p = await probeStatic('https://sqlquest.app', fetchImpl);
    expect(urls).toEqual(['https://sqlquest.app/app/', 'https://sqlquest.app/app.js?v=42d4a302']);
    expect(p).toEqual({ pageStatus: 200, hasAppTag: true, appJsStatus: 200, appJsBytes: 10 });
  });
});

describe('wait for the deploy', () => {
  it('reads the cachebust hash from app.html', () => {
    expect(committedAppHash('<script src="/app.js?v=42d4a302"></script>')).toBe('42d4a302');
    expect(committedAppHash('<script src="/app.js"></script>')).toBeNull();
    expect(committedAppHash(read('public/app.html'))).toMatch(/^[a-f0-9]{8}$/);
  });

  it('is live only when the page AND the served app.js carry the committed hash; times out at the ceiling', async () => {
    const js = Buffer.from('bundle');
    const h = hashOf(js);
    let t = 0;
    const clock = { now: () => t, sleep: async (ms) => { t += ms; }, log: () => {} };
    let stage = 0;
    const fetchImpl = async (u) => {
      if (u.endsWith('/app/')) return stage === 0 ? res(200, '', '<script src="/app.js?v=deadbeef"></script>') : res(200, '', `<script src="/app.js?v=${h}"></script>`);
      return { ok: true, status: 200, arrayBuffer: async () => stage < 2 ? Buffer.from('old') : js };
    };
    const slow = await waitForDeploy({ base: 'https://x', expected: h, fetchImpl, ...clock, ceilingMs: 60_000, pollMs: 15_000 });
    expect(slow.live).toBe(false);
    expect(slow.waitedMs).toBeGreaterThanOrEqual(60_000);
    stage = 1; t = 0;
    const cached = await waitForDeploy({ base: 'https://x', expected: h, fetchImpl, ...clock, ceilingMs: 30_000, pollMs: 15_000 });
    expect(cached.live).toBe(false);
    expect(cached.last.servedJsHash).toBe(hashOf(Buffer.from('old')));
    stage = 2; t = 0;
    expect((await waitForDeploy({ base: 'https://x', expected: h, fetchImpl, ...clock })).live).toBe(true);
  });
});

describe('the DB check', () => {
  it('thresholds: mean > 200 ms AND calls > 1,000 in 24 h — in the script and in the migration defaults', () => {
    expect(MIN_MEAN_MS).toBe(200);
    expect(MIN_CALLS).toBe(1000);
    expect(WINDOW_HOURS).toBe(24);
    expect(migration).toMatch(/p_min_mean_ms\s+double precision default 200/);
    expect(migration).toMatch(/p_min_calls\s+bigint\s+default 1000/);
    expect(migration).toMatch(/p_window_hours\s+integer\s+default 24/);
  });

  it('an offender is strictly over both thresholds; at the line it is not one', () => {
    const rows = [
      { queryid: 1, calls_delta: 1001, mean_ms: 200.1, query_head: 'select slow' },
      { queryid: 2, calls_delta: 1000, mean_ms: 900, query_head: 'few calls' },
      { queryid: 3, calls_delta: 50000, mean_ms: 200, query_head: 'at the line' },
      { queryid: 4, calls_delta: 5000, mean_ms: 350, query_head: 'select worse' },
    ];
    expect(offendersOf(rows).map(o => o.queryid)).toEqual(['4', '1']);
  });

  it('calls the RPC with the thresholds and the service role; a 404 is an infrastructure state', async () => {
    let sent;
    const out = await runDb({ env: { SUPABASE_URL: 'https://p.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'srk' }, fetchImpl: async (u, o) => { sent = { u, o }; return res(200, []); } });
    expect(sent.u).toBe(`https://p.supabase.co/rest/v1/rpc/${RPC}`);
    expect(sent.o.headers.authorization).toBe('Bearer srk');
    expect(JSON.parse(sent.o.body)).toEqual({ p_min_mean_ms: 200, p_min_calls: 1000, p_window_hours: 24 });
    expect(out.offenders).toEqual([]);
    const err = await runDb({ env: { SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }, fetchImpl: async () => res(404, {}, 'not found') }).catch(e => e);
    expect(err.infra).toBe(true);
    expect(err.message).toMatch(/HTTP 404/);
    await expect(runDb({ env: {} })).rejects.toThrow(/not set/);
  });

  it('the migration: schema ops, RLS on, nothing granted to anon or authenticated, service role only, never a reset', () => {
    expect(migration).toContain('create schema if not exists ops');
    expect(migration).toContain('create table if not exists ops.query_stats_daily');
    for (const col of ['queryid', 'query_sha', 'calls', 'total_exec_time', 'captured_at']) expect(migration).toMatch(new RegExp(`^\\s+${col}\\s`, 'm'));
    expect(migration).toContain('alter table ops.query_stats_daily enable row level security');
    expect(migration).not.toMatch(/grant[^;]*\bto\b[^;]*\b(anon|authenticated)\b/i);
    expect(migration).toMatch(/revoke all on ops\.query_stats_daily from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.ops_capture_query_stats[^;]*to service_role/);
    expect(migration).toMatch(/revoke all on function public\.ops_capture_query_stats[^;]*from public, anon, authenticated/);
    expect(migration.match(/security definer/g)).toHaveLength(2);
    expect(migration).not.toMatch(/pg_stat_statements_reset/);
    expect(fs.existsSync(new URL('../supabase/manual/20260929_ops_query_stats_daily_rollback.sql', import.meta.url))).toBe(true);
  });
});

describe('the alert', () => {
  it('deduplicates per failing check per UTC day through the issue markers', () => {
    const seen = markersIn(`${markerFor('db-slow-queries', '2026-09-29')}\nx\n${markerFor('interactive', '2026-09-28')}`);
    expect(newFailures(['db-slow-queries', 'interactive'], seen, '2026-09-29')).toEqual(['interactive']);
    expect(newFailures(['db-slow-queries'], seen, '2026-09-29')).toEqual([]);
    expect(newFailures(['db-slow-queries'], seen, '2026-09-30')).toEqual(['db-slow-queries']);
  });

  it('the subject names the failing check', () => {
    expect(subjectFor(['interactive'])).toBe('[smoke] interactive failed on sqlquest.app');
    expect(subjectFor(['interactive', 'pro-mock'], { rolledBack: true })).toBe('[smoke] interactive, pro-mock failed on sqlquest.app — rolled back');
  });

  it('the body carries every failing check, the rollback outcome and today\'s markers', () => {
    const body = renderBody({ results: [{ check: 'interactive', ok: false, class: 'frontend_dead', detail: { why: 'no shell' } }, { check: 'db-slow-queries', ok: true }], failed: ['interactive'], runUrl: 'https://gh/run/1', rollback: { rolledBack: true, from: 'a', to: 'b', commit: 'c0ffee' }, day: '2026-09-29' });
    expect(body).toContain('✗ interactive [frontend_dead]');
    expect(body).toContain('ROLLED BACK: production a → b (c0ffee)');
    expect(body).toContain('passed: db-slow-queries');
    expect(body).toContain(markerFor('interactive', '2026-09-29'));
  });

  it('one mail through Resend, none without the secrets', async () => {
    let sent;
    await sendMail({ env: { RESEND_API_KEY: 'k', REPORT_TO: 'f@x' }, fetchImpl: async (u, o) => { sent = { u, body: JSON.parse(o.body) }; return res(200, { id: 1 }); }, subject: 's', text: 't' });
    expect(sent.u).toBe('https://api.resend.com/emails');
    expect(sent.body).toMatchObject({ to: ['f@x'], subject: 's' });
    expect(await sendMail({ env: {}, subject: 's', text: 't' })).toMatchObject({ mailed: false });
  });
});

describe('the Vercel rollback', () => {
  const deployments = [
    { uid: 'cur', target: 'production', readyState: 'READY', created: 300 },
    { uid: 'prev-ready', target: 'production', readyState: 'READY', created: 200, meta: { githubCommitSha: 'abc' } },
    { uid: 'prev-error', target: 'production', readyState: 'ERROR', created: 250 },
    { uid: 'preview', target: null, readyState: 'READY', created: 290 },
    { uid: 'older', target: 'production', readyState: 'READY', created: 100 },
  ];

  it('picks the newest READY production deployment that is not the current one', () => {
    expect(pickPrevious(deployments, 'cur').uid).toBe('prev-ready');
    expect(pickPrevious(deployments.filter(d => d.uid === 'cur'), 'cur')).toBeNull();
  });

  it('without the token: logs the skip and does nothing', async () => {
    const logs = [];
    let called = 0;
    const r = await rollback({ env: {}, fetchImpl: async () => { called++; }, log: (m) => logs.push(m) });
    expect(r).toEqual({ skipped: 'VERCEL_TOKEN not set' });
    expect(logs).toContain('rollback skipped: VERCEL_TOKEN not set');
    expect(called).toBe(0);
  });

  it('with the token: POST /v1/projects/{id}/rollback/{previous} scoped to the team', async () => {
    const calls = [];
    const fetchImpl = async (u, o = {}) => {
      calls.push({ u, method: o.method || 'GET' });
      if (/\/v9\/projects\//.test(u)) return res(200, { targets: { production: { id: 'cur' } } });
      if (/\/v6\/deployments/.test(u)) return res(200, { deployments });
      if (/\/rollback\//.test(u)) return res(201, {});
      throw new Error('unexpected ' + u);
    };
    const r = await rollback({ env: { VERCEL_TOKEN: 't', VERCEL_PROJECT_ID: 'prj_1', VERCEL_ORG_ID: 'team_1' }, fetchImpl, log: () => {} });
    expect(r).toEqual({ rolledBack: true, from: 'cur', to: 'prev-ready', commit: 'abc' });
    const post = calls.find(c => c.method === 'POST');
    expect(post.u).toMatch(/^https:\/\/api\.vercel\.com\/v1\/projects\/prj_1\/rollback\/prev-ready\?/);
    expect(post.u).toContain('teamId=team_1');
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(1);
  });

  it('ids come from env secrets, else .vercel/project.json, else nothing', () => {
    expect(readProjectIds({ VERCEL_PROJECT_ID: 'p', VERCEL_ORG_ID: 'o' }, '/nonexistent')).toEqual({ projectId: 'p', orgId: 'o', source: 'env' });
    expect(readProjectIds({}, '/nonexistent')).toEqual({ projectId: null, orgId: null, source: 'none' });
  });
});

describe('pro-mock scenarios as checks', () => {
  it('three read-only scenarios, each with a judge; the modal and the surface run as the free account', () => {
    expect(SCENARIOS).toEqual(['price_modal_copy', 'deeplink_session', 'free_interview_surface']);
    for (const s of SCENARIOS) expect(typeof JUDGES[s]).toBe('function');
    expect(read('scripts/smoke/pro-mock-checks.mjs')).toContain("name === 'deeplink_session' ? [] : ['--free']");
  });

  it('judges the scenario JSON: the modal with its prices, the kept session, the tabs', () => {
    expect(JUDGES.price_modal_copy({ modalOpen: true, prices: ['$29', '$99'] })).toBeNull();
    expect(JUDGES.price_modal_copy({ modalOpen: false, prices: [] })).toMatch(/did not open/);
    expect(JUDGES.deeplink_session({ late: { savedUser: 'qa_pro', guestBanner: false, openedChallenge: 'editor open' } })).toBeNull();
    expect(JUDGES.deeplink_session({ late: { savedUser: null, guestBanner: true } })).toMatch(/lost the session/);
    expect(JUDGES.free_interview_surface({ hasInterviewTab: true, tabsText: 'Learning Path Challenges Interview' })).toBeNull();
    expect(JUDGES.free_interview_surface({ hasInterviewTab: false, tabsText: 'NO TABS BLOCK' })).toMatch(/without the tabs/);
    expect(judge([{ name: 'price_modal_copy', code: 1, json: null, err: 'boom' }])).toEqual([{ scenario: 'price_modal_copy', why: 'scenario exited 1 without JSON', stderr: 'boom' }]);
  });
});

describe('the battery record', () => {
  it('a crash is infra, a failed check is business, and the summary line is kept', () => {
    expect(batteryResult('smoke-battery', 0, '  ✓ a\n\n30/30 passed\n')).toMatchObject({ ok: true, class: 'ok', detail: { summary: '30/30 passed' } });
    expect(batteryResult('smoke-battery', 1, '  ✗ app shell rendered — no tabs\n29/30 passed\n')).toMatchObject({ ok: false, class: CLASSES.BUSINESS, detail: { failed: ['  ✗ app shell rendered — no tabs'] } });
    expect(batteryResult('smoke-battery', 2, 'Smoke test crashed: no tab').class).toBe(CLASSES.INFRA);
    expect(batteryResult('smoke-battery', 2, '').class).toBe(CLASSES.INFRA);
    expect(batteryResult('smoke-battery', 1, '✗ x\n26/27 passed', { advisory: true }).class).toBe(CLASSES.ADVISORY);
    expect(batteryResult('smoke-battery', 0, '27/27 passed', { advisory: true }).class).toBe('ok');
  });
});

// The one real call (2026-09-30): the tutor returned 502 for three days and
// every hermetic check stayed green, because they stub the backend.
describe('tutor-health: one real call to the production tutor', () => {
  const ANON = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.sig`;
  const SERVICE = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.sig`;
  const bundle = (key) => `window.SUPABASE_URL="https://abc123.supabase.co",window.SUPABASE_ANON_KEY="${key}";`;
  const files = (key) => (p) => { if (p.endsWith('public/data.js')) return bundle(key); throw new Error('ENOENT'); };

  it('judges: 200 with a text passes; 429 passes with a note; 502, an empty or a short text fail', () => {
    expect(tutor.MIN_TEXT).toBe(20);
    expect(tutor.judge({ status: 200, body: { text: 'Think about which column splits the rows.' } })).toEqual({ ok: true });
    const limited = tutor.judge({ status: 429, body: { error: 'Daily AI limit reached', used: 20, limit: 20 } });
    expect(limited.ok).toBe(true);
    expect(limited.note).toMatch(/429.*20\/20/);
    expect(tutor.judge({ status: 502, body: { error: 'AI service error', status: 400 } })).toEqual({ ok: false, why: 'HTTP 502 — AI service error (upstream 400)' });
    expect(tutor.judge({ status: 200, body: { text: '' } }).ok).toBe(false);
    expect(tutor.judge({ status: 200, body: { text: 'x'.repeat(19) } }).ok).toBe(false);
    expect(tutor.judge({ status: 200, body: { text: 'x'.repeat(20) } }).ok).toBe(true);
    expect(tutor.judge({ status: 200, body: null }).ok).toBe(false);
    expect(tutor.judge({ status: 404, body: { error: 'User not found' } }).ok).toBe(false);
  });

  it('sends ONE live_nudge as the internal account, with the public anon key and the site origin', async () => {
    const calls = [];
    const r = await tutor.run({
      env: { SUPABASE_URL: 'https://p.supabase.co/' },
      readFile: files(ANON),
      fetchImpl: async (u, o) => { calls.push({ u, o }); return res(200, { text: 'AVG collapses the table into one group; which column splits it?', usage: { used: 1 } }); },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].u).toBe('https://p.supabase.co/functions/v1/ai-tutor');
    expect(calls[0].o.method).toBe('POST');
    expect(calls[0].o.headers).toMatchObject({ apikey: ANON, authorization: `Bearer ${ANON}`, origin: 'https://sqlquest.app' });
    const body = JSON.parse(calls[0].o.body);
    expect(body).toMatchObject({ username: 'sqlquest', mode: 'live_nudge', phase: 'live_nudge' });
    expect(body.messages).toHaveLength(1);
    expect(r).toMatchObject({ ok: true, status: 200, keySource: 'public/data.js' });
    // live_nudge is the cheapest phase the function has.
    expect(read('supabase/functions/ai-tutor/index.ts')).toMatch(/live_nudge: 120,/);
  });

  it('reads the key the page ships, falls back to the URL beside it, and refuses a key that is not anon', async () => {
    expect(tutor.anonKeyFrom(read('public/data.js'))).toMatch(/^eyJ/);
    expect(tutor.roleOf(tutor.anonKeyFrom(read('public/data.js')))).toBe('anon');
    expect(tutor.KEY_SOURCES[0]).toBe('public/data.js');
    let url;
    await tutor.run({ env: {}, readFile: files(ANON), fetchImpl: async (u) => { url = u; return res(200, { text: 'x'.repeat(40) }); } });
    expect(url).toBe('https://abc123.supabase.co/functions/v1/ai-tutor');
    let called = 0;
    const err = await tutor.run({ env: {}, readFile: files(SERVICE), fetchImpl: async () => { called++; return res(200, {}); } }).catch(e => e);
    expect(err.infra).toBe(true);
    expect(err.message).toMatch(/not an anon key/);
    expect(called).toBe(0);
    await expect(tutor.run({ env: {}, readFile: () => { throw new Error('ENOENT'); } })).rejects.toThrow(/no SUPABASE_ANON_KEY/);
    // No secret is added for it: the workflow passes the URL only.
    const step = wf.slice(wf.indexOf('id: tutor'), wf.indexOf('- name: Verdict'));
    expect(step).toContain('SUPABASE_URL: ${{ secrets.SUPABASE_URL }}');
    expect(step).not.toMatch(/SERVICE_ROLE|ANON_KEY/);
  });

  it('an outage is a business failure — never frontend_dead, so never a rollback', async () => {
    const down = await tutor.run({ env: {}, readFile: files(ANON), fetchImpl: async () => res(502, { error: 'AI service error', status: 400 }) });
    expect(down).toMatchObject({ ok: false, status: 502 });
    const dead = await tutor.run({ env: {}, readFile: files(ANON), fetchImpl: async () => { throw new Error('fetch failed'); } });
    expect(dead).toMatchObject({ ok: false, status: 0 });
    expect(dead.why).toMatch(/no answer/);
    const src = read('scripts/smoke/tutor-health.mjs');
    expect(src).toContain("class: r.ok ? 'ok' : CLASSES.BUSINESS");
    expect(src).not.toMatch(/FRONTEND_DEAD|frontend_dead'/);
    expect(classifyRun([{ check: tutor.CHECK, ok: false, class: CLASSES.BUSINESS }])).toEqual({ failed: ['tutor-health'], advisory: [], frontendDead: false, classes: ['business'] });
    expect(subjectFor(['tutor-health'])).toBe('[smoke] tutor-health failed on sqlquest.app');
  });

  it('a 429 pass says so in the alert body', () => {
    const body = renderBody({ results: [{ check: 'interactive', ok: false, class: 'slow', detail: {} }, { check: 'tutor-health', ok: true, detail: { note: 'HTTP 429 — the internal account\'s daily limit is used up' } }], failed: ['interactive'], day: '2026-09-30' });
    expect(body).toContain('note, tutor-health: HTTP 429');
  });
});

// IndexNow after every deploy (2026-09-30): push only, after the deploy is
// live, only what the push changed, and it can fail nothing.
describe('indexnow.yml: after a deploy, never on a schedule, never a failure', () => {
  const iw = read('.github/workflows/indexnow.yml');
  const sm = (rows) => `<urlset>${rows.map(([loc, lastmod]) => `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('')}</urlset>`;
  const BEFORE = sm([['https://sqlquest.app/', '2026-09-20'], ['https://sqlquest.app/a/', '2026-09-21'], ['https://sqlquest.app/gone/', '2026-09-01']]);
  const AFTER = sm([['https://sqlquest.app/', '2026-09-20'], ['https://sqlquest.app/a/', '2026-09-30'], ['https://sqlquest.app/new/', '2026-09-30']]);
  const APP = '<script src="/app.js?v=42d4a302"></script>';
  const io = (over = {}) => {
    const calls = { submit: [], order: [] };
    return {
      calls,
      args: {
        env: { GITHUB_EVENT_NAME: 'push', BEFORE: 'abc' },
        readFile: (p) => (p.endsWith('sitemap.xml') ? AFTER : APP),
        showAt: () => BEFORE,
        waitApp: async ({ expected }) => { calls.order.push(`app:${expected}`); return { live: true, waitedMs: 0 }; },
        waitSitemap: async ({ committed }) => { calls.order.push(committed === AFTER ? 'sitemap' : 'sitemap:WRONG'); return { live: true, waitedMs: 0 }; },
        submit: (urls) => { calls.order.push('submit'); calls.submit.push(urls); return { ok: true }; },
        log: () => {},
        ...over,
      },
    };
  };

  it('triggers on a push to main that touched public/** and on nothing else', () => {
    const on = iw.slice(iw.indexOf('\non:'), iw.indexOf('permissions:'));
    expect(on).toMatch(/push:\s*\n\s+branches: \[main\]\s*\n\s+paths:\s*\n\s+- 'public\/\*\*'\s*\n/);
    expect(on.match(/^\s+- '/gm)).toHaveLength(1);
    expect(iw).not.toMatch(/^\s+(schedule|workflow_dispatch|pull_request|workflow_run):/m);
    expect(iw).not.toContain('cron');
  });

  it('cannot fail anything: continue-on-error, exit 0 always, no smoke-out record, read-only token', () => {
    expect(iw).toMatch(/continue-on-error: true[\s\S]*indexnow-after-deploy\.mjs/);
    expect(iw).toMatch(/permissions:\s*\n\s+contents: read\s*\n/);
    expect(iw).not.toMatch(/issues: write|secrets\./);
    const src = read('scripts/smoke/indexnow-after-deploy.mjs');
    expect(src).toMatch(/\.finally\(\(\) => process\.exit\(0\)\)/);
    expect(src.match(/process\.exit\(/g)).toHaveLength(1);
    expect(src).not.toMatch(/writeResult|smoke-out\/?['"`]|lib\.mjs/);
    expect(iw).toContain('BEFORE: ${{ github.event.before }}');
  });

  it('submits only the URLs whose lastmod the push changed or added', () => {
    expect([...sitemapLastmods(AFTER).keys()]).toHaveLength(3);
    expect(changedUrls(BEFORE, AFTER)).toEqual(['https://sqlquest.app/a/', 'https://sqlquest.app/new/']);
    expect(changedUrls(AFTER, AFTER)).toEqual([]);
    expect(changedUrls('', AFTER)).toHaveLength(3);
    // The live sitemap parses, and every entry carries a lastmod to compare.
    const live = sitemapLastmods(read('public/sitemap.xml'));
    expect(live.size).toBeGreaterThan(300);
    expect([...live.values()].every(Boolean)).toBe(true);
  });

  it('waits for the app marker, then the served sitemap, and only then submits', async () => {
    const { calls, args } = io();
    const r = await runIndexNow(args);
    expect(calls.order).toEqual(['app:42d4a302', 'sitemap', 'submit']);
    expect(calls.submit).toEqual([['https://sqlquest.app/a/', 'https://sqlquest.app/new/']]);
    expect(r).toMatchObject({ submitted: 2 });
  });

  it('submits nothing when the deploy is not live, when no lastmod moved, or when it is not a push', async () => {
    const notLive = io({ waitApp: async () => ({ live: false, waitedMs: 600_000 }) });
    expect(await runIndexNow(notLive.args)).toMatchObject({ submitted: 0, skipped: expect.stringMatching(/did not go live/) });
    const stale = io({ waitSitemap: async () => ({ live: false, waitedMs: 600_000 }) });
    expect(await runIndexNow(stale.args)).toMatchObject({ submitted: 0, skipped: expect.stringMatching(/sitemap\.xml was not served/) });
    const same = io({ showAt: () => AFTER });
    expect(await runIndexNow(same.args)).toMatchObject({ submitted: 0, skipped: 'no <lastmod> changed in this push' });
    for (const ev of ['schedule', 'workflow_dispatch', undefined]) {
      const x = io({ env: { GITHUB_EVENT_NAME: ev, BEFORE: 'abc' } });
      expect(await runIndexNow(x.args)).toMatchObject({ submitted: 0, skipped: expect.stringMatching(/not a push/) });
      expect(x.calls.order).toEqual([]);
    }
    for (const x of [notLive, stale, same]) expect(x.calls.submit).toEqual([]);
  });

  it('a failed ping is reported, not thrown; a force push falls back to the 7-day default', async () => {
    const failed = io({ submit: () => ({ ok: false, why: 'scripts/indexnow.mjs exited 1' }) });
    expect(await runIndexNow(failed.args)).toEqual({ submitted: 0, error: 'scripts/indexnow.mjs exited 1' });
    const forced = io({ showAt: () => null });
    const r = await runIndexNow(forced.args);
    expect(forced.calls.submit).toEqual([[]]); // no explicit URLs = the script's own default window
    expect(r.mode).toMatch(/7 days/);
  });

  it('the served sitemap must be byte-equal to the committed one', async () => {
    let t = 0;
    const clock = { now: () => t, sleep: async (ms) => { t += ms; }, log: () => {} };
    let served = BEFORE;
    const fetchImpl = async (u) => { expect(u).toBe('https://x/sitemap.xml'); return res(200, null, served); };
    expect((await waitForSitemap({ base: 'https://x', committed: AFTER, fetchImpl, ...clock, ceilingMs: 45_000, pollMs: 15_000 })).live).toBe(false);
    served = AFTER; t = 0;
    expect(await waitForSitemap({ base: 'https://x', committed: AFTER, fetchImpl, ...clock })).toEqual({ live: true, waitedMs: 0 });
  });
});

// The credential check must never become a rollback: manual trigger only,
// and the one command it runs carries --dry (2026-09-29).
describe('rollback-check.yml is a dry, manual check', () => {
  const wf = fs.readFileSync(new URL('../.github/workflows/rollback-check.yml', import.meta.url), 'utf8');
  it('runs only on workflow_dispatch', () => {
    expect(wf).toMatch(/^on:\s*\n\s+workflow_dispatch:\s*$/m);
    expect(wf).not.toMatch(/^\s+(push|schedule|pull_request):/m);
  });
  it('every rollback invocation carries --dry', () => {
    const calls = wf.match(/vercel-rollback\.mjs[^\n]*/g) || [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c).toMatch(/--dry\b/);
  });
});

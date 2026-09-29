// The smoke bot (docs/plans/smoke-bot-rollback-2026-09-21.md): the workflow's
// triggers and gates, the DB check's thresholds, the migration's grants, and
// the pure halves of every script. No network, no Chrome: fake fetch only.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { classifyRun, touchesBackend, HERMETIC_PREAMBLE, chromeArgs, CLASSES } from '../scripts/smoke/lib.mjs';
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

  it('runs the four checks, the battery hermetic, each with continue-on-error so all four report', () => {
    for (const s of ['scripts/smoke/interactive.mjs', 'scripts/smoke-test.js', 'scripts/smoke/pro-mock-checks.mjs', 'scripts/smoke/db-slow-queries.mjs']) expect(wf).toContain(s);
    expect(wf.match(/continue-on-error: true/g)).toHaveLength(4);
    expect(wf).toMatch(/SMOKE_HERMETIC: '1'[\s\S]*smoke-test\.js/);
    expect(wf).toContain('record.mjs --verdict');
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
    expect(wf).toMatch(/SMOKE_BATTERY_ADVISORY: '1'[\s\S]*smoke-test\.js/);
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

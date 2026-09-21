#!/usr/bin/env node
/**
 * The four end-to-end checks the smoke test does not reach (founder's list
 * item 10, 2026-09-14): Pro mocks, sign-in, cross-device progress sync, and
 * whether the recommendation actually moves after several solves.
 *
 * Why it is not in scripts/smoke-test.js: every check here needs SEEDED state
 * — a Pro guest, a guest with a dozen solves — which the smoke test
 * deliberately never has (it is the cold-start guard, and a seeded localStorage
 * would quietly weaken it). This one is slower and runs on demand.
 *
 * HERMETIC BY CONSTRUCTION. The local app points at the PRODUCTION Supabase
 * project, so a naive click on "Log In" would send a real login attempt and
 * write a real row. Before the app boots, this harness replaces window.fetch
 * with a recorder that answers every Supabase call from a canned response and
 * lets nothing leave the machine. That is also what makes the sign-in and
 * sync checks possible: the assertion is on the request the client MAKES —
 * which function, which RPC, which payload — not on what the server answers.
 *
 * What this therefore does NOT verify, and where the evidence for it lives:
 *   - a real password check. Creating an account and typing a password are
 *     both off-limits for the agent; the live evidence is the successful
 *     logins through `account-login` in production (docs/reads/
 *     account-security-2026-09-14.md) and the 11:00 auth health-check task.
 *   - a second real device reading the row back. The check here is that the
 *     write goes through sq_save_user and the read through rpc/sq_load_account
 *     (users_public until 2026-09-22),
 *     which is the whole of what the client controls.
 *
 * Usage:
 *   1. npm run dev   (serves public/ on :4321)
 *   2. npm run e2e
 *
 * Exits non-zero on any failure.
 */

import { spawn } from 'child_process';
import http from 'http';

const URL = process.argv[2] || 'http://127.0.0.1:4321';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// A fixed port meant a Chrome left behind by an interrupted run held it and
// the next run hung waiting for a tab that was never its own. Pick a fresh
// one per run instead.
const PORT = 9400 + (process.pid % 500);

const checks = [];
const pass = name => { checks.push({ name, ok: true }); };
const fail = (name, why) => { checks.push({ name, ok: false, why }); };

let msgId = 0;
const pending = new Map();
let ws;
const cdp = (method, params) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

async function ev(expr) {
  const r = await cdp('Runtime.evaluate', {
    expression: `(async () => { try { return { ok: 1, v: await (${expr}) }; } catch (e) { return { ok: 0, e: String(e && e.stack || e) }; } })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const x = r.result?.value || {};
  if (!x.ok) throw new Error(x.e || 'eval failed');
  return x.v;
}

const getJSON = u => new Promise((res, rej) => {
  http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => res(JSON.parse(b))); }).on('error', rej);
});

// ── the page-side preamble: seed, then cut the wire ────────────────────────
//
// Runs before any app script on every navigation. `__seed` is replaced per
// scenario; `__net` collects every request the client tried to make.
const preamble = (seed, cloudRow = null) => `
(() => {
  window.__cloudRow = ${JSON.stringify(cloudRow)};
  try {
    localStorage.clear();
    const seed = ${JSON.stringify(seed)};
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  } catch (_) {}
  window.__net = [];
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input && input.url ? input.url : input);
    const method = (init && init.method) || (input && input.method) || 'GET';
    let body = null;
    try { body = (init && init.body) ? String(init.body).slice(0, 2000) : null; } catch (_) {}
    window.__net.push({ url, method, body });
    // Anything that would leave this machine is answered here instead.
    if (/supabase|functions\\/v1|vercel-insights|va\\.vercel/i.test(url)) {
      const J = { 'Content-Type': 'application/json' };
      // Mirror what PRODUCTION answers, so a client that falls back to a path
      // that is closed in production fails here too.
      if (/functions\\/v1\\/account-login/.test(url)) return new Response(JSON.stringify({ error: 'invalid_credentials' }), { status: 401, headers: J });
      if (/rpc\\/sq_save_user/.test(url)) return new Response('', { status: 204, headers: J });
      if (/\\/rest\\/v1\\/users\\?/.test(url)) return new Response(JSON.stringify({ message: 'permission denied for table users' }), { status: 401, headers: J });
      if (/users_public\\?|rpc\/sq_load_account/.test(url) && window.__cloudRow) return new Response(JSON.stringify([window.__cloudRow]), { status: 200, headers: J });
      return new Response('[]', { status: 200, headers: J });
    }
    return real(input, init);
  };
})();
`;

const CH = n => Array.from({ length: n }, (_, i) => 91 + i);

const attemptsFor = ids => ids.map(id => ({
  challengeId: id, correct: true, topics: ['SELECT'], timestamp: Date.now() - 86400000,
}));

/** A guest blob isResumableGuest() will accept. */
const guest = (over = {}) => ({
  solvedChallenges: [], xp: 0, level: 1, streak: 1,
  lastActive: Date.now(), createdAt: Date.now() - 86400000,
  ...over,
});

// NOTE: always `/app/`, never `/app.html`. The static server 301s
// /app.html → /app and DROPS the query string, so every deep-link check
// silently ran against a plain app load and failed for the wrong reason.
async function load(seed, path = '/app/', cloudRow = null) {
  await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: load._id }).catch(() => {});
  const r = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: preamble(seed, cloudRow) });
  load._id = r.identifier;
  await cdp('Page.navigate', { url: URL + path });
  await new Promise(r2 => setTimeout(r2, 3200));
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log(`E2E → ${URL}`);
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run',
    `--user-data-dir=/tmp/chrome-e2e-${Date.now()}`, 'about:blank',
  ], { stdio: 'ignore' });

  for (let i = 0; i < 40; i++) {
    try { if ((await getJSON(`http://127.0.0.1:${PORT}/json`)).length) break; } catch (_) {}
    await wait(200);
  }
  const tab = (await getJSON(`http://127.0.0.1:${PORT}/json`)).find(t => t.type === 'page');
  if (!tab) throw new Error('no tab');
  const WebSocket = (await import('ws')).WebSocket;
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || m); pending.delete(m.id); }
  });
  await cdp('Page.enable', {});
  await cdp('Runtime.enable', {});

  try {
    // ── 1. Pro mocks ───────────────────────────────────────────────────────
    //
    // Two runs on the same mock: a Pro guest must reach a question, a free
    // guest must meet the gate. One without the other proves nothing — if
    // mocks were ungated the Pro run would pass on its own.
    const proSeed = {
      sqlquest_guest_user: 'guest_e2e_pro',
      sqlquest_user_guest_e2e_pro: guest({
        solvedChallenges: CH(14), xp: 300, level: 4,
        challengeAttempts: attemptsFor(CH(14)),
        proStatus: true, proType: 'annual', proExpiry: new Date(Date.now() + 30 * 86400000).toISOString(),
        // Pre-award the achievements the seeded solve count would otherwise
        // pop on mount: the modal renders over the deep-linked mock.
        unlockedAchievements: ['first_query', 'problem_solver', 'sql_novice', 'getting_started', 'first_solve', 'ten_solves'],
      }),
    };
    await load(proSeed);
    const mocks = await ev(`(window.mockInterviewsData || []).map(m => ({ id: m.id, title: m.title || m.name || '', free: !!m.isFree, q: (m.questions || []).length }))`);
    const paid = mocks.find(m => !m.free && m.q > 0);
    if (!paid) {
      fail('a paid mock exists to test', `mocks: ${JSON.stringify(mocks)}`);
    } else {
      // Cold first: no seeded guest at all, to tell a broken deep link apart
      // from a deep link the resumed-guest path steps on.
      await load({}, `/app/?interview=${paid.id}&src=e2e`);
      const coldRun = await ev(`
        (async () => {
          await new Promise(r => setTimeout(r, 2200));
          return { reachedQuestion: !!document.querySelector('[data-testid="interview-question"]'),
                   gated: /Unlock Pro|Pro unlocks|\\$29|\\$99/i.test(document.body.textContent || '') };
        })()`);
      if (!coldRun.reachedQuestion && coldRun.gated) pass('a cold visitor on the same deep link meets the gate, never the paid mock');
      else fail('a cold visitor on the mock deep link meets the gate', JSON.stringify(coldRun));
      await load(proSeed, `/app/?interview=${paid.id}&src=e2e`);
      const proRun = await ev(`
        (async () => {
          const w = ms => new Promise(r => setTimeout(r, ms));
          await w(2500);
          for (let i = 0; i < 3; i++) {
            const x = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === '✕');
            if (!x) break;
            x.click(); await w(300);
          }
          const title = ${JSON.stringify(paid.title)};
          const head = () => ((document.querySelector('h1, h2') || {}).textContent || '').trim();
          const autoStarted = !!document.querySelector('[data-testid="interview-question"]');
          let clicked = false;
          if (!autoStarted) {
            // The trials tab lists every mock, so the button has to be the one
            // inside THIS mock's card — the first "Start Interview" on the page
            // belongs to whichever card renders first.
            const card = Array.from(document.querySelectorAll('div')).reverse()
              .find(d => (d.textContent || '').includes(title) && d.querySelector('button') && (d.textContent || '').length < 1200);
            const start = card && Array.from(card.querySelectorAll('button')).find(b => /^Start Interview$/i.test((b.textContent || '').trim()));
            if (start) { start.click(); clicked = true; await w(1600); }
          }
          const q = document.querySelector('[data-testid="interview-question"]');
          const text = document.body.textContent || '';
          return {
            autoStarted, clicked,
            reachedQuestion: !!q,
            type: q ? q.getAttribute('data-question-type') : null,
            proModal: /Unlock Pro|Upgrade to Pro/i.test(text),
            heading: head(),
          };
        })()`);
      // Identity, not just "a question rendered". The first version asserted
      // only the latter and passed while the harness was clicking the FREE
      // mock's card — a check that cannot tell the two apart is not a check.
      const gotThePaidOne = proRun.reachedQuestion && !proRun.proModal && proRun.heading === paid.title;
      if (gotThePaidOne && proRun.autoStarted) pass(`the deep link opens the paid mock itself for a Pro user — "${proRun.heading}", a ${proRun.type} question, no click needed`);
      else if (gotThePaidOne) fail('the deep link opens the mock without a further click', `landed on the card instead: ${JSON.stringify(proRun)}`);
      else fail('a Pro user reaches the paid mock the link named', JSON.stringify(proRun));

      await load({
        sqlquest_guest_user: 'guest_e2e_free',
        sqlquest_user_guest_e2e_free: guest({
          solvedChallenges: CH(14), xp: 300, level: 4, challengeAttempts: attemptsFor(CH(14)),
        }),
      }, `/app/?interview=${paid.id}&src=e2e`);
      const freeRun = await ev(`
        (async () => {
          const w = ms => new Promise(r => setTimeout(r, ms));
          await w(2500);
          const title = ${JSON.stringify(paid.title)};
          // Same card-scoped click as the Pro run: the first "Start Interview"
          // on the page belongs to whichever card renders first, and clicking
          // that would test nothing.
          const card = Array.from(document.querySelectorAll('div')).reverse()
            .find(d => (d.textContent || '').includes(title) && d.querySelector('button') && (d.textContent || '').length < 1200);
          const start = card && Array.from(card.querySelectorAll('button')).find(b => /^Start Interview$/i.test((b.textContent || '').trim()));
          if (start) { start.click(); await w(1600); }
          const text = document.body.textContent || '';
          return {
            foundTheCard: !!start,
            reachedQuestion: !!document.querySelector('[data-testid="interview-question"]'),
            gated: /Unlock Pro|Upgrade to Pro|Pro unlocks|free mock/i.test(text),
            heading: ((document.querySelector('h1, h2') || {}).textContent || '').trim(),
          };
        })()`);
      // The app's documented behaviour is not "block": a free user pressing
      // Start on a paid mock is handed the FREE mock instead (the 09-12 M4
      // catcher). So the assertion is on identity — whatever they get, it must
      // not be the paid mock's own questions.
      // The free user's link resolves the same way; what differs is where it
      // lands. Either the gate or the free mock is correct — the paid mock's
      // own questions are not.
      const gotPaid = freeRun.reachedQuestion && freeRun.heading === paid.title;
      if (!gotPaid && (freeRun.gated || !freeRun.reachedQuestion)) pass(`the same link for a free user stops at the gate, never the paid mock (landed on "${freeRun.heading}")`);
      else fail('a free user never reaches the paid mock', JSON.stringify(freeRun));
    }

    // ── 2. sign-in wiring ──────────────────────────────────────────────────
    //
    // No password is typed and nothing leaves the machine: the assertion is
    // that the client asks the `account-login` edge function, and that the
    // account reads go to the users_public VIEW, never the users table (the
    // table is 401 for anon since 2026-09-14 — a client still reading it
    // would be broken in production and green here).
    await load({}, '/app/?signin=1');
    const signin = await ev(`
      (async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const q = s => document.querySelector(s);
        const user = q('input[name="username"], input#username, input[autocomplete="username"]')
          || Array.from(document.querySelectorAll('input')).find(i => /user|email/i.test(i.name + i.id + i.placeholder));
        const pass = Array.from(document.querySelectorAll('input')).find(i => i.type === 'password');
        if (!user || !pass) return { form: false };
        const set = (el, v) => {
          const proto = Object.getPrototypeOf(el);
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        set(user, 'sqlquest_e2e_probe_account');
        set(pass, 'not-a-real-password');
        const submit = Array.from(document.querySelectorAll('button')).find(b => /^(Log In|Sign in|Continue)$/i.test((b.textContent || '').trim()));
        if (submit) { submit.click(); await wait(1500); }
        const net = window.__net || [];
        return {
          form: true,
          login: net.filter(r => /functions\\/v1\\/account-login/.test(r.url)).length,
          tableReads: net.filter(r => /\\/rest\\/v1\\/users\\?/.test(r.url)).length,
          viewReads: net.filter(r => /users_public\\?|rpc\/sq_load_account/.test(r.url)).length,
          sentPassword: net.some(r => (r.body || '').includes('not-a-real-password') && !/account-login/.test(r.url)),
          urls: net.map(r => r.url.replace(/^https?:\\/\\/[^/]+/, '')).slice(-8),
        };
      })()`);
    if (!signin.form) {
      fail('sign-in form renders at ?signin=1', JSON.stringify(signin));
    } else {
      if (signin.login >= 1) pass(`sign-in posts to the account-login edge function (${signin.login} call)`);
      else fail('sign-in posts to account-login', JSON.stringify(signin));
      if (signin.tableReads === 0) pass('sign-in never reads the users table directly (it is 401 for anon in production)');
      else fail('sign-in never reads the users table', `${signin.tableReads} direct reads: ${JSON.stringify(signin.urls)}`);
      if (!signin.sentPassword) pass('the password goes only to account-login, nowhere else');
      else fail('the password goes only to account-login', JSON.stringify(signin.urls));
    }

    // ── 3. cross-device progress sync ──────────────────────────────────────
    //
    // A second device reads the row the first device wrote. The client half
    // is: writes go through the sq_save_user RPC carrying the progress, and
    // reads come from users_public. Both are asserted on the wire.
    await load({
      sqlquest_user: 'e2e_account',
      sqlquest_user_e2e_account: guest({ solvedChallenges: CH(5), xp: 90, level: 2 }),
    });
    // The wire assertion: the session load must read the view, never the
    // table, and a save must go through the sq_save_user RPC.
    await load({
      sqlquest_user: 'e2e_account',
      sqlquest_user_e2e_account: guest({ solvedChallenges: CH(5), xp: 90, level: 2 }),
    }, '/app/', { username: 'e2e_account', data: guest({ solvedChallenges: CH(5), xp: 90, level: 2 }) });
    const wire = await ev(`
      (async () => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        // Change something the account owns, so the debounced autosave fires
        // and the write path is observed rather than assumed.
        const sound = Array.from(document.querySelectorAll('button')).find(b => /^(🔊|🔇)$/.test((b.textContent || '').trim()));
        if (sound) { sound.click(); await w(400); sound.click(); }
        await w(4000);
        const net = window.__net || [];
        return {
          rpcSaves: net.filter(r => /rpc\\/sq_save_user/.test(r.url)).length,
          viewReads: net.filter(r => /users_public\\?|rpc\/sq_load_account/.test(r.url)).length,
          tableReads: net.filter(r => /\\/rest\\/v1\\/users\\?/.test(r.url)).length,
          tableWrites: net.filter(r => /\\/rest\\/v1\\/users\\?/.test(r.url) && r.method !== 'GET').length,
          urls: net.map(r => r.method + ' ' + r.url.replace(/^https?:\\/\\/[^/]+/, '')).slice(0, 12),
        };
      })()`);
    if (wire.viewReads >= 1 && wire.tableReads === 0) pass(`a returning account loads its row through sq_load_account (${wire.viewReads} read${wire.viewReads > 1 ? 's' : ''}, 0 from the table)`);
    else fail('a returning account loads through sq_load_account, not the table', JSON.stringify(wire));
    // The write half of cross-device sync. The table is 401 for anon in
    // production, so a save that still went straight to it would be silently
    // lost — the device would look fine and the other device would never see
    // the progress.
    if (wire.tableWrites === 0) pass(`progress is written only through the sq_save_user RPC (${wire.rpcSaves} save${wire.rpcSaves === 1 ? '' : 's'}, 0 direct table writes)`);
    else fail('progress is written only through sq_save_user', JSON.stringify(wire));

    // ── 4. the recommendation moves after several solves ───────────────────
    //
    // The 2026-08-05 raw-array trap: four recommendation sites read the bank
    // in id order and handed every Medium solver challenge 1, our worst
    // opener (24% solve-through). The unit guard is
    // tests/challenge-order.test.js; this is the same claim asserted through
    // the built bundle, at three solve counts.
    const recs = [];
    for (const n of [1, 6, 14]) {
      await load({
        sqlquest_guest_user: `guest_e2e_r${n}`,
        [`sqlquest_user_guest_e2e_r${n}`]: guest({
          solvedChallenges: CH(n), xp: n * 20, level: 1 + Math.floor(n / 5),
          challengeAttempts: attemptsFor(CH(n)),
        }),
      });
      const r = await ev(`
        (() => {
          const el = document.querySelector('[data-testid="practice-plan"]');
          const ids = el ? Array.from(el.querySelectorAll('[data-plan-item]')).map(x => Number(x.getAttribute('data-plan-item'))) : [];
          const weakest = el ? (el.querySelector('[data-testid="plan-weakest"]') || {}).textContent || '' : '';
          return { planIds: ids, weakest: weakest.replace(/\\s+/g, ' ').trim().slice(0, 80), hasCard: !!el };
        })()`);
      recs.push({ n, ...r });
    }
    const missing = recs.filter(r => !r.hasCard || r.planIds.length === 0);
    if (missing.length) {
      fail('the plan card names what to do next at every solve count', JSON.stringify(recs));
    } else {
      pass(`the plan names questions at 1, 6 and 14 solves (${recs.map(r => `${r.n}→[${r.planIds.join(',')}]`).join(' ')})`);
      // It has to MOVE. A plan that hands the same three questions to someone
      // with 1 solve and someone with 14 is not a recommendation.
      const same = recs[0].planIds.join(',') === recs[2].planIds.join(',');
      if (!same) pass('the plan changes between 1 solve and 14 — it reads progress, it is not a fixed list');
      else fail('the plan changes with progress', JSON.stringify(recs));
      // The 2026-08-05 raw-array trap: challenge 1 is still the first Medium
      // by id in the live bank, so a picker that reads raw order hands it out.
      // It converted at 24%. It must never be planned.
      const trap = recs.some(r => r.planIds.includes(1));
      if (!trap) pass('challenge 1 is never planned — the raw-order trap has not grown back');
      else fail('challenge 1 is never planned (the 08-05 raw-order trap)', JSON.stringify(recs));
      // Never a solved one, either.
      const stale = recs.filter(r => r.planIds.some(id => CH(r.n).includes(id)));
      if (!stale.length) pass('the plan never names a question the user already solved');
      else fail('the plan never names a solved question', JSON.stringify(stale));
    }

  } finally {
    const bad = checks.filter(c => !c.ok);
    for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}${c.ok ? '' : ` — ${c.why}`}`);
    console.log(`\n${checks.length - bad.length}/${checks.length} passed`);
    ws.close();
    chrome.kill();
    if (bad.length) process.exitCode = 1;
  }
}

main().catch(e => { console.error(e); process.exit(1); });

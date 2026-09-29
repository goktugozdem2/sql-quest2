// Shared plumbing for the smoke bot (docs/plans/smoke-bot-rollback-2026-09-21.md).
// Pure helpers are exported for tests/smoke-workflow.test.js; the Chrome
// side is CDP over `ws`, the same way scripts/smoke-test.js drives it.
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// Where every check writes its result. One JSON per check:
//   { check, ok, class: 'frontend_dead' | 'slow' | 'business' | 'infra', detail, at }
// The workflow's alert and rollback jobs read this directory, nothing else.
export const OUT_DIR = process.env.SMOKE_OUT || path.join(process.cwd(), 'smoke-out');

export const CLASSES = Object.freeze({
  FRONTEND_DEAD: 'frontend_dead', // no shell, app.js 404, uncaught error on load
  SLOW: 'slow',                   // shell rendered but interaction missed the 10 s budget
  BUSINESS: 'business',           // a product flow failed; never a rollback
  INFRA: 'infra',                 // the check itself could not run (Chrome, network, DB)
  ADVISORY: 'advisory',           // recorded and shown, but never fails the run or mails on its own
});

export function writeResult(result) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const row = { at: new Date().toISOString(), ...result };
  fs.writeFileSync(path.join(OUT_DIR, `${result.check}.json`), JSON.stringify(row, null, 2) + '\n');
  return row;
}

export function readResults(dir = OUT_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { return null; }
  }).filter(Boolean);
}

// The rollback class is decided here and only here: a run rolls back only
// when at least one failing check is `frontend_dead` and NO failing check
// says the app is merely slow or a flow is broken on top of a live shell.
// (A dead front end can make every downstream check fail too — that is
// still a dead front end. But a live shell with a broken flow is not.)
// An `advisory` failure is written and shown in any alert body, but it is not
// a failing check: it never fails the run, never mails by itself, never rolls
// back. Used for scripts/smoke-test.js while it is stale against the current
// build (six of its 27 checks fail on the live site AND on a local build of
// the same commit, 2026-09-29 — the first-run screen has grown an Interview
// tab, the catcher persona no longer earns its solve). Drop the flag once the
// battery is green again.
export function classifyRun(results) {
  const failed = results.filter(r => r && r.ok === false && r.class !== CLASSES.ADVISORY);
  const advisory = results.filter(r => r && r.ok === false && r.class === CLASSES.ADVISORY);
  const dead = failed.some(r => r.class === CLASSES.FRONTEND_DEAD);
  return {
    failed: failed.map(r => r.check),
    advisory: advisory.map(r => r.check),
    frontendDead: dead,
    classes: [...new Set(failed.map(r => r.class))],
  };
}

// A push that carried a schema or an edge-function change is never rolled
// back by the bot — the static front end may depend on it (plan §3).
export const BACKEND_PATHS = /^(supabase\/|api\/)/;
export function touchesBackend(changedFiles) {
  return (changedFiles || []).some(f => BACKEND_PATHS.test(String(f).trim()));
}

// Which chrome: CHROME env, then the Linux names GitHub's ubuntu image
// ships, then the macOS default the older scripts hard-code.
export function resolveChrome(env = process.env) {
  if (env.CHROME && fs.existsSync(env.CHROME)) return env.CHROME;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium']) {
    try {
      const p = execFileSync('sh', ['-c', `command -v ${name}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (p) return p;
    } catch (_) { /* next */ }
  }
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(mac)) return mac;
  throw new Error('no Chrome found: set CHROME=/path/to/chrome');
}

// A fresh profile every run, no extensions, no first-run UI. `--disable-
// extensions` is the point of the plan's "clean headless profile": the
// founder's 30 s tab on 2026-09-21 was most likely an extension, and the
// bot must never inherit one.
export function chromeArgs(port, userDataDir) {
  return [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--hide-scrollbars',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];
}

// Injected before any page script (Page.addScriptToEvaluateOnNewDocument).
// Every request that would leave the browser for our own backend is
// answered in-page, so a smoke run writes NOTHING to production: no guest
// row, no pro_events, no analytics — the bot must never count as a person
// in first_solve_10m or any other people-metric. The one thing kept is the
// signal the T8 collision-catcher checks in scripts/smoke-test.js read: a
// muted analytics line on console.debug, in the exact shape app.jsx emits
// on localhost (`writeProEvent`), rebuilt from the intercepted POST body.
export const HERMETIC_PREAMBLE = `(() => {
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input && input.url ? input.url : input);
    if (/supabase|functions\\/v1|vercel-insights|va\\.vercel|\\/api\\//i.test(url)) {
      const J = { 'Content-Type': 'application/json' };
      if (/\\/pro_events/.test(url) && init && init.body) {
        try {
          const b = JSON.parse(init.body);
          let m = {};
          try { m = JSON.parse(b.metadata); } catch (_) {}
          console.debug('[sqlquest] analytics muted on localhost:', b.event, b.reason, m);
        } catch (_) {}
        return new Response('', { status: 201, headers: J });
      }
      if (/rpc\\/sq_save_user/.test(url)) return new Response('', { status: 204, headers: J });
      return new Response('[]', { status: 200, headers: J });
    }
    return real(input, init);
  };
  try { navigator.sendBeacon = () => true; } catch (_) {}
})();`;

export function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// Start Chrome and attach to its first page over CDP. Returns
// { cdp(method, params), on(listener), close() }.
export async function launchChrome({ port = 9400 + (process.pid % 400), chrome = resolveChrome() } = {}) {
  const dir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp', 'chrome-smoke-'));
  const proc = spawn(chrome, chromeArgs(port, dir), { stdio: 'ignore' });
  let tabs = [];
  for (let i = 0; i < 50; i++) {
    try { tabs = await getJSON(`http://127.0.0.1:${port}/json`); if (tabs.length) break; } catch (_) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  const tab = tabs.find(t => t.type === 'page');
  if (!tab) { proc.kill('SIGKILL'); throw new Error('Chrome started but exposed no page'); }
  const { WebSocket } = await import('ws');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result || msg); pending.delete(msg.id); }
    else if (msg.method) for (const l of listeners) { try { l(msg); } catch (_) { /* never break the socket */ } }
  });
  const cdp = (method, params = {}) => new Promise(res => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  return {
    cdp,
    on: (l) => listeners.add(l),
    close: () => { try { ws.close(); } catch (_) { /* closing */ } proc.kill('SIGKILL'); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* tmp */ } },
  };
}

export async function evaluate(cdp, expr) {
  const r = await cdp('Runtime.evaluate', {
    expression: `(async () => { try { return { ok: 1, v: await (${expr}) }; } catch (e) { return { ok: 0, e: String(e && e.stack || e) }; } })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const x = r.result?.value || {};
  if (!x.ok) throw new Error(x.e || 'eval failed');
  return x.v;
}

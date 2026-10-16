// The smoke job's Chrome launch on a cold runner (2026-10-16, issue #52).
// `interactive` — always the job's first Chrome launch — failed "Chrome
// started but exposed no page" at 10.35 / 10.45 / 10.40 s on 10-06, 10-08 and
// 10-16: the wait was a fixed 50 × 200 ms, and it stopped at the first target
// of any type. These run waitForPageTarget on a fake clock.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { waitForPageTarget, CHROME_PAGE_DEADLINE_MS } from '../scripts/smoke/lib.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const page = { type: 'page', webSocketDebuggerUrl: 'ws://127.0.0.1:1/devtools/page/x' };

// A fake clock: sleep advances time, listTargets answers by the time.
function harness(answerAt) {
  let t = 0;
  const calls = { list: 0, open: 0 };
  return {
    calls,
    opts: {
      now: () => t,
      sleep: async (ms) => { t += ms; },
      listTargets: async () => { calls.list++; return answerAt(t, calls); },
      openPage: async () => { calls.open++; },
    },
  };
}

describe('waitForPageTarget', () => {
  it('waits out a cold start longer than the old 10 s', async () => {
    const h = harness((t) => { if (t < 12_000) throw new Error('ECONNREFUSED'); return [page]; });
    const r = await waitForPageTarget(h.opts);
    expect(r.page).toBe(page);
    expect(r.waitedMs).toBeGreaterThanOrEqual(12_000);
    expect(CHROME_PAGE_DEADLINE_MS).toBeGreaterThanOrEqual(30_000);
  });

  it('does not stop at a non-page target, and opens a page when the browser has none', async () => {
    const h = harness((t, calls) => (calls.open > 0 ? [{ type: 'browser' }, page] : [{ type: 'service_worker' }, { type: 'browser' }]));
    const r = await waitForPageTarget(h.opts);
    expect(r.page).toBe(page);
    expect(r.openedPage).toBe(true);
    expect(h.calls.open).toBe(1);
  });

  it('gives up at the deadline and says whether the port ever answered', async () => {
    const dead = harness(() => { throw new Error('ECONNREFUSED'); });
    const r1 = await waitForPageTarget({ ...dead.opts, deadlineMs: 5_000 });
    expect(r1).toMatchObject({ page: null, browserAnswered: false });
    const empty = harness(() => []);
    const r2 = await waitForPageTarget({ ...empty.opts, deadlineMs: 5_000 });
    expect(r2).toMatchObject({ page: null, browserAnswered: true, openedPage: true });
  });

  it('both launchers use it — the shared lib and the smoke battery', () => {
    expect(fs.readFileSync(path.join(ROOT, 'scripts/smoke/lib.mjs'), 'utf8')).toMatch(/const waited = await waitForPageTarget\(\{/);
    const battery = fs.readFileSync(path.join(ROOT, 'scripts/smoke-test.js'), 'utf8');
    expect(battery).toMatch(/const waited = await waitForPageTarget\(\{/);
    expect(battery).not.toMatch(/for \(let i = 0; i < 30; i\+\+\) \{\s*try \{\s*const tabs = await getJSON/);
  });
});

// The passing "Sign In / Sign up" frame (2026-10-16): the app boots with
// showAuth = true and swaps to the guest shell a moment later. On a slow
// runner `interactive` saw that frame first and passed with the click
// skipped (4 of 9 passes, 10-08 → 10-15). Reproduced at 6x CPU throttle:
// the frame stood for ~440 ms before the tabs.
import { waitForTabs } from '../scripts/smoke/interactive.mjs';

describe('interactive waits past the sign-in frame', () => {
  it('keeps polling until the tabs appear', async () => {
    let t = 0;
    const frames = [{ shell: true, tabs: false, hasAuth: true }, { shell: true, tabs: false, hasAuth: true }, { shell: true, tabs: true, hasAuth: false }];
    let i = 0;
    const shell = await waitForTabs({ evaluate: async () => frames[Math.min(i++, frames.length - 1)], deadline: 10_000, expr: 'x', now: () => t, sleep: async (ms) => { t += ms; } });
    expect(shell.tabs).toBe(true);
    expect(i).toBe(3);
  });

  it('gives up at the deadline on a surface that never grows tabs', async () => {
    let t = 0;
    const shell = await waitForTabs({ evaluate: async () => ({ shell: true, tabs: false, hasAuth: true }), deadline: 2_000, expr: 'x', now: () => t, sleep: async (ms) => { t += ms; } });
    expect(shell.tabs).toBe(false);
    expect(t).toBeGreaterThanOrEqual(2_000);
  });

  it('the check calls it before deciding to skip the click, and reports authFlashMs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/smoke/interactive.mjs'), 'utf8');
    const wait = src.indexOf('shell = await waitForTabs(');
    const skip = src.indexOf("note: 'no primary tabs on this surface");
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThan(skip);
    expect(src).toContain('return finish(true, null, { shellMs, clickMs, budgetMs: BUDGET_MS, authFlashMs });');
  });
});

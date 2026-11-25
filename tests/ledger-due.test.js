// scripts/ledger/due.mjs (V1, 2026-11-23): which ledger claims are due for a
// read. Pure parser; the fixture below carries every label shape the real
// ledger uses, and the last block runs the parser over the live ledger.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { openClaims, readDate, registeredMetrics, render } from '../scripts/ledger/due.mjs';

const LEDGER = `# Ledger

## Open

### a plain claim
- **Claimed** 2026-11-01 · **Shipped** on merge · **Read** 2026-11-23.
- **Metric** \`gsc_page_clicks\` for the page.

### read on a separate bold date
- **Read on** **2026-10-12**
- **Metric** \`blog_practice_exit\`, distinct people.

### read date inside the bold
- **Read date 2026-10-08**, over the 30 days from the deploy.
- **Metric** \`made_up_metric\`

### read wraps to the next line
- **Claimed** 2026-11-20 · server half on deploy · **Read**
  2026-12-18.
- **Metric** \`trial_funnel\`

### relative read
- **Claimed** 2026-11-14 · **Flipped** _pending_ · **Read**
  flip + 28 days.
- **Metric** \`paywall_moment_reach\`

### a flip note names the date
- **Flipped ON 2026-11-23** by A0. Read 2026-12-21 (28 days).
- **Claimed** 2026-11-22 · **Read** 28 days after the flip.
- **Metric** \`feedback_capture\`

### pending verdict stays open
- **Read** 2026-11-20.
- **Metric** \`quota_wall\`
- **Verdict** _pending_

### verdicted is closed
- **Read** 2026-10-01.
- **Metric** \`quota_wall\`
- **Verdict** **HIT** (read 2026-10-02): 9 of 29.
- **Next:** keep.

### verdict that asks for a re-read
- **Read** 2026-10-29.
- **Metric** \`modal_layout_split\`
- **Verdict** _pending_ — interim.
- **Verdict (B2, 2026-11-22)** **UNREADABLE — n too small, re-read 2026-12-20.**

### not a claim, a note
- Nothing to read here; a state to sign.

## Closed

### an old one — **FLAT**
- **Read** 2026-09-01.

### filed in Closed but still open — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-12
- **Metric** \`gsc_position('/sql-exercises/')\` — baseline 24.5
`;

const METRICS = new Set(['gsc_page_clicks', 'blog_practice_exit', 'trial_funnel', 'paywall_moment_reach', 'feedback_capture', 'quota_wall', 'modal_layout_split', 'gsc_position']);
const byTitle = (claims) => Object.fromEntries(claims.map((c) => [c.title, c]));

describe('ledger due — the parser', () => {
  const claims = byTitle(openClaims(LEDGER, { asOf: '2026-11-23', metrics: METRICS }));

  it('a read date equal to --date is due, an earlier one overdue with its lateness', () => {
    expect(claims['a plain claim'].status).toBe('due');
    expect(claims['read on a separate bold date']).toMatchObject({ status: 'overdue', readDate: '2026-10-12', daysLate: 42 });
    expect(claims['read date inside the bold']).toMatchObject({ status: 'overdue', readDate: '2026-10-08' });
  });

  it('reads a date that wraps onto the next line, and a flip note\'s concrete date', () => {
    expect(claims['read wraps to the next line']).toMatchObject({ readDate: '2026-12-18', status: 'upcoming' });
    expect(claims['a flip note names the date']).toMatchObject({ readDate: '2026-12-21', status: 'upcoming' });
  });

  it('a relative read has no date and keeps its words', () => {
    expect(claims['relative read'].status).toBe('no-date');
    expect(claims['relative read'].readNote).toMatch(/flip \+ 28 days/);
  });

  it('a pending verdict is still open; a real verdict closes; a re-read reopens on its date', () => {
    expect(claims['pending verdict stays open'].status).toBe('overdue');
    expect(claims['verdicted is closed']).toBeUndefined();
    expect(claims['verdict that asks for a re-read']).toMatchObject({ readDate: '2026-12-20', reRead: true, status: 'upcoming' });
  });

  it('skips notes and verdict-headed entries; an **OPEN** heading in Closed is still open', () => {
    expect(claims['not a claim, a note']).toBeUndefined();
    expect(claims['an old one — **FLAT**']).toBeUndefined();
    expect(claims['an old one']).toBeUndefined();
    expect(claims['filed in Closed but still open']).toMatchObject({ status: 'overdue', readDate: '2026-10-12', metric: ['gsc_position'] });
  });

  it('names the metric and says when it is not in metrics.md', () => {
    expect(claims['a plain claim']).toMatchObject({ metric: ['gsc_page_clicks'], metricRegistered: true });
    expect(claims['read date inside the bold']).toMatchObject({ metric: ['made_up_metric'], metricRegistered: false });
  });

  it('sorts overdue first, then due, upcoming, undated', () => {
    const order = openClaims(LEDGER, { asOf: '2026-11-23', metrics: METRICS }).map((c) => c.status);
    const rank = { overdue: 0, due: 1, upcoming: 2, 'no-date': 3 };
    expect(order.map((s) => rank[s])).toEqual([...order.map((s) => rank[s])].sort((a, b) => a - b));
  });

  it('the day before, the plain claim is upcoming, not due', () => {
    const c = byTitle(openClaims(LEDGER, { asOf: '2026-11-22', metrics: METRICS }));
    expect(c['a plain claim'].status).toBe('upcoming');
  });

  it('refuses a malformed --date rather than guessing', () => {
    expect(() => openClaims(LEDGER, { asOf: '23/11/2026' })).toThrow(/YYYY-MM-DD/);
  });

  it('the verdict block\'s own "**Read**" sentence is never taken as a read date', () => {
    expect(readDate('- **Verdict** **MISS**\n- **Read** 2026-01-01 is not a read date here').date).toBe(null);
  });

  it('render prints the counts line and only due/overdue unless --all', () => {
    const list = openClaims(LEDGER, { asOf: '2026-11-23', metrics: METRICS });
    const out = render(list);
    expect(out.split('\n')[0]).toMatch(/overdue 4 · due 1 · upcoming 3 · no date 1/);
    expect(out).not.toMatch(/relative read/);
    expect(render(list, { all: true })).toMatch(/relative read/);
  });
});

describe('ledger due — the live ledger', () => {
  const ledger = fs.readFileSync(new URL('../docs/agent/ledger.md', import.meta.url), 'utf8');
  const metrics = registeredMetrics(fs.readFileSync(new URL('../docs/agent/metrics.md', import.meta.url), 'utf8'));

  it('the registry parses (the metrics every claim may name)', () => {
    expect(metrics.has('blog_practice_exit')).toBe(true);
    expect(metrics.has('bing_page_ctr')).toBe(true);
    expect(metrics.has('bing_citations')).toBe(true);
  });

  it('finds open claims, and none of the five closed on 2026-11-23 is still due', () => {
    const claims = openClaims(ledger, { asOf: '2026-11-23', metrics });
    expect(claims.length).toBeGreaterThan(20);
    const titles = claims.map((c) => c.title).join('\n');
    expect(titles).not.toMatch(/blog posts get a real exit/);
    expect(titles).not.toMatch(/Bing T[123] /);
    expect(titles).not.toMatch(/on Google — the page that ranks 6/);
  });
});

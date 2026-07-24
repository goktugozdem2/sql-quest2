import { describe, it, expect } from 'vitest';
import { computePurchaseFunnel, parseEventMetadata } from '../src/utils/purchase-funnel.js';

const solved = (username, n) =>
  Array.from({ length: n }, () => ({ username, event: 'challenge_solved', reason: 'activation_funnel' }));

// u1  engaged, asked, clicked, checkout, bought
// u2  engaged, asked twice, clicked, checkout, did NOT buy
// u3  engaged, asked, never clicked
// u4  engaged, never asked
// u5  NOT engaged (2 solves) but was asked  -> must not inflate the funnel
// u6  NOT engaged, bought                   -> counted beside the funnel
const FIXTURE = [
  ...solved('u1', 9), ...solved('u2', 7), ...solved('u3', 6), ...solved('u4', 5), ...solved('u5', 2),
  { username: 'u1', event: 'pro_modal_shown' },
  { username: 'u1', event: 'click_annual' },
  { username: 'u1', event: 'pro_checkout_clicked' },
  { username: 'u1', event: 'pro_purchase_completed' },
  { username: 'u2', event: 'pro_modal_shown' },
  { username: 'u2', event: 'pro_modal_shown' },
  { username: 'u2', event: 'click_monthly' },
  { username: 'u2', event: 'pro_checkout_clicked' },
  { username: 'u2', event: 'pro_checkout_returned', metadata: JSON.stringify(JSON.stringify({ outcome: 'never_navigated' })) },
  { username: 'u3', event: 'pro_modal_shown' },
  { username: 'u5', event: 'pro_modal_shown' },
  { username: 'u6', event: 'pro_purchase_completed' },
  { username: 'u6', event: 'pro_checkout_returned', metadata: JSON.stringify({ outcome: 'left_checkout' }) },
];

const stepUsers = (r, name) => r.steps.find(s => s.step === name).users;

describe('computePurchaseFunnel', () => {
  const r = computePurchaseFunnel(FIXTURE);

  it('never lets a step exceed the one above it', () => {
    // The bug this guards: counting "shown the offer" across everyone gave
    // 66 against an engaged base of 54, because people meet the modal
    // before their fifth solve. A funnel that widens is not a funnel.
    for (let i = 1; i < r.steps.length; i += 1) {
      expect(r.steps[i].users, `${r.steps[i].step} vs ${r.steps[i - 1].step}`)
        .toBeLessThanOrEqual(r.steps[i - 1].users);
    }
  });

  it('applies the engagement floor', () => {
    expect(stepUsers(r, 'engaged')).toBe(4); // u5 has 2 solves
  });

  it('excludes the un-engaged from every rung, not just the first', () => {
    expect(stepUsers(r, 'shown_the_offer')).toBe(3); // u1,u2,u3 — not u5
  });

  it('counts a buyer as having reached checkout even without the click event', () => {
    const noClick = FIXTURE.filter(e => !(e.username === 'u1' && e.event === 'pro_checkout_clicked'));
    expect(stepUsers(computePurchaseFunnel(noClick), 'reached_checkout')).toBe(2);
  });

  it('reports sub-threshold buyers beside the funnel, not inside it', () => {
    expect(stepUsers(r, 'purchased')).toBe(1);   // u1 only
    expect(r.purchasesOutsideEngaged).toBe(1);   // u6
  });

  it('finds engaged users who were never shown the offer', () => {
    expect(r.engagedNeverAsked).toEqual(['u4']);
  });

  it('averages how many times an asked user is actually asked', () => {
    expect(r.avgTimesAsked).toBe(1.3); // u1:1 u2:2 u3:1 u5:1 -> 5/4
  });

  it('separates checkout defects from price rejections', () => {
    expect(r.checkoutOutcomes).toEqual({ never_navigated: 1, left_checkout: 1 });
    expect(r.checkoutDefectRatePct).toBe(50);
  });

  it('ranks hot leads by how far they got, then by engagement', () => {
    expect(r.hotLeads[0].username).toBe('u2'); // reached checkout, didn't buy
    expect(r.hotLeads[0].rung).toBe(1);
    expect(r.hotLeads.some(l => l.username === 'u1')).toBe(false); // bought
  });

  it('takes the per-user MAX of users-table and event counts', () => {
    // Both sources are lower bounds with different blind spots. elena: 134
    // table solves, 0 events (events start 2026-06-30). ghost, a guest: 9
    // event solves, 0 in the table (guest rows never persisted progress
    // until 2026-07-24). The first version of this merge let the table win
    // outright, which fixed elena by disappearing every solving guest —
    // this test replaces the one that pinned that mistake in.
    const events = [
      { username: 'elena', event: 'click_annual' },
      { username: 'elena', event: 'pro_modal_shown' },
      ...solved('ghost', 9),
    ];
    const r2 = computePurchaseFunnel(events, { solvesByUser: { elena: 134, ghost: 0 } });
    expect(r2.solvesSource).toBe('max(users_table, events)');
    expect(stepUsers(r2, 'engaged')).toBe(2); // elena (table) AND ghost (events)
    expect(r2.hotLeads.find(l => l.username === 'elena')).toMatchObject({ solves: 134, rung: 2 });
    expect(r2.hotLeads.find(l => l.username === 'ghost')).toMatchObject({ solves: 9 });

    const withoutMap = computePurchaseFunnel(events);
    expect(withoutMap.solvesSource).toBe('events_since_2026-06-30');
    expect(stepUsers(withoutMap, 'engaged')).toBe(1); // only ghost
  });

  it('survives empty and malformed input', () => {
    expect(computePurchaseFunnel([]).steps[0].users).toBe(0);
    expect(computePurchaseFunnel(null).engagedNeverAsked).toEqual([]);
    expect(computePurchaseFunnel([{ event: 'pro_modal_shown' }]).steps[0].users).toBe(0);
  });
});

describe('parseEventMetadata', () => {
  it('unwraps double-encoded jsonb', () => {
    expect(parseEventMetadata({ metadata: JSON.stringify(JSON.stringify({ a: 1 })) })).toEqual({ a: 1 });
  });
  it('accepts single-encoded and plain objects', () => {
    expect(parseEventMetadata({ metadata: JSON.stringify({ a: 1 }) })).toEqual({ a: 1 });
    expect(parseEventMetadata({ metadata: { a: 1 } })).toEqual({ a: 1 });
  });
  it('returns {} for junk rather than throwing', () => {
    expect(parseEventMetadata({ metadata: 'not json' })).toEqual({});
    expect(parseEventMetadata({ metadata: null })).toEqual({});
    expect(parseEventMetadata(null)).toEqual({});
    expect(parseEventMetadata({ metadata: JSON.stringify([1, 2]) })).toEqual({});
  });
});

// Tests for engagement-matched league divisions.
//
// The defect being fixed: a global top-20 board against a real distribution of
// median 428 / max 25,757 XP meant ~19 in 20 users could never appear on it.
// The assertion that carries this whole file is "everyone can see themselves" —
// if buildDivision ever returns a board without the current user in it, the
// feature has silently reverted to the thing it replaced.
import { describe, it, expect } from 'vitest';
import { LEAGUE_TIERS, DIVISION_SIZE, tierForXp, nextTier, buildDivision } from '../src/utils/leagues.js';

const mk = (n, xpFn) => Array.from({ length: n }, (_, i) => ({ username: `u${String(i).padStart(3, '0')}`, xp: xpFn(i) }));

describe('tierForXp', () => {
  it('places the observed distribution across more than one tier', () => {
    // The real percentiles this was built from.
    const observed = [10, 158, 380, 628, 1341, 2924, 25757];
    const tiers = new Set(observed.map(x => tierForXp(x).id));
    expect(tiers.size).toBeGreaterThan(3);
  });

  it('never returns null, including for 0, negative and garbage', () => {
    for (const x of [0, -5, NaN, undefined, null, 'abc']) {
      expect(tierForXp(x).id).toBe('row');
    }
  });

  it('is monotonic — more XP never means a lower tier', () => {
    let last = -1;
    for (let xp = 0; xp <= 30000; xp += 137) {
      const idx = LEAGUE_TIERS.findIndex(t => t.id === tierForXp(xp).id);
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it('puts the top real user in the top tier', () => {
    expect(tierForXp(25757).id).toBe('lakehouse');
  });
});

describe('nextTier', () => {
  it('reports the gap to the next rung', () => {
    const n = nextTier(100);
    expect(n.tier.id).toBe('table');
    expect(n.xpToGo).toBe(50);
  });
  it('returns null at the top so the UI has nothing to promise', () => {
    expect(nextTier(999999)).toBeNull();
  });
});

describe('buildDivision', () => {
  it('ALWAYS includes the current user — the whole point', () => {
    // 400 users spread across the range; check a user at every position.
    const users = mk(400, i => i * 70);
    for (const probe of ['u000', 'u007', 'u199', 'u398', 'u399']) {
      const { rows } = buildDivision(users, probe);
      expect(rows.some(r => r.username === probe)).toBe(true);
    }
  });

  it('shows only peers from the same tier', () => {
    const users = mk(300, i => i * 100);
    const { rows, tier } = buildDivision(users, 'u050');
    for (const r of rows) expect(tierForXp(r.xp).id).toBe(tier.id);
  });

  it('caps the board at the division size', () => {
    const users = mk(500, () => 500); // everyone in one tier
    expect(buildDivision(users, 'u250').rows.length).toBe(DIVISION_SIZE);
  });

  it('ranks by XP within the tier, not by window position', () => {
    const users = mk(60, i => 400 + i); // all in 'schema'
    const { rows } = buildDivision(users, 'u030');
    const ranks = rows.map(r => r.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    // The window is mid-tier, so ranks must not start at 1.
    expect(ranks[0]).toBeGreaterThan(1);
  });

  it('clamps at the ends instead of running off the board', () => {
    const users = mk(100, i => 400 + i);
    const top = buildDivision(users, 'u099'); // highest XP
    expect(top.rows[0].rank).toBe(1);
    const bottom = buildDivision(users, 'u000');
    expect(bottom.rows[bottom.rows.length - 1].rank).toBe(top.tierSize);
  });

  it('is stable across reloads — a board that reshuffles reads as fake', () => {
    const users = mk(40, () => 500); // all tied
    const a = buildDivision(users, 'u010').rows.map(r => r.username);
    const b = buildDivision([...users].reverse(), 'u010').rows.map(r => r.username);
    expect(a).toEqual(b);
  });

  it('reports the true tier size, not the window size', () => {
    const users = mk(200, () => 500);
    const d = buildDivision(users, 'u100');
    expect(d.rows.length).toBe(DIVISION_SIZE);
    expect(d.tierSize).toBe(200);
  });

  it('shows the entry tier rather than a blank board to a signed-out visitor', () => {
    const users = mk(50, i => i * 300);
    const d = buildDivision(users, null);
    expect(d.tier.id).toBe('row');
    expect(d.myRank).toBeNull();
    expect(d.rows.length).toBeGreaterThan(0);
  });

  it('survives junk rows without throwing', () => {
    const users = [null, undefined, { xp: 5 }, { username: 'ok', xp: 'NaN' }, { username: 'fine', xp: 700 }];
    expect(() => buildDivision(users, 'fine')).not.toThrow();
    expect(buildDivision(users, 'fine').rows.some(r => r.username === 'fine')).toBe(true);
  });

  it('matches usernames case-insensitively', () => {
    const users = mk(30, i => 400 + i).concat([{ username: 'Elena', xp: 450 }]);
    expect(buildDivision(users, 'elena').myRank).not.toBeNull();
  });
});

describe('isInternalAccount', () => {
  it('catches the accounts actually present in live data', async () => {
    const { isInternalAccount } = await import('../src/utils/leagues.js');
    // Every one of these was on the live board on 2026-07-26.
    for (const u of ['test2', 'test3', 'test44', 'test109', 'sqlquest',
                     'fabletestdb', 'fabletestfree', 'fabletestux',
                     'linktest348013', 'internalroutine768']) {
      expect(isInternalAccount(u), u).toBe(true);
    }
  });

  it('does not catch real users', async () => {
    const { isInternalAccount } = await import('../src/utils/leagues.js');
    for (const u of ['ruchita', 'sergelafarge', 'elena', 'prasanth', 'adinajoshi',
                     'testa_real_person', 'protester', 'contestant']) {
      expect(isInternalAccount(u), u).toBe(false);
    }
  });

  it('hides internal accounts from a real user’s board', async () => {
    const { buildDivision } = await import('../src/utils/leagues.js');
    const users = [
      { username: 'test2', xp: 25757 },
      { username: 'sqlquest', xp: 495 },
      { username: 'realone', xp: 500 },
      { username: 'realtwo', xp: 480 },
    ];
    const names = buildDivision(users, 'realone').rows.map(r => r.username);
    expect(names).not.toContain('test2');
    expect(names).not.toContain('sqlquest');
    expect(names).toContain('realone');
  });

  it('still shows an internal account its own board, so QA can see the feature', async () => {
    const { buildDivision } = await import('../src/utils/leagues.js');
    const users = [{ username: 'test2', xp: 500 }, { username: 'realone', xp: 480 }];
    const d = buildDivision(users, 'test2');
    expect(d.rows.some(r => r.username === 'test2')).toBe(true);
    expect(d.myRank).toBe(1);
  });
});

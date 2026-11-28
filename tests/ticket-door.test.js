// The ticket door (First 90 Days F2, 2026-11-25): ticket 1 on the Coach for
// Analyst Day-One holders and job_ready people with 6+ solves, behind
// `ticketForDayOne`. Pins: who sees it and the source the event carries; the
// card opens the next unsolved ticket and the lock stays the post-hire one
// (ticket 1 free, the rest Pro); the flag ships off; the hooks sit above the
// early returns; the card opens tickets through openTicket (own DB per
// dataset, never `reference`); the event fires once per person per day.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  TICKET_DOOR_FLAG, ANALYST_DAY_ONE_GOAL_ID, TICKET_DOOR_MIN_SOLVES, TICKET_DOOR_SOURCES,
  ticketDoorSource, showsTicketDoorCard, nextDoorTicket,
} from '../src/utils/ticket-door.js';
import { ticketLocked, FREE_TICKETS } from '../src/utils/post-hire.js';
import { TICKETS } from '../src/data/tickets.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

describe('ticketDoorSource — who is at the door', () => {
  const on = { flagOn: true };

  it('flag off: nobody, hired included (no card, no event)', () => {
    expect(ticketDoorSource({ flagOn: false, intentRecord: { goal: 'hired' } })).toBeNull();
    expect(ticketDoorSource({ flagOn: false, goalId: ANALYST_DAY_ONE_GOAL_ID })).toBeNull();
    expect(ticketDoorSource({ flagOn: false, intent: 'job_ready', solves: 50 })).toBeNull();
  });

  it('an Analyst Day-One holder at any solve count', () => {
    expect(ticketDoorSource({ ...on, goalId: ANALYST_DAY_ONE_GOAL_ID, solves: 0 })).toBe('analyst_day_one');
    expect(ticketDoorSource({ ...on, goalId: ANALYST_DAY_ONE_GOAL_ID, intent: 'interview', solves: 3 })).toBe('analyst_day_one');
  });

  it('a job_ready person only from 6 solves', () => {
    expect(TICKET_DOOR_MIN_SOLVES).toBe(6);
    expect(ticketDoorSource({ ...on, intent: 'job_ready', solves: 5 })).toBeNull();
    expect(ticketDoorSource({ ...on, intent: 'job_ready', solves: 6 })).toBe('job_ready');
    expect(ticketDoorSource({ ...on, intentRecord: { goal: 'job_ready' }, solves: 9 })).toBe('job_ready');
  });

  it('every other intent and goal stays out', () => {
    for (const intent of ['interview', 'learning', 'exploring', null]) {
      expect(ticketDoorSource({ ...on, intent, solves: 40 })).toBeNull();
    }
    for (const goalId of ['fundamentals', 'interview-prep', null]) {
      expect(ticketDoorSource({ ...on, goalId, solves: 40 })).toBeNull();
    }
  });

  it('hired wins and is counted, but keeps its own card', () => {
    expect(ticketDoorSource({ ...on, intentRecord: { goal: 'hired' }, goalId: ANALYST_DAY_ONE_GOAL_ID })).toBe('hired');
    expect(showsTicketDoorCard('hired')).toBe(false);
    expect(showsTicketDoorCard('analyst_day_one')).toBe(true);
    expect(showsTicketDoorCard('job_ready')).toBe(true);
    expect(showsTicketDoorCard(null)).toBe(false);
  });

  it('the sources are the metric’s three values', () => {
    expect(TICKET_DOOR_SOURCES).toEqual(['hired', 'analyst_day_one', 'job_ready']);
  });

  it('the goal id is a live goal', () => {
    const sb = { window: {}, console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(read('src/data/goals.js').replace(/^export\s+/gm, ''), sb);
    const goals = sb.window.coachGoals || [];
    expect(goals.some(g => g.id === ANALYST_DAY_ONE_GOAL_ID)).toBe(true);
  });
});

describe('nextDoorTicket — the card opens ticket 1 first, then the next unsolved', () => {
  it('ticket 1 for a person with no ticket log; it is free', () => {
    const n = nextDoorTicket(TICKETS, {});
    expect(n.index).toBe(0);
    expect(n.ticket.id).toBe(TICKETS[0].id);
    expect(ticketLocked({ index: n.index, isPro: false, solved: false })).toBe(false);
  });

  it('after ticket 1 is solved the next one is Pro for a free person (FREE_TICKETS unchanged)', () => {
    expect(FREE_TICKETS).toBe(1);
    const n = nextDoorTicket(TICKETS, { [TICKETS[0].id]: { solvedAt: '2026-11-25T10:00:00Z' } });
    expect(n.index).toBe(1);
    expect(ticketLocked({ index: n.index, isPro: false, solved: false })).toBe(true);
    expect(ticketLocked({ index: n.index, isPro: true, solved: false })).toBe(false);
  });

  it('an attempt without a solve does not move the card; all solved → no card', () => {
    expect(nextDoorTicket(TICKETS, { [TICKETS[0].id]: { attempts: 3 } }).index).toBe(0);
    const all = Object.fromEntries(TICKETS.map(t => [t.id, { solvedAt: 'x' }]));
    expect(nextDoorTicket(TICKETS, all)).toBeNull();
    expect(nextDoorTicket(TICKETS, null).index).toBe(0);
  });
});

describe('the flag', () => {
  it('ticketForDayOne ships false (a missing flag would read true)', () => {
    const sb = { window: { location: { search: '' } }, URLSearchParams: globalThis.URLSearchParams, console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(read('src/data/feature-flags.js'), sb);
    expect(TICKET_DOOR_FLAG).toBe('ticketForDayOne');
    expect(sb.window.FEATURE_FLAGS.features.ticketForDayOne).toBe(false);
  });
});

describe('app.jsx wiring', () => {
  const app = read('src/app.jsx');

  it('the door is read through ftbFlag and its hooks sit above the early returns', () => {
    const at = app.indexOf('const ticketDoor = ticketDoorSource({');
    expect(at).toBeGreaterThan(0);
    expect(app).toContain('flagOn: ftbFlag(TICKET_DOOR_FLAG),');
    const effect = app.indexOf("trackActivationEvent('ticket_card_shown'");
    expect(effect).toBeGreaterThan(at);
    expect(effect).toBeLessThan(app.indexOf('\n  if (showAuth) {\n'));
    expect(effect).toBeLessThan(app.indexOf('\n  if (!dbReady) return ('));
  });

  it('ticket_card_shown carries the source, once per person per day', () => {
    expect(app).toContain("trackActivationEvent('ticket_card_shown', { source: ticketDoor, solves: solvedChallenges.size }, { onceKey: `ticket_card_shown_${getTodayString()}` });");
  });

  it('the card opens the ticket through openTicket (the lock, the own-DB run), with the source on ticket_opened', () => {
    const body = app.slice(app.indexOf('const renderTicketDoorCard = () => {'), app.indexOf('const renderGotTheJobLink = () => {'));
    expect(body.length).toBeGreaterThan(200);
    expect(body).toContain('if (!showsTicketDoorCard(ticketDoor)) return null;');
    expect(body).toContain('nextDoorTicket(TICKETS, ticketLog)');
    expect(body).toContain('onClick={() => openTicket(doorTicket, doorIndex, ticketDoor)}');
    expect(body).not.toMatch(/reference/);
    expect(body).not.toMatch(/\.exec\(/);
    expect(app).toContain("trackActivationEvent('ticket_opened', { ticketId: ticket.id, index, locked, ...(source ? { source } : {}) });");
  });

  it('one card on the Coach, under the next-step card; the hired card is unchanged', () => {
    const mounts = app.split('{renderTicketDoorCard()}').length - 1;
    expect(mounts).toBe(1);
    const mount = app.indexOf('{renderTicketDoorCard()}');
    const coach = app.indexOf("{activeTab === 'guide' && currentUser && !showSimpleLearningShell && (() => {");
    expect(coach).toBeGreaterThan(0);
    expect(mount).toBeGreaterThan(coach);
    expect(mount).toBeGreaterThan(app.indexOf('data-testid="coach-step-counter"'));
    expect(mount).toBeLessThan(app.indexOf('── Skill radar on the Coach (2026-09-12, P0-4) ──'));
    expect(app).toContain('{hired && renderFirst90Card()}');
  });
});

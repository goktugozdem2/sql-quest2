// The ticket door (First 90 Days F2, 2026-11-25,
// docs/plans/first-90-days-2026-11-25.md §4 F2; orchestrator decision 1 of
// 2026-11-25, PR #372).
//
// Until this date a ticket (src/data/tickets.js) was reachable only by a
// person who said they got the job (intent 'hired', src/utils/post-hire.js):
// one real person since 2026-10-04, and 0 non-internal ticket opens in 52
// days. The people who already look like "first job" are a larger group —
// Analyst Day-One goal holders (64, the best step rate of the three goals)
// and job-ready people (226 job-ready solvers in 90 days) — and they never
// saw a ticket. Behind `ticketForDayOne` the Coach shows them ONE card that
// opens the next ticket, ticket 1 first. Nothing about the tickets changes:
// FREE_TICKETS = 1, tickets 2–5 stay Pro through the existing `post_hire`
// modal reason, each ticket still runs on its own sql.js Database per dataset
// (app.jsx's ticketDbFor) and is graded on its figures (ticket-grade.js), and
// `reference` is never rendered.
//
// This module is the pure half: who sees the card and which source the
// `ticket_card_shown` event carries, which ticket the card opens. app.jsx
// decides where it renders (the Coach, under the next-step card) and fires
// the event once per person per day. Metric: `ticket_door`
// (docs/agent/metrics.md). Guards: tests/ticket-door.test.js.

import { isHired } from './post-hire.js';

export const TICKET_DOOR_FLAG = 'ticketForDayOne';
export const ANALYST_DAY_ONE_GOAL_ID = 'analyst-day-one';
export const JOB_READY_INTENT = 'job_ready';
// A job-ready person sees the card at 6 distinct solves — the `reach_6_rate`
// line, so the card never competes with a person's first challenges. An
// Analyst Day-One holder sees it at any count: the goal itself is "your first
// week on the job", and its reach-6 is the guardrail the plan reads (§8 F2).
export const TICKET_DOOR_MIN_SOLVES = 6;
export const TICKET_DOOR_SOURCES = ['hired', 'analyst_day_one', 'job_ready'];

/**
 * Which door a person is at, or null. Precedence: hired (the existing First
 * 90 Days card — counted, not re-rendered), then the Analyst Day-One goal,
 * then the job-ready intent with 6+ solves. Flag off → null for everyone, so
 * the event never fires and nothing new renders.
 *
 * `intentRecord` is app.jsx's `{ goal, source, at }`; `intent` is the browser
 * key (getUserIntent()), read as a fallback when the record is not loaded.
 */
export function ticketDoorSource({ flagOn, intentRecord = null, intent = null, goalId = null, solves = 0 } = {}) {
  if (!flagOn) return null;
  if (isHired(intentRecord) || intent === 'hired') return 'hired';
  if (goalId === ANALYST_DAY_ONE_GOAL_ID) return 'analyst_day_one';
  const declared = (intentRecord && intentRecord.goal) || intent || null;
  if (declared === JOB_READY_INTENT && Number(solves) >= TICKET_DOOR_MIN_SOLVES) return 'job_ready';
  return null;
}

/** The new Coach card renders for the two non-hired sources; hired keeps its own card. */
export function showsTicketDoorCard(source) {
  return source === 'analyst_day_one' || source === 'job_ready';
}

/**
 * The ticket the card opens: the first unsolved one in bank order (ticket 1
 * first), with its index — openTicket's lock reads the index. Null when
 * every ticket is solved (the card then goes away).
 */
export function nextDoorTicket(tickets, ticketLog) {
  const log = ticketLog && typeof ticketLog === 'object' ? ticketLog : {};
  const list = Array.isArray(tickets) ? tickets : [];
  for (let i = 0; i < list.length; i++) {
    if (!(log[list[i].id] && log[list[i].id].solvedAt)) return { ticket: list[i], index: i };
  }
  return null;
}

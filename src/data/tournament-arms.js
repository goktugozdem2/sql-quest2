// The first-session tournament's registry — the single source the app, the
// tests and scripts/tournament-read.sql read (plan:
// docs/plans/first-session-tournament-2026-11-26.md §2.2; metric
// `first_session_tournament` in docs/agent/metrics.md).
//
// New visitors are split by aid across the ACTIVE arms, equal weights. Arm A
// (today's product) is permanent; the challengers come and go:
//   - the worst challenger is eliminated (status 'eliminated', an endDate),
//     and the next queued hypothesis takes its place with round + 1;
//   - a challenger that beats control (P ≥ 0.95 on two consecutive Friday
//     reads, orchestrator decision 2026-11-26) is 'promoted': its behaviour
//     becomes A_control's, and A_control's armVersion goes up by one.
// Retired arms STAY in this list, so an old record still names a known arm.
//
// Fields:
//   id          — the arm's name on every event (`tournament_assigned.arm`,
//                 the `tArm` stamp). Never reused for different behaviour.
//   label       — a short human name for reads and reports.
//   hypothesis  — one sentence, the mechanism the arm tests.
//   status      — 'active' (assignable) | 'queued' (built or planned, not
//                 assignable) | 'eliminated' | 'promoted'.
//   permanent   — true for control only: it is never eliminated.
//   slot        — the arm's place in the assignment order (control is 0,
//                 forever). Active arms are ordered by slot; a replacement
//                 takes the freed slot. null while queued.
//   startDate   — the first day its people count in a read (YYYY-MM-DD,
//                 UTC). The read drops rows before it, so a dark-flag
//                 preview walk never enters a read.
//   endDate     — the day it left (eliminated / promoted), else null.
//   armVersion  — bumps on ANY behaviour change of the arm (control's
//                 included). The read never pools across versions.
//   round       — the tournament round the arm entered in (launch = 1;
//                 +1 on every replacement).
//   built       — has the arm's own behaviour landed? false = it runs
//                 A_control's behaviour (an "A_control twin", plan §2.4).
//                 PR 1 ships B and D unbuilt; each arm's PR sets it true.
//
// Changing the active set re-buckets only browsers with no record yet;
// stored records keep their arm (src/utils/tournament.js). The read restarts
// its per-arm counts at any change of the active count (a share moves from
// 1/3 to 1/4) — never pool across it.
//
// Orchestrator decisions 2026-11-26: three arms at launch (A, B, D); C is
// queued as the first replacement; launch 2026-12-10, inside the freeQuota
// holdout's enrolment, so every read is 2×2 with `fqArm`.

export const TOURNAMENT_TEST_ID = 'first_session_tournament_v1';
export const TOURNAMENT_LAUNCH_DATE = '2026-12-10';
export const TOURNAMENT_CONTROL_ID = 'A_control';
export const TOURNAMENT_STATUSES = Object.freeze(['active', 'queued', 'eliminated', 'promoted']);

export const TOURNAMENT_ARMS = Object.freeze([
  Object.freeze({
    id: 'A_control',
    label: 'Control (today\'s product)',
    hypothesis: "Today's product: it anchors drift between rounds and is never eliminated.",
    status: 'active',
    permanent: true,
    slot: 0,
    startDate: TOURNAMENT_LAUNCH_DATE,
    endDate: null,
    armVersion: 1,
    round: 1,
    built: true,
  }),
  Object.freeze({
    id: 'B_single_path',
    label: 'Single path (Tek Yol)',
    hypothesis: 'No choices until the level is known: a 4-question adaptive ladder sets the level from solving, then one line says the next step, so fewer people leave and more reach six solves.',
    status: 'active',
    permanent: false,
    slot: 1,
    startDate: TOURNAMENT_LAUNCH_DATE,
    endDate: null,
    armVersion: 1,
    round: 1,
    built: false,
  }),
  Object.freeze({
    id: 'D_interview_sprint',
    label: 'Interview sprint',
    hypothesis: 'A 14-day sprint for a named company (one tap, the length set for them) turns a vague visit into a daily count to keep.',
    status: 'active',
    permanent: false,
    slot: 2,
    startDate: TOURNAMENT_LAUNCH_DATE,
    endDate: null,
    armVersion: 1,
    round: 1,
    built: false,
  }),
  Object.freeze({
    id: 'C_proof_first',
    label: 'Proof first',
    hypothesis: "Seeing your own Skillmap first (the readiness test's ten questions) creates a reason to follow the plan it builds.",
    status: 'queued',
    permanent: false,
    slot: null,
    startDate: null,
    endDate: null,
    armVersion: 1,
    round: null,
    built: false,
  }),
]);

/** The arms a new visitor can be assigned to, in slot order. */
export function activeTournamentArms(arms = TOURNAMENT_ARMS) {
  return arms
    .filter(a => a && a.status === 'active' && Number.isInteger(a.slot))
    .slice()
    .sort((x, y) => x.slot - y.slot);
}

/** The registry entry for an arm id, or null. */
export function tournamentArmById(id, arms = TOURNAMENT_ARMS) {
  return arms.find(a => a && a.id === id) || null;
}

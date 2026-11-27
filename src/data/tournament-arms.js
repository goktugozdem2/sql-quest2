// The first-session tournament's registry — the single source the app, the
// tests and scripts/tournament-read.sql read (plan:
// docs/plans/first-session-tournament-2026-11-26.md §2.2; metric
// `first_session_tournament` in docs/agent/metrics.md).
//
// New visitors are profiled, put in a stratum (TOURNAMENT_STRATA, below),
// and split by aid across the ACTIVE arms inside it — equal weights unless
// the stratum is routed (TOURNAMENT_STRATUM_WEIGHTS). Arm A (today's
// product) is permanent; the challengers come and go:
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
// queued as the first replacement; launch 2026-12-12 (orchestrator 2026-11-27), inside the freeQuota
// holdout's enrolment, so every read is 2×2 with `fqArm`.

export const TOURNAMENT_TEST_ID = 'first_session_tournament_v1';
export const TOURNAMENT_LAUNCH_DATE = '2026-12-12';
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

// ── Strata: profile first, then the draw (founder, chat, 2026-11-26) ──────
// "kişinin profilini anlamadan onu bir gruba alamayız. profile göre gruba
// almalıyız." A person's profile is read at the first app open
// (buildVisitorProfile, src/utils/tournament.js); it puts them in ONE of
// four strata; the arm is then drawn at random INSIDE the stratum. Picking
// the arm FROM the profile would make arm and profile the same thing and
// no read could tell them apart; drawing inside the stratum keeps every
// arm comparable within every profile.
//
// Four, not more: ~23 new people a day, so every extra cut halves each cell.
//   IT = interview-target (company page, `?company=`, the readiness test or
//        its stored result, the Capital One blog — #409's entry definition)
//   NI = everyone else
//   D  = desktop (and a device that could not be read)
//   M  = phone or tablet
export const TOURNAMENT_STRATA = Object.freeze(['IT-D', 'IT-M', 'NI-D', 'NI-M']);
export const TOURNAMENT_STRATUM_LABELS = Object.freeze({
  'IT-D': 'interview-target · desktop',
  'IT-M': 'interview-target · phone/tablet',
  'NI-D': 'not interview-target · desktop',
  'NI-M': 'not interview-target · phone/tablet',
});

// Exploration floor: a routed stratum keeps at least this share on the arms
// that did NOT win it, so the read keeps seeing them (and drift is caught).
export const TOURNAMENT_MIN_EXPLORE = 0.2;

// Per-stratum weights — the routing table. A stratum with no entry draws
// with EQUAL weights over the active arms (weightsVersion 0). An entry
// routes it, by an orchestrator decision row and only after the routing
// rule (metrics.md `first_session_tournament`: P(best in stratum) ≥ 0.95 on
// two consecutive Friday reads, ≥ 100 eligible per arm in that stratum):
//
//   'IT-D': Object.freeze({
//     version: 1,                       // bumps on every change; the read restarts
//     since: '2027-03-05',              //   the stratum's per-arm counts at it
//     decision: 'orchestrator-decisions.md 2027-03-05',
//     weights: Object.freeze({ B_single_path: 0.8, A_control: 0.1, D_interview_sprint: 0.1 }),
//   }),
//
// Weights name ACTIVE arms only; every active arm keeps > 0 and the winner
// at most 1 − TOURNAMENT_MIN_EXPLORE. An entry that breaks either rule is
// ignored (the stratum draws equally) — tests/tournament.test.js holds the
// live table to it. Changing a weight re-buckets only browsers with no
// record yet; stored records keep their arm.
export const TOURNAMENT_STRATUM_WEIGHTS = Object.freeze({});

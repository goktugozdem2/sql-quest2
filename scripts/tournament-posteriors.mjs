#!/usr/bin/env node
// The first-session tournament's posteriors — the companion of
// scripts/tournament-read.sql (2026-11-26, PR 1 of 4). Metric
// `first_session_tournament`; rules: docs/plans/first-session-tournament-2026-11-26.md
// §5.5 + orchestrator decision 2026-11-26 (promotion needs two consecutive
// Friday reads at ≥ 0.95).
//
//   node scripts/tournament-posteriors.mjs '<query 1 rows as JSON>' ['<last Friday's output JSON>']
//   node scripts/tournament-posteriors.mjs --sim   (what the rules can see, plan §5.5)
//
// Input: an array of { arm, is_control, eligible_7d, six_7d } (query 1's
// columns; extra columns are ignored, alpha/beta are recomputed here so a
// hand-edited row cannot disagree with its counts). Output: per arm the
// posterior mean, P(better than control), P(worst among challengers) and
// the rule verdict for this read.
//
// Beta(1 + six, 1 + eligible − six) per arm, uniform prior, 20,000 draws,
// seeded — the same input gives the same numbers on every run.

export const DRAWS = 20000;
export const GATE_MIN_ELIGIBLE = 150;
export const ELIMINATE_P_WORST = 0.80;
export const PROMOTE_P_BETTER = 0.95;
export const PROMOTE_CONSECUTIVE_READS = 2;
export const HARM_MIN_ELIGIBLE = 100;
export const HARM_POINTS = 10;

/** mulberry32: a small seeded PRNG in [0, 1). */
export function rng(seed = 20261126) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Gamma(shape, 1) by Marsaglia–Tsang (shape ≥ 1 here: the prior adds 1). */
function gamma(shape, rand) {
  if (shape < 1) return gamma(shape + 1, rand) * Math.pow(rand(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x;
    let v;
    do { x = normal(rand); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function betaDraw(alpha, beta, rand) {
  const x = gamma(alpha, rand);
  const y = gamma(beta, rand);
  return x / (x + y);
}

/** Normalise query-1 rows into { arm, isControl, n, k, alpha, beta }. */
export function armsFromRows(rows) {
  if (!Array.isArray(rows)) throw new Error('expected an array of query 1 rows');
  return rows.map(r => {
    const n = Number(r.eligible_7d);
    const k = Number(r.six_7d);
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < k) throw new Error(`bad counts for ${r.arm}`);
    const isControl = r.is_control === true || r.is_control === 't' || r.is_control === 'true';
    const s10 = r.solve_10m_pct == null ? null : Number(r.solve_10m_pct);
    return { arm: String(r.arm), isControl, n, k, alpha: 1 + k, beta: 1 + n - k, solve10mPct: Number.isFinite(s10) ? s10 : null };
  });
}

/**
 * P(better than control) per challenger and P(worst among challengers),
 * by Monte-Carlo over the arms' Beta posteriors.
 */
export function posteriors(rows, { draws = DRAWS, seed = 20261126 } = {}) {
  const arms = armsFromRows(rows);
  const control = arms.find(a => a.isControl);
  if (!control) throw new Error('no control row (is_control = true)');
  const challengers = arms.filter(a => !a.isControl);
  const rand = rng(seed);
  const better = new Map(challengers.map(a => [a.arm, 0]));
  const worst = new Map(challengers.map(a => [a.arm, 0]));
  for (let i = 0; i < draws; i++) {
    const c = betaDraw(control.alpha, control.beta, rand);
    let lo = Infinity;
    let loArm = null;
    for (const a of challengers) {
      const x = betaDraw(a.alpha, a.beta, rand);
      if (x > c) better.set(a.arm, better.get(a.arm) + 1);
      if (x < lo) { lo = x; loArm = a.arm; }
    }
    if (loArm) worst.set(loArm, worst.get(loArm) + 1);
  }
  return arms.map(a => ({
    arm: a.arm,
    isControl: a.isControl,
    eligible: a.n,
    six: a.k,
    solve10mPct: a.solve10mPct,
    postMean: a.alpha / (a.alpha + a.beta),
    pBetterThanControl: a.isControl ? null : better.get(a.arm) / draws,
    pWorstAmongChallengers: a.isControl || challengers.length < 2 ? null : worst.get(a.arm) / draws,
  }));
}

/**
 * This read's verdict per arm. `previous` is last Friday's output (for the
 * two-consecutive-reads promotion rule); omit it on the first read.
 */
export function decide(post, { previous = null } = {}) {
  const challengers = post.filter(p => !p.isControl);
  const gateOpen = challengers.length > 0 && challengers.every(p => p.eligible >= GATE_MIN_ELIGIBLE);
  const prevBy = new Map((previous || []).map(p => [p.arm, p]));
  const control = post.find(p => p.isControl);
  return post.map(p => {
    if (p.isControl) return { ...p, verdict: 'control (never eliminated)' };
    // Harm stop, any week, before the gate: first_solve_10m ≥ 10 points
    // under control with both at ≥ 100 eligible.
    if (control && control.solve10mPct != null && p.solve10mPct != null
        && control.eligible >= HARM_MIN_ELIGIBLE && p.eligible >= HARM_MIN_ELIGIBLE
        && control.solve10mPct - p.solve10mPct >= HARM_POINTS) {
      return { ...p, verdict: 'HARM STOP (solve_10m ≥ 10 points under control)' };
    }
    if (!gateOpen) return { ...p, verdict: `wait (gate: every challenger at ≥ ${GATE_MIN_ELIGIBLE} eligible)` };
    const prev = prevBy.get(p.arm);
    if (p.pBetterThanControl >= PROMOTE_P_BETTER) {
      return prev && prev.pBetterThanControl >= PROMOTE_P_BETTER
        ? { ...p, verdict: 'PROMOTE (≥ 0.95 on two consecutive reads; founder go on money copy)' }
        : { ...p, verdict: 'promote candidate (≥ 0.95 once; needs next Friday too)' };
    }
    if (p.pWorstAmongChallengers != null && p.pWorstAmongChallengers >= ELIMINATE_P_WORST) {
      return { ...p, verdict: 'ELIMINATE (P(worst) ≥ 0.80)' };
    }
    return { ...p, verdict: 'continue' };
  });
}

/**
 * What the rules can see (plan §5.5): repeated simulated reads at `n` per
 * arm with true rates `rates` (control first). Returns the share of runs in
 * which an elimination fired, it fired on the true worst, and a one-look
 * promotion fired.
 */
export function simulate({ n = 150, rates = [0.118, 0.118, 0.118], runs = 400, draws = 2000, seed = 7 } = {}) {
  const rand = rng(seed);
  const names = rates.map((_, i) => (i === 0 ? 'A' : `C${i}`));
  const trueWorst = names[1 + rates.slice(1).indexOf(Math.min(...rates.slice(1)))];
  let elim = 0;
  let elimOnWorst = 0;
  let promoted = 0;
  for (let r = 0; r < runs; r++) {
    const rows = rates.map((p, i) => {
      let k = 0;
      for (let j = 0; j < n; j++) if (rand() < p) k++;
      return { arm: names[i], is_control: i === 0, eligible_7d: n, six_7d: k };
    });
    const post = posteriors(rows, { draws, seed: Math.floor(rand() * 2 ** 31) });
    const out = decide(post);
    const e = out.find(p => p.verdict.startsWith('ELIMINATE'));
    if (e) { elim++; if (e.arm === trueWorst) elimOnWorst++; }
    if (out.some(p => p.pBetterThanControl != null && p.pBetterThanControl >= PROMOTE_P_BETTER)) promoted++;
  }
  return { n, rates, runs, eliminationFires: elim / runs, onTrueWorst: elimOnWorst / runs, promotionOneLook: promoted / runs };
}

const isMain = (() => {
  try { return import.meta.url === new URL(`file://${process.argv[1]}`).href; } catch (_) { return false; }
})();

if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === '--sim') {
    for (const rates of [[0.118, 0.118, 0.118], [0.118, 0.118, 0.07], [0.118, 0.18, 0.118], [0.118, 0.20, 0.118]]) {
      console.log(JSON.stringify(simulate({ n: 150, rates })));
    }
  } else if (args[0]) {
    const rows = JSON.parse(args[0]);
    const previous = args[1] ? JSON.parse(args[1]) : null;
    const out = decide(posteriors(rows), { previous });
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.error('usage: node scripts/tournament-posteriors.mjs \'<query 1 rows JSON>\' [\'<previous output JSON>\'] | --sim');
    process.exit(2);
  }
}

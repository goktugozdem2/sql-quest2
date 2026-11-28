#!/usr/bin/env node
// The first-session tournament's posteriors — the companion of
// scripts/tournament-read.sql (2026-11-26, PR 1 of 4). Metric
// `first_session_tournament`; rules: docs/plans/first-session-tournament-2026-11-26.md
// §5.5 + orchestrator decision 2026-11-26 (promotion needs two consecutive
// Friday reads at ≥ 0.95).
//
//   node scripts/tournament-posteriors.mjs '<query 1 rows as JSON>' ['<last Friday's output JSON>']
//   node scripts/tournament-posteriors.mjs --strata '<query 4 rows as JSON>' ['<last Friday's --strata output JSON>']
//   node scripts/tournament-posteriors.mjs --sim   (what the rules can see, plan §5.5)
//
// --strata (founder, 2026-11-26: profile first, then the group): per
// stratum, P(best in stratum) for every arm and the ROUTING verdict — a
// stratum is routed to an arm only when P(best) ≥ 0.95 on two consecutive
// Friday reads with ≥ 100 eligible per arm in that stratum; the routed
// weights keep ≥ 20% exploring. It also prints the POST-STRATIFIED pool
// (each stratum weighted by its share of eligible people), which replaces
// query 1's plain pool for elimination and promotion once any stratum is
// routed.
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
export const ROUTE_P_BEST = 0.95;
export const ROUTE_MIN_ELIGIBLE_PER_ARM = 100;
export const ROUTE_CONSECUTIVE_READS = 2;
export const ROUTE_WINNER_MAX_WEIGHT = 0.8;   // ≥ 20% explores (TOURNAMENT_MIN_EXPLORE)

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

/** Query 4's rows grouped by stratum: Map(stratum → normalised arms). */
export function strataFromRows(rows) {
  if (!Array.isArray(rows)) throw new Error('expected an array of query 4 rows');
  const by = new Map();
  for (const r of rows) {
    if (!r || typeof r.stratum !== 'string') throw new Error('a query 4 row without a stratum');
    if (!by.has(r.stratum)) by.set(r.stratum, []);
    by.get(r.stratum).push(r);
  }
  return new Map([...by].map(([k, v]) => [k, armsFromRows(v)]));
}

/**
 * Per stratum: P(best in stratum) per arm (control included — routing asks
 * which arm is best for THESE people, not only whether it beats control).
 */
export function stratumPosteriors(rows, { draws = DRAWS, seed = 20261126 } = {}) {
  const strata = strataFromRows(rows);
  const out = [];
  let s = seed;
  for (const [stratum, arms] of strata) {
    const rand = rng(s++);
    const best = new Map(arms.map(a => [a.arm, 0]));
    for (let i = 0; i < draws; i++) {
      let hi = -Infinity;
      let hiArm = null;
      for (const a of arms) {
        const x = betaDraw(a.alpha, a.beta, rand);
        if (x > hi) { hi = x; hiArm = a.arm; }
      }
      best.set(hiArm, best.get(hiArm) + 1);
    }
    for (const a of arms) {
      out.push({
        stratum, arm: a.arm, isControl: a.isControl, eligible: a.n, six: a.k,
        postMean: a.alpha / (a.alpha + a.beta), pBestInStratum: best.get(a.arm) / draws,
      });
    }
  }
  return out;
}

/**
 * The routing verdict per stratum. `previous` is last Friday's
 * routeStrata() output. Never routes by itself: a ROUTE verdict is a
 * proposal for an orchestrator decision row (TOURNAMENT_STRATUM_WEIGHTS).
 */
export function routeStrata(post, { previous = null } = {}) {
  const by = new Map();
  for (const p of post) {
    if (!by.has(p.stratum)) by.set(p.stratum, []);
    by.get(p.stratum).push(p);
  }
  const prev = new Map((previous || []).map(v => [v.stratum, v]));
  return [...by].map(([stratum, arms]) => {
    const minN = Math.min(...arms.map(a => a.eligible));
    const top = arms.slice().sort((x, y) => y.pBestInStratum - x.pBestInStratum)[0];
    const base = { stratum, minEligiblePerArm: minN, leader: top.arm, pBest: top.pBestInStratum };
    if (minN < ROUTE_MIN_ELIGIBLE_PER_ARM) {
      return { ...base, verdict: `explore (equal weights; every arm needs ≥ ${ROUTE_MIN_ELIGIBLE_PER_ARM} eligible in this stratum)` };
    }
    if (top.pBestInStratum < ROUTE_P_BEST) return { ...base, verdict: 'explore (no arm at P(best) ≥ 0.95)' };
    const last = prev.get(stratum);
    if (last && last.leader === top.arm && last.pBest >= ROUTE_P_BEST && last.minEligiblePerArm >= ROUTE_MIN_ELIGIBLE_PER_ARM) {
      const others = arms.filter(a => a.arm !== top.arm).map(a => a.arm);
      const rest = Math.round(((1 - ROUTE_WINNER_MAX_WEIGHT) / others.length) * 1000) / 1000;
      return {
        ...base,
        verdict: `ROUTE to ${top.arm} (P(best) ≥ 0.95 on two consecutive reads) — decision row`,
        proposedWeights: Object.fromEntries([[top.arm, ROUTE_WINNER_MAX_WEIGHT], ...others.map(o => [o, rest])]),
      };
    }
    return { ...base, verdict: `route candidate: ${top.arm} (P(best) ≥ 0.95 once; needs next Friday too)` };
  });
}

/**
 * The pool, post-stratified: each draw is Σ_stratum share × the arm's draw
 * in that stratum, share = the stratum's part of all eligible people. Same
 * output shape as posteriors(), so decide() reads it. Use it for
 * elimination and promotion once any stratum is routed.
 */
export function poststratifiedPosteriors(rows, { draws = DRAWS, seed = 20261126 } = {}) {
  const strata = strataFromRows(rows);
  const armIds = [...new Set([...strata.values()].flat().map(a => a.arm))];
  const total = [...strata.values()].reduce((n, arms) => n + arms.reduce((m, a) => m + a.n, 0), 0);
  if (!total) throw new Error('no eligible people in any stratum');
  const share = new Map([...strata].map(([k, arms]) => [k, arms.reduce((m, a) => m + a.n, 0) / total]));
  const isControl = new Map([...strata.values()].flat().map(a => [a.arm, a.isControl]));
  const control = armIds.find(id => isControl.get(id));
  if (!control) throw new Error('no control row (is_control = true)');
  const challengers = armIds.filter(id => id !== control);
  const rand = rng(seed);
  const sum = new Map(armIds.map(id => [id, 0]));
  const better = new Map(challengers.map(id => [id, 0]));
  const worst = new Map(challengers.map(id => [id, 0]));
  for (let i = 0; i < draws; i++) {
    const v = new Map(armIds.map(id => [id, 0]));
    for (const [k, arms] of strata) {
      const w = share.get(k);
      if (!w) continue;
      for (const a of arms) v.set(a.arm, v.get(a.arm) + w * betaDraw(a.alpha, a.beta, rand));
    }
    let lo = Infinity;
    let loArm = null;
    for (const id of challengers) {
      if (v.get(id) > v.get(control)) better.set(id, better.get(id) + 1);
      if (v.get(id) < lo) { lo = v.get(id); loArm = id; }
    }
    if (loArm) worst.set(loArm, worst.get(loArm) + 1);
    for (const id of armIds) sum.set(id, sum.get(id) + v.get(id));
  }
  const n = (id) => [...strata.values()].flat().filter(a => a.arm === id).reduce((m, a) => m + a.n, 0);
  const k = (id) => [...strata.values()].flat().filter(a => a.arm === id).reduce((m, a) => m + a.k, 0);
  return armIds.map(id => ({
    arm: id,
    isControl: id === control,
    eligible: n(id),
    six: k(id),
    solve10mPct: null,
    postMean: sum.get(id) / draws,
    pBetterThanControl: id === control ? null : better.get(id) / draws,
    pWorstAmongChallengers: id === control || challengers.length < 2 ? null : worst.get(id) / draws,
  }));
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
  if (args[0] === '--strata' && args[1]) {
    const rows = JSON.parse(args[1]);
    // Last Friday's whole --strata output, or just its `routing` array.
    const prevRaw = args[2] ? JSON.parse(args[2]) : null;
    const previous = prevRaw && !Array.isArray(prevRaw) ? prevRaw.routing : prevRaw;
    const per = stratumPosteriors(rows);
    console.log(JSON.stringify({
      strata: per,
      routing: routeStrata(per, { previous }),
      pooledPostStratified: decide(poststratifiedPosteriors(rows)),
    }, null, 2));
  } else if (args[0] === '--sim') {
    for (const rates of [[0.118, 0.118, 0.118], [0.118, 0.118, 0.07], [0.118, 0.18, 0.118], [0.118, 0.20, 0.118]]) {
      console.log(JSON.stringify(simulate({ n: 150, rates })));
    }
  } else if (args[0]) {
    const rows = JSON.parse(args[0]);
    const previous = args[1] ? JSON.parse(args[1]) : null;
    const out = decide(posteriors(rows), { previous });
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.error('usage: node scripts/tournament-posteriors.mjs \'<query 1 rows JSON>\' [\'<previous output JSON>\'] | --strata \'<query 4 rows JSON>\' [\'<previous routing JSON>\'] | --sim');
    process.exit(2);
  }
}

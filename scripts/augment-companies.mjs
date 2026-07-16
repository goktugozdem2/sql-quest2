import fs from 'fs';

const src = fs.readFileSync('/Users/cgozdemm/sql-quest2/src/data/challenges.js', 'utf-8');
const match = src.match(/window\.challengesData\s*=\s*(\[[\s\S]*?\]);?\s*$/);
const arr = eval(match[1]);

const PROSE = [
  'Amazon','Meta','Facebook','Google','Netflix','Apple','Uber','Airbnb',
  'Databricks','Shopify','Spotify','JPMorgan','LinkedIn','Stripe',
  'Microsoft','Instagram','Bloomberg','DoorDash','Instacart','TikTok'
];
const TARGETS = ['Amazon','Meta','Google','Netflix','Apple','Uber','Airbnb',
  'Databricks','Shopify','Spotify','JPMorgan','Stripe'];
const TSET = new Set(TARGETS);

function proseHits(c) {
  const text = (c.description || '') + ' ' + (c.title || '');
  const hits = new Set();
  for (const co of PROSE) {
    if (new RegExp('\\b' + co + '\\b', 'i').test(text)) {
      const norm = co === 'Facebook' ? 'Meta' : co;
      if (TSET.has(norm)) hits.add(norm);
    }
  }
  return hits;
}

function scoreChallenge(c) {
  const text = ((c.description || '') + ' ' + (c.title || '')).toLowerCase();
  const cat = (c.category || '').toLowerCase();
  const skills = (c.skills || []).map(s => s.toLowerCase());
  const diff = c.difficulty;
  const ds = (c.dataset || '').toLowerCase();
  const isOrders = ds === 'orders' || ds === 'customers' || (c.tables || []).some(t => ['orders','customers'].includes(t));
  const isMovies = ds === 'movies';
  const isEmployees = ds === 'employees';
  const isTitanic = ds === 'titanic';
  const scores = {};
  const bump = (co, n) => { if (TSET.has(co)) scores[co] = (scores[co] || 0) + n; };
  const has = (kw) => text.includes(kw) || cat.includes(kw) || skills.some(s => s.includes(kw));

  if (c.id >= 91 && c.id <= 105) return {};

  // Amazon
  if (has('anti-join') || has('not in') || has('not exists') || has('unmatched')) bump('Amazon', 4);
  if (has('recursive') && (has('org') || has('team') || has('hierarchy'))) bump('Amazon', 4);
  if (has('repeat buyer') || has('repeat purchase') || has('clv') || has('ltv') || has('lifetime value')) bump('Amazon', 4);
  if (has('pivot') || has('conditional aggregation')) bump('Amazon', 3);
  if (has('funnel')) bump('Amazon', 3);
  if (has('cohort') && diff === 'Hard') bump('Amazon', 2);
  if (isOrders && diff === 'Hard') bump('Amazon', 2);

  // Meta
  if (has('dau') || has('daily active') || has('active users')) bump('Meta', 4);
  if (has('retention') || has('cohort')) bump('Meta', 3);
  if (has('session')) bump('Meta', 3);
  if (has('relational division') || has('all categories') || has('at least one')) bump('Meta', 4);
  if (has('self-join') && (has('consecutive') || has('back-to-back'))) bump('Meta', 3);
  if (has('percentile') || has('percent_rank')) bump('Meta', 2);

  // Google
  if (has('median') || has('percentile') || has('percent_rank') || has('ntile')) bump('Google', 4);
  if (has('recursive')) bump('Google', 3);
  if (has('correlated subquery') || has('correlated')) bump('Google', 3);
  if (has('exists') || (has('in') && cat.includes('subquery'))) bump('Google', 2);
  if (has('string') || has('group_concat')) bump('Google', 2);
  if (isEmployees && diff === 'Hard') bump('Google', 1);

  // Netflix
  if (has('rolling') || has('moving average')) bump('Netflix', 4);
  if (has('session')) bump('Netflix', 3);
  if (has('cumulative distinct')) bump('Netflix', 3);
  if (has('retention') || has('cohort')) bump('Netflix', 3);
  if (has('year-over-year') || has('yoy')) bump('Netflix', 2);
  if (isMovies && diff === 'Hard') bump('Netflix', 2);

  // Spotify
  if (has('session')) bump('Spotify', 2);
  if (has('genre') || has('music')) bump('Spotify', 3);
  if (has('cumulative distinct')) bump('Spotify', 3);
  if (has('rolling') || has('moving average')) bump('Spotify', 2);
  if (isMovies && diff === 'Hard') bump('Spotify', 2);

  // Stripe
  if ((has('running total') || has('cumulative revenue')) && !isMovies) bump('Stripe', 4);
  if ((has('clv') || has('lifetime value') || has('revenue share')) && !isMovies) bump('Stripe', 4);
  if (has('null') && has('revenue') && !isMovies && !isTitanic) bump('Stripe', 3);
  if (has('pareto') && !isMovies) bump('Stripe', 3);
  if (has('fraud') || has('risk')) bump('Stripe', 4);
  if (isOrders && (has('revenue') || has('funnel') || has('payment'))) bump('Stripe', 2);

  // Uber
  if (has('consecutive') || has('gaps-and-islands') || has('streak') || has('island')) bump('Uber', 4);
  if ((has('fare') || has('surge')) && !isTitanic) bump('Uber', 4);
  if (has('price') && isOrders) bump('Uber', 2);
  if (has('session')) bump('Uber', 3);
  if (has('self-join') && (has('back-to-back') || has('consecutive'))) bump('Uber', 3);
  if (isOrders && has('days between')) bump('Uber', 3);
  if (isOrders && has('repeat')) bump('Uber', 2);
  if (isOrders && has('date') && diff === 'Hard') bump('Uber', 2);

  // Airbnb
  if (has('retention') || has('cohort')) bump('Airbnb', 3);
  if (has('first value') || has('first_value') || has('last_value') || has('first order') || has('last order')) bump('Airbnb', 3);
  if ((has('fare') || has('price')) && !isTitanic) bump('Airbnb', 3);
  if ((has('year-over-year') || has('yoy') || has('seasonal')) && !isMovies) bump('Airbnb', 3);
  if (has('funnel')) bump('Airbnb', 2);
  if (isOrders && has('cohort')) bump('Airbnb', 2);
  if (isOrders && (has('days') || has('date'))) bump('Airbnb', 2);
  if (has('lag') || has('lead')) bump('Airbnb', 2);
  if (isOrders && diff === 'Hard') bump('Airbnb', 1);

  // Databricks
  if (has('recursive')) bump('Databricks', 4);
  if (has('gaps-and-islands') || has('island')) bump('Databricks', 3);
  if (has('anti-join') || has('not exists')) bump('Databricks', 3);
  if (has('union') || has('intersect') || has('except') || cat.includes('set operation')) bump('Databricks', 3);
  if (has('window') && has('frame')) bump('Databricks', 3);
  if (has('pivot')) bump('Databricks', 2);
  if (has('lag') || has('lead')) bump('Databricks', 2);

  // Apple — BOOSTED
  if (has('first_value') || has('last_value') || has('first value') || has('last value') || has('first order') || has('last order')) bump('Apple', 4);
  if (has('cohort') || has('retention')) bump('Apple', 3);
  if (has('clv') || has('ltv') || has('lifetime value')) bump('Apple', 3);
  if (has('year-over-year') || has('yoy')) bump('Apple', 3);
  if (has('rolling') || has('moving average')) bump('Apple', 2);
  if (has('running total')) bump('Apple', 2);
  if (has('quarterly') || has('quarter')) bump('Apple', 3);
  if (has('mom') || has('month-over-month') || has('monthly')) bump('Apple', 2);
  if (has('subscription') || has('recurring')) bump('Apple', 4);
  if (has('pareto') || has('revenue share')) bump('Apple', 2);

  // Shopify
  if (has('funnel')) bump('Shopify', 4);
  if (has('gmv') || has('merchant') || has('cart')) bump('Shopify', 4);
  if (has('order') && (has('status') || has('pivot'))) bump('Shopify', 3);
  if (has('pareto') || has('revenue share')) bump('Shopify', 3);
  if (has('repeat buyer') || has('repeat purchase')) bump('Shopify', 3);
  if (has('cohort') && isOrders) bump('Shopify', 3);
  if (has('customer') && has('retention')) bump('Shopify', 3);
  if (isOrders && (has('revenue') || has('country'))) bump('Shopify', 2);
  if (has('year-over-year') && isOrders) bump('Shopify', 2);
  if (has('clv') || has('ltv') || has('lifetime value')) bump('Shopify', 3);

  // JPMorgan — BOOSTED
  if ((has('median') || has('percentile') || has('quartile')) && !isTitanic && !isMovies) bump('JPMorgan', 3);
  if ((has('running total') || has('cumulative revenue')) && !isMovies) bump('JPMorgan', 3);
  if (has('null') && has('revenue') && !isMovies) bump('JPMorgan', 3);
  if (has('variance') || has('std') || has('stdev')) bump('JPMorgan', 4);
  if (has('pareto') && !isMovies) bump('JPMorgan', 2);
  if ((has('year-over-year') || has('yoy')) && !isMovies) bump('JPMorgan', 2);
  if (has('salary') && (has('rank') || has('percentile') || has('quartile'))) bump('JPMorgan', 3);
  if (has('quarterly') || has('quarter')) bump('JPMorgan', 3);
  if (has('compound') || has('growth rate')) bump('JPMorgan', 3);
  if (has('nth highest') || has('top n')) bump('JPMorgan', 2);
  if (has('bucket') && has('salary')) bump('JPMorgan', 2);
  if (has('risk') || has('exposure')) bump('JPMorgan', 3);
  if (has('window') && has('rank')) bump('JPMorgan', 1);
  if (has('compensation')) bump('JPMorgan', 3);
  if (has('high earner') || has('top earner') || has('above-average') || has('above average')) bump('JPMorgan', 2);
  if (has('performance') && has('salary')) bump('JPMorgan', 2);
  if (has('tenure') || has('seniority')) bump('JPMorgan', 2);

  return scores;
}

function pickCompanies(c) {
  const prose = proseHits(c);
  const scores = scoreChallenge(c);
  for (const co of prose) scores[co] = (scores[co] || 0) + 10;

  const maxN = c.difficulty === 'Hard' ? 5 : c.difficulty === 'Medium' ? 4 : 3;
  const sorted = Object.entries(scores)
    .filter(([, s]) => s >= 2)
    .sort((a,b) => b[1] - a[1])
    .slice(0, maxN)
    .map(([co]) => co);

  const final = new Set(sorted);
  for (const co of prose) final.add(co);
  return [...final].sort();
}

// Fintech doors (2026-07-16) — Plaid / Ramp / Revolut / Wise. Scored in a
// SECOND pass that only APPENDS tags: running them inside the main scorer
// would compete for the per-challenge company cap (maxN) and evict existing
// tags, silently changing the hardcoded honest counts on live company pages.
// Signals map to what these companies actually screen for:
//   Plaid   — bank-data plumbing: NULL handling, dedup, cleanup, categorization
//   Ramp    — spend management: MoM, running totals, top-N, pivots, Pareto
//   Revolut — consumer neobank: retention, activity streaks, balances, funnels
//   Wise    — cross-border: countries, fees, growth, recency
function scoreFintech(c) {
  const text = ((c.description || '') + ' ' + (c.title || '')).toLowerCase();
  const cat = (c.category || '').toLowerCase();
  const skills = (c.skills || []).map(s => s.toLowerCase());
  const diff = c.difficulty;
  const ds = (c.dataset || '').toLowerCase();
  const isOrders = ds === 'orders' || ds === 'customers' || (c.tables || []).some(t => ['orders','customers'].includes(t));
  const isMovies = ds === 'movies';
  const isTitanic = ds === 'titanic';
  const scores = {};
  const bump = (co, n) => { scores[co] = (scores[co] || 0) + n; };
  const has = (kw) => text.includes(kw) || cat.includes(kw) || skills.some(s => s.includes(kw));

  if (c.id >= 91 && c.id <= 105) return {};

  // Plaid
  if (has('duplicate') || has('dedup')) bump('Plaid', 4);
  if (has('clean') || has('data quality') || has('malformed')) bump('Plaid', 4);
  if (has('null') && !isMovies && !isTitanic) bump('Plaid', 3);
  if (has('categor') && !isMovies) bump('Plaid', 3);
  if ((has('string') || has('pattern') || has('like')) && cat.includes('string')) bump('Plaid', 2);

  // Ramp
  if (has('spend')) bump('Ramp', 4);
  if (has('month-over-month') || has('mom growth')) bump('Ramp', 4);
  if ((has('monthly') || has('quarter')) && !isMovies) bump('Ramp', 3);
  if ((has('running total') || has('cumulative')) && !isMovies) bump('Ramp', 3);
  if (has('top n') || has('nth highest')) bump('Ramp', 3);
  if (has('pivot') || has('conditional aggregation')) bump('Ramp', 3);
  if (has('pareto') || has('revenue share')) bump('Ramp', 3);

  // Revolut
  if (has('retention') || has('cohort')) bump('Revolut', 4);
  if (has('dau') || has('daily active') || has('active users')) bump('Revolut', 4);
  if (has('consecutive') || has('streak')) bump('Revolut', 3);
  if ((has('running total') || has('cumulative')) && !isMovies) bump('Revolut', 3);
  if (has('funnel') || has('conversion')) bump('Revolut', 3);
  if (has('fraud') || has('risk')) bump('Revolut', 3);

  // Wise
  if (has('country') && !isMovies) bump('Wise', 4);
  if (has('fee') || has('exchange')) bump('Wise', 4);
  if ((has('year-over-year') || has('yoy') || has('growth')) && !isMovies) bump('Wise', 3);
  if (has('days between') || has('recency')) bump('Wise', 3);
  if (has('duplicate') || has('dedup')) bump('Wise', 2);
  if (isOrders && has('revenue') && diff === 'Hard') bump('Wise', 1);

  return scores;
}

const FINTECH_MIN_SCORE = 3; // stricter than the main scorer's 2: append-only tags need clear topical fit
const FINTECH_CAP = { Hard: 3, Medium: 3, Easy: 2 }; // max fintech tags added per challenge

// BASELINE = the committed challenge-companies.js, NOT the scorer output.
// The committed file carries hand-edits the scorer never produced (Snowflake
// tags on ~100 challenges for the "Snowflake-compatible" door, plus per-door
// count fixes from 2026-07-11). Regenerating from the scorer would silently
// strip them and break the live pages' promised counts. The scorer above is
// kept for reference/bootstrap only; this script now only APPENDS.
const existing = fs.readFileSync('/Users/cgozdemm/sql-quest2/src/data/challenge-companies.js', 'utf-8');
const map = JSON.parse(existing.match(/window\.challengeCompanies = (\{[\s\S]*?\});/)[1]);
const counts = {};
for (const list of Object.values(map)) for (const co of list) counts[co] = (counts[co] || 0) + 1;

// Fintech append pass — never removes or reorders existing tags' membership.
for (const c of arr) {
  const scores = scoreFintech(c);
  const picks = Object.entries(scores)
    .filter(([, s]) => s >= FINTECH_MIN_SCORE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, FINTECH_CAP[c.difficulty] || 2)
    .map(([co]) => co);
  if (picks.length === 0) continue;
  const list = map[c.id] || (map[c.id] = []);
  for (const co of picks) {
    if (!list.includes(co)) {
      list.push(co);
      counts[co] = (counts[co] || 0) + 1;
    }
  }
  list.sort();
}

// Hand-picked fintech top-ups (2026-07-16) — same precedent as Netflix/Uber:
// keep every fintech door at >= 6 free (non-Hard) solvable challenges so a
// landing-page visitor gets a real free dose before the wall.
const FINTECH_MANUAL = {
  Revolut: [56, 75, 118, 126],  // recency/days-between, monthly activity, MoM — consumer-banking analytics fits
};
for (const [co, ids] of Object.entries(FINTECH_MANUAL)) {
  for (const id of ids) {
    const list = map[id] || (map[id] = []);
    if (!list.includes(co)) {
      list.push(co);
      list.sort();
      counts[co] = (counts[co] || 0) + 1;
    }
  }
}

// Manual additions (2026-07-12) — the topical scorer left Uber (3 free)
// and Netflix (5 free) with too little solvable content behind their
// interview pages: visitors hit the Pro wall after a few solves. These
// are hand-picked natural fits (movies/ratings content for Netflix;
// time-series/recency/growth for Uber). Keep when regenerating.
const MANUAL_ADDITIONS = {
  Netflix: [5, 36, 65, 117, 122],
  Uber: [56, 75, 112, 118, 126],
};
for (const [co, ids] of Object.entries(MANUAL_ADDITIONS)) {
  for (const id of ids) {
    const list = map[id] || (map[id] = []);
    if (!list.includes(co)) {
      list.push(co);
      list.sort();
      counts[co] = (counts[co] || 0) + 1;
    }
  }
}

console.log('=== FINAL V8 COUNTS ===');
const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
for (const [co, n] of sorted) {
  const floor = n >= 10 ? '✓' : '✗';
  console.log(`${floor} ${co.padEnd(12)} ${n}`);
}

let tagged = 0;
for (const c of arr) if (map[c.id]) tagged++;
console.log(`\nTotal tagged: ${tagged} / ${arr.length}`);

console.log('\n=== APPLE SAMPLE ===');
for (const c of arr) {
  if (map[c.id]?.includes('Apple')) {
    console.log(`  #${c.id} [${c.difficulty}] ${c.title}`);
  }
}

console.log('\n=== JPMORGAN SAMPLE ===');
for (const c of arr) {
  if (map[c.id]?.includes('JPMorgan')) {
    console.log(`  #${c.id} [${c.difficulty}] ${c.title}`);
  }
}

const out = `// Auto-generated by scripts/augment-companies.mjs
// Maps challenge id -> companies where the pattern is asked or plausibly asked.
// Source: prose mentions (ground truth) + topical fit scoring, dataset-aware.

window.challengeCompanies = ${JSON.stringify(map, null, 2)};
`;
fs.writeFileSync('/Users/cgozdemm/sql-quest2/src/data/challenge-companies.js', out);
console.log('\nWrote src/data/challenge-companies.js');

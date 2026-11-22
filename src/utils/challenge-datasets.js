// Which datasets a challenge needs loaded — its own, plus any dataset that
// provides a table it lists but its own dataset lacks.
//
// Why this exists (2026-11-22, C1 found it): challenge 27 "UNION ALL Dedup:
// Cross-Dataset Search" lists `employees` and `customers` with
// `dataset: "ecommerce"`, and the ecommerce dataset has no `employees` table
// (it lives in the `employees` dataset). The app loaded exactly one dataset
// per challenge, so on a fresh session the reference solution and every
// learner query failed with "no such table: employees" — it only worked when
// an earlier screen had happened to load the employees dataset. 24 people
// opened it in 60 days; 3 ran it.
//
// The `dataset` field stays a string (scripts and tests read it that way).
// The plan is: the challenge's own dataset first, whole; then, for each
// listed table it lacks, the FIRST dataset (in registry order) that has it,
// loading ONLY that table — so an extra dataset never replaces a table of
// the challenge's own dataset that happens to share a name.
//
// Pure: no window, no DOM. app.jsx wraps it as `loadChallengeDatasets`;
// tests/challenge-datasets.test.js runs every reference solution on exactly
// this plan.

function hasTable(datasets, key, table) {
  const ds = datasets && datasets[key];
  return !!(ds && ds.tables && Object.prototype.hasOwnProperty.call(ds.tables, table));
}

// The dataset that provides `table` for this challenge: its own when it has
// it, else the first other dataset that does, else null.
export function datasetForTable(challenge, table, datasets) {
  const own = challenge && challenge.dataset;
  if (own && hasTable(datasets, own, table)) return own;
  for (const key of Object.keys(datasets || {})) {
    if (key !== own && hasTable(datasets, key, table)) return key;
  }
  return null;
}

// [{ dataset, tables }] in load order. `tables: null` = the whole dataset
// (only ever the challenge's own); an extra carries just the missing tables.
export function challengeTablePlan(challenge, datasets) {
  const own = challenge && challenge.dataset;
  if (!own || !datasets || !datasets[own]) return [];
  const plan = [{ dataset: own, tables: null }];
  const extras = new Map();
  for (const table of (challenge.tables || [])) {
    if (hasTable(datasets, own, table)) continue;
    const key = datasetForTable(challenge, table, datasets);
    if (!key) continue;
    if (!extras.has(key)) extras.set(key, []);
    if (!extras.get(key).includes(table)) extras.get(key).push(table);
  }
  for (const [dataset, tables] of extras) plan.push({ dataset, tables });
  return plan;
}

// The dataset keys, own first — the short form of the plan.
export function datasetsForChallenge(challenge, datasets) {
  return challengeTablePlan(challenge, datasets).map(step => step.dataset);
}

// The table object ({ columns, data }) a schema panel should show for one of
// the challenge's listed tables, from whichever dataset the plan loads it.
export function challengeTableData(challenge, table, datasets) {
  const key = datasetForTable(challenge, table, datasets);
  return key ? datasets[key].tables[table] : null;
}

// Listed tables no dataset provides — must be empty for every challenge
// (the audit test fails on any).
export function missingChallengeTables(challenge, datasets) {
  return (challenge && challenge.tables || []).filter(t => !datasetForTable(challenge, t, datasets));
}

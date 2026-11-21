// The first-time opener's starter (2026-11-22). A person with no solves opens
// a challenge on an empty editor whose placeholder reads "Start here: SELECT *
// FROM <table> LIMIT 5;" — a placeholder, not text, since the 2026-09-19
// founder QA (as a comment it was submitted with the person's own query).
// Pressing Run on that empty editor did nothing. One builder for the hint and
// one parser for Run, so the two cannot drift.
export const STARTER_PREFIX = 'Start here: ';

export function starterHintFor(table) {
  const t = String(table || 'table_name');
  return `${STARTER_PREFIX}SELECT * FROM ${t} LIMIT 5;`;
}

/** The runnable SQL inside a starter hint, or null for anything else. */
export function starterSqlFromHint(hint) {
  if (typeof hint !== 'string' || !hint.startsWith(STARTER_PREFIX)) return null;
  const sql = hint.slice(STARTER_PREFIX.length).trim();
  return /^select\b/i.test(sql) ? sql : null;
}

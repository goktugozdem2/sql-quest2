// Skeleton templates for the "Show Structure" hint level.
//
// Purpose: students with the right concepts often still stumble on WHERE
// a clause goes (Murat wrote CASE WHEN as a separate clause, not inside
// SELECT). Skeletons show the SHAPE of a correct query without giving
// away the specific answer, letting students fill in the blanks.
//
// The design intentionally leaves variable names generic (column1,
// table_name, condition1) so the skeleton teaches structure, not a
// memorizable answer. Students must still match the pattern to the
// specific challenge tables and columns.

const SKELETONS = {
  case_when: {
    label: 'CASE WHEN structure',
    description: 'CASE WHEN is an expression that goes inside SELECT, not a separate clause.',
    template: `SELECT
  CASE
    WHEN condition1 THEN 'Label1'
    WHEN condition2 THEN 'Label2'
    ELSE 'DefaultLabel'
  END AS category_name,
  COUNT(*) AS count,
  ROUND(AVG(other_column), 1) AS avg_value
FROM table_name
GROUP BY category_name
ORDER BY avg_value DESC;`,
  },

  join: {
    label: 'JOIN structure',
    description: 'JOIN combines rows from two tables based on a matching column. Use aliases (t1, t2) for readability.',
    template: `SELECT
  t1.column1,
  t1.column2,
  t2.column3
FROM table1 t1
JOIN table2 t2 ON t1.foreign_key = t2.primary_key
WHERE condition
ORDER BY t1.column1;`,
  },

  left_join_null: {
    label: 'LEFT JOIN + NULL handling',
    description: 'LEFT JOIN keeps all rows from the left table. Use COALESCE or IS NULL to handle missing matches.',
    template: `SELECT
  t1.column1,
  COALESCE(t2.column2, 'No match') AS column2
FROM table1 t1
LEFT JOIN table2 t2 ON t1.id = t2.t1_id
WHERE t2.column IS NULL   -- optional: find unmatched rows only
ORDER BY t1.column1;`,
  },

  group_by_having: {
    label: 'GROUP BY + HAVING structure',
    description: 'WHERE filters rows before grouping. HAVING filters groups after aggregation.',
    template: `SELECT
  column1,
  COUNT(*) AS count,
  SUM(metric) AS total
FROM table_name
WHERE filter_condition          -- per-row filter (runs BEFORE grouping)
GROUP BY column1
HAVING COUNT(*) >= 3             -- group filter (runs AFTER grouping)
ORDER BY total DESC;`,
  },

  window_function: {
    label: 'Window function structure',
    description: 'Window functions compute a value across a set of rows without collapsing them. PARTITION BY groups the window.',
    template: `SELECT
  column1,
  column2,
  RANK() OVER (PARTITION BY column1 ORDER BY column2 DESC) AS rank_in_group,
  SUM(metric) OVER (PARTITION BY column1) AS total_per_group
FROM table_name
ORDER BY column1, rank_in_group;`,
  },

  cte: {
    label: 'CTE (WITH) structure',
    description: 'A CTE is a named intermediate result. Define once with WITH, reference in the main query.',
    template: `WITH intermediate AS (
  SELECT
    column1,
    SUM(metric) AS total
  FROM table_name
  GROUP BY column1
)
SELECT
  i.column1,
  i.total,
  i.total * 100.0 / (SELECT SUM(total) FROM intermediate) AS pct
FROM intermediate i
ORDER BY pct DESC;`,
  },

  self_join: {
    label: 'Self-join structure',
    description: 'A self-join compares rows from the same table against itself. Use two different aliases.',
    template: `SELECT
  a.column1,
  a.column2,
  b.column2 AS related_column2
FROM table_name a
JOIN table_name b ON a.relationship_id = b.id
WHERE a.id != b.id         -- avoid matching a row with itself
ORDER BY a.column1;`,
  },

  subquery: {
    label: 'Subquery structure',
    description: 'A subquery is a SELECT inside another query. Correlated subqueries reference the outer row.',
    template: `SELECT
  column1,
  column2
FROM table_name outer_t
WHERE column2 > (
  SELECT AVG(column2)
  FROM table_name inner_t
  WHERE inner_t.group_column = outer_t.group_column   -- correlated
)
ORDER BY column1;`,
  },
};

/**
 * Infer which skeleton(s) best match a challenge based on its declared
 * skills and category. Returns an array of skeleton keys ordered by
 * relevance — the most specific pattern first.
 *
 * @param {Object} challenge - a challenge from challenges.js
 * @returns {Array<string>} ordered skeleton keys (e.g. ["window_function", "cte"])
 */
export function detectSkeletons(challenge) {
  if (!challenge) return [];

  const skills = (challenge.skills || []).map(s => s.toLowerCase());
  const category = (challenge.category || '').toLowerCase();
  const combined = skills.join(' ') + ' ' + category;

  const matches = [];

  // Order of detection matters: the most specific / advanced pattern first,
  // since a challenge involving window functions + CTE should lead with window.

  if (combined.includes('window') || combined.includes('partition by') ||
      combined.includes('rank') || combined.includes('row_number') ||
      combined.includes('lag') || combined.includes('lead')) {
    matches.push('window_function');
  }

  if (combined.includes('cte') || combined.includes('with ') ||
      combined.includes('recursive')) {
    matches.push('cte');
  }

  if (combined.includes('self-join') || combined.includes('self join')) {
    matches.push('self_join');
  }

  if (combined.includes('subquery') || combined.includes('correlated')) {
    matches.push('subquery');
  }

  // LEFT JOIN + NULL handling is more specific than plain JOIN
  if ((combined.includes('left join') || combined.includes('anti-join')) &&
      combined.includes('null')) {
    matches.push('left_join_null');
  } else if (combined.includes('join') && !matches.includes('self_join')) {
    matches.push('join');
  }

  if (combined.includes('having')) {
    matches.push('group_by_having');
  } else if ((combined.includes('group by') || combined.includes('aggregation')) &&
             !matches.some(m => m === 'window_function' || m === 'cte')) {
    matches.push('group_by_having');
  }

  if (combined.includes('case') || combined.includes('conditional')) {
    matches.push('case_when');
  }

  return matches;
}

/**
 * Get a specific skeleton by key.
 * @param {string} key - skeleton key (e.g. "case_when")
 * @returns {Object|null} { label, description, template } or null
 */
export function getSkeleton(key) {
  return SKELETONS[key] || null;
}

/**
 * Return the primary (most relevant) skeleton for a challenge, or null
 * if no pattern matched.
 *
 * Per-challenge override: if the challenge defines its own `skeleton`
 * field (shape: { label, description, template }), that takes priority
 * over pattern-detected skeletons. Used for challenges where the
 * generic pattern template doesn't capture the specific sub-pattern
 * (e.g., window function + frame clause for LAST_VALUE needs a custom
 * skeleton emphasizing the frame, not a plain window template).
 *
 * @param {Object} challenge - a challenge from challenges.js
 * @returns {Object|null} { key, label, description, template }
 */
export function getPrimarySkeleton(challenge) {
  if (!challenge) return null;
  // Per-challenge override takes priority — when a challenge ships with
  // its own hand-written skeleton, trust the author over pattern detection.
  if (challenge.skeleton && challenge.skeleton.template) {
    return {
      key: `custom_${challenge.id}`,
      label: challenge.skeleton.label || 'Structure for this challenge',
      description: challenge.skeleton.description || 'Hand-crafted template for this specific challenge.',
      template: challenge.skeleton.template,
    };
  }
  const keys = detectSkeletons(challenge);
  if (keys.length === 0) return null;
  const key = keys[0];
  return { key, ...SKELETONS[key] };
}

/**
 * Return all matching skeletons for a challenge. Useful when a challenge
 * combines multiple patterns (e.g. window function + CTE) and we want to
 * show both structures.
 *
 * Per-challenge override: if the challenge has a bespoke `skeleton`, it
 * replaces the pattern-detected list entirely. A custom skeleton is
 * assumed to be complete — we don't stack generic patterns behind a
 * custom one (would confuse more than help).
 *
 * @param {Object} challenge
 * @returns {Array<Object>} [{ key, label, description, template }]
 */
export function getAllSkeletons(challenge) {
  if (!challenge) return [];
  if (challenge.skeleton && challenge.skeleton.template) {
    return [{
      key: `custom_${challenge.id}`,
      label: challenge.skeleton.label || 'Structure for this challenge',
      description: challenge.skeleton.description || 'Hand-crafted template for this specific challenge.',
      template: challenge.skeleton.template,
    }];
  }
  return detectSkeletons(challenge)
    .map(key => ({ key, ...SKELETONS[key] }))
    .filter(Boolean);
}

export default SKELETONS;

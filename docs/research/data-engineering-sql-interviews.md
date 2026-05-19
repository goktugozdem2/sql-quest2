# Data Engineering SQL Interview Notes

Source: [How to pass data engineering SQL interviews in big tech](https://blog.dataexpert.io/p/how-to-pass-data-engineering-sql), Zach Wilson, DataExpert.io Newsletter, published March 5, 2025.  
Captured: May 19, 2026.

These are product notes for SQL Quest's Interview section. They are paraphrased so we can reuse the ideas without copying the article.

## Main Takeaway

Big-tech data engineering SQL interviews are not only "can you write SQL?" They test whether the candidate can:

- translate interview wording into the right SQL pattern
- communicate assumptions before coding
- choose readable query structure
- explain table scans, joins, partitions, indexes, and optimization tradeoffs
- solve without relying on vendor-specific functions

The Interview section should teach this as a loop:

```text
Clarify -> Pick pattern -> Write readable SQL -> Explain tradeoffs -> Improve
```

## Interview Types To Model

### Screener

Typical duration: 45-60 minutes. The candidate usually needs to solve several practical SQL questions quickly.

Common patterns:

- `WHERE` plus `GROUP BY`
- `JOIN` plus aggregation
- window functions such as `ROW_NUMBER`, `RANK`, and `DENSE_RANK`
- CTE or subquery plus another technique
- self-join or an optimization-oriented follow-up

Product implication:

- Add an "SQL Screener" mode with 4-5 timed questions.
- Grade for correct result first, then show pattern labels and a short explanation.
- Include one question where `LAG` or `LEAD` can also be solved with a self-join.

### Onsite

Typical duration: 60 minutes. The candidate gets fewer questions, but the interviewer probes reasoning and optimization.

Common emphasis:

- data model comprehension
- fewer table scans
- window function tie behavior
- conditional aggregation
- anti-joins such as `LEFT JOIN ... IS NULL`
- rolling and cumulative metrics
- query plans, indexes, and partitioning

Product implication:

- Add an "Onsite Deep Dive" mode with one dataset, multiple follow-ups, and explain-your-tradeoff prompts.
- After a correct query, ask "Can this scan the table fewer times?" or "What index or partition would help?"
- Show a lightweight query-plan discussion even if the local engine cannot expose a real production plan.

## Keyword To SQL Pattern Map

Use these cues in interview coaching prompts:

| Interview wording | Likely SQL pattern |
| --- | --- |
| first, second, third, nth | window ranking with `ROW_NUMBER`, `RANK`, or `DENSE_RANK` |
| ties matter | explain difference between `RANK`, `DENSE_RANK`, and `ROW_NUMBER` |
| rolling, cumulative, running | window aggregate with an ordered frame |
| metric by dimension | `GROUP BY`, or `PARTITION BY` if paired with ranking/rolling |
| count several conditions | conditional aggregation in one scan |
| users/items with no related rows | anti-join with `LEFT JOIN` and `IS NULL` |
| previous or next event | `LAG`/`LEAD`, with self-join fallback when needed |
| make it readable | CTE with clear aliases |
| optimize this | table scans, indexes, partitions, and join order |

## Common Candidate Mistakes To Train Against

- Starts coding without clarifying edge cases.
- Uses engine-specific syntax when standard SQL would work.
- Overuses window functions without knowing a self-join alternative.
- Does not explain the approach while solving.
- Produces a correct query but cannot discuss performance.
- Writes nested SQL that works but is hard to follow.

Product implication:

- Add a "Clarify first" required step before showing the SQL editor in Interview mode.
- Award points for asking about ties, duplicates, nulls, date ranges, and expected grain.
- Penalize or warn on engine-specific constructs when the prompt asks for portable SQL.

## Candidate Answer Rubric

Interview mode should score more than final output:

- Correctness: query returns the expected rows and columns.
- Communication: assumptions and edge cases are stated.
- Readability: aliases, CTE names, and query structure are clear.
- Portability: avoids unnecessary vendor-specific features.
- Efficiency: avoids avoidable repeated scans and can explain tradeoffs.
- Follow-up readiness: can adjust for ties, nulls, missing related rows, or larger data.

## Suggested SQL Quest Interview Features

1. Screener simulation

   Four to five questions in sequence: filter/group, join/aggregate, ranking, CTE/subquery, self-join or optimization.

2. Pattern flashcards

   Show the wording cue and ask the user to choose the likely SQL pattern before writing SQL.

3. Tie behavior drills

   Compare `ROW_NUMBER`, `RANK`, and `DENSE_RANK` on duplicated values.

4. One-scan challenges

   Ask for multiple conditional counts and nudge the user toward conditional aggregation instead of several separate queries.

5. Anti-join challenges

   Practice "things with no X" prompts using `LEFT JOIN ... IS NULL`.

6. Explain mode

   After solving, prompt: "Explain why this query is correct and what would make it faster on a large table."

7. ANSI fallback drills

   Ask users to solve a `LAG`/`LEAD` style problem with a self-join.

8. Interviewer hints

   Simulate interviewer nudges so learners practice responding instead of silently brute-forcing.

## First Implementation Candidate

Start with one new Interview path:

```text
Data Engineering SQL Screener
1. GROUP BY with WHERE
2. JOIN plus aggregation
3. Ranking with ties
4. CTE plus filter
5. Self-join fallback or optimization follow-up
```

Each question should include:

- prompt
- schema
- sample rows
- clarifying-question checklist
- SQL editor
- expected result
- post-solve explanation
- optimization follow-up

This fits SQL Quest's current roadmap because it can reuse existing challenge execution, hints, and sector datasets while adding interview-specific framing.

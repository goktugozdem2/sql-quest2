# Amazon BIE technical round — a candidate's report (2026-10-21)

**Source:** a SQL Quest Pro member preparing for a Business Intelligence
Engineer role, by email to the founder on 2026-10-17 (round format, before
the interview) and 2026-10-21 (questions and follow-ups, the morning of the
interview, with photos of their own queries). **Name withheld at their
request.** On 2026-10-12, about an earlier report, they wrote that they were
happy for the questions and insights to be shared as long as their name and
personal details stay out; the 10-21 email shares the questions "since they
might be useful for other candidates". Nothing in this repository identifies
them, and nothing should.

This is one candidate's account of one round, unverified by Amazon. Pages
cite it as "reported to us", never as Amazon's format.

## What they reported

- **Format:** a 60-minute technical and behavioural round covering SQL, BI
  and analytical problem-solving (10-17 email). On the day: three SQL
  problems, each followed by conceptual questions and changes to the
  original query (10-21 email).
- **Problem 1:** employees whose salary exceeds their department's average;
  two tables (employee, department); return employee name, department name,
  salary and the department average.
- **Problem 2:** reviewers who rated the same movie exactly twice, where the
  second rating by date was higher than the first; return reviewer and
  movie name. Follow-ups: what a self-join is and why use it; what join type
  a bare JOIN performs; how CTE columns are referenced in later joins;
  COUNT(*) vs COUNT(column); ROW_NUMBER vs RANK vs DENSE_RANK.
- **Problem 3:** users who logged in on three or more consecutive days;
  return user name, streak start date and streak length. Follow-ups: why
  DISTINCT in the first step; same-day multiple logins; explaining the
  date-minus-row-number technique with an example; whether the logic holds
  without deduplication; DENSE_RANK instead of ROW_NUMBER; how duplicates
  change the streak length; changing the query to "at least three distinct
  days within any rolling seven-day window"; why GROUP BY on user and the
  grouping key.
- **Editor:** their photos show an Amazon-branded web editor with a "Legacy
  mode" toggle. Whether queries could be executed is not stated — the page
  does not claim either way.

## What we did with it (2026-10-21)

- The Amazon page's sourced format table gets one row, cited to this report
  as "reported to us" (`SOURCED_FORMATS.amazon`, source flagged `direct`).
- Problem 1's shape already had two cards (131 "Above-Department-Average
  Earners", 171 "Salary vs Department Average (PARTITION BY)"); both are
  tagged Amazon.
- Problems 2 and 3 and the rolling-window follow-up became three new cards
  on our own synthetic tables (`ecommerce.reviews`, `ecommerce.logins`):
  317 "Reviewed Twice, Scored Higher the Second Time", 318 "Three-Day Login
  Streaks", 319 "Three Login Days in Any 7-Day Window". Our wording, our
  data; no card names the company. tests/challenges-317-319.test.js.

## What this does not support

- No claim about how often Amazon asks these, or that every BIE loop has
  three SQL problems. One report.
- No claim about the outcome of this candidate's interview.

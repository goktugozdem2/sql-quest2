# Backlink outreach — drafts for the founder (SEO plan P2.13, 2026-09-13)

**Nothing here has been sent, submitted or posted.** Every item below is an
outward-facing action and stays the founder's to take. The prospect research
(100 URLs from the "best SQL practice sites" family of queries, fit-scored) is
in [`backlink-prospects-2026-09-13.md`](backlink-prospects-2026-09-13.md); the
strategy and the rules it runs under are in
[`docs/plans/backlinks-2026-09-11.md`](../plans/backlinks-2026-09-11.md) —
T2 "the lists that link out by policy". Two of those rules apply to every
draft here:

- **Disclose authorship every time.** "I build SQL Quest" is in every draft.
- **Email voice** (CLAUDE.md): the subject says the founder is writing; the
  body says it is written by hand to a short list; one question; no follow-up
  sequence; no two bodies identical.

## What changed since the 09-11 plan — the asset to point at

A list of "free SQL resources" will rarely add a product. It adds a free tool
that does one job. Since today we have five, none of which needs a signup:

| Tool | URL | Fits a list that is about… |
|---|---|---|
| SQL Query Checker | https://sqlquest.app/sql-query-checker/ | practice, debugging, "why is my query wrong" |
| SQL Query Explainer | https://sqlquest.app/sql-query-explainer/ | learning SQL, beginners |
| SQL Query Optimizer | https://sqlquest.app/sql-query-optimizer/ | performance, data engineering |
| SQL Interview Readiness Test | https://sqlquest.app/sql-interview-readiness-test/ | interview prep |
| All 299 questions, one page each | https://sqlquest.app/questions/ | practice problem lists |

Lead with the tool that matches the list. Mention the practice site second.

## Order of work

1. **GitHub lists (PRs)** — no inbox to land in, a maintainer merges or not.
   Items 1–5 below.
2. **AlternativeTo** — self-serve "Add alternative" (needs the founder's
   account). Items 6–8.
3. **Listicle authors updated in 2026** — contact form or LinkedIn message.
   Items 9–15, a few a week, never all on one day.

Track each in the table at the end. Read the result on **2026-11-24** against
the T2 claim in the 09-11 plan (target ≥ 5 merged or accepted).

---

## 1. GitHub PRs

Each PR adds one line in the list's existing format. Read the repo's
CONTRIBUTING file first and match its alphabetical order or section.

### 1. amartinson193/The-Ultimate-List-of-Free-SQL-Resources (prospect #1)

Entry (practice section):

```markdown
- [SQL Quest](https://sqlquest.app/questions/) - 299 SQL interview practice questions (226 free, no signup) that run in the browser and explain which rows a wrong answer got wrong. Also free: a [query checker](https://sqlquest.app/sql-query-checker/) and [query explainer](https://sqlquest.app/sql-query-explainer/).
```

PR title: `Add SQL Quest (free SQL interview practice + query checker)`

PR body:

```text
Adds one entry to the practice section.

Disclosure: I build SQL Quest, so weigh this accordingly. I think it fits the
list's "free" bar: 226 of the 299 questions play free with no account, and the
query checker/explainer pages are free and run entirely in the browser.

Happy to move it to another section or shorten the description.
```

### 2. PavelGrigoryevDS/awesome-data-analysis (prospect #2)

Entry (SQL section, after the existing practice entries):

```markdown
- [SQL Query Checker](https://sqlquest.app/sql-query-checker/) - Free, in-browser check for the SQL mistakes that return wrong rows (NOT IN with NULLs, window functions in WHERE, LEFT JOIN filters).
```

PR title: `Add a free SQL query checker to the SQL section`

PR body:

```text
The SQL section has tutorials and one window-functions drill; this adds a
free tool for the step after writing a query — checking it for the mistakes
that silently return wrong rows. No signup, nothing is sent to a server.

Disclosure: I built it (it is part of SQL Quest). Per CONTRIBUTING I kept it
to one line; glad to adjust wording or placement.
```

### 3. awesomelistsio/awesome-sql (prospect #15)

Entry (learning resources):

```markdown
- [SQL Quest](https://sqlquest.app/) - SQL interview practice in the browser, graded against real tables, with a free query explainer and optimizer.
```

PR body: same disclosure shape as #1, one sentence on why it is SQL-first
practice next to LeetCode Database.

### 4. rbhatia46/Data-Science-Interview-Resources (prospect #16)

Entry (SQL section):

```markdown
- [SQL Interview Readiness Test](https://sqlquest.app/sql-interview-readiness-test/) - 10 questions, no signup; scores joins, window functions and aggregation separately and names the weakest skill.
```

PR body: note that the section is articles only and this adds something to
practise on; disclose authorship; point to Contribution.md format followed.

### 5. Extremesarova/ds_resources (prospect #17)

Entry (SQL practice list):

```markdown
- [SQL Quest](https://sqlquest.app/questions/) — company-specific SQL interview sets (30 companies) and 299 questions with a diagnostic for wrong answers
```

No CONTRIBUTING file: open an issue first asking whether practice sites are
welcome, then the PR if yes. Disclose in the issue.

---

## 2. AlternativeTo (founder's account)

SQL Quest is already listed on the DataLemur and SQL Noir pages (prospects
#65, #66). Add it as an alternative on:

- **#3 SQLBolt** — tag: "free", "browser-based". One-line reason: "Free SQL
  practice after the tutorials: 226 questions without signup, and wrong
  answers show which rows differ."
- **#8 LeetCode** — tag: "SQL". Reason: "SQL-only interview practice, the
  thing people use LeetCode's Database set for."
- **#9 HackerRank** — tag: "SQL", "interview prep". Reason: "Timed SQL mock
  screens and company sets, SQL only."

AlternativeTo asks for the product description; use the positioning line:
"Personalized SQL interview practice — an AI coach that finds your SQL skill
gaps."

---

## 3. Listicle authors (2026-dated pages)

Contact route is the one the page shows (see the prospect table). Where the
only route is LinkedIn, send a connection note, not an InMail pitch — the
drafts below are short enough to fit. Pronouns are unknown for every author:
the drafts use names only.

### 9. codewithfimi.com — Best Free SQL Practice Websites (#4)

**Subject:** I build SQL Quest — a free practice site for your list's "why is my query wrong" gap

```text
Hi Fimijoba,

I'm the person who builds SQL Quest, and I'm writing this myself to a short
list of people whose SQL roundups I actually read.

Your free practice list is all sandboxes and tutorials, which is honest —
most sites that grade answers want an account. SQL Quest doesn't: 226 of
299 questions run free in the browser without signup, and a wrong answer
shows which rows differ rather than just "incorrect". There is also a free
query checker at https://sqlquest.app/sql-query-checker/.

One question: would a practice site that explains wrong answers fit your
next update, or do you keep the list to sandboxes on purpose?

No follow-up from me either way.

Göktuğ
Founder, SQL Quest
```

### 10. Analytics Vidhya — Top 10 Platforms to Practice SQL in 2026 (#5)

**Subject:** From SQL Quest's founder — for the 2027 refresh of your practice-platforms list

```text
Hi Nitika,

I build SQL Quest and I'm contacting a handful of authors whose lists get
refreshed every year — this is not a mailing.

Your list already covers DataLemur, StrataScratch and SQLPad for interviews.
The thing SQL Quest does differently is diagnosis: it grades against real
tables, scores your skills separately, and builds the next question around
the weakest one. The free readiness test shows it in ten questions:
https://sqlquest.app/sql-interview-readiness-test/

Would you look at it when you next re-date the article? A no is a fine answer.

Göktuğ
Founder, SQL Quest
```

### 11. Rivery — How to practice SQL: 10 Best Platforms (2026) (#6)

**Subject:** SQL Quest's founder here — an AI tutor that is checked by a real grader

```text
Hi Brandon,

I'm writing to you myself; there are only a few people on this list.

Your article lists Claude and ChatGPT as practice tools, which I think is
right — and it is also where people get burned, because a chatbot will
happily approve a query that returns the wrong rows. SQL Quest pairs an AI
tutor with a grader that runs the query against real tables, so the
feedback is about the actual result.

Would that belong next to the AI entries in your next revision?

Göktuğ
Founder, SQL Quest
```

### 12. Estuary — 11 Best Free Resources to Learn SQL (2026 Guide) (#7)

**Subject:** From the person who builds SQL Quest — a free step between tutorials and HackerRank

```text
Hi Dani,

I build SQL Quest and I'm writing this one by hand after reading your
August guide.

The list goes from "learn the basics" straight to HackerRank. The step in
between — practising on realistic tables and learning why a query is wrong
— is what SQL Quest's free tier is for: no signup, and a free explainer that
walks any query in execution order: https://sqlquest.app/sql-query-explainer/

Is a bridge like that something you'd consider adding, or is the list
deliberately courses-only?

Göktuğ
Founder, SQL Quest
```

### 13. Analytics Insight — Where to Practice SQL in 2026 (#11)

The site also sells placements. **Ask for an editorial update only; do not
reply to any rate card.** If the answer is a price, stop.

**Subject:** I build SQL Quest — an editorial suggestion, not an ad request

```text
Hello,

I'm the founder of SQL Quest, writing personally.

Your 2026 list has one interview-specific platform. SQL Quest is another,
with company-specific practice sets and a free readiness test — and a free
tier larger than most. If an editor updates the article, it may be worth a
look: https://sqlquest.app/questions/

To be clear, I'm not asking about sponsored placement. Is there an editorial
contact for corrections and additions?

Göktuğ
Founder, SQL Quest
```

### 14. Javarevisited — Top 5 Websites to Learn SQL Online for FREE (#14)

Route: comment on the post (comments are open), disclosed. Not an email.

```text
Disclosure first: I build SQL Quest. For readers who finish the tutorials
here and want free practice that says why a query is wrong, it has 226 free
questions with no signup, plus a free query checker
(https://sqlquest.app/sql-query-checker/). Thanks for keeping this list
updated all these years.
```

### 15. Data Analysis Journal — recurring SQL tools roundup (#18)

**Subject:** A question from the person who builds SQL Quest

```text
Hi Olga,

I build SQL Quest and I'm writing myself — your SQL tutorial roundups are
the kind I'd want SQL Quest to deserve a line in, so I'd rather ask than
guess.

The new piece is three free in-browser tools: a query checker for the
mistakes that return wrong rows (NOT IN with NULLs, LEFT JOIN filters that
turn into inner joins), an explainer that walks a query in execution order,
and an optimizer. https://sqlquest.app/sql-tools/

Is that the kind of thing your roundups cover?

Göktuğ
Founder, SQL Quest
```

---

## Tracker

| # | Target | Route | Sent (date) | Outcome | Link live (URL) |
|---|---|---|---|---|---|
| 1 | The-Ultimate-List-of-Free-SQL-Resources | PR | | | |
| 2 | awesome-data-analysis | PR | | | |
| 3 | awesome-sql | PR | | | |
| 4 | Data-Science-Interview-Resources | PR | | | |
| 5 | ds_resources | issue → PR | | | |
| 6 | AlternativeTo SQLBolt | self-serve | | | |
| 7 | AlternativeTo LeetCode | self-serve | | | |
| 8 | AlternativeTo HackerRank | self-serve | | | |
| 9 | codewithfimi | contact form | | | |
| 10 | Analytics Vidhya | LinkedIn | | | |
| 11 | Rivery | contact / LinkedIn | | | |
| 12 | Estuary | LinkedIn | | | |
| 13 | Analytics Insight | contact form | | | |
| 14 | Javarevisited | comment | | | |
| 15 | Data Analysis Journal | Substack reply | | | |

Metric: `external_links` (docs/agent/metrics.md), the T2 claim in the 09-11 plan;
read in Search Console → Links and Bing Webmaster Tools → Backlinks.

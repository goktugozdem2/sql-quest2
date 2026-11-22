# The builder playbook: what SQL Quest taught us, for the next app

This playbook is written so it can be copied into the next product, one more
app like SQL Quest. It holds only general lessons: no customer data, no
secrets, nothing that only matters to this repo. Every rule below was learned
the hard way, and where it helps the SQL Quest incident is named.

> Started 2026-11-22. Add a lesson the day it is learned, with one sentence
> on what it cost.

## 0. Decide how you will know you were wrong, before you build

- **Every product change gets a claim before it ships.** The claim names a
  metric, a baseline, a target, a falsification written in advance, and a
  read date within 28 days. Keep them in a ledger. A change without a
  falsification can't fail, so it can't teach you anything.
- **Read on the date.** A claim nobody reads is the same as no claim. Run a
  weekly job that lists overdue claims. SQL Quest's O2 went 12 days without a
  baseline, and 19 claims sat past their read dates.
- **Count people, not events, and exclude bots first.** Find the bot
  fingerprints before the first read:
  - one fixed viewport (800×600, 1280×1200, 1919×992);
  - spoofed referrers (a radiology society's domain "sent" 1,005 visitors
    with 0 solves);
  - self-declared automation.
- **The payment processor's webhook is the only truth about money.** Client
  events lie: retries, refreshes, test cards.
- **Two changes in the same week on the same step make both unreadable.**
  Stagger them, or say so in the claim.
- **AI assistants strip referrers.** A real share of "direct" traffic is
  ChatGPT or Gemini recommending you. Don't read direct traffic as brand.

## 1. Infrastructure traps (each one cost a day or more)

### Hosting (Vercel Hobby)
- The cap is **100 deployments a day, counted when a deployment is
  created**. A build cancelled by an "ignored build step" still counts.
- A **rate-limited production deploy is never retried**. The site stays on
  the old build until the next push to main.
- With agents pushing branches, turn previews off by branch prefix
  (`git.deploymentEnabled`) on day one, and batch docs-only merges.
- Custom analytics events need a paid plan. Write first-party events to your
  own database instead.

### Supabase / Postgres
- **Every client save is an anon upsert, and upserts fire BEFORE INSERT
  triggers as the caller.** Revoking something from `anon` that a trigger
  calls silently blocks every write. SQL Quest lost four days of signups this
  way while guest rows kept flowing.
- A fetch helper that returns `null` for both "empty success" and "failure"
  lets writes lie. Make writes throw.
- Make sensitive account fields server-owned: plan, payment ids, opt-outs.
  The client can never set them.
- **pg_cron reports "succeeded" on any HTTP status**, and pg_net's default
  timeout is 5 s. Set `timeout_milliseconds` and read the real status.
- Never sort or filter a view that computes JSON per row. A leaderboard poll
  did that and cost about 39 hours of database time in nine days.
- Keep **CORS headers in one list** that every browser call is tested
  against. A header the function didn't allow dropped every live call for
  months, and server-side checks never see CORS.

### Stripe
- **Payment Links force the local currency** (Adaptive Pricing). Use
  Checkout Sessions to control it.
- A failed **first** charge after a trial is a decline at checkout, not
  dunning. Word the email for that case, and give a self-serve invoice link
  rather than "reply to me".
- Product names, descriptors and the webhook's event list live in the
  dashboard, not in git. Re-read them after every price change.
- Never put a discount percentage in a product name; it goes stale.

### Email
- **Gate every sender** to the service role or a secret. All nine senders
  once answered the public anon key.
- Every send logs a row carrying the provider's message id, or engagement
  can't be attributed.
- **A cooldown is not a limit.** Add a lifetime cap and a dormancy cutoff.
- Open tracking can be silently off. Judge mail by returns within 48 h, not
  opens.

### Git, hooks and builds
- `git add` explicit paths only. **Never `git add -A` while agents work in
  parallel.** One sweep blanked the app for 9 minutes.
- Generated build output (big JS bundles) can exceed secret-scanner limits.
  Exclude bundles from the scan; never teach agents to skip the scanner.
- Make the build deterministic: rebuilding unchanged source leaves the tree
  clean. Date-stamped output stays out of git.

## 2. Product lessons that transfer

- **The first screen should be the product, not a quiz.** A real first
  challenge beat a placement quiz on first-solve-in-10-minutes, 37.2% vs
  15.5%.
- **Make the first click do something.** "Run" on an empty editor did
  nothing. It now runs a starter query, so the first click always produces
  output.
- **Never pick "next" from raw content order.** Order by a curriculum
  comparator. The first Medium by id was the hardest item in the bank and
  became everyone's "what's next".
- **Deep links must enter through the same gates as normal navigation.** A
  deep link that opened content before the user's record loaded bypassed the
  free quota.
- **Paywalls the person opens convert better than paywalls that open on
  them.** Plan clicks were 27–32% in self-opened modals vs 3–13% in automatic
  ones. Give free users a button they can press.
- **Ask one question at the moment it is answerable.** Put the "which
  company are you preparing for?" ask after the first solve, never as a gate
  before value.
- **Free tier wording comes from the same code that enforces it.** Counts on
  pages come from helpers and are guarded by tests, so copy never contradicts
  the gate.
- **Mobile:** measure overflow against the viewport width you set.
  `innerWidth` stretches to the overflow and hides it.

## 3. Growth lessons

- **Search:** a sitemap entry is discovery, not a crawl signal. Ship every
  new page with internal links in the same commit.
- **Programmatic pages can be thin.** Watch the index count against the
  sitemap. A robots `Disallow` on parameterised app URLs let 819 bare,
  unfetchable URLs into Bing's index, and Bing clicks fell from 280 to 25 a
  week.
- **Facts on pages need dated sources.** Never claim "most asked" or "80%
  of interviews". Write a company's interview format only from a dated,
  opened source, never from a search snippet.
- **GEO (AI assistants).** Keep a fixed panel of buyer questions and measure
  share of voice weekly. Ship `llms.txt`, one consistent entity in JSON-LD,
  answer-first page summaries, and AI crawlers allowed. Third-party "best X
  sites" lists are what assistants cite, so getting onto those lists is the
  off-site work.
- **Outreach:**
  - the founder in the subject line, one specific fact about them, one
    question;
  - say it's written by hand to a short list;
  - no sequences, no identical bodies.
- **Drafts are worthless until sent.** In the first two months, 40 B2B
  targets were drafted and none were sent. Track sends, not drafts.
- **Your warmest leads may already be in the logs.** A school's Moodle had
  been sending students unasked. Check referrers from `.edu` and LMS hosts.

## 4. Running the work with an agent fleet

- **One lane per agent, a written brief, one number it's judged by.**
  Write a FLEET-RESULT line per run and keep a weekly scorecard.
- **Reviewer and gate are separate agents.** One checks that the change is
  right; the other decides whether it ships now. Money, outward actions,
  production writes and guard removals are always held for the human.
- **Two runtimes.** Cloud sessions (repo only) review and merge. The laptop
  runs the lanes that need production data, email drafts and the live site.
  Write down which runtime owns which lane.
- **Shared memory belongs in the repo**, not in one machine's local files.
  Two agents got the same ID, and an agent re-asked a decision already made,
  because the decisions lived only on the laptop.
- **A refusal (403/429) is final.** Never route around it with another
  fetcher or scraper.
- **Agent tests are proven by a deliberate break.** Change the guarded thing,
  watch the test fail by name, restore. Record the break in the commit.
- **Agents draft, the human sends.** Every outward message, price, deploy and
  migration stays with the founder.
- **Budget the shared limits:** deploys a day, concurrent code agents, merges
  a day.

## 5. Day-one checklist for the next app

1. A ledger file, a metrics file, an objectives file with a measured day-0
   baseline.
2. First-party events with an anonymous id stitched to the account; the bot
   filter written before the first read.
3. Payment webhook → events table as the money truth. Checkout Sessions,
   not Payment Links.
4. Senders gated, logged with the provider id, lifetime-capped.
5. Server-owned plan fields; client writes through one RPC.
6. Hosting: previews off for agent branches; an ignored-build step for
   docs-only commits.
7. A secret scanner that excludes build output.
8. Robots and sitemap reviewed against the index count weekly. No `Disallow`
   on URLs you also link to.
9. `llms.txt`, JSON-LD entity, a GEO prompt panel.
10. The fleet README (lanes, runtimes, merge rule, budgets) copied from
    `docs/agent/fleet/README.md`, with this playbook linked from its first
    line.

## 6. Choosing the next app

Added 2026-11-22, at the founder's request ("burda uyguladığımız yöntemleri
yine benzer ne gibi uygulamalarda kullanabiliriz").

### The shape that transfers

SQL Quest works because of one shape, not because of SQL. Look for all four:

1. **A dated, high-stakes test.** The person has an interview or exam on a
   known day. Every SQL Quest purchase came before a date, never from
   general interest.
2. **Answers that are checked automatically.** The answer runs in the browser
   and is graded against an expected output, table or figure. Free-text
   answers graded by AI are possible, but trust in the grade is lower.
3. **A skill map with a known syllabus.** A fixed set of skills that a
   diagnostic can place someone on, which is what the Coach and the
   Skillmap stand on.
4. **Searches that name the test.** People search by company or exam name,
   so company pages, mocks and SEO with dated sources work again.

Weak without these: general skill practice with no date (bash, git, regex).
People use it, but nobody pays for it in a hurry.

### Candidates (scored 2026-11-22)

| App | Fit | Difficulty |
|---|---|---|
| **Python/pandas interview prep** | Same buyers. Code runs in the browser (Pyodide instead of sql.js). Grading compares output tables, as now. Company pages, the Skillmap and the Coach carry over. | Low. **First choice.** |
| Excel / financial-modelling tests (banking, PE, FP&A) | Dated tests, high willingness to pay. A browser formula engine (HyperFormula) exists, and answers are graded on figures (`ticket-grade`). | Medium |
| Power BI (DAX) / Tableau certifications | Fixed syllabus, a dated exam, search by certificate name. | Medium. DAX is hard to run in the browser, so mostly scenario questions. |
| Product-analytics / A/B-test case interviews | Same buyers; could be a module of the existing app. | AI grading of free text, so trust is lower. |
| Data-engineering "first 90 days" tasks (dbt, ETL) | An extension of the post-hire tickets. | Medium; lower willingness to pay than an interview. |
| Turkish dated exams (e.g. ALES quantitative) | Dated and gradable; home market. | Different pricing and ability to pay; verify first. |

### What carries over unchanged

Sections 0–5 of this file. In short:

- **Measurement:** the ledger, first-party events and the bot filter.
- **Money and accounts:** the webhook as the money truth, Checkout Sessions,
  server-owned plan fields.
- **Email:** gated, logged senders.
- **Hosting:** agent-branch deploys off.
- **Search:** the SEO loop and the GEO panel.
- **Free tier and paywall:** the quota after value, and the self-opened
  paywall.
- **The agent fleet**, with its README.

### What every new app must build from scratch

- **The content:** the question bank, the company research and the mocks.
- **The buyer signal.** For SQL Quest it was Capital One, and it came from
  talking to payers, not from analytics.

### How to test demand before building

Do not start a second product to find out. Put a small version inside the
product that already has the buyers, and write the kill number first:

- For pandas: 10 questions inside SQL Quest, plus a waitlist.
- Proposed rule: fewer than 50 waitlist sign-ups in 30 days means we don't
  build it.
- The founder sets the final number before the test starts, and it goes into
  the ledger like any other claim.

**Measured on 2026-11-22** (`docs/reads/demand-2026-11-22.md`): the market
ranks Python next after SQL and Excel, but **our own audience has not asked
for it**. No feedback and no tutor question named another tool. The
adjacent demand inside our data is still SQL, in other dialects (Snowflake,
BigQuery, dbt). So the order for SQL Quest is:

1. a higher price tier on the same product (a founder-led mock);
2. SQL dialects;
3. the pandas demand test.

A new app comes after that.

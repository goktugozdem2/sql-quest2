# New content QA — every page and question added since 2026-11-09, live (2026-11-23)

Founder's ask: "yeni eklenen sayfaları, soruları tek tek kontrol et". Each item
was checked on **https://sqlquest.app** on 2026-11-23 against origin/main
`c4405ce5`. No code was changed in this run. The defects are listed at the end
with file, line and the fix.

## Scope

The baseline is `888e9bd7` (2026-10-16), the last commit on main before
2026-11-09. Nothing landed between 10-16 and 11-20. 174 commits since then.

| Item | Came from |
|---|---|
| `/paypal-sql-interview/`, `/coinbase-sql-interview/`, `/monzo-sql-interview/` | #76 (`b5720c9c`) |
| `/chime-sql-interview/` | #134 (`6b3f6632`) |
| `/sql-rollup-interview-questions/` | #127 (`3acf9303`) |
| `/blog/revolut-data-analyst-sql-screen/` | #161 (`67b5a263`) |
| `/for-teams/` (built 09-26 as noindex and unlinked; indexed and added to the sitemap on 11-23) | #188 (`4980088e`) |
| Challenges 317, 318, 319 + their `/questions/` pages | #59 (`b47c69b3`) |
| Challenges 320–324 + their `/questions/` pages | #132 (`211761e8`); #167 changed 323's example |
| `src/data/sector-challenges.js` | no new ids |
| Mock-interview questions | **none added**. `mock-interviews.js` changed only to remove `explainApproach` (#106) |

That makes 7 pages, 8 question pages and 8 challenges.

**Not live yet** (open PRs, out of scope): the Debug set and its hub
(#249/#252/#256/#258), the topic pilot (#260), challenges 325–329 (#172) and
330 (#236), the Capital One guide edit (#220), the sector articles, and the 343+
challenges.

## Method

- **Pages.** I fetched each page with `redirect: manual` and parsed the title,
  meta description, canonical, robots metas, X-Robots-Tag, every JSON-LD block,
  track.js and every internal `href`. Each internal link was fetched once with
  `redirect: manual`, and anything other than 200 counts as a fail. Every
  `/app/?challenge=` id was checked against the bank. I scanned the text for
  counts, frequency phrasing and every sentence with "free".
- **Browser.** Headless Chrome via `scripts/smoke/lib.mjs`, with
  `HERMETIC_PREAMBLE` and `Network.setBlockedURLs` on `*supabase.co*`,
  `*ai-tutor*` and Vercel insights. Each page loaded at 1280 and at 375 (mobile
  emulation). I measured `scrollWidth`, which elements overflow and whether a
  scroll container holds each one, the size of the main CTA, text under 12 px,
  console errors and exceptions, and whether each JSON-LD FAQ question and
  answer appears in the page text.
- **Challenges.** Each reference solution ran on better-sqlite3 with the app's
  `loadDataset` type rules and `challengeTablePlan`, then was graded with
  `resultsMatch` from `src/utils/grade.js`. Every example claim was recomputed
  from the data. Tags were resolved with `SKILL_TO_RADAR`/`mapTopicToSkill` and
  `challengeMatchesSkill`.
- **App.** Every `/app/?challenge=<id>&src=question-<slug>` link opened in a
  fresh profile as a guest at 375. Three Easy cards (320, 322, 324) were solved
  by typing the reference answer with CDP `Input.insertText` into CodeMirror
  and pressing Submit. All four company heroes were also followed as fresh
  guests. **Zero requests reached `*.supabase.co` or `ai-tutor`** in any app
  run, because the fetch stub answered all of them.

## Pages

Columns: **status** is the first hop (no redirect seen); **T/D** is the decoded
title and meta-description length; **links** is internal links checked, all
200; **375/1280** is sideways scroll at each width.

| Page | Status | T / D | Canonical · robots | JSON-LD · FAQ = visible | Links | Counts · free tier · frequency · sourcing | 375 / 1280 | Console | track.js | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| /for-teams/ | 200 | 45 / 157 | self · index | **no JSON-LD block** (FAQ in `<details>`, no schema) | 6/6 | "300+" ✓; "Pro lifts the free tier's daily cap" ✓ | no scroll; CTA "Ask for seats" 143×48 in `#F5C518`, the light-theme accent in DESIGN.md ✓ | 0 | ✓ | PASS (note D7) |
| /blog/revolut-data-analyst-sql-screen/ | 200 | **78** / 159 | self · index | BlogPosting + FAQPage parse; 4 FAQ answers equal the `<details>` text in the HTML. innerText hid them only because `<details>` is closed | 22/22 | free tier "10 free challenge solves", "first 3 are free to try" ✓; source dated ("read in a browser on 12 September 2026", interviewquery guide) ✓ | no scroll (code blocks scroll inside their container); CTA 245×91 | 0 | ✓ | FAIL title > 70 (D5) |
| /paypal-sql-interview/ | 200 | **82** / 160 | self · index | 3 blocks parse; FAQ 4/4 visible | 39/39 | 16 = 5E/6M/5H matches `challengeCompanies` ✓; "300+" ✓; "your first 10 solves free" ✓; 9 dated citations ✓. FAQ "Reported most often:" refers to the cited reports (allowed) | no scroll (table scrolls in its wrapper); hero 327×86 | 0 | ✓ | FAIL title (D5); 17 text nodes at 11 px (D6) |
| /coinbase-sql-interview/ | 200 | **77** / 159 | self · index | 3 parse; FAQ 4/4 | 39/39 | 16 = 5E/5M/6H ✓; 8 dated citations ✓ | no scroll; hero 327×86 | 0 | ✓ | FAIL title (D5); 11 px (D6) |
| /monzo-sql-interview/ | 200 | **75** / 150 | self · index | 3 parse; FAQ 4/4 | 39/39 | 16 = 5E/6M/5H ✓; 7 dated citations; **"Monzo does not publish the format" ×4 (page + FAQ JSON-LD)** while R1 found Monzo publishes its process (#237) | no scroll; hero 327×86 | 0 | ✓ | **FAIL (D1)**, title (D5), 11 px (D6) |
| /chime-sql-interview/ | 200 | **78** / 164 | self · index | 3 parse; FAQ 4/4 | 39/39 | 16 = 5E/7M/4H ✓; 7 dated citations ✓ | no scroll; hero 327×66 | 0 | ✓ | FAIL title (D5); 11 px (D6) |
| /sql-rollup-interview-questions/ | 200 | 65 / 161 | self · index | Article + FAQPage parse; FAQ 6/6 | 18/18 | links `?challenge=169` (exists); no bank solution printed on the page (all 421 checked) | no scroll; CTA 288×51 | 0 | ✓ | PASS (title 65: over the brief's 60, under the repo's 70) |

All four company heroes were followed as fresh guests at 375. The
`companyDirectOpen` 50/50 test splits the arrivals. In the `direct` arm
(Coinbase, Chime) question 1 opens in the editor. In the `list` arm (PayPal ×3,
Monzo) the company view shows question 1's title to press. Neither arm
produced a console error. Working as designed.

## Question pages

Every question page answered 200 with a self canonical and
`robots: index, follow` + `bingbot: noindex, follow` (intended, #72). Every
page had LearningResource and BreadcrumbList JSON-LD that parsed, track.js
present, zero console errors, no sideways scroll at 375 or 1280, and a CTA of
281×50. The raw HTML (JSON-LD included) carries **no reference solution**. All
internal links answered 200.

| Page | Id | T | Links | Hint on page | App deep link, fresh guest at 375 | Verdict |
|---|---|---|---|---|---|---|
| reviewed-twice-scored-higher-the-second-time | 317 | 60 | 24 | free hint shown (allowed; see D8) | opens 317 in the editor | PASS |
| three-day-login-streaks | 318 | 63 | 27 | "This is a Pro challenge" ✓, no hint | **opens #86 "Multi-CTE Revenue Pipeline"** with the swap note below the problem | PASS page / app D2 |
| three-login-days-in-any-7-day-window | 319 | 66 | 26 | Pro message ✓ | **opens #86** (same as 318) | PASS page / app D2 |
| every-employee-next-to-their-departments-top-salary | 320 | 67 | 21 | free hint ✓ | opens 320; **typed and solved** → "Solved", `solvedChallenges [320]` | PASS |
| number-each-customers-orders | 321 | 69 | 21 | free hint ✓ | opens 321 | PASS |
| hires-per-year | 322 | 54 | 21 | free hint ✓ | opens 322; **typed and solved** → `[322]` | PASS |
| weekend-logins | 323 | 54 | 20 | free hint ✓ | opens 323 | PASS |
| ages-on-record-by-class | 324 | 63 | 21 | free hint ✓ | opens 324; **typed and solved** → `[324]` | PASS |

Titles of 63–69 characters exceed the brief's 60 but sit under the generator's
own `QUESTION_TITLE_MAX = 70`. They are not counted as defects here.

## Challenges

The reference solution graded correct with `resultsMatch` on all eight.
`description_tr`, `hint_tr` and `example_tr` exist on all eight and say the
same thing as the English. No hint contains a SQL statement. Two tags resolve
to no canonical skill: `Gaps and Islands` (318's category) and `strftime`
(322, 323). Older cards already use both, and every card's other tags map, so
the Skillmap credit is correct.

| Id | Diff | Dataset (tables) | Solution result | Example vs data | Canonical skills | Difficulty next to neighbours | Verdict |
|---|---|---|---|---|---|---|---|
| 317 | Medium | ecommerce (reviews 18, customers 16) | 3 rows: Daniel Martinez/Office Chair, James Johnson + John Smith/Laptop Pro | "18 reviews by 8 customers" ✓; "one Office Chair, two Laptop Pro" ✓ | Joins, Subqueries & CTEs, Window Functions | two windows + a CTE + a self-join + two traps is Hard-shaped next to Window Functions 5E/10M/17H (D8) | PASS (note) |
| 318 | Hard | ecommerce (logins 37) | 5 streaks: 5,5,4,3,3 | output ✓; **"in March 2024" is wrong**: login 37 is 2024-04-01 21:37, and Olivia's 5-day streak 03-28 runs into April | Aggregation, Joins, Subqueries & CTEs, Window, Date | Hard fits (gaps-and-islands; the other card in that category is also Hard) | FAIL example (D4) |
| 319 | Hard | ecommerce (logins 37) | 7 customers, first 2024-03-03 | output ✓; **"in March 2024" wrong** (same) | same as 318 | Hard fits | FAIL example (D4) |
| 320 | Easy | employees (50) | 50 rows; Engineering 115000, HR 80000 | ✓ | Aggregation, Window | one-window Easy, allowed by D2 (#222) | PASS |
| 321 | Easy | ecommerce (orders 40) | 40 rows; customer 1 → 1..6, customer 10 → 1..3; no tied dates | ✓ | Window | ✓ (#222) | PASS |
| 322 | Easy | employees (50) | 7 rows; 2016·1, 2020·12 | ✓ | Aggregation, Date | ✓ next to Date 4E/7M | PASS |
| 323 | Easy | ecommerce (logins 37) | 13 rows; `%w` 6 → 7, 0 → 6 | ✓ (#167 range) | Date | ✓ | PASS |
| 324 | Easy | titanic (891; age NULL ×177) | 216/174/42, 184/147/37, 491/393/98 | ✓ | Aggregation, NULL Handling | ✓ next to NULL 3E/3M/1H | PASS |

## Defects, ranked by what a visitor meets

| # | Defect | Where | Fix |
|---|---|---|---|
| D1 | The Monzo page says "Monzo does not publish the format" four times, in the provenance note, the sourced section, the FAQ and the FAQ JSON-LD. R1's dossier found Monzo does publish its process, and the page's own roles row quotes Monzo naming its stack. A wrong statement inside a "sourced" block. | `src/data/company-interviews.js` Monzo entry (~line 321); generated `src/monzo-sql-interview.html` | Set the `publishes` field with its dated source and regenerate. This is done in open **#237**, so merge it. |
| D2 | `/questions/three-day-login-streaks/` and `/three-login-days-in-any-7-day-window/` send a cold guest to #86 "Multi-CTE Revenue Pipeline", a customer-spend DENSE_RANK question, under "a free Hard question of the same kind". The swap note renders **below** the problem and the hint button, so at 375 the visitor reads a different problem before learning why. | note: `src/app.jsx:39690`; pick: `src/utils/paid-wall.js:145` `previewSwapFor` | (a) Render `deeplink-swap-note` above the problem statement. (b) In `previewSwapFor`, skip the generic tags (`SELECT`, `JOIN`, `CTE`, `GROUP BY`) when scoring, so a match needs a defining tag (Date Functions, LAG, Gaps and Islands). If nothing shares one, say "a free Hard question" without "of the same kind". |
| D3 | Run and Submit are 40 px tall on a phone (`py-2`), below the 44 px tap target. Measured 151×40 at 375. | `src/app.jsx:39719` (Run), `:39722` (Submit) | Add `min-h-[44px]` (or `py-2.5`) to both buttons. |
| D4 | 318 and 319 examples say "37 logins by 9 customers in March 2024". The table's last login is 2024-04-01 21:37, the same inaccuracy #167 fixed on 323. | `src/data/challenges.js:3833, 3839, 3852, 3858` | Use "37 logins by 9 customers, 2024-03-01 to 2024-04-01" (TR: "2024-03-01 ile 2024-04-01 arasında 9 müşteriden 37 giriş"). |
| D5 | Titles are over the repo's own 70-character limit (`TITLE_MAX`, tests/snippet-length.test.js), so Google cuts them: PayPal 82, Chime 78, Revolut blog 78, Coinbase 77, Monzo 75. | `src/data/company-interviews.js:250, 286, 321, 359`; `src/blog/revolut-data-analyst-sql-screen.html:14` | Shorten to ≤ 70 including " \| SQLQuest.app", e.g. "PayPal SQL Interview Questions: Payments & Fraud". Add these pages to `SNIPPET_PAGES` or run the 70 check over every company page. |
| D6 | The company pages show 17–25 text nodes at 11 px (the `[n]` citation markers), under the 12 px floor (#145). | company-page template | Open **#235** raises them to 12 px, so merge it. |
| D7 | `/for-teams/` has no JSON-LD. It is the one new indexed page without the site's Organization entity (#187). | `src/for-teams.html` | Add the shared Organization block (and a WebPage) the way #187 did on the other pages. |
| D8 (note) | 317's hint, which the question page publishes, spells out the whole method in words: ROW_NUMBER by date, a COUNT window, a self-join or LAG, keep n = 2, compare the stars. It contains no SQL, so `showHint` passes it, but little is left to work out. With two windows, a CTE, a self-join and two traps it also reads as Hard rather than Medium. | `src/data/challenges.js` id 317 | Cut the hint to the first step (number each customer's reviews of a product by date). Or keep the hint in the app only, or move the card to Hard (xp 90). |

Not defects:
- The `list` arm of `companyDirectOpen` lands on the company view, not on
  question 1, although the hero button says "Solve … question 1 now". This is
  the running 50/50 test, and question 1 is on screen to press.
- The bank is stated as "300+" everywhere; 312 unique ids gives "300+" ✓.

## Not walked

- The `/for-teams/` "Ask for seats" button was not pressed (it writes a
  `team_interest` row).
- Hard 318/319 were not solved as a guest, because the link swaps to #86 by
  design.
- No Safari or real-device pass; the cross-browser matrix (#153) covers that
  daily.

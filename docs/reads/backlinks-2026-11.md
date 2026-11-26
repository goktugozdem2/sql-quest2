# Backlinks and mentions — November 2026 (C3 daily notes)

One dated section per C3 run. The open queue for the founder's Thursday send
stays in `docs/outreach/queue-2026-11-26.md`; this file is the running log of
what each daily run found, checked and drafted. No recipient addresses are
written here: each route is named by organisation and by where its address
is published.

---

## 2026-11-23 (C3, laptop, daily run)

**Nothing was sent, posted, opened or submitted.** One Gmail draft was
created; the PR and the form message below wait for the founder.

### Live-link check (curl, 2026-11-23 ~01:10 UTC)

Fetched each page in the open queue and searched the HTML for `sqlquest`:

| Page | HTTP | Links to sqlquest.app? |
|---|---|---|
| PavelGrigoryevDS/awesome-data-analysis README | 200 | no |
| alexeygrigorev/data-science-interviews `awesome.md` | 200 | no |
| onjob.io/best/sql-practice-sites/ | 200 | no |
| boot.dev/blog/backend/best-sql-practice-sites | 200 | no |
| thequerylab.com/blog/best-sql-practice-websites | 200 (after a 308 to www) | no `sqlquest` in the served HTML. G1 saw us in its table on 11-22, so the table is probably rendered client-side. Check it in a browser before counting it either way. |

**Live links: still 0.**

### Today's three opportunities (ranked by fit, then by upkeep)

| # | Page | Read | Maintained by | Last activity | How a resource gets added | Odds |
|---|---|---|---|---|---|---|
| 1 | github.com/amartinson193/The-Ultimate-List-of-Free-SQL-Resources (Practice → Interactive) | 2026-11-23 | Andreas Martinson (repo owner) | merge **2026-11-16** | pull request or issue (README: "feel free to either open a pull request or an issue") | good |
| 2 | Data Science Weekly (datascienceweekly.substack.com), issue 678 | 2026-11-23 | DATAYOU, LLC (no editor named) | issue 678, **2026-11-19**; weekly | email: the team role address on datascienceweekly.org ("Email Us") | low–medium |
| 3 | revarta.com/blog/best-interview-prep-app-for-data-analysts-2026 | 2026-11-23 | Revarta; written by its founder | published **2026-10-01** | contact form on revarta.com/contact (no email shown) | low–medium |

#### 1. The Ultimate List of Free SQL Resources — GitHub PR (FOUNDER)

- **What it is.** 180 stars, a long-running list of free SQL resources.
  Its "Practice → Interactive" group lists SQLBattle, Schemaverse, SQL
  Murder Mystery, Codewars, HackerRank, "LeetCode (Freemium)" and DataLemur.
  It does not name us.
- **Why it is new.** It was prospect #1 in
  `docs/marketing/backlink-prospects-2026-09-13.md`, but it was never sent
  (that file's tracker is empty). Then it looked dormant: no merge between
  2025-03 and 2026-11. Now it is active again.
- **Upkeep.** The owner merged PR #11 on **2026-11-16**, the same day it was
  opened. Every outside PR in the repo's history (#2, #6, #7, #8, #9, #11)
  was merged, most within a day. Issue #10 (a suggestion, 2026-11-12) is
  still open, so **a PR works better than an issue here**.
- **The fact a note should name.** On 11-16 the owner merged a freemium
  entry, Indentwise SQL, whose line says plainly what is free and what is
  paid ("free Beginner lessons, no sign-up; Intermediate and Advanced are
  paid"), and whose PR disclosed "we make Indentwise". So an honest
  freemium line with a disclosure is the accepted form. LeetCode already
  carries "(Freemium)".
- **Page to suggest:** `https://sqlquest.app/sql-exercises/`. It has five
  worked solutions and needs no account.

**Exact line** (append to `README.md` under `## Practice` → `**Interactive**`,
right after the DataLemur line):

```diff
 - [Ace The SQL Interview - DataLemur](https://datalemur.com/) [[LinkedIn]](https://www.linkedin.com/feed/update/urn:li:activity:6968283612706177026)
+- [SQL Quest Exercises (Freemium)](https://sqlquest.app/sql-exercises/) (worked SQL interview exercises that run in the browser, no sign-up; 10 free challenge solves in the app, Pro opens all 300+)
```

**PR title:** `Add SQL Quest Exercises to Practice → Interactive`

**PR description:**

```
Adds one line to Practice → Interactive.

SQL Quest Exercises (https://sqlquest.app/sql-exercises/) is SQL interview
practice for data analysts. The page has five exercises with worked
solutions, it runs in the browser, and it needs no account. In the app,
10 challenge solves are free, plus the lessons, warm-ups and the daily
challenge. Pro opens all 300+ questions. The line marks it (Freemium),
the same way LeetCode's line does.

Disclosure: I build SQL Quest. If a freemium site is one too many for a
free list, close this. There will be no follow-up from me.

Göktuğ, Founder, SQL Quest
```

**Founder steps:** fork the repo, edit `README.md` in the GitHub web
editor, paste the line, and open the PR with the title and description
above. That is one PR, and nothing else from us on this repo.

#### 2. Data Science Weekly — Gmail draft created

- **What it is.** A weekly newsletter of data-science articles, tools and
  projects, issue 678 on 2026-11-19. Its sections are Editor's Picks, Data
  Science Articles & Videos, Last Week's 3 Most Clicked Links, and Cutting
  Room Floor. Items come from independent blogs and from company blogs
  (MotherDuck, SpiralDB, TigerBeetle, PivotLake in #678). Nothing is
  marked sponsored. The issue states no rule on submissions.
- **The fact the note names (verified in the issue's HTML).** Issue 678's
  "Last Week's 3 Most Clicked Links" includes "Can GROUP BY still be
  optimized after all these years?" (pivotlake.io). A SQL piece got clicks
  from this audience last week.
- **Page suggested:** `https://sqlquest.app/sql-join-fan-out/`. It is a
  content page, not a product pitch: a wrong-key JOIN multiplies SUM and
  COUNT, 78,986.43 reported as 243,172.54, and the fix. It is free to read.
- **Gmail checked.** There was no thread with the domain or the name, and
  no send in the last 30 days.
- **Draft.** It goes to the role address published on datascienceweekly.org.
  Subject: "SQL Quest's founder here — the JOIN that triples a SUM, for Data
  Science Weekly". It says it is written by hand to a short list and
  names the #678 GROUP BY link. It is plain that the page sits on a paid
  product's site, with the free tier said the way the gates decide it. It
  asks one question (does a piece from a product's own site fit?) and
  says there will be no follow-up.
- **Odds: low–medium.** Most items are independent writing, though company
  engineering blogs do appear.

#### 3. Revarta, "Best Interview Prep App for Data Analysts in 2026" — form (FOUNDER)

- **What it is.** A comparison written by Revarta's founder and published
  2026-10-01. Its table lists Revarta, DataLemur, StrataScratch, Interview
  Query, LeetCode (Database) and DataCamp, and it does not name us. Revarta
  sells voice mock interviews (behavioural/STAR), not SQL practice.
- **Why it matters.** revarta.com was among Perplexity's sources on the
  Capital One panel prompt in G1's read (`docs/reads/geo-2026-11-22.md`,
  prompt #3), so assistants read this site.
- **The fact a note should name.** The page says that Revarta does not run
  SQL or grade code, which is why it sends readers to SQL tools. A SQL tool
  that complements it, rather than competes, is the honest angle.
- **Route.** A web form only (revarta.com/contact: name, email, message).
  No email address is published, so **no Gmail draft**. The founder pastes
  the text below, or skips it.
- **Odds: low–medium.** It is a vendor page, but we are not its competitor.

**Form message (founder pastes it; there is no subject field, so the
first line carries the founder signal):**

```
From SQL Quest's founder, a note on your data-analyst prep comparison.

I'm Göktuğ, and I build SQL Quest. I'm writing this myself to a short list.
Your 1 October piece says plainly that Revarta doesn't run SQL or grade
code, and then points readers to the SQL tools that do. SQL Quest is one
of those: SQL interview practice for data analysts, run in the browser,
with company sets (Capital One and Revolut among them) and timed mocks.
In the app, 10 challenge solves are free, and Pro opens all 300+
questions. The no-signup way in is https://sqlquest.app/sql-exercises/

My one question: would you consider it for the SQL row the next time you
update the table?

No follow-up from me either way.

Göktuğ
Founder, SQL Quest
```

### Looked at and skipped today

| Target | Why not |
|---|---|
| moshesham/Data-Science-Analytical-Handbook (resources page) | Pushed 2026-08; every merged PR is the owner's or Copilot's. There is no outside contribution path in practice. |
| zezere/best-resources-to-learn-sql (+ github.io page) | 1 star; last push 2025-12; an outside PR from 2026-09 sits unmerged. |
| dev.to, "Top 10 Data Engineering Interview Prep Tools (2026)" | Data-engineering readers; the only route is a comment; newest comment from April. |
| Estuary, "11 Best Free Resources to Learn SQL" (updated 2026-08-07) | Still a fit, but there is no email (contact form / "Talk to sales"), and it is already in the September list. Leave it for a form batch. |
| Data Elixir (issue 597, 2026-11-10) | Contact form only; it states no link-suggestion policy. A later candidate. |
| Postgres Weekly (Cooperpress) | No submission route shown; Postgres readers, while our pages run on SQLite. Weak fit. |
| beyz.ai, prachub, dataford "alternatives" lists | Competitors' own rankings. |
| University / bootcamp resource pages | None surfaced in four searches (.edu, MSBA careers, syllabi). The Illinois Wesleyan CS codex SQL page failed TLS. A university route needs a named librarian or instructor. Try from a browser session. |

### FOUNDER

1. Open the PR on amartinson193/The-Ultimate-List-of-Free-SQL-Resources
   (line and text above).
2. Read the Data Science Weekly draft in Gmail and send it, or delete it.
3. Optionally, paste the Revarta message into revarta.com/contact.
4. Open thequerylab.com/blog/best-sql-practice-websites in a browser and
   check whether its SQL Quest row carries a link. If it does, that is
   our first live link.

---

## 2026-11-23, run 2: web-form outreach (founder's ask: "onlara websitelerinden form doldurarak ulaş")

The founder approved the four forms without a CAPTCHA and the contact
address `support@sqlquest.app` in chat. The texts were drafted by C3,
re-checked against each page on 2026-11-23 and shown to the founder before
anything was sent. The name field read "Göktuğ (SQL Quest)". Each message is
dated, names the founder, asks one question and promises no follow-up.

| # | Target | Page that would link | Result |
|---|---|---|---|
| 1 | TheQueryLab (correction: $19 → $29/$99, "60+ free" → 10 free solves, "unlimited AI" → not unlimited) | thequerylab.com/blog/best-sql-practice-websites (lists us as #6, plain text, no link) | **Not sent.** Pressing Send opens a "Sign in to continue" modal (Google sign-in), and no request reached their contact API. Creating an account on their site is the founder's call. FOUNDER: sign in and paste the text from the C3 file, or skip. |
| 2 | Revarta, "Best Interview Prep App for Data Analysts in 2026" | revarta.com/blog/best-interview-prep-app-for-data-analysts-2026 | **Sent** 2026-11-23 ~15:50 UTC. The site confirmed "Your message has been sent successfully". |
| 3 | UC San Diego Library, Data Science guide → "Data science interview prep" | ucsd.libguides.com (updated 2026-11-05; DataLemur is its only SQL site) | **Sent** 2026-11-23 ~15:55 UTC through LibAnswers "Email Us", affiliation "Non-UC San Diego / Other". The site confirmed "Thank you! We strive to respond … within two business days". |
| 5 | Data Elixir (newsletter) | weekly issue, "Posts & Tutorials" | **Not sent.** CleanTalk anti-spam refused the automated browser ("Browser seems to be spambot"). We do not get around bot detection. FOUNDER: send the same text from your own browser, or skip. |
| 4, 6, 7 | codewithfimi, KDnuggets, RustcodeWeb | (see the C3 file) | **Not attempted.** These forms have a reCAPTCHA, so they are the founder's to send. |

The texts and fields for all seven are in the C3 research file written
2026-11-23 (session scratchpad, `backlink-forms-2026-11-23.md`). They are
not in the repo, because each holds an outward message, not data. The
dropped list from that research:
- FreeCodingCourses.com: email only, so it moves to the Gmail lane;
- Analytics Vidhya: phone number and marketing consent required;
- Estuary and Rivery: sales or demo forms only;
- Liam ERD: GitHub or X only;
- Data Research Analysis Collection: the form is broken.

**Next live-link check:** Revarta and UCSD from 2026-12-07; no follow-up
messages, as promised. **Live links: still 0.**

---

## 2026-11-24 (C3, laptop, daily run)

**Nothing was sent, posted, opened or submitted by this run. No Gmail draft
was created**, because neither new target publishes an address. Both are
founder routes.

### Stop rule: not applied

The 7-day rule counts days with no founder sends, and the last sends were
yesterday. Gmail Sent (searched 2026-11-24 ~11:45 UTC) holds three C3 drafts
that the founder sent on **2026-11-23**: Data Science Weekly (~10:32 UTC),
onjob.io (~11:45) and boot.dev (~12:45). Run 2's two forms also went out that
day with his approval (Revarta, UCSD Library). That makes **5 sends from the
queue, 1 day ago**. No reply has come back yet from any of the five domains,
or from thequerylab.com.

Still waiting on the founder:
- the GitHub PRs/issue (awesome-data-analysis, data-science-interviews,
  Extremesarova, The-Ultimate-List-of-Free-SQL-Resources). None has been
  opened: `gh search prs/issues --author goktugozdem2` shows nothing outside
  our repo since 11-20;
- the unaddressed Data Career Jumpstart draft (reply-to-an-issue route);
- the forms for TheQueryLab (needs a sign-in), Data Elixir (CleanTalk) and
  the three reCAPTCHA forms;
- the alternativeto.net edit.

### Live-link check (curl, 2026-11-24 ~11:50 UTC)

| Page | HTTP | `sqlquest.app` in HTML |
|---|---|---|
| PavelGrigoryevDS/awesome-data-analysis | 200 | no |
| alexeygrigorev/data-science-interviews `awesome.md` | 200 | no |
| amartinson193/The-Ultimate-List-of-Free-SQL-Resources README | 200 | no |
| onjob.io/best/sql-practice-sites/ | 200 | no |
| boot.dev/blog/backend/best-sql-practice-sites | 200 | no |
| revarta.com/blog/best-interview-prep-app-for-data-analysts-2026 | 200 | no |
| thequerylab.com/blog/best-sql-practice-websites | 200 | **yes, as plain text**: "6. SQL Quest", then "Website: sqlquest.app" with no `<a href>`, in both the rendered HTML and the RSC payload |

TheQueryLab therefore counts as an **unlinked mention**, not a link. This
settles the 11-23 question: the row exists, and it carries no link. The
correction message from run 2 is still the founder's to send (sign-in
required); it could also ask for the name to be linked.

**Live links: still 0.**

### Today's two opportunities

| # | Page | Read | By | Last activity | Route | Odds |
|---|---|---|---|---|---|---|
| 1 | chandukongara.substack.com/p/the-7-sql-patterns-behind-most-data ("Chandu Explains") | 2026-11-24 | Chandu Kongara, independent writer, sells nothing | published **2026-11-21** | Substack comment (founder's Substack account) | medium |
| 2 | Data With Sarah (datawithsarah1.beehiiv.com) | 2026-11-24 | Sarah Rajani, a senior data analyst (7+ years) | issue **2026-11-03**; weekly to monthly | subscribe, then reply to an issue ("Hit reply anytime" goes to her) | low |

#### 1. "The 7 SQL patterns behind most data analyst interview questions": comment (FOUNDER)

- **What it is.** A post from three days ago. It organises analyst
  interview SQL into seven patterns and says to solve three questions per
  pattern on DataLemur or LeetCode SQL 50 (both linked). Pattern 5 is "find
  what's missing (anti-join)", and pattern 7 is dedupe to the latest row.
- **Why a link helps the reader.** The post teaches the anti-join pattern.
  The way it breaks most often in practice is `NOT IN` over a column that
  holds a NULL: the query returns 0 rows and raises no error. Our
  `https://sqlquest.app/sql-not-in-null/` shows that on real data with the
  fix, and it is free to read with no account. It adds to the post and
  does not replace its practice links.
- **Route.** No email, contact page or about-page address was found (post,
  footer, and a name search). Commenting is an outward post, so it is the
  founder's to make. Answer first; the link is the last line.

**Comment text (founder pastes it, or skips):**

```
Good list. One addition to pattern 5. If the anti-join is written as
NOT IN (SELECT id FROM ...) and that subquery returns even one NULL,
the whole query returns 0 rows with no error. x NOT IN (1, NULL) is
never true. NOT EXISTS, or LEFT JOIN ... WHERE right.id IS NULL, both
avoid it. I wrote the case up with data here, if it's useful to
anyone: https://sqlquest.app/sql-not-in-null/

(Disclosure: I build SQL Quest.)
Göktuğ
```

#### 2. Data With Sarah: reply to an issue (FOUNDER, optional)

- **What it is.** A newsletter for working analysts and job-seekers (SQL,
  career, resumes). Its 2026-11-03 issue is "7 years in analytics. Would I
  struggle to get hired today?", and its archive has a "quick SQL request"
  story and a coffee data challenge. It shows no third-party tool roundups,
  so a link would be a one-off mention at best. **Odds: low.**
- **Page suggested:** `https://sqlquest.app/sql-join-fan-out/`. It covers
  the "quick request" whose SUM comes out tripled, which is the workplace
  angle she writes in.
- **Route.** The only route is a reply to an issue, which needs a
  subscription. No address is published, so there is no draft. If the
  founder subscribes, a reply in the email-voice rule's shape would say
  that he builds SQL Quest, name her 11-03 issue, and ask one question
  (would a worked JOIN trap fit a future issue?), with no follow-up.

### Looked at and skipped today

| Target | Why not |
|---|---|
| academic/awesome-datascience (30k stars; it merged outside PRs on 11-16 and 11-17 and lists datadriven.io under Tutorials) | Its CONTRIBUTING requires any commercial or freemium listing to **pay** $1/month or $12/year through GitHub Sponsors. A paid listing is a bought link, which this lane does not do. It is the founder's call if he ever wants it. |
| danhuss/awesome-sql (456 stars) | 12 outside "Add X" PRs are open since 10-25 and none is merged. It is a queue with no merges. |
| mtahiraslan / mrankitgupta data-analyst-roadmap repos | Their only outside PRs sit unmerged for months. |
| DopplerHQ/awesome-interview-questions | Last merge 2024-07. |
| TLDR Data | No editorial submission route; only "Advertise". |
| amlanmohanty1.substack.com (Data Career School) | A competitor ranking its own product first. |
| analysthive.io "Where to practice SQL for free" | A vendor page (course and pricing) that links no site at all. No contact. |
| dataelevateengineer.substack.com SQL resources post (2026-04-25) | Its list is all YouTube/LinkedIn short links to the author's own material, and there is no contact. |
| aaboutdata.substack.com | The about page says nothing about SQL tools and gives no contact. |
| University LibGuides / syllabi (two searches) | Only UCSD surfaced, and it was already contacted on 11-23. |

### FOUNDER (today)

1. Optional: post the comment above on Chandu Kongara's 11-21 post.
2. Optional: subscribe to Data With Sarah and reply to an issue.
3. Everything listed under "Still waiting on the founder" above, with the
   GitHub PR on amartinson193 first: it merged every outside PR within a
   day.

**Next live-link check:** tomorrow. Revarta and UCSD from 2026-12-07.

---

## 2026-11-25 (C3, laptop, daily run)

**Nothing was sent, posted, opened or submitted by this run.** Three Gmail
drafts were created. No PR or form went out.

### Correction: the onjob.io note never arrived

The 11-24 section counted onjob.io among the founder's sends. The send did
happen (Gmail Sent, 2026-11-23 11:45 UTC), but **it bounced 28 seconds
later**. onjob.io's Microsoft 365 server answered
`550 5.4.1 Recipient address rejected: Access denied`. The support inbox
published in the page's structured data does not take mail from outside.
So 4 of the 5 sends of 11-23 reached someone: boot.dev, Data Science Weekly,
and the Revarta and UCSD forms.

**Re-route (draft made).** onjob.io/contact lists six routes, and the
obfuscated addresses decode to role inboxes only. There is no editorial or
corrections address. Its "Business enquiries" route goes to the parent
company, Pitch N Hire. A new draft goes there. It is not a copy of the 11-23
text: it says the support inbox refused it, asks for a forward to whoever
edits the guides, and keeps the same facts (free limit, price, the
no-account page) and the same single question.

### Live-link check (curl + GitHub code search + web search, 2026-11-25 ~09:40 UTC)

| Page | HTTP | `sqlquest` in HTML |
|---|---|---|
| PavelGrigoryevDS/awesome-data-analysis README | 200 | no |
| alexeygrigorev/data-science-interviews `awesome.md` | 200 | no |
| amartinson193/The-Ultimate-List-of-Free-SQL-Resources README | 200 | no |
| Extremesarova/data-science-resources README | 200 | no |
| onjob.io/best/sql-practice-sites/ | 200 | no (the note bounced, see above) |
| boot.dev/blog/backend/best-sql-practice-sites | 200 | no |
| revarta.com/blog/best-interview-prep-app-for-data-analysts-2026 | 200 | no |
| thequerylab.com/blog/best-sql-practice-websites | 200 | plain-text mention only, no `<a href>` (unchanged from 11-24) |

None of the queue's targets links to us yet. The founder has opened no PR or
issue outside our repo since 11-24 (`gh search prs/issues --author
goktugozdem2`).

**Two links that nobody asked for, found today by `gh search code
"sqlquest.app"`.** Neither repo has stars, and GitHub marks its links
nofollow, so the search value is close to zero. Both are real hyperlinks
written by people we never contacted:

| Repo | File | What it says | Added |
|---|---|---|---|
| johanccs/infra-setup | `tutorials/docs/playground.md` | a table of SQL playgrounds: "SQL Quest, Beginner–intermediate, Practice with a game feel, Free tier", linking `https://sqlquest.app/` | 2026-10-11 |
| vincemaina/ae-practise-tool | `notes/research/competitor-landscape.md`, `feature-ideas-2026.md` | a builder's competitor research. It cites `/sql-practice-comparison/` as a source and names our AI coach | 2026-07 to 08 |

Neither dates from November, so **links earned this month are still 0**.
The month's running total of links found pointing at sqlquest.app is now 2,
both unsolicited and both on GitHub. The web search for `"sqlquest.app"`
off our hosts found only the alternativeto listing (still "250+"; the
founder's edit is pending) and our own Vercel mirror.

**Not C3's lane, noted for C1 and S1.** `sql-quest2.vercel.app` is indexed
and serves an old build. Its home and llms.txt still claim "the only SQL
site with an AI tutor that explains failed queries" and "a 7-day Pro trial
on signup with no card required". This is duplicate content that carries
stale claims, and search engines and assistants read it.

### G1's two lists (BACKLOG "GEO gaps — G1")

| List | Read 2026-11-25 | Verdict |
|---|---|---|
| analyticsinsight.net, "Where to Practice SQL in 2026? Top 10 Learning Platforms" | K Akash (reviewed by Sanchari Bhaduri), published and last updated **2026-02-15**. In order: HackerRank, LeetCode, CodeChef, DataCamp, Coursera, Kaggle, W3Schools, Mode, StrataScratch, SQLZoo. No affiliate disclosure on the page. The site sells sponsored content, but its about page says that coverage is never influenced by advertisers. | **Draft made, low odds.** Run 2 of 11-22 skipped it because it is nine months old. It is in G1's panel (#2), though, and the contact page publishes an editorial role inbox for "general feedback and corrections". A news site usually writes a fresh "2027" list rather than editing this one, so the note asks to be considered when the list is refreshed. It says plainly that this is not a request for sponsored placement. **If the answer is a rate card, decline: a paid placement is a bought link.** |
| positioniseverything.net, "10 Best Platforms to Practice SQL: Choose by Your Goal" | "Position is Everything Team", published 2026-08-17, prices "as of November 24, 2026". Lists SQLBolt, SQLZoo, LeetCode, HackerRank, StrataScratch, DataLemur, Mode, Interview Query, W3Schools and Kaggle. None of the ten is linked. The page discloses affiliate links and states that some top positions are paid placements, and it carries a "Sponsor this article" box. The site is a general how-to and affiliate listicle site. | **Skip.** The route into this list is paid placement, so any link from it would be bought. Its curl fetch also answers 403. G1 can mark it closed: we do not chase this list. |

### Today's two new targets

The stop rule does not apply: the founder's last queue sends were on 11-23,
two days ago.

| # | Target | Read | Last activity | Route | Odds |
|---|---|---|---|---|---|
| 1 | Data Analysis Journal (Olga Berezovsky), "A Selection Of SQL Tutorials" | 2026-11-25 | weekly: Issue 341 on 11-11, a post on 11-18 | reply to an issue (subscribe first) | medium |
| 2 | Analytics Insight, the 2026 list above | 2026-11-25 | the list dates from 2026-02-15; the site publishes daily | editorial role inbox (contact page) | low |

#### 1. Data Analysis Journal: no-recipient draft, reply route (FOUNDER)

- **What it is.** A weekly newsletter for working analysts, running since
  2021 and still active: Issue 338 (2026-10-21) is "The New Reality of
  Getting Hired in Data Analytics", and the 11-18 post launched a tool
  bundle. Its free series "A Selection Of SQL Tutorials" (Issues 77, 141
  and 163, the last on 2023-09-27) is a curated list of "mostly free SQL
  tutorials and practice sites". The post says it is refreshed every six
  months, and **it ends by asking readers to send the SQL links they think
  belong on it.** That is an open invitation, so this is not a cold pitch.
- **Why a link helps the reader.** The list's "Become proficient" section
  already carries a piece on ON versus WHERE in PostgreSQL joins. Our
  `/sql-left-join-where-filter/` works the same idea through on data:
  15 rows instead of 25, why, and two fixes. It is free to read with no
  account. The draft's numbers were checked on the live page today.
- **Risk.** The series has not been refreshed since 2023, so the
  invitation may be stale. The newsletter is active and the ask is one
  line, so it is still worth a single note.
- **Route.** The about page publishes only a personal address, given for
  student discounts, and not as a route for links. We do not use it. The
  post asks readers to "send", which for a Substack means replying to an
  issue. The founder's inbox is **not subscribed**: Gmail holds only a 2023
  Substack recommendation. So: subscribe (free tier), wait for the next
  Wednesday issue, and send the draft as a reply to it.
- **Draft (Gmail, no recipient):** "From the person who builds SQL Quest —
  a link for your SQL tutorials list". It names Issue 163's invitation and
  the ON-versus-WHERE piece, gives the page and what it shows, discloses
  the paid tier in the gates' words, asks one question and promises no
  follow-up.

#### 2. Analytics Insight: draft to the editorial role inbox

- **Draft (Gmail, to the editorial inbox on analyticsinsight.net/contact-us):**
  "I build SQL Quest — for the next 'Where to Practice SQL' list". It
  quotes the list's own overview line on timed challenges, gives the facts
  and the no-account page, says that it is not asking for sponsored
  placement, asks one question and promises no follow-up.

### Looked at and skipped today

| Target | Why not |
|---|---|
| positioniseverything.net | Paid placements and affiliate links (above). |
| lichuang/awesome-sqlite (127 stars, outside PRs merged 11-15) | Every entry is an open-source repo or an article about SQLite itself. A closed SQL practice product that happens to run SQLite in the browser does not help that reader, and none of our pages is about SQLite. |
| Airsequel/awesome-sqlite ("Apps building on SQLite") | Its CONTRIBUTING requires 100 GitHub stars or independent third-party coverage. Our only independent coverage is TheQueryLab's unlinked mention, which does not clearly meet the bar. Revisit once an independent article links us. |
| awelist/awesome-sql (9 stars) | One merge since July. Of 12 outside PRs, 10 were closed, and CONTRIBUTING declines self-promotion. |
| NC State IAA, "Mastering the Job Interview Process" (2026-04-30; it names DataLemur, Interview Query and StrataScratch) | A student-written blog post that will not be re-edited. The only routes are a phone line and a staff directory, with no role inbox. |
| Data Insights (kaparker.substack.com) | Last issue 2025-07-23. Dormant. |
| Stan-Wangg/data-analyst-roadmap | Its premise is "every skill for $0, from YouTube". A freemium product does not belong on it. |

### FOUNDER (today)

1. **onjob.io:** the 11-23 note bounced. Read the new draft to Pitch N Hire's
   business inbox ("SQL Quest's founder here — a note for OnJob's SQL
   practice sites page"), then send it or delete it.
2. **Analytics Insight:** read the draft ("I build SQL Quest — for the next
   'Where to Practice SQL' list"), then send it or delete it. If they answer
   with a sponsored-content price, the answer is no.
3. **Data Analysis Journal:** subscribe free to dataanalysis.substack.com,
   then send the no-recipient draft ("From the person who builds SQL Quest —
   a link for your SQL tutorials list") as a reply to the next issue.
4. Still open from earlier runs, in this order: the amartinson193 PR (it
   merges outside PRs within a day), the awesome-data-analysis PR, the
   alternativeto.net edit (the listing still says "250+"), and the
   data-science-interviews PR.

**Next live-link check:** tomorrow. Revarta and UCSD from 2026-12-07.

---

## 2026-11-26 (C3, laptop, Thursday run; cadence Mon + Thu from 11-25)

**Nothing was sent, posted, opened or submitted by this run.** One Gmail
draft was created. No PR, issue or form went out.

### Gmail: what happened to the earlier notes (searched ~05:45 UTC)

| Note | State |
|---|---|
| onjob.io re-route (Pitch N Hire's business inbox), drafted 11-25 | **Scheduled by the founder** for 2026-11-26 07:50 UTC. It no longer sits in Drafts. |
| Analytics Insight (editorial submissions inbox), drafted 11-25 | **Scheduled by the founder** for 2026-11-26 08:10 UTC. |
| Data Analysis Journal (no-recipient reply draft), drafted 11-25 | Still a draft. It waits for the founder to subscribe and reply to the next issue. |
| boot.dev, Data Science Weekly (sent 11-23) | Delivered, no reply after 3 days. |
| Revarta, UCSD Library (forms, 11-23) | No reply in Gmail. Live check from 2026-12-07, as promised. |

No new bounce and no auto-reply on any C3 route since 11-23. The only
bounce so far is still onjob.io's support inbox (11-23).

**Stop rule: not applied.** The founder acted on the queue on 11-25 (two
scheduled sends), so the 7-day clock restarts there.

### Live-link check (curl + GitHub code search, 2026-11-26 ~05:50 UTC)

| Page | HTTP | `sqlquest` in HTML |
|---|---|---|
| PavelGrigoryevDS/awesome-data-analysis README | 200 | no |
| alexeygrigorev/data-science-interviews `awesome.md` | 200 | no |
| amartinson193/The-Ultimate-List-of-Free-SQL-Resources README | 200 | no |
| Extremesarova/data-science-resources README | 200 | no |
| onjob.io/best/sql-practice-sites/ | 200 | no (the re-routed note goes out today) |
| boot.dev/blog/backend/best-sql-practice-sites | 200 | no |
| revarta.com/blog/best-interview-prep-app-for-data-analysts-2026 | 200 | no |
| thequerylab.com/blog/best-sql-practice-websites | 200 | plain-text mention only, no `<a href>` (unchanged) |
| analyticsinsight.net "Where to Practice SQL in 2026" | 200 | no (the note goes out today) |

The founder has opened no PR or issue outside our repo since 11-20
(`gh search prs/issues --author goktugozdem2`). `gh search code
"sqlquest.app"` shows no new link: beyond the two 0-star repos found on 11-25
it returns only Xcode project files (a bundle id, not a link) and a scraped
leads CSV. **Links earned in November: still 0.**

### The money pages: where a link to them could come from

The investor plan (A09/A10) puts the seven money company pages first:
Capital One, Revolut, Wise, Monzo, Amazon, Stripe and Snowflake. Today's
searches looked for a third-party page about one of those interviews that
an outsider could get a link onto. About ten searches covered the CodeSignal
assessment, Revolut/Monzo/Wise analyst prep, Stripe/Snowflake analyst
guides, Amazon BIE prep, UK careers services and fintech societies.

**Result: no page qualifies, and the reason is structural.** Every page
ranking for these interviews belongs to a competitor (Interview Query,
Dataford, Exponent, Prepfully, DataInterview, iGotAnOffer, linkjob.ai) or is
a candidate thread (Glassdoor, Blind, 1point3acres, LeetCode Discuss). No
independent editor curates "Capital One SQL prep" links. University career
pages that mention these companies are reposts of Exponent's guides (CSUN,
NAU, Puget Sound, Saint Mary's), so they are a vendor's feed. Monzo's own
"Interviewing for data science at Monzo" posts are the employer's.

So a money page can earn links in only two ways:
1. an answer in a live candidate thread (queue item 4, Capital One on
   Blind/Reddit). That is the founder's route, with the reply already
   written in the queue file;
2. a general list that links us, so the link passes through
   `/sql-exercises/` and the company links on it.

Email outreach for money pages specifically has no target today. C3 does
not invent one.

### Today's new target

| # | Target | Read | Last activity | Route | Odds |
|---|---|---|---|---|---|
| 12 | MIT Career Advising & Professional Development, "Ace the data science technical interview" (capd.mit.edu/resources/…) | 2026-11-26 | evergreen resource page, no date shown (images from 2024-11) | CAPD's role inbox, published on the page and on capd.mit.edu/contact-us | low |

- **What it is.** MIT's career office guide to data-science technical
  interviews. It says students "will likely need to write code in Python or
  SQL", and it names two practice sites: LeetCode, and DataLemur "for data
  science students". It names no page where a SQL answer is shown worked
  through.
- **Why a link helps the reader.** `/sql-exercises/` has five exercises
  solved in full (task, tables, query, "why it works"). Each query runs in
  the browser on the same data, and the page needs no account. Checked on
  the live page today.
- **Why not a money page.** The guide is company-agnostic. A Stripe or
  Amazon page would not fit it, and asking for one would lower the odds.
- **Draft (Gmail, to the CAPD role inbox):** "SQL Quest's founder here — a
  free SQL page for 'Ace the data science technical interview'". It names
  the guide and its two links, gives the page and what it shows, discloses
  the paid tier in the gates' words, asks one question and promises no
  follow-up.

### Looked at and skipped today

| Target | Why not |
|---|---|
| CSUN / NAU / Puget Sound / Saint Mary's career-center "Data Analyst Interview Prep" pages | Reposts of Exponent's guide. The only links on them are Exponent's. |
| NC State IAA analytics page (`analytics.ncsu.edu/?p=740`) | The same 2026-04-30 student post skipped on 11-25, under a second URL. |
| maggieindata.substack.com, "Cracking SQL Interview…" | Published 2024-09-03, no later post visible, and no route for resource suggestions. |
| SQLBook newsletter (buttondown) | SQLBook sells SQL practice and interview challenges itself. |
| SourceForge "interview preparation tools that integrate with SQL" | A vendor-submitted directory with two unrelated products and a sponsored sort. Listing would need an account. Not worth it. |
| Medium, "I tried the 6 data interview prep platforms" | The fetch answered 403, so it could not be read. Not drafted unread. |
| mgramin/awesome-db-tools (5.4k stars) | Last merge 2026-05-21; outside PRs since then sit open. |
| andresvourakis/data-scientist-handbook, katiehuangx/Transition-into-Data-Analytics | No outside PR has ever been merged. The second list's author wrote DataLemur's content. |
| JuanPabloDiaz/freeForGeeks | Free resources only. A freemium product does not belong. |
| Snowflake-Labs/awesome-snowflake | Last push 2024-04. |
| The Data School (UK) SQL resources post; hackforla data-science wiki | 2022 posts. The only route is a general company inbox or wiki membership. |

### FOUNDER (today)

1. **MIT CAPD:** read the draft ("SQL Quest's founder here — a free SQL page
   for …"), then send it or delete it.
2. **The money pages' only route is item 4:** the Capital One reply in
   `docs/outreach/queue-2026-11-26.md` § 4, posted by you in a live
   Blind or r/dataanalysis thread. Its check list is there.
3. Still open, in this order: the amartinson193 PR, the
   awesome-data-analysis PR, the Data Analysis Journal reply (subscribe
   first), the alternativeto.net edit (still "250+").

**Next run:** Monday 2026-11-30: live-link check, including onjob.io and
Analytics Insight, which go out today. Revarta and UCSD from 2026-12-07.

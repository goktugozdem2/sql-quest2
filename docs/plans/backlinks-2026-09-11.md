# Backlinks: we are not invisible on Google, we are on page two

**Written 2026-09-11**, after Bing Webmaster Tools flagged "not enough inbound
links from high quality domains" and Search Console supplied the numbers behind
it. This plan exists because that warning is the *same* warning as "limited
crawl capacity", and links are the only lever under both.

---

## 1. What our link profile actually is

Search Console, Links report, read 2026-09-11:

| | |
|---|---|
| External links, total | **57** |
| From `saasmarket.site` | **44** |
| From everything else | **13** |
| Distinct real linking sites | dev.to (2), linkedin.com (2), microsoft.com (2), sql-quest.app (2), long tail |

**Seventy-seven percent of our backlink profile is one domain**, and it is a
directory-shaped site nobody reads. Strip it and SQL Quest has roughly a dozen
links from four domains after a year. Bing's warning is not a nag; it is an
accurate description.

Most-linked pages: the homepage (12), then
`/blog/sql-joins-explained/` and `/meta-sql-interview/` at 2 each. Nothing else
has more than one.

## 2. Why this matters more than it looks — the two engines disagree

Three months to 2026-09-08, both consoles:

| | Google | Bing |
|---|---|---|
| Impressions | **73.6K** | 23.7K |
| Clicks | 982 | 809 |
| CTR | **1.3%** | **3.42%** |
| Average position | **15.7** | ~6 |
| Pages indexed / with impressions | 76 indexed | 41 with impressions |

Read those two columns together, because the story is in the gap.

**Google already shows us to 73,600 people a quarter and they do not click,
because 15.7 is the middle of page two.** Bing shows us to a third as many
people, ranks us around position 6, and delivers almost the same number of
clicks — better ones, in fact: Bing arrivals reach a first solve at 58.6%
against Google's 49.0%, and sign up at 11.0% against 8.7%
(`docs/reads/signup-growth-cause-2026-09-11.md`).

So the constraint on Google is **not indexing**. 76 of 89 pages are indexed and
"Discovered – currently not indexed" is **zero**. Google has crawled us, kept
us, and put us on page two. The thing that separates page two from page one on
Google, at equal content quality, is authority. That is what links buy, and it
is exactly where we have thirteen of them.

### The prize, in numbers

Holding impressions flat at 73.6K a quarter and moving only position:

| Average position | Plausible CTR | Clicks / quarter | vs today |
|---|---|---|---|
| 15.7 (today) | 1.3% | 982 | — |
| ~8 | ~3% | ~2,200 | +1,200 |
| ~5 | ~6% | ~4,400 | +3,400 |

At our measured Google landing→signup rate of 8.7%, page one is worth roughly
**+100 signups a month** without a single new visitor to the site. O1 needs
signups at 1,000/month against 194 in the measured period, so this is not the
whole answer, but it is the largest single number available from work we can do
ourselves.

**The honest caveat, stated first:** the CTR figures in that table are the
standard position-to-CTR curve, not our measurement. We cannot measure our own
page-one CTR because we have never been there. Treat the table as the size of
the prize, not as a forecast.

---

## 3. T0 — the links we already own and are wasting (ship today)

Before asking anyone for anything: our own internal links point at the wrong
pages. Counted across the 141 built pages, 2026-09-11:

| Page | Pages linking to it |
|---|---|
| `/sql-interview-prep/` | 97 |
| **`/terms.html`** | **90** |
| `/learn-sql/` | 51 |
| `/blog/` | 42 |
| **`/sql-exercises/`** | **31** |
| `/challenges/` | 13 |
| **`/best-sql-practice-sites/`** | **9** |

`/sql-exercises/` takes **48% of our Bing impressions** and produces more
solvers than any other door. It has a third of the internal links our terms of
service page has. `/best-sql-practice-sites/` is our second-best door by
six-solvers produced and sits on nine pages.

Search Console counts 524 internal links on this site. A large share of them
currently point at boilerplate. This is the one kind of link we control
completely, it costs nothing, and it ships in one commit.

**Action:** both doors go in the footer of every page, in the "Practice &
Resources" column where `/sql-exercises/` already sits on the homepage.

**Claim:** internal links to `/sql-exercises/`, baseline **31 of 141 pages**.
Target **≥ 130**. This is a mechanical check, not a metric read — the outcome
to watch is its Google average position, baseline **15.7 site-wide** on the day
it ships. Read **2026-10-12**.

**Shipped 2026-09-11: 31 → 132 and 9 → 132.** Three footer shapes had to be
edited, none of them shared: the `.flk` div on the landing pages, the inline
`.ft > p` list on the blog and challenge topic pages, and a bare `<footer><p>`
on the three variant pages. The Turkish sector landings are *generated* by
`scripts/build-sector-landings.js`, so the template changed too — the same
lesson the 2026-09-10 colour sweep learned, that editing `src/` does not reach
a generated page.

The nine pages still without the link are all correct exclusions: the page
itself, the noindex app shell, `/affiliate/`, `kpis.html`, and the three legal
pages.

## 4. T1 — reclaim what already exists (this week, founder)

The cheapest link in the world is a mention that is already written.

- **`sql-quest.app` links to us twice.** That is a hyphenated variant of our
  own domain that we do not own. Find out what it is. If it is a squatter,
  those two links are worthless and possibly harmful; if it is a fan page,
  it is a relationship.
- **`microsoft.com` links to us twice.** Find out where. A link from
  microsoft.com is worth more than the other twelve combined, and knowing why
  it exists tells us whether it can be repeated.
- **Unlinked mentions.** People discuss SQL practice sites on Reddit, Hacker
  News, Discord and course forums constantly. Search for "SQL Quest" mentions
  without a link and, where the thread is still live and the mention is
  positive, reply as the founder. Not a pitch — the CLAUDE.md outreach voice.

**Claim:** distinct real linking domains, baseline **4** (dev.to, linkedin.com,
microsoft.com, sql-quest.app, excluding saasmarket.site). Target **≥ 10** by
2026-11-08. Falsification: under 6 means unlinked mentions are not a real
inventory at our size and the channel is outreach, not reclamation.

## 5. T2 — the lists that link out by policy (this month)

There is a category of page whose entire purpose is to link to free resources.
We qualify honestly: 219 of 287 exercises free, no signup, no card. Most
"alternatives" cannot say that, which is the whole reason
`/best-sql-practice-sites/` ranks.

In rough order of fit:

- **GitHub awesome-lists** — `awesome-sql`, `awesome-datascience`,
  `awesome-interview-questions`, `free-for-dev`. Pull request, not an email.
  These are maintained by people who merge good entries.
- **University and bootcamp resource pages.** SQLZoo comes out of Edinburgh
  Napier; a lot of course pages link to it and to SQLBolt. A page that lists
  free SQL practice for students is a page that would list us if it knew.
- **r/SQL and r/dataengineering wikis and recurring "how do I practice"
  threads.** Answer the question, link once, disclose that you built it.
- **Dev.to and Hashnode cross-posts.** We already have two dev.to links, so the
  channel demonstrably works.

**Rule for this whole tier, and it is not negotiable:** every submission
discloses that the founder built the thing. A list entry that hides authorship
is the same act as a paid link with a different fig leaf, and our
`/best-sql-practice-sites/` page ranks precisely because it is candid about
being written by a competitor.

**Claim:** links from domains a human maintains, baseline **0** from this
channel. Target **≥ 5 merged or accepted** by 2026-11-24. Falsification: under
2 means the free-tier pitch does not clear these editors' bar and the effort
belongs in T3 instead.

## 6. T3 — publish something only we can (this quarter)

Passive links come from being the source of a fact, not from being a product.
We measured three things this quarter that nobody else can publish:

1. **Bing beats Google for a SQL practice site.** 356 arrivals against 528
   producing *more* solvers, with the full two-console comparison in section 2.
   Nobody writes this because almost nobody looks at Bing Webmaster Tools.
2. **The challenge-ordering incident.** A recommendation engine that handed
   every solver the worst challenge in the bank, four times, because four call
   sites read raw array order. 24% solve-through against 73% on an identical
   definition (`src/utils/challenge-order.js`).
3. **What a first-run fix is worth.** Cold users' first-solve rate moved 39.7%
   → 51.7% against a flat warm control, from showing table columns and
   reordering one challenge.

Each is a real number with a method attached, which is the only kind of post
that earns links without asking.

**Claim:** referring domains from a published post, baseline 0. No target — we
have never done this and inventing a number would be theatre. Measurement-first,
read **2026-12-08** with O1.

## 7. What we will not do

- **No paid links, no directory blasts, no PBNs.** `saasmarket.site` already
  gave us 44 links and it moved nothing measurable. That is the empirical
  answer to whether volume-without-quality works here, and it cost us the
  experiment already.
- **No guest-post spam.** A post nobody would read without the link in it is
  the same thing as a paid link.
- **No reciprocal-link schemes with other practice sites.** We rank on being
  candid about competitors. Trading links with them ends that.
- **No anchor-text engineering.** Our current top anchors are "sqlquest app"
  and "sql quest" — brand. That is what a natural profile looks like and we are
  not going to make it look otherwise.

## 8. Sequence, and the reason for it

1. **Today:** T0. It is free, it is ours, and it needs nobody's permission.
2. **This week:** T1, founder-only. Two of the four questions (what is
   `sql-quest.app`, why does microsoft.com link to us) are ten minutes each and
   might change the plan.
3. **This month:** T2, a few submissions a week, disclosed.
4. **This quarter:** T3, one post, written properly.

T0 ships in this commit. Everything after it is outward-facing and therefore
the founder's to send, per the standing rule.

## 9. What this does not fix

Links are slow. Nothing here moves Google's average position inside a month,
and a plan that implied otherwise would be lying about how the web works. In
the meantime the faster route stays what `docs/plans/bing-channel-2026-09-11.md`
found: Bing already ranks us on page one, gives us better users, and answers to
work we can do in an afternoon. This plan is the long lever. That one is the
short one, and they are not in competition.

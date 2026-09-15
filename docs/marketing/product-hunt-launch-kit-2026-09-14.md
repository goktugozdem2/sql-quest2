# Product Hunt launch kit — SQLQuest.app

Written 2026-09-14. Everything below is paste-ready; the founder does the
launching. Every number in this file was measured on the date shown and is
bound by a test in the repo — do not round any of them up on the day.

## The one honest thing to know before you spend a day on this

The founder's stated reason is "dış link ve isim sahipliği". Half of that is
right and half needs correcting:

- **Name ownership: yes, and it is the strongest reason.** A Product Hunt
  page titled `SQLQuest.app` ranks for our brand query, sits on a domain with
  far more authority than ours, and becomes a canonical record of what this
  product is. That matters more than usual for us, because `sql-quest.app` is
  a *different product with our name* — a SQL detective game on iOS/Android
  (docs/reads/google-position-2026-09-11.md §4). A PH listing is a public,
  dated, third-party-hosted statement of which SQLQuest is which.
- **Link equity: no. Product Hunt's outbound links are `nofollow`.** Nobody
  should launch for the backlink. What you actually get is the PH page
  ranking, referral traffic on the day, and secondary pickup — newsletters
  and aggregators that scrape PH *do* often link followed. Plan for those, not
  for the PH link itself.

If the goal were purely links, this is not the highest-value day's work. As a
name-ownership move against a live brand collision, it is.

---

## 1. The listing

**Name** (40 char limit)

```
SQLQuest.app
```

Use the domain form, not "SQL Quest". This is the whole point: it is the one
string the mobile game does not have.

**Tagline** (60 char limit — all three below fit; first is the recommendation)

```
Find your SQL gaps before the interviewer does
```
```
The AI coach that finds your SQL gaps before the interview
```
```
Personalized SQL interview practice, not another list
```

**Description** (260 char limit — the one below is 249)

```
Most SQL practice hands everyone the same list. SQLQuest.app scores nine SQL skills as you solve, then picks your next question from your weakest one — and tells you why a wrong query is wrong. 299 challenges, 30 company sets, timed mocks. Free tier.
```

**Topics** (max 3)

```
Education · Developer Tools · Artificial Intelligence
```

Career is tempting as a fourth; Developer Tools brings the audience that
actually writes SQL. Keep the three above.

**Links**

- Website: `https://sqlquest.app/?src=producthunt`
- Do NOT deep-link to /app — the homepage is the page with the proof line and
  the pricing, and the `?src=` gives us an attributable arrival in
  `pro_events` (`landing_view` carries `aid`, joinable to a later solve).

---

## 2. The maker comment

This is the single highest-leverage text on the page — it is what people read
before they click, and it is what gets quoted. Founder voice: writing as
yourself, specific, and honest about what the product is not.

```
Hi Product Hunt — Göktuğ here. I build SQLQuest.app on my own.

I built it because SQL interview prep has a shape problem. Every site hands
you the same ordered list, you grind down it, and you find out what you are
bad at during the interview. The list does not know anything about you.

So this one measures instead. Nine SQL skills — joins, window functions,
subqueries and CTEs, aggregation, conditional logic, dates, strings, NULL
handling, the basics — and every query you solve scores them. That picture is
the Skillmap, and the coach reads it to pick your next question from your
weakest line rather than from the top of a list.

The part I am most attached to is smaller: when your query is wrong, it tells
you WHY. Not "try again" — which rows came back that should not have, whether
the join fanned out, whether a GROUP BY is missing. The mistake is the
teaching moment and most tools waste it.

What is in there today: 299 challenges, 30 company question sets (Capital One,
Stripe, Revolut, Amazon, Meta and more), timed mock screens, and a free
10-question readiness test that needs no signup.

What it is not: it is not a course, there are no videos, and it will not teach
you SQL from zero as well as a good book will. It is for the case where you
can already write a query and you have a screen coming up.

Measured 12 Sep: 5,745 accepted solutions, 1,195 people in the last 30 days.
Small numbers, real ones — I would rather show you those than a rounded
"thousands of learners".

The free tier is a real tier, not a trial with a clock. Pro is $29/mo or
$99/yr and it lifts the daily AI-tutor cap and opens the Hard bank and the
full mock set.

I am here all day. If you try it and something is wrong, dull or confusing,
tell me in the comments — that is more useful to me than a nice word, and I
will reply to every one of them.
```

Two things to check before pasting: the usage numbers are refreshed every
Friday by the `weekly-funnel-friday` task, so re-read the homepage proof line
on launch morning and update them if they moved. And `299` is bound by
`tests/site-counts.test.js` — if it changed, the site changed, so take the
site's number.

---

## 3. Gallery

**Built 2026-09-15 — upload these, in this order.** Every frame is the live
bundle rendering a seeded learner, cropped, never retouched; no dark flag is
switched on. Files in `docs/marketing/product-hunt/`; each has a `@2x` twin
(2540×1520) — upload the `@2x` if PH accepts it, it is sharper on retina.

| # | File | What it shows |
|---|---|---|
| 1 | `gallery-1-skillmap.png` | **Thumbnail.** The Skillmap panel (overall 55, Window Functions 19 weakest) above "Your plan", whose first item today is a window-function question. The differentiator in one frame. |
| 2 | `gallery-2-diagnosis.png` | A LEFT JOIN written as JOIN, and the panel: "expected 46, got 40", the INNER→LEFT hint, the six missing rows. |
| 3 | `gallery-3-company-mock.png` | The Capital One mock mid-sitting (Q1/14, the 69:53 clock) beside the first three cards of the Capital One set. |
| 4 | `gallery-4-readiness.png` | The free readiness test result for Capital One: 73%, the per-skill bars, Window Functions named weakest. |
| 5 | `gallery-5-pricing.png` | The homepage pricing block as it is: three outcomes, $99/yr and $29/mo. |
| — | `logo-240.png` | The purple bolt mark, no wordmark. |

Rebuild after any UI change: `npm run dev`, then `npm run ph:gallery`
(`scripts/ph-gallery/capture.mjs` → `compose.mjs`). The capture is hermetic —
every Supabase call is answered in-page, so the seeded account never becomes
a row.

Two things to know before launch day:

- **The seeded learner is a demo account, not a customer.** `maya_k`, 185
  solves, is generated from the live bank. Its name never appears in a crop; do not
  describe the account as a user in the comments.
- **The homepage shows two plans; the app sells three.** Since
  `quarterlyPlan` went on (2026-09-14) the in-app modal also offers $49 per
  quarter; the homepage still lists only annual and monthly, and frame 5
  shows the homepage. Deliberate for now — the homepage price story is under
  a read on 2026-10-03 and changing it would confound that read — but a PH
  visitor who clicks through will see a third price. The maker comment's
  "$29/mo or $99/yr" line is true of the homepage and incomplete for the app;
  add "or $49 a quarter" to it if you launch before 10-03.

---

## 4. Timing

- **PH days start at 00:01 Pacific.** That is 10:01 Istanbul. Post at the top
  of the day or you lose hours of the 24-hour window you are ranked over.
- **Tuesday, Wednesday or Thursday** for reach; **Saturday or Sunday** for an
  easier rank with less traffic. Given the goal is name ownership rather than
  a traffic spike, **Tuesday** is the recommendation — the page is the same
  either way and a mid-week launch gets more of the newsletter and aggregator
  pickup that carries the followed links.
- Block the whole day. A launch where the maker answers every comment within
  the hour ranks differently from one where they do not, and the comments are
  the part that gets quoted later.

---

## 5. What only you can do

I cannot create accounts, sign in, or post. All of this is yours:

1. Create/sign in to the Product Hunt account.
2. Submit the product (self-hunting is fine and normal now; a hunter adds
   little unless they are genuinely in this audience).
3. Upload the gallery and the logo.
4. Paste the name, tagline, description, topics and links from §1.
5. Post the maker comment from §2 as the first comment, immediately after
   launch.
6. Reply to comments through the day.

**Do not ask anyone to upvote.** It is against Product Hunt's rules and it is
the one thing that can get a launch removed. "I launched today, here is the
link" is fine; "please upvote" is not. Every message you send about the launch
should pass that test.

---

## 6. Comment replies, prepared

The four that will come, and the honest answer to each:

**"How is this different from DataLemur / StrataScratch?"**
> They are both good and I use them as references. The difference is that
> they give everyone the same list; this one measures nine skills as you solve
> and picks from your weakest. There is a comparison on the site with every
> competitor fact dated and sourced — including the places where they are
> ahead of us.

**"Is the free tier actually usable?"**
> Yes. Every Easy and Medium plays free with no signup, the readiness test is
> free, the coach is free, and there is a free mock. Pro lifts a daily AI
> cap and opens the Hard bank and the rest of the mocks. I do not claim
> "unlimited" anywhere, because the backend does have a cap.

**"Where does the AI come in — is it just ChatGPT with a prompt?"**
> The scoring and the next-question pick are not a model, they are computed
> from your attempts, so they are the same answer every time and I can show
> you the arithmetic. The model is used for the tutor: it gets your actual
> query, what the diff engine found wrong, your mastery on the skills that
> challenge needs, and the error patterns you repeat. That context is what
> makes the hint useful.

**"Solo founder? What happens if you stop?"**
> Fair question and I would ask it too. Everything runs in the browser, your
> progress is yours, and I build in public — the numbers on the homepage are
> real and refreshed weekly. I am not going to promise a decade; I will say
> that I answer support myself, usually the same day.

---

## 7. Afterwards

- Add the PH page to `sameAs` in the homepage `Organization` JSON-LD. That is
  the step that turns the listing into a brand-ownership signal rather than
  just a page; it is one line and I can do it the moment the URL exists.
- Submit the PH URL to Bing via `npm run indexnow` the same day (Bing is our
  real channel — see `docs/agent/metrics.md`, `bing_citations`).
- Read `landing_view` where `src=producthunt` against solves in the following
  7 days. That is the only number that says whether the day was worth it; PH
  upvotes are not a metric we keep.

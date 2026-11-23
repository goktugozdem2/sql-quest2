# The indexing queue — rules, written before use (2026-11-23)

The founder's ask, 2026-11-23: *"GSC ve Bing işleri için bir sıralama düzen
oluştur, risk almayacak şekilde zamanla eklersin, önem sırasına göre."* An
ordered, low-risk way to feed URLs to Google Search Console and Bing over time,
the most important first.

Until now this was a list C1 handed the founder on Mondays (SEO-loop rule 6),
and the history of what was requested lived in a memory note and two reads.
From here: one rule set (this file), one ranked list
(`scripts/index-queue.mjs`), one log (`docs/agent/index-requests.json`), one
daily step (S1).

## What does what

| Engine | Channel | Who | Limit |
|---|---|---|---|
| Google | URL Inspection → Request indexing (no API) | S1 through Claude in Chrome, or the founder | ≤ 8 a day, this queue |
| Bing | `scripts/bing/submit.mjs` (API, Mondays) | GitHub Actions | ≤ 100, its own 14-day cooldown, unchanged |
| Bing | IndexNow on every deploy (`indexnow.yml`) | GitHub Actions | automatic, unchanged |
| Bing | URL Inspection / Submission by hand | S1 or the founder | T1 changed today only, ≤ 10 a day |

The queue never requests or submits anything itself; it prints the list.

## 1. Priority tiers

Ranked; within a tier, a **pending** page goes first (in the order of
`pending` in `src/data/index-tiers.json`), then a page the engine has not
indexed, then a page never requested, then the newest lastmod.

- **T1 — money doors:** `/`, `/sql-exercises/`, `/sql-interview-prep/`,
  `/capital-one-sql-interview/`, `/revolut-sql-interview/`,
  `/sql-interview-readiness-test/`. (The homepage is the pricing-bearing
  page; there is no separate pricing page.) A T1 page is eligible whenever it
  changed since its last crawl, even when the change was site-wide.
- **T2 — a new or materially changed page on a door that earns impressions:**
  company pages, topic pages (`/challenges/…`), trap pages and the rollup
  page, `/vs-*`, the alternatives and comparison pages, `/for-teams/`, the
  Debug hub. *New* = the engine does not have it indexed; *materially
  changed* = it is listed under `pending`. A class-2 page that is neither
  ranks as T4.
- **T3 — blog and tutorial pages.**
- **T4 — everything else** (tools, industry pages, the Turkish pages).
- **T5 — `/questions/` pages: Google only, last.** They carry
  `bingbot: noindex, follow` (#72) and are never queued for Bing.
- **Skip list** (`skip` in the tier file): `/privacy/`, `/terms/`,
  `/refund/`, `/weekly/` — never worth a request.

**Pending.** The agent that ships a page, or changes one materially (new
sections, a new title, new questions — not a footer), adds a `pending` line
in the same PR: `{path, tier, added, source}`. A pending page loses the boost
once it has been requested on that engine on or after `added`. A pending line
may carry a **gate**: `flag` (the key must read `true` in
`src/data/feature-flags.js`; a missing key is OFF) and/or `liveMarker` (a
string the live page must contain — proves the PR deployed). With the gate
closed the page is ranked by its class rules like any other.

**Flag-gated pages** (`flagGated` in the tier file): a page that exists only
behind a flag — today `/sql-debugging-practice/` behind `debugQuestions` — is
never queued on any engine while the flag is off, and with `--live` not before
it answers 200.

**A site-wide change is not a change.** When more than half the sitemap's
lastmods moved on the same day (a footer, a shared partial — 427 of 431 pages
on 2026-11-23), that day's lastmod does not make an indexed T2–T5 page
eligible. Only T1, pending, and not-indexed pages go.

## 2. Daily caps, with a margin

- **GSC: at most 8 requests a day.** Google allows about 10; 2 stay free for
  an emergency (a broken page fixed, a money-door change). The quota is a
  **rolling 24 hours from the last request**, not a calendar day (memory
  note, Trap 3: refused the next morning twice). So a batch starts at least
  24 h after the previous batch's last request; the log records the time.
- **The same URL never twice within 14 days**, per engine, and after 14 days
  only if its lastmod moved since the request.
- **Bing:** the API submitter and IndexNow only. By hand only a T1 page whose
  lastmod is today and whose change is not site-wide (IndexNow already sent
  that one), at most 10 a day.
- **IndexNow stays automatic.**

## 3. Preconditions per URL, checked live on the day (`--live`)

1. HTTP 200 with no redirect (`redirect: 'manual'`).
2. A canonical pointing at itself.
3. No `noindex` for the target engine: `<meta name="robots">`, the engine's
   own meta (`googlebot` / `bingbot`), or an `X-Robots-Tag` header.
4. Listed in the live `https://sqlquest.app/sitemap.xml`.
5. The deploy is at least 1 hour old: the last commit on `origin/main` that
   touched `public/` (fetch first), or `--deployed-at`. Not `Last-Modified`:
   on Vercel that header is the edge cache's fill time (read "0 min ago" on
   2026-11-23 for a deploy merged five hours earlier).
6. Not in `src/data/seo-prune.json`.
7. Not flag-gated off; a pending gate's `liveMarker` present.

Without `--live` every line says "live: check on the day". Nothing is
requested from a list made without `--live`.

## 4. Stop rules

- **Already indexed:** a page the engine shows indexed ("Submitted and
  indexed" on Google; crawled on Bing) with a crawl on or after its lastmod is
  not requested. The script reads `gsc_index_status` / `bing_url_status` when
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, or a `--status` JSON
  snapshot; without either it says so and skips the step.
- **S1 RED pauses T3/T4** on the engine that is RED (`**Status:**` line in
  `docs/agent/fleet/state/S1.md`, e.g. `Google GREEN · Bing RED`; a missing
  line reads as RED on both). T1/T2 still go.
- **"Quota Exceeded" stops the day.** Log it as `quota_exceeded`; the script
  then returns nothing for that date. A refusal costs no quota and starts no
  cooldown.
- In the console, never press Enter in the URL Inspection box after a request
  (it fires "Request again" on the URL already open), and click only a control
  that reads exactly "Request indexing" (memory recipe, Traps 2–8).

## 5. The log

`docs/agent/index-requests.json`, one row per URL: `{url, engine, date, by,
result}`, nothing else. `date` is `YYYY-MM-DD` or a full ISO time (prefer the
time); `by` is `founder`, `laptop-agent` or `unknown`; `result` is
`requested`, `quota_exceeded`, `refused`, `already_indexed` or `unknown`. No
names, no e-mail, no customer data (the test fails on an address or an extra
key). What the repo recorded before 2026-11-23 is seeded; what it mentions
without URLs sits under `unrecorded`, never invented.

## 6. The S1 step

Each day after the GSC fetch, S1 runs the queue with `--live`, requests day
1's list (or hands it to the founder under FOUNDER), logs every result, and
does the smaller Bing pass. Details in `docs/agent/fleet/S1-seo-sentinel.md`,
"The daily indexing step". This is the one exception to SEO-loop rule 6 ("no
agent touches the consoles"), at the founder's request of 2026-11-23, and only
for Request indexing on this list.

## What would tell us it is wrong

- A request burns quota on a page that was already indexed after its change
  (read the next `gsc_index_status`): tighten the stop rule.
- New T2 pages still "unknown to Google" 14 days after their request: the
  problem is links or demand, not the queue (CLAUDE.md, "Search-engine
  indexing").
- Any "Quota Exceeded" on a day the log says ≤ 8 in 24 h: the window is
  tighter than measured; lower the cap.

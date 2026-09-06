# Autonomous agent

Runs SQL Quest work unattended on a schedule and opens pull requests. `run.sh`
never pushes to `main` and never merges; a ruleset on `main` makes that true of
the whole process, not just the script (gate 4, below).

## Why it is shaped like this

An agent editing a live product without review is how you get the next
incident, and this repo's `CLAUDE.md` is a list of incidents caused by
unreviewed assumptions. So the autonomy is real but bounded: the agent may
propose, and only a human may land.

Four gates, each independent of the others:

| # | Gate | Blocks |
|---|---|---|
| 1 | `guard.sh` | task allowlist, protected paths, money/auth symbols, runaway diffs, leaked credentials |
| 2 | `npm run build:check` | lint + 686 tests + build + artifact validation |
| 3 | GitHub Actions on the PR | the same checks again, from a clean checkout |
| 4 | you | the merge button — enforced by a ruleset on `main` (pull request required, CI check required, no bypass for the fleet's token), not by `run.sh`'s manners |

Gate 1 exists because gate 2 does not know the difference between a content
edit and a pricing edit. Gate 3 exists because gate 2 runs in the agent's own
dirty environment. Gate 4 exists because the other three are code.

Gate 4 is a repo setting, not a line in `run.sh`, and the distinction is the
whole gate. The agent runs with `--dangerously-skip-permissions` in a checkout
whose credential helper holds a token with Contents read+write; the four gates
govern what `run.sh` does after the agent returns, and nothing in them stops
the model itself running `git push origin HEAD:main` mid-run. So before the
fleet is installed, `main` gets a ruleset: require a pull request, require the
CI status check, and no bypass for the identity the fleet's token belongs to
(a fine-grained PAT acts as your user — check that user is not on the bypass
list). With that in place "never pushes to `main`" is enforced by GitHub;
without it, it is a description of the script's habits.

## What it may and may not touch

Hard-blocked by `guard.sh`:

- `supabase/functions/` — deploying these sends real email and touches Stripe
- `supabase/migrations/` — schema changes are one-way doors
- `.github/workflows/` — the agent must not weaken its own CI gate
- `scripts/agent/` — the agent must not edit its own guardrails
- `vercel.json`, `package.json`, `package-lock.json`

Also blocked, by content rather than path, because the monolith holds the
pricing modal and the checkout handler in the same file as everything else:
any diff line containing `buy.stripe.com`, `beginCheckout`,
`pro_purchase_completed`, `stripe_webhook`, `proStatus`, or an API-key name.

Caps: 25 files, 400 lines. Above that the run aborts — a diff that size is a
prompt that went sideways, not a contribution.

Scoped per task, by the first line of its prompt file:

```
<!-- allowed-paths: docs/reads/ -->
```

`run.sh` reads that header and `guard.sh` fails the run on any changed or
untracked file outside it — colon-separated bash globs, a trailing slash
meaning "anything under" (`docs/reads/`), otherwise matched as written
(`docs/agent/ledger.md`, `src/*.html`). The denylist above says what no task
may touch; this says what one task may, and the gap between them is
`src/app.jsx`, which holds the product and cannot be denylisted. Without the
header, a read task told "only `docs/reads/`" that then fixes the bug it
noticed in app.jsx passes the guard and reaches the reviewer as an app
change under a report's PR title. No header means no allowlist — how every
task behaved until 2026-09-06, when all of them got one. The header lives
under `scripts/agent/`, which is denylisted, so a task cannot widen its own
scope. The parse fails closed: a first line that mentions `allowed-paths` but
does not parse (a reflowed comment, a space-separated list) aborts the run
rather than running it unwalled. Two things to know before leaning on it for
more than it does: a glob's `*` matches `/`, so a bare `src/*.html` would
admit `src/blog/x.html` and `src/app.html` — the guard has extglob on, and
`seo-page` writes `src/!(app|blog/*|data/*).html` so the wall covers the
blog, the app shell and the data directory; and the check runs before
`build:check`, so a task that runs the build itself must list the build's
outputs. The guard also diffs untracked files against `/dev/null`, so a
brand-new page is scanned for money symbols, credentials and size exactly
like an edit — before that, a new file counted as "0 lines" and its
contents were never read.

## Tasks

| Task | Schedule | What it does | Risk |
|---|---|---|---|
| `weekly-read` | Mon 03:00 | Reads the funnel and writes `docs/reads/YYYY-MM-DD-weekly.md`. Touches nothing but that directory. | low |
| `seo-read` | Mon 03:30 | Reads the arrival doors (`door_solve_rate`, `landing_click_through` in the registry): which pages bring people who go on to solve, not just people; how concentrated the traffic is (`sql-exercises` alone was 41% of SEO arrivals on 2026-09-06); which cluster the next page belongs in. Writes under `docs/reads/`, touches nothing else, proposes no page. | low |
| `outreach-queue` | Mon 04:30 | Assembles who the founder should write to this week (unanswered feedback first, then 20+ solve crossers, max 5) with full per-person context. **Writes no emails, sends nothing** — the hand-written email is the product's one unfair advantage at this size; the queue exists so it actually happens. | low |
| `content-fix` | Wed 03:30 | Finds the worst challenge by live solve-through, rewrites its description EN+TR, or changes nothing if it finds no concrete defect. | medium |
| `seo-page` | Thu 03:30 | Proposes ONE new landing page in a cluster the SEO read says converts — never a blog post — as `src/SLUG.html` plus its sitemap entry and its internal links, all in the same commit. Nothing in `src/app.jsx`. Indexing requests (GSC, IndexNow) stay with the human, after merge. | medium — it adds a public page and links |
| `sensor-check` | daily 03:45 | Audits the measurements themselves: multi-fire events, constant-username identities, must-stay-zero counters, mid-window event births, contaminated aids, overdue or UNDEFINED-bound ledger entries. Runs before `verify` because a verdict written on a lying sensor is worse than no verdict. | low |
| `verify` | daily 04:00 | Measures whether merged changes did what they claimed; writes verdicts to `docs/agent/ledger.md`. Exits without writing when nothing is due, which is most days. | low |

The order encodes the loop: **sense → read → propose → verify**, with the
human holding merge and every irreversible decision. Monday morning the
founder gets one packet — the funnel read, the SEO read, and the outreach
queue (with the default cap of one open PR, the second and third of those
wait behind the first until it is merged; see Backlog guard) — and the
weekly triage is: read the verdicts, then ask "which task's PRs keep moving
numbers?" More of those, fewer of the others. The ledger is the allocator.

**`seo-page` — gate met, task added 2026-09-06.** The rule had been: no page
task until the funnel converts a click into a payment, because multiplying
traffic into an unconverting funnel multiplies a zero. Two payments then
landed from the funnel, on 2026-08-23 and 2026-09-01, so the task exists —
bound by four rules the traffic read of 2026-09-06 wrote before the first
run. **One page a week**, never more: GSC indexing requests are manual at
~10/day and a page nobody links or requests is an orphan. **Never a blog
post**: blog arrivals go on to solve at 5%, against 23-32% for the hub,
company and comparison pages that put a challenge one click away. **Links in
the same commit** as the page — the nav dropdown and footer in
`src/index.html`, the sibling strip for a company page — because on a domain
this small a sitemap entry is discovery, not a crawl; the four fintech pages
of July sat unindexed for a week with zero inbound links to prove it. **No
`src/app.jsx`, no `src/app.html`, no blog** — the allowlist header enforces
those (`src/!(app|blog/*|data/*).html:public/sitemap.xml`); the prompt
enforces the rest. Where to dig, from the same read (28 days, app arrivals, internal
accounts out): 609 of 1047 came through an SEO page (58%); the working
clusters are the fintech/data company pages (Revolut 33, Snowflake 27, Wise
14, Stripe 14) and the "analyst-interview" query space (12 — the channel that
sent payer #2, via Gemini); and one page, `sql-exercises`, carried 252 of the
609, which is a concentration risk, not a strategy.

A run that proposes nothing is a successful run. Every prompt says so
explicitly, because an agent that must produce something will lower its own bar
to have something to produce.

Add a task by dropping `tasks/<name>.md` in — first line
`<!-- allowed-paths: … -->` — and adding a timer in `install-vps.sh`. Mind
the daily cap when you add a timer: it counts fires per day, skips included.

## The loop: `Measures:` → ledger → triage

The fleet is only worth running if something checks whether the work worked.
Three files carry that:

- **`docs/agent/metrics.md`** — the metric registry. The verifier can only check
  a metric defined here, with its SQL. A metric named in a PR but missing from
  the registry is recorded as `UNDEFINED`, never guessed. A number improvised on
  the spot reads exactly like a measured one and gets trusted like one.
- **`docs/agent/ledger.md`** — the claim, made at merge time: metric, baseline,
  target, read date. Then the verdict, measured on the date. Nobody edits a
  claim after the fact; that is what makes it a record.
- **`verify`** — reads the ledger daily, measures what is due, writes
  `HIT` / `MOVED` / `FLAT` / `MISS` / `UNREADABLE` / `UNDEFINED`.

`UNREADABLE` is a frequent and legitimate outcome at 22 weekly engaged users. It
is never rounded to `FLAT` — one means "no signal available", the other means
"signal available, nothing moved".

**A ledger that only records wins is a marketing document.** `MISS` is the
outcome worth having, because the next triage decision gets made on this file:
if content fixes keep moving numbers, do more of them; if they do not, stop.

## Auth: subscription or API key

Either works. Set one in `~/sqlquest-agent/.env`.

**Subscription** (recommended here — flat cost, and this fleet is small):

```bash
claude setup-token       # on any machine where you're logged in
# paste into CLAUDE_CODE_OAUTH_TOKEN
```

**API key**: `ANTHROPIC_API_KEY` from console.anthropic.com. Isolated quota,
billed per token.

### The catch, and what the code does about it

A subscription draws from **the same quota as your own interactive sessions**.
An unattended fleet running all day will leave you rate-limited at your own
keyboard — the background system starving the foreground human, which is
exactly backwards. Four defences, all on by default in subscription mode:

| Setting | Default | Why |
|---|---|---|
| `AGENT_QUIET_HOURS` | `2-6` | Runs only 02:00–06:00 local. Burns quota while you sleep. `AGENT_FORCE=1` overrides for a manual run. |
| `AGENT_MAX_RUNS_PER_DAY` | `5` | Hard stop regardless of how many timers fire. Five because Monday fires five; at four, `verify` was refused every Monday. |
| `AGENT_MAX_OPEN_PRS` | `1` | The reviewer is the bottleneck, not the writer. |
| `AGENT_MODEL` | unset | Point cheap tasks at a cheaper model; leave `content-fix` on the strong one. |

And it **fails closed**: if a run hits a usage limit, it parks the fleet for the
rest of the day instead of retrying. A retry storm does not just exhaust today's
window, it eats tomorrow's.

Timers are scheduled between 03:00 and 04:30 so the PR is waiting when you sit
down and the quota is not already gone.

If you later move to API-key mode, quiet hours stop applying automatically —
there is no shared quota to protect.

**Check Anthropic's current terms for unattended/automated use on your plan
before pointing a large fleet at a subscription.** The mechanics work; whether
your plan permits the volume you want is a separate question, and it changes.

## Backlog guard

If `AGENT_MAX_OPEN_PRS` PRs (default 1) from the SAME task are already open
(branches `agent/<task>-*`), the next run of that task exits without doing
anything. An agent that opens PRs faster than a human merges them is
generating work, not doing it.

The count is per task, not fleet-wide — changed 2026-09-06. With one
fleet-wide slot, a report task that writes a file every run blocked every
task behind it: on Monday `seo-read` and `outreach-queue` skipped behind
`weekly-read`, and on any day `verify` skipped behind the sensor report opened
fifteen minutes earlier, so the one task that writes verdicts could never run.
Per task, an unmerged `weekly-read` PR still stops the next `weekly-read`
(there is no point in two unread reads), but never the verifier. The cost
that remains is the honest one: up to seven open PRs on a Monday morning if
nothing was merged all week — a statement about how much the reviewer can
carry, which the code does not make for you.

## One checkout, one run at a time

Every task works in the same clone, and a run begins by resetting it. Two runs
in it at once is not a race, it is a corruption: the second run's reset wipes
the first run's edits, and the first run's `git add -A` then commits whatever
both agents wrote, on whichever branch is checked out, checked against only
one task's allowlist — `weekly-read` and `seo-read` both allow `docs/reads/`,
so a mixed PR would pass the guard under the wrong title. Monday fires three
timers, `TimeoutStartSec` lets a run take most of an hour, and a read run
longer than the gap between timers is normal. So `run.sh` takes a lock on
`$AGENT_HOME/.lock` (`flock`, util-linux) for the whole run. A late arrival
queues for up to 30 minutes (`AGENT_LOCK_WAIT`) rather than skipping — a
oneshot timer does not retry, so a skipped Monday run is gone for the week —
and gives up with a `SKIP` line after that. Timers sit thirty minutes apart
with a minute of jitter so the queue is rare, and the service timeout is
sized for wait plus run.

## What is deliberately NOT automated

One-off changes. Mobile layout fixes, packaging changes, pricing, the paywall,
email sends, schema migrations. None of those are recurring work — you do them
once, with review — and several of them are one-way doors.

## Install

On the VPS, as the user that will own the agent — not root.

**Run 0**, on GitHub, before anything touches the VPS: Settings → Rules →
Rulesets → new branch ruleset targeting `main` — require a pull request
before merging, require the CI status check to pass, and leave the bypass
list empty of the identity the fleet's token belongs to. This is gate 4.
Without it the fleet is trusted not to push to `main`; with it, it cannot.

**Run 1** writes `~/sqlquest-agent/.env` and stops:

```bash
curl -fsSL https://raw.githubusercontent.com/goktugozdem2/sql-quest2/main/scripts/agent/install-vps.sh | bash
```

Fill in the two values it asks for:

- `ANTHROPIC_API_KEY` — console.anthropic.com → API keys
- `GH_TOKEN` — github.com/settings/tokens → **fine-grained**, this repo only,
  Contents read+write, Pull requests read+write

**Run 2** clones, installs the timers, and starts them:

```bash
bash ~/sqlquest-agent/repo/scripts/agent/install-vps.sh
sudo loginctl enable-linger "$USER"    # so timers fire while logged out
```

One credential, not two: git authenticates over HTTPS with the same `GH_TOKEN`
that `gh pr create` needs, so there is no deploy key and no SSH key to manage.
The token goes into the credential helper rather than the remote URL — a URL
with a token in it leaks into `git remote -v`, into logs, and into every error
message.

Never put a password into a prompt, a commit, a chat window, or a script. If
one ever ends up somewhere it shouldn't, rotate it rather than deleting the
message; the copy you can see is not the only one.

## Operating it

```bash
systemctl --user list-timers | grep sqlquest     # when it next runs
bash scripts/agent/run.sh weekly-read            # run one now
tail -f ~/sqlquest-agent/logs/*.log              # watch
systemctl --user disable --now sqlquest-content-fix.timer   # stop one
```

Every run writes `~/sqlquest-agent/logs/<task>-<stamp>.log`, and the PR body
links to it.
